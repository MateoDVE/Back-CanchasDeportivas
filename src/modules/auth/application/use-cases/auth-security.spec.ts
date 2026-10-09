import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { EmailVerificationService } from '../../infrastructure/services/email-verification.service';
import { VerifyEmailUseCase } from './verify-email.use-case';
import { LoginUseCase } from './login.use-case';
import { JwtStrategy } from '../../infrastructure/strategies/jwt.strategy';
import { BcryptPasswordHasher } from '../../infrastructure/services/bcrypt-password-hasher.service';
import { User } from '../../../users/domain/entities/user.entity';

describe('Seguridad de acceso y verificación de correo', () => {
  const jwt = new JwtService({ secret: 'test-only-secret-do-not-use-in-production' });
  const config = new ConfigService({ JWT_SECRET: 'test-only-secret-do-not-use-in-production' });
  const verification = new EmailVerificationService(config, jwt);
  let user: User;
  let users: any;
  beforeEach(() => {
    user = new User('u1', 'Juan Pérez', 'juan@example.test', '70000000', '123', 'hash', 'CLIENTE', 'PENDING_VERIFICATION');
    users = { findByEmail: jest.fn(async () => user), findById: jest.fn(async () => user), update: jest.fn() };
  });
  const token = (overrides = {}, expiresIn: any = '30m') => jwt.sign({ sub: 'u1', email: 'juan@example.test', purpose: 'verify-email', ...overrides }, { expiresIn, audience: 'email-verification' });
  it.each([
    () => 'arbitrary-token', () => token({ email: 'another@example.test' }),
    () => token({ sub: 'other' }), () => token({ purpose: 'access' }), () => token({}, -1),
  ])('rechaza enlaces falsificados, vencidos, ajenos o de otro propósito', async makeToken => {
    await expect(new VerifyEmailUseCase(users, verification).execute({ email: user.email, token: makeToken() })).rejects.toThrow();
    expect(users.update).not.toHaveBeenCalled();
    expect(user.status).toBe('PENDING_VERIFICATION');
  });
  it('activa una cuenta pendiente con enlace válido; repetir no modifica la cuenta', async () => {
    const uc = new VerifyEmailUseCase(users, verification);
    const input = { email: user.email, token: token() };
    await uc.execute(input); await uc.execute(input);
    expect(user.status).toBe('ACTIVE'); expect(users.update).toHaveBeenCalledTimes(1);
  });
  it('un enlace no reactiva una cuenta deshabilitada', async () => {
    user.deactivate();
    await expect(new VerifyEmailUseCase(users, verification).execute({ email: user.email, token: token() })).rejects.toThrow();
  });
  it('no inicia sesión hasta verificar el correo', async () => {
    const login = new LoginUseCase(users, { compare: async () => true } as any, jwt);
    await expect(login.execute({ email: user.email, password: 'password123' })).rejects.toThrow('Verifica tu correo');
    user.activate();
    const session = await login.execute({ email: user.email, password: 'password123' });
    expect(jwt.verify(session.accessToken).purpose).toBe('access');
  });
  it('no acepta enlaces de correo como sesión ni usuarios desactivados con JWT vigente', async () => {
    const strategy = new JwtStrategy(config, users);
    await expect(strategy.validate(jwt.decode(token()) as any)).rejects.toThrow();
    await expect(strategy.validate({ sub: 'u1', id: 'u1', purpose: 'access' } as any)).rejects.toThrow();
    user.activate();
    expect((await strategy.validate({ sub: 'u1', id: 'u1', purpose: 'access', role: 'ADMIN' } as any)).role).toBe('CLIENTE');
  });
  it('bcrypt genera hashes con sal y verifica contraseñas sin guardarlas en claro', async () => {
    const hasher = new BcryptPasswordHasher();
    const one = await hasher.hash('Contraseña segura 123');
    const two = await hasher.hash('Contraseña segura 123');
    expect(one).not.toBe(two); expect(one).toMatch(/^\$2[aby]\$/);
    expect(await hasher.compare('Contraseña segura 123', one)).toBe(true);
    expect(await hasher.compare('incorrecta', one)).toBe(false);
    await expect(hasher.hash('á'.repeat(37))).rejects.toThrow();
  });
});
