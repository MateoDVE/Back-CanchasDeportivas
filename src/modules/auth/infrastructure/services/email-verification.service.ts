import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { IEmailVerification } from '../../domain/services/email-verification.interface';

@Injectable()
export class EmailVerificationService implements IEmailVerification {
  constructor(private readonly config: ConfigService, private readonly jwt: JwtService) {}

  async send(userId: string, email: string): Promise<void> {
    const key = this.config.get<string>('RESEND_API_KEY');
    const from = this.config.get<string>('MAIL_FROM');
    const origin = this.config.get<string>('FRONTEND_URL');
    if (!key || !from || !origin) {
      throw new ServiceUnavailableException('El envío de correos no está configurado. Contacta al administrador.');
    }
    const token = this.jwt.sign({ sub: userId, email, purpose: 'verify-email' }, {
      expiresIn: '30m', audience: 'email-verification',
    });
    const url = new URL('/verify-email', origin);
    // El fragmento no se envía al servidor web ni en Referer.
    url.hash = new URLSearchParams({ email, token }).toString();
    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from, to: [email], subject: 'Verifica tu correo para reservar',
          text: `Confirma tu correo abriendo este enlace: ${url.toString()}\nEl enlace vence en 30 minutos. Después podrás iniciar sesión. Si no solicitaste esta cuenta, ignora este correo.` }),
        signal: AbortSignal.timeout(10000),
      });
      if (!response.ok) throw new Error('Mail delivery failed');
    } catch {
      throw new ServiceUnavailableException('No se pudo enviar el correo. Tu cuenta sigue pendiente; solicita reenviar el enlace.');
    }
  }

  async verify(token: string, userId: string, email: string): Promise<boolean> {
    try {
      const claims = this.jwt.verify(token, { algorithms: ['HS256'], audience: 'email-verification' });
      return claims.purpose === 'verify-email' && claims.sub === userId && claims.email === email;
    } catch { return false; }
  }
}
