import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';

export interface AsaasCardData {
  holderName: string;
  number: string;
  expiryMonth: string;
  expiryYear: string;
  ccv: string;
}

export interface AsaasHolderInfo {
  name: string;
  email?: string;
  cpfCnpj: string;
  postalCode: string;
  addressNumber: string;
  phone: string;
}

export interface AsaasSubscriptionDetails {
  status: string;
  nextDueDate: string;
  value: number;
  billingType: string;
  creditCardBrand?: string;
  creditCardLastFour?: string;
}

@Injectable()
export class AsaasService {
  private readonly logger = new Logger(AsaasService.name);
  private readonly apiKey = process.env.ASAAS_API_KEY ?? '';
  private readonly baseUrl =
    process.env.ASAAS_ENV === 'production'
      ? 'https://api.asaas.com/v3'
      : 'https://sandbox.asaas.com/api/v3';

  private async req<T>(method: string, path: string, body?: object): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: { 'Content-Type': 'application/json', 'access_token': this.apiKey },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      const text = await res.text();
      this.logger.error(`Asaas ${method} ${path} → ${res.status}: ${text}`);
      throw new InternalServerErrorException(`Erro no gateway de pagamento: ${res.status}`);
    }
    return res.json() as Promise<T>;
  }

  async findOrCreateCustomer(userId: string, name: string, email: string): Promise<string> {
    const list = await this.req<{ data: { id: string }[] }>(
      'GET', `/customers?email=${encodeURIComponent(email)}&limit=1`,
    );
    if (list.data?.length > 0) return list.data[0].id;
    const c = await this.req<{ id: string }>('POST', '/customers', {
      name,
      email,
      externalReference: userId,
      notificationDisabled: false,
    });
    return c.id;
  }

  // ── Credit card tokenization (card data never stored, transits only to Asaas) ──

  async tokenizeCard(
    customerId: string,
    card: AsaasCardData,
    holder: AsaasHolderInfo,
    remoteIp: string,
  ): Promise<{ creditCardToken: string; creditCardBrand: string }> {
    return this.req<{ creditCardToken: string; creditCardBrand: string }>(
      'POST',
      '/creditCards/tokenize',
      {
        customer: customerId,
        creditCard: {
          holderName: card.holderName,
          number: card.number.replace(/\s/g, ''),
          expiryMonth: card.expiryMonth,
          expiryYear: card.expiryYear,
          ccv: card.ccv,
        },
        creditCardHolderInfo: {
          name: holder.name,
          email: holder.email,
          cpfCnpj: holder.cpfCnpj.replace(/\D/g, ''),
          postalCode: holder.postalCode.replace(/\D/g, ''),
          addressNumber: holder.addressNumber,
          phone: holder.phone.replace(/\D/g, ''),
        },
        remoteIp,
      },
    );
  }

  // ── Subscription creation ─────────────────────────────────────────────────

  private subscriptionBase(customerId: string, userId: string, billingType: string) {
    const nextDue = new Date();
    nextDue.setDate(nextDue.getDate() + 1);
    return {
      customer: customerId,
      billingType,
      value: 19.0,
      nextDueDate: nextDue.toISOString().split('T')[0],
      cycle: 'MONTHLY',
      description: 'SAAFO HUB — Plano Estudante',
      externalReference: userId,
    };
  }

  async createSubscriptionCard(
    customerId: string,
    userId: string,
    creditCardToken: string,
  ): Promise<{ id: string }> {
    return this.req<{ id: string }>('POST', '/subscriptions', {
      ...this.subscriptionBase(customerId, userId, 'CREDIT_CARD'),
      creditCardToken,
    });
  }

  // ── Subscription management ───────────────────────────────────────────────

  async getSubscriptionDetails(subscriptionId: string): Promise<AsaasSubscriptionDetails> {
    const sub = await this.req<{
      status: string;
      nextDueDate: string;
      value: number;
      billingType: string;
      creditCard?: { creditCardBrand: string; creditCardNumber: string };
    }>('GET', `/subscriptions/${subscriptionId}`);

    return {
      status: sub.status,
      nextDueDate: sub.nextDueDate,
      value: sub.value,
      billingType: sub.billingType,
      creditCardBrand: sub.creditCard?.creditCardBrand,
      creditCardLastFour: sub.creditCard?.creditCardNumber,
    };
  }

  async updateSubscriptionCard(subscriptionId: string, creditCardToken: string): Promise<void> {
    await this.req('POST', `/subscriptions/${subscriptionId}/creditCardToken`, { creditCardToken });
  }

  async cancelSubscription(subscriptionId: string): Promise<void> {
    await this.req('DELETE', `/subscriptions/${subscriptionId}`);
  }

  async cancelExistingSubscription(userId: string, subscriptionId: string): Promise<void> {
    try {
      await this.cancelSubscription(subscriptionId);
    } catch (e) {
      this.logger.warn(`Failed to cancel subscription ${subscriptionId} for user ${userId}: ${(e as Error).message}`);
    }
  }
}
