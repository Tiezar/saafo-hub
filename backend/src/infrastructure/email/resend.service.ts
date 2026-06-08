import { Injectable, Logger } from '@nestjs/common';
import { Resend } from 'resend';

@Injectable()
export class ResendService {
  private readonly resend: Resend;
  private readonly logger = new Logger(ResendService.name);

  constructor() {
    this.resend = new Resend(process.env.RESEND_API_KEY);
  }

  async sendVerificationEmail(
    to: string,
    name: string,
    verifyUrl: string,
  ): Promise<void> {
    const from = process.env.RESEND_FROM_EMAIL!;

    const { error } = await this.resend.emails.send({
      from,
      to,
      subject: 'Confirme seu email — SAAFO HUB',
      html: this.buildVerificationEmailHtml(name, verifyUrl),
    });

    if (error) {
      this.logger.error(
        `Failed to send verification email to ${to}: ${error.message}`,
      );
      throw new Error('Não foi possível enviar o email de verificação.');
    }

    this.logger.log(`Verification email sent to ${to}`);
  }

  async sendReminderEmail(
    to: string,
    name: string,
    eventTitle: string,
    eventType: string,
    timeStr: string,
    when: string,
  ): Promise<void> {
    const from = process.env.RESEND_FROM_EMAIL!;
    if (!from || !process.env.RESEND_API_KEY) {
      this.logger.warn('Resend not configured — skipping email reminder');
      return;
    }

    const { error } = await this.resend.emails.send({
      from,
      to,
      subject: `⏰ Lembrete: ${eventTitle} — SAAFO HUB`,
      html: this.buildReminderEmailHtml(
        name,
        eventTitle,
        eventType,
        timeStr,
        when,
      ),
    });

    if (error) {
      this.logger.error(
        `Failed to send reminder email to ${to}: ${error.message}`,
      );
      return;
    }

    this.logger.log(`Reminder email sent to ${to}`);
  }

  private buildReminderEmailHtml(
    name: string,
    eventTitle: string,
    eventType: string,
    timeStr: string,
    when: string,
  ): string {
    const frontendUrl = (process.env.FRONTEND_URL ?? 'http://localhost:5173')
      .split(',')[0]
      .trim();
    const logoUrl = `${frontendUrl}/saafo-hub-logo.png`;

    return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Lembrete — SAAFO HUB</title>
</head>
<body style="margin:0;padding:0;background-color:#fff8f3;font-family:'Inter',system-ui,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
    style="background-color:#fff8f3;padding:40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width:520px;">

          <!-- Logo -->
          <tr>
            <td align="center" style="padding-bottom:32px;">
              <a href="${frontendUrl}" target="_blank" style="text-decoration:none;">
                <img src="${logoUrl}" alt="SAAFO HUB" style="height:32px; display:block; border:0; object-fit:contain;" />
              </a>
            </td>
          </tr>

          <!-- Card -->
          <tr>
            <td style="background-color:#fef2e4;border:1px solid #cdc5bc;
              border-radius:6px;padding:40px 36px;">
              <p style="margin:0 0 6px;font-size:11px;font-weight:700;color:#a33b3a;
                text-transform:uppercase;letter-spacing:0.08em;font-family:monospace;">⏰ Lembrete</p>
              <h1 style="margin:0 0 12px;font-size:24px;font-weight:700;color:#201b12;letter-spacing:-0.5px;font-family:'Georgia',serif;">
                ${eventType} em ${when}
              </h1>
              <p style="margin:0 0 24px;font-size:15px;color:#4b463f;line-height:1.6;">
                Olá, <strong style="color:#201b12;">${name}</strong>! Não esqueça do seu compromisso de estudos programado.
              </p>

              <div style="background-color:#fff8f3;border:1px solid #cdc5bc;
                border-radius:6px;padding:20px 24px;margin-bottom:24px;">
                <div style="font-size:18px;font-weight:700;color:#201b12;margin-bottom:6px;font-family:'Georgia',serif;">
                  ${eventTitle}
                </div>
                <div style="font-size:14px;color:#4b463f;">
                  🕐 ${timeStr}
                </div>
              </div>

              <p style="margin:0;font-size:13px;color:#7c766e;line-height:1.5;border-top:1px solid #cdc5bc;padding-top:20px;">
                Bons estudos! 📚
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding-top:24px;">
              <p style="margin:0;font-size:12px;color:#7c766e;line-height:1.5;">
                SAAFO HUB &mdash; Plataforma Inteligente de Flashcards<br />
                <span style="color:#cdc5bc;">© ${new Date().getFullYear()} SAAFO HUB. Todos os direitos reservados.</span>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
  }

  private buildVerificationEmailHtml(name: string, verifyUrl: string): string {
    const frontendUrl = (process.env.FRONTEND_URL ?? 'http://localhost:5173')
      .split(',')[0]
      .trim();
    const logoUrl = `${frontendUrl}/saafo-hub-logo.png`;

    return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Confirme seu email — SAAFO HUB</title>
</head>
<body style="margin:0;padding:0;background-color:#fff8f3;font-family:'Inter',system-ui,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
    style="background-color:#fff8f3;padding:40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width:520px;">

          <!-- Logo -->
          <tr>
            <td align="center" style="padding-bottom:32px;">
              <a href="${frontendUrl}" target="_blank" style="text-decoration:none;">
                <img src="${logoUrl}" alt="SAAFO HUB" style="height:32px; display:block; border:0; object-fit:contain;" />
              </a>
            </td>
          </tr>

          <!-- Card -->
          <tr>
            <td style="background-color:#fef2e4;border:1px solid #cdc5bc;
              border-radius:6px;padding:40px 36px;">
              <h1 style="margin:0 0 12px;font-size:24px;font-weight:700;color:#201b12;letter-spacing:-0.5px;font-family:'Georgia',serif;">
                Confirme seu e-mail
              </h1>
              <p style="margin:0 0 28px;font-size:15px;color:#4b463f;line-height:1.6;">
                Olá, <strong style="color:#201b12;">${name}</strong>! Obrigado por se cadastrar no SAAFO HUB. Clique no botão abaixo para verificar seu endereço de e-mail e ativar sua conta.
              </p>

              <div align="center" style="margin-bottom:28px;">
                <a href="${verifyUrl}" target="_blank"
                  style="display:inline-block;padding:14px 32px;
                    background-color:#a33b3a;
                    color:#ffffff;text-decoration:none;border-radius:6px;
                    font-weight:600;font-size:15px;letter-spacing:0.2px;box-shadow:0 4px 12px rgba(163,59,58,0.25);">
                  Ativar Minha Conta
                </a>
              </div>

              <p style="margin:28px 0 0;font-size:13px;color:#7c766e;line-height:1.5;border-top:1px solid #cdc5bc;padding-top:20px;">
                Este link expira em <strong>24 horas</strong>.<br />
                Se você não realizou este cadastro, por favor desconsidere este e-mail.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding-top:24px;">
              <p style="margin:0;font-size:12px;color:#7c766e;line-height:1.5;">
                SAAFO HUB &mdash; Plataforma Inteligente de Flashcards<br />
                <span style="color:#cdc5bc;">© ${new Date().getFullYear()} SAAFO HUB. Todos os direitos reservados.</span>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
  }
}
