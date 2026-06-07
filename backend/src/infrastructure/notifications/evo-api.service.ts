import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class EvoApiService {
  private readonly logger = new Logger(EvoApiService.name);
  private readonly apiUrl = process.env.EVOLUTION_API_URL;
  private readonly apiKey = process.env.EVOLUTION_API_KEY;
  private readonly instance = process.env.EVOLUTION_API_INSTANCE;

  get isConfigured(): boolean {
    return !!(this.apiUrl && this.apiKey && this.instance);
  }

  async sendWhatsApp(phone: string, message: string): Promise<void> {
    if (!this.isConfigured) {
      this.logger.warn('EvoAPI not configured — skipping WhatsApp notification');
      return;
    }

    const normalized = this.normalizePhone(phone);

    try {
      const res = await fetch(
        `${this.apiUrl}/send/text`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: this.apiKey!,
            instance: this.instance!,
          },
          body: JSON.stringify({ number: normalized, text: message }),
        },
      );

      if (!res.ok) {
        const body = await res.text();
        this.logger.error(`EvoAPI error ${res.status}: ${body}`);
        return;
      }

      this.logger.log(`WhatsApp sent to ${normalized}`);
    } catch (err) {
      this.logger.error(`Failed to send WhatsApp: ${(err as Error).message}`);
    }
  }

  private normalizePhone(phone: string): string {
    const digits = phone.replace(/\D/g, '').replace(/^0+/, '');
    // Prepend country code 55 (Brazil) if not already present
    if (digits.startsWith('55') && digits.length >= 12) return digits;
    return `55${digits}`;
  }
}
