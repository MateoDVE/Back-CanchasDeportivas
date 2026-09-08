import { GetCourtAvailabilityUseCase } from './get-court-availability.use-case';
import { CourtIncident } from '../../../courts/domain/entities/court-incident.entity';
import { RegisterIncidentUseCase } from '../../../courts/application/use-cases/register-incident.use-case';

describe('Temporary court blocks', () => {
  const court = { id: 8, name: 'Pádel', isActive: true };
  const reservations = { findByCourtAndDate: async () => [] } as any;
  const courts = { findById: async () => court } as any;
  const schedules = { findByCourtAndDate: async () => null,
    findByCourtAndDay: async () => ({ openTime: '08:00', closeTime: '23:00' }) } as any;

  it('blocks only 14:00–15:00 and leaves the evening and boundaries available', async () => {
    const incident = new CourtIncident(1, 8, new Date('2026-09-08T14:00:00-04:00'), new Date('2026-09-08T15:00:00-04:00'), 'Mantenimiento');
    const useCase = new GetCourtAvailabilityUseCase({ findByCourt: async () => [incident] } as any, reservations, courts, schedules);
    const result = await useCase.execute(8, '2026-09-08');
    expect(result.slots.filter(slot => !slot.isAvailable).map(slot => slot.startTime)).toEqual(['14:00']);
    expect(result.slots.find(slot => slot.startTime === '15:00')?.isAvailable).toBe(true);
    expect(result.slots.find(slot => slot.startTime === '20:00')?.isAvailable).toBe(true);
    expect(result.isOpen).toBe(true);
  });

  it('handles a block crossing midnight in Bolivia without blocking the next evening', async () => {
    const incident = new CourtIncident(1, 8, new Date('2026-09-07T23:30:00-04:00'), new Date('2026-09-08T08:30:00-04:00'), 'Mantenimiento');
    const useCase = new GetCourtAvailabilityUseCase({ findByCourt: async () => [incident] } as any, reservations, courts, schedules);
    const result = await useCase.execute(8, '2026-09-08');
    expect(result.slots.filter(slot => !slot.isAvailable).map(slot => slot.startTime)).toEqual(['08:00']);
    expect(result.slots.find(slot => slot.startTime === '20:00')?.isAvailable).toBe(true);
  });

  it('stores a one-hour immediate incident without disabling the court', async () => {
    const repository = { save: jest.fn(async data => ({ ...data, id: 1 })) } as any;
    const result = await new RegisterIncidentUseCase(repository, courts).execute({ courtId: 8, reason: 'Reparación', durationHours: 1 });
    expect(result.endDatetime.getTime() - result.startDatetime.getTime()).toBe(3600000);
    expect(court.isActive).toBe(true);
  });
});
