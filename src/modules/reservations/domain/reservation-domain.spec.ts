import { TimeSlot } from './value-objects/time-slot.vo';
import { Reservation } from './entities/reservation.entity';
import {
  InvalidReservationDurationException,
  ValidationException,
} from '../../../common/domain/exceptions/domain.exception';

describe('Reservation Domain & Business Rules (RN-01 to RN-05)', () => {
  describe('TimeSlot VO (RN-01 & RN-02 & HU-CLI-10)', () => {
    it('debe permitir reservas de exactamente 1 hora', () => {
      const slot = new TimeSlot('08:00', '09:00');
      expect(slot.durationHours).toBe(1);
    });

    it('debe permitir reservas de 2 horas consecutivas', () => {
      const slot = new TimeSlot('18:00', '20:00');
      expect(slot.durationHours).toBe(2);
    });

    it('debe permitir inicio en minuto :30 si la duración es una hora entera (RN-02)', () => {
      const slot = new TimeSlot('08:30', '09:30');
      expect(slot.durationHours).toBe(1);
    });

    it('debe rechazar duraciones menores a 1 hora (ej. 30 minutos - RN-01)', () => {
      expect(() => new TimeSlot('08:00', '08:30')).toThrow(
        InvalidReservationDurationException,
      );
    });

    it('debe rechazar duraciones fraccionadas (ej. 1 hora y media - RN-01)', () => {
      expect(() => new TimeSlot('08:00', '09:30')).toThrow(
        InvalidReservationDurationException,
      );
    });

    it('debe rechazar inicios en minutos no permitidos (ej. :15 - RN-02)', () => {
      expect(() => new TimeSlot('14:15', '15:15')).toThrow(ValidationException);
    });
  });

  describe('Reservation Entity (RN-03, RN-04, RN-05 & HU-CLI-11..14)', () => {
    const timeSlot = new TimeSlot('18:00', '20:00'); // 2 horas
    const pricePerHour = 100.0;

    it('debe calcular exactamente el 25% de anticipo y 75% de saldo pendiente (RN-04 & HU-CLI-14)', () => {
      const reservation = Reservation.createTemporal({
        id: 'res-test-1',
        clientId: 'client-1',
        courtId: 1,
        reservationDate: '2026-09-10',
        timeSlot,
        pricePerHour,
        createdBy: 'client-1',
      });

      // Total = 2 horas * 100 = 200
      expect(reservation.totalPrice).toBe(200.0);
      // Anticipo = 200 * 0.25 = 50
      expect(reservation.advanceRequired).toBe(50.0);
      // Saldo pendiente = 200 - 50 = 150
      expect(reservation.pendingBalance).toBe(150.0);
    });

    it('debe establecer el bloqueo temporal de 5 minutos exactos (RN-03 & HU-CLI-12)', () => {
      const before = Date.now() + 5 * 60 * 1000 - 1000;
      const reservation = Reservation.createTemporal({
        id: 'res-test-2',
        clientId: 'client-1',
        courtId: 1,
        reservationDate: '2026-09-10',
        timeSlot,
        pricePerHour,
        createdBy: 'client-1',
      });
      const after = Date.now() + 5 * 60 * 1000 + 1000;

      expect(reservation.status).toBe('TEMPORAL');
      expect(reservation.expiresAt).not.toBeNull();
      expect(reservation.expiresAt!.getTime()).toBeGreaterThanOrEqual(before);
      expect(reservation.expiresAt!.getTime()).toBeLessThanOrEqual(after);
      expect(reservation.secondsRemaining()).toBeGreaterThan(290);
    });

    it('debe congelar el precio por hora histórico (RN-05)', () => {
      const reservation = Reservation.createTemporal({
        id: 'res-test-3',
        clientId: 'client-1',
        courtId: 1,
        reservationDate: '2026-09-10',
        timeSlot,
        pricePerHour: 100.0,
        createdBy: 'client-1',
      });

      expect(reservation.pricePerHour).toBe(100.0);
      // Si la cancha sube a 150, la reserva sigue congelada en 100
      expect(reservation.totalPrice).toBe(200.0);
    });

    it('debe permitir transicionar a PENDING_VALIDATION y luego a CONFIRMED (HU-CLI-16 & HU-SEC-09)', () => {
      const reservation = Reservation.createTemporal({
        id: 'res-test-4',
        clientId: 'client-1',
        courtId: 1,
        reservationDate: '2026-09-10',
        timeSlot,
        pricePerHour,
        createdBy: 'client-1',
      });

      reservation.markAsPendingValidation();
      expect(reservation.status).toBe('PENDING_VALIDATION');

      reservation.confirm();
      expect(reservation.status).toBe('CONFIRMED');
    });
  });
});
