import { GetCourtSchedulesUseCase } from './get-court-schedules.use-case';
import { SetWeeklyScheduleUseCase } from './set-weekly-schedule.use-case';
import { SetSpecificDateScheduleUseCase } from './set-specific-date-schedule.use-case';
import { InMemoryScheduleRepository } from '../../infrastructure/repositories/in-memory-schedule.repository';
import { InMemoryCourtRepository } from '../../../courts/infrastructure/repositories/in-memory-court.repository';
import { Court } from '../../../courts/domain/entities/court.entity';
import { CourtSchedule } from '../../domain/entities/court-schedule.entity';
import {
  EntityNotFoundException,
  ValidationException,
} from '../../../../common/domain/exceptions/domain.exception';

describe('Configuración de horarios de atención', () => {
  let repository: InMemoryScheduleRepository;
  let courts: InMemoryCourtRepository;
  let weekly: SetWeeklyScheduleUseCase;
  let special: SetSpecificDateScheduleUseCase;
  let query: GetCourtSchedulesUseCase;
  const monday = { dayOfWeek: 1, openTime: '08:00', closeTime: '22:00' };

  beforeEach(async () => {
    repository = new InMemoryScheduleRepository();
    courts = new InMemoryCourtRepository();
    await courts.save(new Court(1, 1, 'Norte', 'Futsal', 100));
    await courts.save(new Court(2, 1, 'Sur', 'Futsal', 100));
    weekly = new SetWeeklyScheduleUseCase(repository, courts);
    special = new SetSpecificDateScheduleUseCase(repository, courts);
    query = new GetCourtSchedulesUseCase(repository, courts);
  });

  it('guarda y consulta los extremos de la semana sin incluir horarios especiales', async () => {
    const input = [
      monday,
      { dayOfWeek: 7, openTime: '10:00', closeTime: '18:00' },
    ];
    const saved = await weekly.execute({ courtId: 1, schedules: input });
    await special.execute({
      courtId: 1,
      specificDate: '2026-10-14',
      openTime: '09:00',
      closeTime: '12:00',
    });
    expect(saved).toEqual(
      input.map((item, index) => ({
        id: index + 1,
        courtId: 1,
        specificDate: null,
        ...item,
      })),
    );
    expect(await query.execute(1)).toEqual(saved);
    expect(await repository.findByCourtAndDay(1, 1)).toMatchObject(monday);
    expect(await repository.findByCourtAndDay(1, 2)).toBeNull();
    expect(await query.execute(2)).toEqual([]);
  });

  it('reemplaza o vacía la semana preservando otras canchas y excepciones por fecha', async () => {
    await weekly.execute({ courtId: 1, schedules: [monday] });
    const other = await weekly.execute({ courtId: 2, schedules: [monday] });
    const exception = await special.execute({
      courtId: 1,
      specificDate: '2026-10-14',
      openTime: '09:00',
      closeTime: '12:00',
    });
    await weekly.execute({
      courtId: 1,
      schedules: [{ ...monday, openTime: '11:00' }],
    });
    expect(await repository.findByCourtAndDay(1, 1)).toMatchObject({
      openTime: '11:00',
    });
    expect(await weekly.execute({ courtId: 1, schedules: [] })).toEqual([]);
    expect(await query.execute(1)).toEqual([]);
    expect(await query.execute(2)).toEqual(other);
    expect(await repository.findByCourtAndDate(1, '2026-10-14')).toEqual(
      expect.objectContaining(exception),
    );
  });

  it('actualiza solo la excepción de la cancha y fecha solicitadas', async () => {
    await weekly.execute({ courtId: 1, schedules: [monday] });
    for (const [courtId, specificDate] of [
      [1, '2026-10-14'],
      [1, '2026-10-15'],
      [2, '2026-10-14'],
    ] as const) {
      await special.execute({
        courtId,
        specificDate,
        openTime: '09:00',
        closeTime: '12:00',
      });
    }
    const updated = await special.execute({
      courtId: 1,
      specificDate: '2026-10-14',
      openTime: '11:00',
      closeTime: '13:00',
    });
    expect(updated).toMatchObject({
      courtId: 1,
      dayOfWeek: null,
      specificDate: '2026-10-14',
      openTime: '11:00',
      closeTime: '13:00',
    });
    expect(await repository.findByCourtAndDate(1, '2026-10-14')).toMatchObject(
      updated,
    );
    expect(await repository.findByCourtAndDate(1, '2026-10-15')).toMatchObject({
      openTime: '09:00',
    });
    expect(await repository.findByCourtAndDate(2, '2026-10-14')).toMatchObject({
      openTime: '09:00',
    });
    expect(await repository.findByCourtAndDate(1, '2026-10-16')).toBeNull();
    expect(await repository.findByCourtAndDay(1, 1)).toMatchObject(monday);
  });

  it('rechaza canchas inexistentes en consulta y escritura', async () => {
    await expect(query.execute(99)).rejects.toThrow(EntityNotFoundException);
    await expect(
      weekly.execute({ courtId: 99, schedules: [monday] }),
    ).rejects.toThrow(EntityNotFoundException);
    await expect(
      special.execute({
        courtId: 99,
        specificDate: '2026-10-14',
        openTime: '09:00',
        closeTime: '12:00',
      }),
    ).rejects.toThrow(EntityNotFoundException);
  });

  it.each([0, 8])(
    'rechaza día semanal %s sin borrar la configuración existente',
    async (dayOfWeek) => {
      const saved = await weekly.execute({ courtId: 1, schedules: [monday] });
      await expect(
        weekly.execute({
          courtId: 1,
          schedules: [monday, { ...monday, dayOfWeek }],
        }),
      ).rejects.toThrow(ValidationException);
      expect(await query.execute(1)).toEqual(saved);
      expect(
        () => new CourtSchedule(0, 1, dayOfWeek, null, '08:00', '22:00'),
      ).toThrow(ValidationException);
    },
  );

  it('rechaza listas de horarios ausentes', async () => {
    await expect(
      weekly.execute({ courtId: 1, schedules: null as never }),
    ).rejects.toThrow(ValidationException);
    expect(await query.execute(1)).toEqual([]);
  });

  it.each(['08:00', '07:00'])(
    'rechaza cierre %s anterior o igual a apertura',
    async (closeTime) => {
      await expect(
        weekly.execute({ courtId: 1, schedules: [{ ...monday, closeTime }] }),
      ).rejects.toThrow(ValidationException);
      await expect(
        special.execute({
          courtId: 1,
          specificDate: '2026-10-14',
          openTime: '08:00',
          closeTime,
        }),
      ).rejects.toThrow(ValidationException);
      expect(
        () => new CourtSchedule(0, 1, null, '2026-10-14', '08:00', closeTime),
      ).toThrow(ValidationException);
    },
  );

  it.each(['14/10/2026', '', '2026-1-1'])(
    'rechaza formato de fecha %p',
    async (specificDate) => {
      await expect(
        special.execute({
          courtId: 1,
          specificDate,
          openTime: '08:00',
          closeTime: '22:00',
        }),
      ).rejects.toThrow(ValidationException);
      expect(await repository.findByCourtAndDate(1, specificDate)).toBeNull();
    },
  );
});
