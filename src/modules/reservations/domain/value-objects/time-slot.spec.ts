import { TimeSlot } from './time-slot.vo';
import {
  ValidationException,
  InvalidReservationDurationException,
} from '../../../../common/domain/exceptions/domain.exception';

describe('Límites y solapamientos de TimeSlot', () => {
  it.each([
    ['9:00', '10:00'],
    ['24:00', '25:00'],
    ['09:60', '10:00'],
    ['09:00', 'fin'],
  ])('rechaza formato %s–%s', (start, end) => {
    expect(() => new TimeSlot(start, end)).toThrow(ValidationException);
  });
  it.each([
    ['10:00', '10:00'],
    ['10:00', '09:00'],
  ])('rechaza intervalo no creciente %s–%s', (start, end) => {
    expect(() => new TimeSlot(start, end)).toThrow(ValidationException);
  });
  it.each([
    ['10:00', '10:15'],
    ['10:00', '10:45'],
  ])('rechaza duración %s–%s', (start, end) => {
    expect(() => new TimeSlot(start, end)).toThrow(
      InvalidReservationDurationException,
    );
  });
  it('rechaza minutos desplazados aunque la duración sea media hora', () => {
    expect(() => new TimeSlot('10:15', '10:45')).toThrow(ValidationException);
  });
  it.each([
    ['09:00', '10:00', false],
    ['11:00', '12:00', false],
    ['10:00', '11:00', true],
    ['10:30', '11:30', true],
    ['09:30', '10:30', true],
  ])('evalúa solapamiento con %s–%s', (start, end, expected) => {
    const slot = new TimeSlot('10:00', '11:00');
    expect(slot.overlapsWith(start, end)).toBe(expected);
    expect(slot.durationHours).toBe(1);
  });
});
