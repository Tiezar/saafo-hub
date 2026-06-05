import {
  Controller, Post, Get, Delete, Body, Headers, Req,
  Inject, UseGuards, NotFoundException, BadRequestException,
  UnauthorizedException, HttpCode, InternalServerErrorException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { AsaasService } from '../../payments/asaas.service';
import type { IUserRepository } from '../../../domain/repositories/user-repository.interface';

@Controller('billing')
export class BillingController {
  constructor(
    private readonly asaasService: AsaasService,
    @Inject('IUserRepository') private readonly userRepository: IUserRepository,
  ) {}

  /** Cria checkout Asaas e retorna a URL de pagamento */
  @Post('checkout')
  @UseGuards(JwtAuthGuard)
  async createCheckout(@Req() req: any) {
    if (!process.env.ASAAS_API_KEY) {
      throw new InternalServerErrorException('Gateway de pagamento não configurado.');
    }
    const user = await this.userRepository.findById(req.user.id);
    if (!user) throw new NotFoundException('Usuário não encontrado.');

    const customerId = await this.asaasService.findOrCreateCustomer(user.id, user.name, user.email);
    await this.userRepository.update(user.id, { asaasCustomerId: customerId });

    const { id, invoiceUrl } = await this.asaasService.createSubscription(customerId, user.id);
    await this.userRepository.update(user.id, { asaasSubscriptionId: id });

    return { invoiceUrl };
  }

  /** Retorna status do plano do usuário autenticado */
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

  /** Cancela assinatura ativa */
  @Delete('subscription')
  @UseGuards(JwtAuthGuard)
  async cancelSubscription(@Req() req: any) {
    const user = await this.userRepository.findById(req.user.id);
    if (!user?.asaasSubscriptionId) {
      throw new BadRequestException('Nenhuma assinatura ativa encontrada.');
    }
    await this.asaasService.cancelSubscription(user.asaasSubscriptionId);
    await this.userRepository.update(user.id, { plan: 'EXPIRED', asaasSubscriptionId: undefined });
    return { message: 'Assinatura cancelada com sucesso.' };
  }

  /**
   * Webhook Asaas — não protegido por JWT (chamado pelo servidor Asaas).
   * Valida via header "asaas-access-token".
   */
  @Post('webhook')
  @HttpCode(200)
  async handleWebhook(
    @Body() body: any,
    @Headers('asaas-access-token') token: string,
  ) {
    const webhookToken = process.env.ASAAS_WEBHOOK_TOKEN;
    if (webhookToken && token !== webhookToken) {
      throw new UnauthorizedException('Webhook token inválido.');
    }

    const event: string = body.event ?? '';
    // externalReference = userId definido na criação da assinatura
    const userId: string = body.payment?.externalReference ?? '';
    if (!userId) return { received: true };

    if (['PAYMENT_RECEIVED', 'PAYMENT_CONFIRMED'].includes(event)) {
      await this.userRepository.update(userId, { plan: 'STUDENT' });
    } else if (['PAYMENT_OVERDUE', 'SUBSCRIPTION_DELETED', 'SUBSCRIPTION_INACTIVATED'].includes(event)) {
      await this.userRepository.update(userId, { plan: 'EXPIRED' });
    }

    return { received: true };
  }
}
