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
    const logoUrl = `${frontendUrl}/saafo-hub-logo-dark.png`;

    return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Lembrete — SAAFO HUB</title>
</head>
<body style="margin:0;padding:0;background-color:#09090b;font-family:'Inter',system-ui,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
    style="background-color:#09090b;padding:40px 20px;">
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
            <td style="background-color:#18181b;border:1px solid #27272a;
              border-radius:16px;padding:40px 36px;">
              <p style="margin:0 0 6px;font-size:12px;font-weight:700;color:#a78bfa;
                text-transform:uppercase;letter-spacing:0.08em;">⏰ Lembrete</p>
              <h1 style="margin:0 0 12px;font-size:24px;font-weight:700;color:#ffffff;letter-spacing:-0.5px;">
                ${eventType} em ${when}
              </h1>
              <p style="margin:0 0 24px;font-size:15px;color:#a1a1aa;line-height:1.6;">
                Olá, <strong style="color:#ffffff;">${name}</strong>! Não esqueça do seu compromisso de estudos programado.
              </p>

              <div style="background-color:#09090b;border:1px solid #27272a;
                border-radius:12px;padding:20px 24px;margin-bottom:24px;">
                <div style="font-size:18px;font-weight:700;color:#ffffff;margin-bottom:6px;">
                  ${eventTitle}
                </div>
                <div style="font-size:14px;color:#a1a1aa;">
                  🕐 ${timeStr}
                </div>
              </div>

              <p style="margin:0;font-size:13px;color:#71717a;line-height:1.5;border-top:1px solid #27272a;padding-top:20px;">
                Bons estudos! 📚
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding-top:24px;">
              <p style="margin:0;font-size:12px;color:#52525b;line-height:1.5;">
                SAAFO HUB &mdash; Plataforma Inteligente de Flashcards<br />
                <span style="color:#3f3f46;">© ${new Date().getFullYear()} SAAFO HUB. Todos os direitos reservados.</span>
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
    const logoUrl = `${frontendUrl}/saafo-hub-logo-dark.png`;

    return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Confirme seu email — SAAFO HUB</title>
</head>
<body style="margin:0;padding:0;background-color:#09090b;font-family:'Inter',system-ui,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
    style="background-color:#09090b;padding:40px 20px;">
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
            <td style="background-color:#18181b;border:1px solid #27272a;
              border-radius:16px;padding:40px 36px;">
              <h1 style="margin:0 0 12px;font-size:24px;font-weight:700;color:#ffffff;letter-spacing:-0.5px;">
                Confirme seu e-mail
              </h1>
              <p style="margin:0 0 28px;font-size:15px;color:#a1a1aa;line-height:1.6;">
                Olá, <strong style="color:#ffffff;">${name}</strong>! Obrigado por se cadastrar no SAAFO HUB. Clique no botão abaixo para verificar seu endereço de e-mail e ativar sua conta.
              </p>

              <div align="center" style="margin-bottom:28px;">
                <a href="${verifyUrl}" target="_blank"
                  style="display:inline-block;padding:14px 32px;
                    background-color:#7c3aed;
                    background:linear-gradient(135deg,#7c3aed,#6366f1);
                    color:#ffffff;text-decoration:none;border-radius:8px;
                    font-weight:600;font-size:15px;letter-spacing:0.2px;box-shadow:0 4px 12px rgba(124,58,237,0.25);">
                  Ativar Minha Conta
                </a>
              </div>

              <p style="margin:28px 0 0;font-size:13px;color:#71717a;line-height:1.5;border-top:1px solid #27272a;padding-top:20px;">
                Este link expira em <strong>24 horas</strong>.<br />
                Se você não realizou este cadastro, por favor desconsidere este e-mail.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding-top:24px;">
              <p style="margin:0;font-size:12px;color:#52525b;line-height:1.5;">
                SAAFO HUB &mdash; Plataforma Inteligente de Flashcards<br />
                <span style="color:#3f3f46;">© ${new Date().getFullYear()} SAAFO HUB. Todos os direitos reservados.</span>
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
