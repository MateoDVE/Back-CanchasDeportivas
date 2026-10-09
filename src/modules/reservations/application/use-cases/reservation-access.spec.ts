import { JwtService } from '@nestjs/jwt';
import { AuthorizeReservationAccessUseCase } from './authorize-reservation-access.use-case';
import { ReservationRouteTokenService } from './reservation-route-token.service';
import { TimeSlot } from '../../domain/value-objects/time-slot.vo';
import { Reservation } from '../../domain/entities/reservation.entity';

describe('Permisos, enlaces y medias horas', () => {
  const jwt = new JwtService({ secret: 'test-reservations-secret' });
  const tokens = new ReservationRouteTokenService(jwt);
  it('rechaza enlace alterado, vencido o abierto por otra cuenta', () => {
    const token = tokens.create('r1', 'u1');
    expect(tokens.resolve(token, 'u1')).toBe('r1');
    expect(() => tokens.resolve(token, 'u2')).toThrow();
    expect(() => tokens.resolve(token + 'tampered', 'u1')).toThrow();
    const expired = jwt.sign({ sub: 'u1', reservationId: 'r1', purpose: 'reservation-route' }, { expiresIn: -1, audience: 'reservation-route' });
    expect(() => tokens.resolve(expired, 'u1')).toThrow();
  });
  it('impide leer reservas ajenas incluso con UUID válido', async () => {
    const user = { id: 'u2', role: 'CLIENTE', isActive: () => true };
    const access = new AuthorizeReservationAccessUseCase({ findById: async () => ({ clientId: 'u1' }) } as any, { findById: async () => user } as any);
    await expect(access.execute('r1', 'u2')).rejects.toThrow();
    user.id = 'u1'; await expect(access.execute('r1', 'u1')).resolves.toBeUndefined();
    user.id = 'u2'; user.role = 'SECRETARIA'; await expect(access.execute('r1', 'u2')).resolves.toBeUndefined();
  });
  it.each([['08:00', '08:30', 0.5], ['08:30', '10:00', 1.5], ['08:00', '11:00', 3]])('calcula precio proporcional %s–%s', (start, end, duration) => {
    const timeSlot = new TimeSlot(start as string, end as string);
    expect(timeSlot.durationHours).toBe(duration);
    const r = Reservation.createTemporal({ id: 'r1', clientId: 'u1', courtId: 1, reservationDate: '2030-01-01', timeSlot, pricePerHour: 81, createdBy: 'u1' });
    expect(r.totalPrice).toBe(81 * Number(duration));
    expect(r.advanceRequired).toBe(Number((r.totalPrice * 0.25).toFixed(2)));
  });
  it.each([['08:00', '08:15'], ['08:15', '08:45'], ['09:00', '08:30']])('rechaza bloques inválidos %s–%s', (a, b) => expect(() => new TimeSlot(a, b)).toThrow());
});
