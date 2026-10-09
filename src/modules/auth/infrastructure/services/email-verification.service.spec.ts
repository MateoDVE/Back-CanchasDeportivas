import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { EmailVerificationService } from './email-verification.service';

describe('Entrega de correo de verificación', () => {
  const jwt = new JwtService({ secret: 'email-test-secret' });
  afterEach(() => jest.restoreAllMocks());
  it('envía solo al destinatario y usa un enlace de 30 minutos sin credenciales en query', async () => {
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue({ ok: true } as Response);
    const service = new EmailVerificationService(new ConfigService({ RESEND_API_KEY: 'test-key', MAIL_FROM: 'Reservas <reservas@example.test>', FRONTEND_URL: 'https://courts.example.test' }), jwt);
    await service.send('user-1', 'user@example.test');
    const [endpoint, options] = fetchMock.mock.calls[0];
    expect(endpoint).toBe('https://api.resend.com/emails');
    const payload = JSON.parse(options!.body as string);
    expect(payload.to).toEqual(['user@example.test']);
    const link = new URL(payload.text.match(/https:\/\/\S+/)[0]);
    expect(link.origin).toBe('https://courts.example.test'); expect(link.pathname).toBe('/verify-email'); expect(link.search).toBe('');
    const token = new URLSearchParams(link.hash.slice(1)).get('token')!;
    const claims = jwt.verify(token, { audience: 'email-verification' });
    expect(claims.exp - claims.iat).toBe(1800);
    expect(await service.verify(token, 'user-1', 'user@example.test')).toBe(true);
  });
  it('no simula entregas si no está configurado el proveedor', async () => {
    const fetchMock = jest.spyOn(global, 'fetch');
    await expect(new EmailVerificationService(new ConfigService(), jwt).send('u1', 'a@example.test')).rejects.toThrow('no está configurado');
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it('informa un fallo del proveedor para permitir reintentar', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue({ ok: false } as Response);
    const service = new EmailVerificationService(new ConfigService({ RESEND_API_KEY: 'key', MAIL_FROM: 'from@example.test', FRONTEND_URL: 'https://courts.example.test' }), jwt);
    await expect(service.send('u1', 'a@example.test')).rejects.toThrow('Tu cuenta sigue pendiente');
  });
});
