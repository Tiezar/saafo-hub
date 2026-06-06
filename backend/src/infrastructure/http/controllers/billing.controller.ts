import {
  Controller, Post, Get, Put, Delete, Body, Headers, Req,
  Inject, UseGuards, NotFoundException, BadRequestException,
  UnauthorizedException, HttpCode, InternalServerErrorException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { AsaasService, AsaasCardData, AsaasHolderInfo } from '../../payments/asaas.service';
import type { IUserRepository } from '../../../domain/repositories/user-repository.interface';
import {
  IsString, IsNotEmpty, MaxLength, Matches,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

// ── DTOs ─────────────────────────────────────────────────────────────────────

// email is injected server-side from JWT — not sent by the frontend
class HolderInfoDto {
  @IsString() @IsNotEmpty() name: string;
  @IsString() @Matches(/^\d{11,14}$/, { message: 'CPF/CNPJ inválido' }) cpfCnpj: string;
  @IsString() @Matches(/^\d{8}$/, { message: 'CEP inválido' }) postalCode: string;
  @IsString() @IsNotEmpty() @MaxLength(10) addressNumber: string;
  @IsString() @Matches(/^\d{10,11}$/, { message: 'Telefone inválido' }) phone: string;
}

class CardDataDto implements AsaasCardData {
  @IsString() @IsNotEmpty() @MaxLength(100) holderName: string;
  @IsString() @Matches(/^\d{13,19}$/, { message: 'Número do cartão inválido' }) number: string;
  @IsString() @Matches(/^(0[1-9]|1[0-2])$/, { message: 'Mês inválido' }) expiryMonth: string;
  @IsString() @Matches(/^\d{4}$/, { message: 'Ano inválido' }) expiryYear: string;
  @IsString() @Matches(/^\d{3,4}$/, { message: 'CVV inválido' }) ccv: string;
}

class CardCheckoutDto {
  @ValidateNested() @Type(() => CardDataDto) card: CardDataDto;
  @ValidateNested() @Type(() => HolderInfoDto) holder: HolderInfoDto;
}

class UpdateCardDto {
  @ValidateNested() @Type(() => CardDataDto) card: CardDataDto;
  @ValidateNested() @Type(() => HolderInfoDto) holder: HolderInfoDto;
}

// ── Helper ────────────────────────────────────────────────────────────────────

function getClientIp(req: any): string {
  const forwarded = req.headers?.['x-forwarded-for'];
  if (typeof forwarded === 'string') return forwarded.split(',')[0].trim();
  return req.ip ?? req.connection?.remoteAddress ?? '0.0.0.0';
}

// ── Controller ────────────────────────────────────────────────────────────────

@Controller('billing')
export class BillingController {
  constructor(
    private readonly asaasService: AsaasService,
    @Inject('IUserRepository') private readonly userRepository: IUserRepository,
  ) {}

  private async ensureCustomer(userId: string) {
    const user = await this.userRepository.findById(userId);
    if (!user) throw new NotFoundException('Usuário não encontrado.');
    if (!process.env.ASAAS_API_KEY) throw new InternalServerErrorException('Gateway de pagamento não configurado.');

    const customerId = await this.asaasService.findOrCreateCustomer(user.id, user.name, user.email);
    if (!user.asaasCustomerId) {
      await this.userRepository.update(user.id, { asaasCustomerId: customerId });
    }

    // Cancel any pending subscription before creating a new one
    if (user.asaasSubscriptionId && user.plan !== 'STUDENT') {
      await this.asaasService.cancelExistingSubscription(user.id, user.asaasSubscriptionId);
      await this.userRepository.update(user.id, { asaasSubscriptionId: undefined });
    }

    return { user, customerId };
  }

  // ── Checkout — Credit Card (transparent) ─────────────────────────────────

  @Post('checkout/card')
  @UseGuards(JwtAuthGuard)
  async checkoutCard(@Req() req: any, @Body() body: CardCheckoutDto) {
    const { user, customerId } = await this.ensureCustomer(req.user.id);

    const { creditCardToken } = await this.asaasService.tokenizeCard(
      customerId, body.card, { ...body.holder, email: user.email }, getClientIp(req),
    );

    const sub = await this.asaasService.createSubscriptionCard(customerId, user.id, creditCardToken);
    await this.userRepository.update(user.id, { asaasSubscriptionId: sub.id, plan: 'STUDENT' });

    return { ok: true };
  }

  // ── Checkout — PIX ────────────────────────────────────────────────────────

  @Post('checkout/pix')
  @UseGuards(JwtAuthGuard)
  async checkoutPix(@Req() req: any) {
    const { user, customerId } = await this.ensureCustomer(req.user.id);

    const { subscriptionId, pixQrCode, pixCopyPaste, paymentId } =
      await this.asaasService.createSubscriptionPix(customerId, user.id);

    await this.userRepository.update(user.id, { asaasSubscriptionId: subscriptionId });

    return { pixQrCode, pixCopyPaste, paymentId };
  }

  // ── Checkout — Boleto ─────────────────────────────────────────────────────

  @Post('checkout/boleto')
  @UseGuards(JwtAuthGuard)
  async checkoutBoleto(@Req() req: any) {
    const { user, customerId } = await this.ensureCustomer(req.user.id);

    const { subscriptionId, boletoUrl, barCode } =
      await this.asaasService.createSubscriptionBoleto(customerId, user.id);

    await this.userRepository.update(user.id, { asaasSubscriptionId: subscriptionId });

    return { boletoUrl, barCode };
  }

  // ── Subscription details ──────────────────────────────────────────────────

  @Get('subscription/details')
  @UseGuards(JwtAuthGuard)
  async getSubscriptionDetails(@Req() req: any) {
    const user = await this.userRepository.findById(req.user.id);
    if (!user) throw new NotFoundException('Usuário não encontrado.');
    if (!user.asaasSubscriptionId) return null;

    try {
      return await this.asaasService.getSubscriptionDetails(user.asaasSubscriptionId);
    } catch {
      return null;
    }
  }

  // ── Update payment method (card) ──────────────────────────────────────────

  @Put('subscription/payment-method')
  @UseGuards(JwtAuthGuard)
  async updatePaymentMethod(@Req() req: any, @Body() body: UpdateCardDto) {
    const user = await this.userRepository.findById(req.user.id);
    if (!user) throw new NotFoundException('Usuário não encontrado.');
    if (!user.asaasSubscriptionId) throw new BadRequestException('Nenhuma assinatura ativa.');

    const customerId = await this.asaasService.findOrCreateCustomer(user.id, user.name, user.email);

    const { creditCardToken } = await this.asaasService.tokenizeCard(
      customerId, body.card, { ...body.holder, email: user.email }, getClientIp(req),
    );

    await this.asaasService.updateSubscriptionCard(user.asaasSubscriptionId, creditCardToken);
    return { ok: true };
  }

  // ── Plan status ───────────────────────────────────────────────────────────

  @Get('status')
  @UseGuards(JwtAuthGuard)
  async getPlanStatus(@Req() req: any) {
    const user = await this.userRepository.findById(req.user.id);
    if (!user) throw new NotFoundException();

    return {
      plan: user.plan ?? 'FREE_TRIAL',
      isActive: user.isActivePlan,
      trialEndsAt: user.trialEndsAt,
      trialDaysLeft: user.trialDaysLeft,
    };
  }

  // ── Cancel subscription ───────────────────────────────────────────────────

  @Delete('subscription')
  @UseGuards(JwtAuthGuard)
  async cancelSubscription(@Req() req: any) {
    const user = await this.userRepository.findById(req.user.id);
    if (!user?.asaasSubscriptionId) throw new BadRequestException('Nenhuma assinatura ativa encontrada.');

    await this.asaasService.cancelSubscription(user.asaasSubscriptionId);
    await this.userRepository.update(user.id, { plan: 'EXPIRED', asaasSubscriptionId: undefined });
    return { message: 'Assinatura cancelada com sucesso.' };
  }

  // ── Webhook ───────────────────────────────────────────────────────────────

  @Post('webhook')
  @HttpCode(200)
  async handleWebhook(@Body() body: any, @Headers('asaas-access-token') token: string) {
    const webhookToken = process.env.ASAAS_WEBHOOK_TOKEN;
    if (webhookToken && token !== webhookToken) throw new UnauthorizedException('Webhook token inválido.');

    const event: string = body.event ?? '';
    const userId: string = body.payment?.externalReference ?? '';
    if (!userId) return { received: true };

    if (['PAYMENT_RECEIVED', 'PAYMENT_CONFIRMED'].includes(event)) {
      await this.userRepository.update(userId, { plan: 'STUDENT' });
    } else if (['PAYMENT_OVERDUE', 'SUBSCRIPTION_DELETED', 'SUBSCRIPTION_INACTIVATED'].includes(event)) {
      const user = await this.userRepository.findById(userId);
      if (user?.plan === 'STUDENT') {
        await this.userRepository.update(userId, { plan: 'EXPIRED' });
      }
    }

    return { received: true };
  }
}
