import { Test } from '@nestjs/testing';
import { ValidationPipe, INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';
import { AppModule } from '../../app.module';
import { SUPABASE_CLIENT } from '../../common/supabase/supabase.provider';
import { GlobalDomainExceptionFilter } from '../../common/filters/domain-exception.filter';
import { EMAIL_VERIFICATION } from './domain/services/email-verification.interface';
import { EmailVerificationService } from './infrastructure/services/email-verification.service';
import { USER_REPOSITORY, IUserRepository } from '../users/domain/repositories/user.repository.interface';
import { RESERVATION_REPOSITORY, IReservationRepository } from '../reservations/domain/repositories/reservation.repository.interface';
import { Reservation } from '../reservations/domain/entities/reservation.entity';
import { TimeSlot } from '../reservations/domain/value-objects/time-slot.vo';
import { COURT_REPOSITORY, ICourtRepository } from '../courts/domain/repositories/court.repository.interface';
import { COMPLEX_REPOSITORY, IComplexRepository } from '../complexes/domain/repositories/complex.repository.interface';
import { Court } from '../courts/domain/entities/court.entity';
import { Complex } from '../complexes/domain/entities/complex.entity';

describe('Registro y acceso HTTP (repositorios locales)', () => {
  let app: INestApplication;
  const jwt = new JwtService({ secret: 'http-test-secret-only' });
  const email = new EmailVerificationService(new ConfigService(), jwt);
  const delivered: Array<{ id: string; email: string }> = [];
  beforeAll(async () => {
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(SUPABASE_CLIENT).useValue(null)
      .overrideProvider(ConfigService).useValue(new ConfigService({ JWT_SECRET: 'http-test-secret-only' }))
      .overrideProvider(EMAIL_VERIFICATION).useValue({ send: async (id: string, address: string) => { delivered.push({ id, email: address }); }, verify: email.verify.bind(email) })
      .compile();
    app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }));
    app.useGlobalFilters(new GlobalDomainExceptionFilter());
    await app.init();
    await app.get<IComplexRepository>(COMPLEX_REPOSITORY).save(new Complex(0, 'Complejo de prueba', 'La Paz', '70000000'));
    await app.get<ICourtRepository>(COURT_REPOSITORY).save(new Court(0, 1, 'Cancha de prueba', 'Futsal', 80));
  });
  afterAll(async () => { await app?.close(); });

  it('registra nombres separados, exige correo y protege todos los detalles de reserva', async () => {
    const http = app.getHttpServer();
    const registration = await request(http).post('/api/v1/auth/register').send({ firstName: 'María José', lastName: 'Pérez López', email: 'maria@example.test', phone: '70000000', password: 'SafePassword123' }).expect(201);
    expect(registration.body.status).toBe('PENDING_VERIFICATION');
    expect(registration.body.passwordHash).toBeUndefined();
    expect(registration.body).not.toHaveProperty('ci');
    const users = app.get<IUserRepository>(USER_REPOSITORY);
    const saved = (await users.findById(registration.body.id))!;
    expect(saved.ci).toBe('');
    expect(saved.firstName).toBe('María José'); expect(saved.lastName).toBe('Pérez López');
    expect(saved.passwordHash).toMatch(/^\$2/); expect(delivered[0].id).toBe(saved.id);
    const credentials = { email: saved.email, password: 'SafePassword123' };
    await request(http).post('/api/v1/auth/login').send(credentials).expect(403);
    await request(http).post('/api/v1/auth/verify-email').send({ email: saved.email, token: 'bogus' }).expect(400);
    const verificationToken = jwt.sign({ sub: saved.id, email: saved.email, purpose: 'verify-email' }, { expiresIn: '30m', audience: 'email-verification' });
    await request(http).post('/api/v1/auth/verify-email').send({ email: saved.email, token: verificationToken }).expect(200);
    const login = await request(http).post('/api/v1/auth/login').send(credentials).expect(200);
    const authorization = 'Bearer ' + login.body.accessToken;
    await request(http).get('/api/v1/auth/me').set('Authorization', 'Bearer ' + verificationToken).expect(401);
    await request(http).get('/api/v1/auth/me').set('Authorization', authorization).expect(200);
    const repo = app.get<IReservationRepository>(RESERVATION_REPOSITORY);
    const reservation = Reservation.createTemporal({ id: 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa', clientId: saved.id, courtId: 1, reservationDate: '2030-01-01', timeSlot: new TimeSlot('10:00', '10:30'), pricePerHour: 80, createdBy: saved.id });
    await repo.save(reservation);
    const other = await request(http).post('/api/v1/auth/login').send({ email: 'cliente@canchas.com', password: 'Cliente123!' }).expect(200);
    for (const endpoint of [`reservations/${reservation.id}/summary`, `reservations/${reservation.id}/status`, `reservations/${reservation.id}`, `reservations/${reservation.id}/balance`, `reservations/${reservation.id}/reschedule-info`, `payments/${reservation.id}/status`, `reservations/${reservation.id}/route-token`]) {
      await request(http).get('/api/v1/' + endpoint).expect(401);
      await request(http).get('/api/v1/' + endpoint).set('Authorization', 'Bearer ' + other.body.accessToken).expect(404);
    }
    const link = await request(http).get(`/api/v1/reservations/${reservation.id}/route-token`).set('Authorization', authorization).expect(200);
    await request(http).post('/api/v1/reservations/resolve-route').set('Authorization', 'Bearer ' + other.body.accessToken).send(link.body).expect(401);
    const resolved = await request(http).post('/api/v1/reservations/resolve-route').set('Authorization', authorization).send(link.body).expect(200);
    expect(resolved.body.totalPrice).toBe(40);
    saved.deactivate(); await users.update(saved);
    await request(http).get('/api/v1/auth/me').set('Authorization', authorization).expect(401);
  });
});
