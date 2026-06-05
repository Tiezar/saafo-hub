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
      this.logger.error(`Failed to send verification email to ${to}: ${error.message}`);
      throw new Error('Não foi possível enviar o email de verificação.');
    }

    this.logger.log(`Verification email sent to ${to}`);
  }

  private buildVerificationEmailHtml(name: string, verifyUrl: string): string {
    return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Confirme seu email</title>
</head>
<body style="margin:0;padding:0;background:#09090b;font-family:'Inter',system-ui,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
    style="background:#09090b;padding:40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width:520px;">

          <!-- Logo -->
          <tr>
            <td align="center" style="padding-bottom:32px;">
              <div style="display:inline-flex;align-items:center;gap:10px;">
                <div style="width:36px;height:36px;background:linear-gradient(135deg,#7c3aed,#6366f1);
                  border-radius:8px;display:inline-flex;align-items:center;justify-content:center;">
                  <span style="color:white;font-size:18px;font-weight:bold;">S</span>
                </div>
                <span style="font-family:Georgia,serif;font-size:22px;font-weight:800;
                  color:#a78bfa;letter-spacing:-0.5px;">SAAFO HUB</span>
              </div>
            </td>
          </tr>

          <!-- Card -->
          <tr>
            <td style="background:#18181b;border:1px solid rgba(255,255,255,0.08);
              border-radius:16px;padding:40px 36px;">
              <h1 style="margin:0 0 8px;font-size:26px;font-weight:700;color:#f4f4f5;">
                Confirme seu email
              </h1>
              <p style="margin:0 0 28px;font-size:15px;color:#a1a1aa;line-height:1.6;">
                Olá, <strong style="color:#f4f4f5;">${name}</strong>! Clique no botão abaixo
                para verificar seu endereço de email e ativar sua conta.
              </p>

              <a href="${verifyUrl}"
                style="display:inline-block;padding:14px 28px;
                  background:linear-gradient(135deg,#7c3aed,#6366f1);
                  color:white;text-decoration:none;border-radius:8px;
                  font-weight:600;font-size:15px;letter-spacing:0.2px;">
                Verificar meu email
              </a>

              <p style="margin:28px 0 0;font-size:13px;color:#71717a;line-height:1.5;">
                Este link expira em <strong>24 horas</strong>.<br />
                Se você não criou uma conta no SAAFO HUB, ignore este email.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding-top:24px;">
              <p style="margin:0;font-size:12px;color:#52525b;">
                SAAFO HUB &mdash; Plataforma de flashcards com repetição espaçada
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
