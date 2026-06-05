import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';

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

  async createSubscription(
    customerId: string,
    userId: string,
  ): Promise<{ id: string; invoiceUrl: string }> {
    const nextDue = new Date();
    nextDue.setDate(nextDue.getDate() + 1);
    const sub = await this.req<{ id: string; invoiceUrl: string }>(
      'POST',
      '/subscriptions',
      {
        customer: customerId,
        billingType: 'UNDEFINED', // usuário escolhe: PIX / boleto / cartão
        value: 19.0,
        nextDueDate: nextDue.toISOString().split('T')[0],
        cycle: 'MONTHLY',
        description: 'SAAFO HUB — Plano Estudante',
        externalReference: userId,
      },
    );
    return { id: sub.id, invoiceUrl: sub.invoiceUrl ?? '' };
  }

  async cancelSubscription(subscriptionId: string): Promise<void> {
    await this.req('DELETE', `/subscriptions/${subscriptionId}`);
  }
}
