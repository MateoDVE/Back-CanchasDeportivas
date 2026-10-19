import { CreateTemporalReservationUseCase } from './create-temporal-reservation.use-case';

import {
  IReservationRepository,
} from '../../domain/repositories/reservation.repository.interface';

import {
  ICourtRepository,
} from '../../../courts/domain/repositories/court.repository.interface';

import {
  IScheduleRepository,
} from '../../../schedules/domain/repositories/schedule.repository.interface';

import {
  ICourtIncidentRepository,
} from '../../../courts/domain/repositories/court-incident.repository.interface';

import {
  EntityNotFoundException,
  CourtSlotOccupiedException,
  ValidationException,
} from '../../../../common/domain/exceptions/domain.exception';

describe('CreateTemporalReservationUseCase', () => {
  let useCase: CreateTemporalReservationUseCase;

  let reservationRepository:
    jest.Mocked<IReservationRepository>;

  let courtRepository:
    jest.Mocked<ICourtRepository>;

  let scheduleRepository:
    jest.Mocked<IScheduleRepository>;

  let incidentRepository:
    jest.Mocked<ICourtIncidentRepository>;

  const activeCourt = {
    id: 1,
    name: 'Cancha 1',
    isActive: true,
    pricePerHour: 100,
  } as any;

  const weeklySchedule = {
    courtId: 1,
    dayOfWeek: 1,
    openTime: '08:00:00',
    closeTime: '22:00:00',
  } as any;

  const input = {
    clientId: 'CLIENT-1',
    courtId: 1,
    date: '2026-10-19',
    startTime: '10:00',
    endTime: '11:00',
  };

  beforeEach(() => {
    reservationRepository = {
      findById: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
      findConflicting: jest.fn(),
      findByCourtAndDate: jest.fn(),
      findByClient: jest.fn(),
      findPendingValidation: jest.fn(),
      findActiveTemporal: jest.fn(),
      findAll: jest.fn(),
      findByDateRange: jest.fn(),
      search: jest.fn(),
      releaseExpiredReservations: jest.fn(),
      reschedule: jest.fn(),
    } as unknown as jest.Mocked<IReservationRepository>;

    courtRepository = {
      findById: jest.fn(),
    } as unknown as jest.Mocked<ICourtRepository>;

    scheduleRepository = {
      findByCourtAndDate: jest.fn(),
      findByCourtAndDay: jest.fn(),
    } as unknown as jest.Mocked<IScheduleRepository>;

    incidentRepository = {
      findByCourt: jest.fn(),
    } as unknown as jest.Mocked<ICourtIncidentRepository>;

    courtRepository.findById.mockResolvedValue(activeCourt);

    incidentRepository.findByCourt.mockResolvedValue([]);

    scheduleRepository.findByCourtAndDate.mockResolvedValue(
      weeklySchedule,
    );

    scheduleRepository.findByCourtAndDay.mockResolvedValue(
      weeklySchedule,
    );

    reservationRepository.findConflicting.mockResolvedValue([]);

    reservationRepository.save.mockResolvedValue();

    useCase = new CreateTemporalReservationUseCase(
      incidentRepository,
      reservationRepository,
      courtRepository,
      scheduleRepository,
    );
  });

  it('debe lanzar error si la cancha no existe', async () => {
    courtRepository.findById.mockResolvedValue(null);

    await expect(
      useCase.execute(input),
    ).rejects.toBeInstanceOf(
      EntityNotFoundException,
    );

    expect(courtRepository.findById)
      .toHaveBeenCalledWith(1);

    expect(incidentRepository.findByCourt)
      .not.toHaveBeenCalled();
  });

  it('debe lanzar error si la cancha está inactiva', async () => {
    courtRepository.findById.mockResolvedValue({
      ...activeCourt,
      isActive: false,
    });

    await expect(
      useCase.execute(input),
    ).rejects.toThrow(
      'La cancha 1 no está disponible.',
    );
  });

  it('debe lanzar error si el horario coincide con un incidente', async () => {
    incidentRepository.findByCourt.mockResolvedValue([
      {
        id: 'INC-1',
        courtId: 1,
        startDatetime:
          new Date('2026-10-19T09:00:00'),
        endDatetime:
          new Date('2026-10-19T12:00:00'),
      } as any,
    ]);

    await expect(
      useCase.execute(input),
    ).rejects.toBeInstanceOf(
      CourtSlotOccupiedException,
    );

    expect(
      reservationRepository.findConflicting,
    ).not.toHaveBeenCalled();
  });

  it('debe usar horario específico de fecha si existe', async () => {
    scheduleRepository.findByCourtAndDate.mockResolvedValue({
      ...weeklySchedule,
      openTime: '09:00:00',
      closeTime: '20:00:00',
    });

    const result = await useCase.execute(input);

    expect(
      scheduleRepository.findByCourtAndDate,
    ).toHaveBeenCalledWith(
      1,
      '2026-10-19',
    );

    expect(
      scheduleRepository.findByCourtAndDay,
    ).not.toHaveBeenCalled();

    expect(result.reservationId)
      .toBeDefined();
  });

  it('debe buscar horario semanal si no existe horario específico', async () => {
    scheduleRepository.findByCourtAndDate.mockResolvedValue(
      null,
    );

    scheduleRepository.findByCourtAndDay.mockResolvedValue(
      weeklySchedule,
    );

    await useCase.execute(input);

    expect(
      scheduleRepository.findByCourtAndDay,
    ).toHaveBeenCalled();
  });

  it('debe buscar domingo como día 7', async () => {
    const sundayInput = {
      ...input,
      date: '2026-10-18',
    };

    scheduleRepository.findByCourtAndDate.mockResolvedValue(
      null,
    );

    scheduleRepository.findByCourtAndDay.mockResolvedValue(
      weeklySchedule,
    );

    await useCase.execute(sundayInput);

    expect(
      scheduleRepository.findByCourtAndDay,
    ).toHaveBeenCalledWith(
      1,
      7,
    );
  });

  it('debe usar fallback domingo día 0 si no encuentra día 7', async () => {
    const sundayInput = {
      ...input,
      date: '2026-10-18',
    };

    scheduleRepository.findByCourtAndDate.mockResolvedValue(
      null,
    );

    scheduleRepository.findByCourtAndDay
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(weeklySchedule);

    await useCase.execute(sundayInput);

    expect(
      scheduleRepository.findByCourtAndDay,
    ).toHaveBeenNthCalledWith(
      1,
      1,
      7,
    );

    expect(
      scheduleRepository.findByCourtAndDay,
    ).toHaveBeenNthCalledWith(
      2,
      1,
      0,
    );
  });

  it('debe lanzar error si la cancha no atiende ese día', async () => {
    scheduleRepository.findByCourtAndDate.mockResolvedValue(
      null,
    );

    scheduleRepository.findByCourtAndDay.mockResolvedValue(
      null,
    );

    await expect(
      useCase.execute(input),
    ).rejects.toBeInstanceOf(
      ValidationException,
    );

    expect(
      reservationRepository.findConflicting,
    ).not.toHaveBeenCalled();
  });

  it('debe lanzar error si el horario inicia antes de apertura', async () => {
    scheduleRepository.findByCourtAndDate.mockResolvedValue({
      ...weeklySchedule,
      openTime: '11:00:00',
      closeTime: '22:00:00',
    });

    await expect(
      useCase.execute({
        ...input,
        startTime: '10:00',
        endTime: '11:00',
      }),
    ).rejects.toBeInstanceOf(
      ValidationException,
    );
  });

  it('debe lanzar error si el horario termina después del cierre', async () => {
    scheduleRepository.findByCourtAndDate.mockResolvedValue({
      ...weeklySchedule,
      openTime: '08:00:00',
      closeTime: '10:30:00',
    });

    await expect(
      useCase.execute({
        ...input,
        startTime: '10:00',
        endTime: '11:00',
      }),
    ).rejects.toBeInstanceOf(
      ValidationException,
    );
  });

  it('debe lanzar error si existe conflicto con otra reserva', async () => {
    reservationRepository.findConflicting.mockResolvedValue([
      {
        id: 'OTHER-RES',
      } as any,
    ]);

    await expect(
      useCase.execute(input),
    ).rejects.toBeInstanceOf(
      CourtSlotOccupiedException,
    );

    expect(
      reservationRepository.findConflicting,
    ).toHaveBeenCalledWith(
      1,
      '2026-10-19',
      '10:00',
      '11:00',
    );

    expect(reservationRepository.save)
      .not.toHaveBeenCalled();
  });

  it('debe crear correctamente una reserva temporal', async () => {
    const result = await useCase.execute(input);

    expect(courtRepository.findById)
      .toHaveBeenCalledWith(1);

    expect(incidentRepository.findByCourt)
      .toHaveBeenCalledWith(1);

    expect(
      reservationRepository.findConflicting,
    ).toHaveBeenCalledWith(
      1,
      '2026-10-19',
      '10:00',
      '11:00',
    );

    expect(reservationRepository.save)
      .toHaveBeenCalledTimes(1);

    const savedReservation =
      reservationRepository.save.mock.calls[0][0];

    expect(savedReservation.id)
      .toBeDefined();

    expect(savedReservation.clientId)
      .toBe('CLIENT-1');

    expect(savedReservation.courtId)
      .toBe(1);

    expect(savedReservation.reservationDate)
      .toBe('2026-10-19');

    expect(savedReservation.startTime)
      .toBe('10:00');

    expect(savedReservation.endTime)
      .toBe('11:00');

    expect(savedReservation.pricePerHour)
      .toBe(100);

    expect(savedReservation.totalPrice)
      .toBe(100);

    expect(savedReservation.advanceRequired)
      .toBe(25);

    expect(savedReservation.pendingBalance)
      .toBe(75);

    expect(savedReservation.status)
      .toBe('TEMPORAL');

    expect(result.reservationId)
      .toBe(savedReservation.id);

    expect(result.clientId)
      .toBe('CLIENT-1');

    expect(result.courtId)
      .toBe(1);

    expect(result.reservationDate)
      .toBe('2026-10-19');

    expect(result.startTime)
      .toBe('10:00');

    expect(result.endTime)
      .toBe('11:00');

    expect(result.durationHours)
      .toBe(1);

    expect(result.pricePerHour)
      .toBe(100);

    expect(result.totalPrice)
      .toBe(100);

    expect(result.advanceRequired)
      .toBe(25);

    expect(result.pendingBalance)
      .toBe(75);

    expect(result.status)
      .toBe('TEMPORAL');

    expect(result.expiresAt)
      .toBeDefined();

    expect(result.secondsRemaining)
      .toBeGreaterThanOrEqual(0);
  });

  it('debe calcular correctamente una reserva de dos horas', async () => {
    const result = await useCase.execute({
      ...input,
      startTime: '10:00',
      endTime: '12:00',
    });

    expect(result.durationHours)
      .toBe(2);

    expect(result.totalPrice)
      .toBe(200);

    expect(result.advanceRequired)
      .toBe(50);

    expect(result.pendingBalance)
      .toBe(150);
  });

  it('debe congelar el precio actual de la cancha en la reserva', async () => {
    courtRepository.findById.mockResolvedValue({
      ...activeCourt,
      pricePerHour: 150,
    });

    const result = await useCase.execute(input);

    expect(result.pricePerHour)
      .toBe(150);

    expect(result.totalPrice)
      .toBe(150);

    expect(result.advanceRequired)
      .toBe(37.5);

    expect(result.pendingBalance)
      .toBe(112.5);
  });
});