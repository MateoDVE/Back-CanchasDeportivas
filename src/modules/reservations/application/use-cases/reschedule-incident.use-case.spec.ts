import { RescheduleReservationUseCase } from './reschedule-reservation.use-case';

import {
  IReservationRepository,
} from '../../domain/repositories/reservation.repository.interface';

import {
  ICourtRepository,
} from '../../../courts/domain/repositories/court.repository.interface';

import {
  EntityNotFoundException,
  CourtSlotOccupiedException,
} from '../../../../common/domain/exceptions/domain.exception';

describe('RescheduleReservationUseCase', () => {
  let useCase: RescheduleReservationUseCase;

  let reservationRepository:
    jest.Mocked<IReservationRepository>;

  let courtRepository:
    jest.Mocked<ICourtRepository>;

  const oldReservation = {
    id: 'OLD-1',
    clientId: 'CLIENT-1',
    courtId: 1,
    reservationDate: '2026-10-20',
    startTime: '10:00',
    endTime: '11:00',
    pricePerHour: 100,
    totalPrice: 100,
    status: 'CONFIRMED',
  } as any;

  const activeCourt = {
    id: 1,
    name: 'Cancha 1',
    isActive: true,
    pricePerHour: 120,
  } as any;

  beforeEach(() => {
    reservationRepository = {
      findById: jest.fn(),
      findConflicting: jest.fn(),
      reschedule: jest.fn(),

      save: jest.fn(),
      update: jest.fn(),
      findByCourtAndDate: jest.fn(),
      findByClient: jest.fn(),
      findPendingValidation: jest.fn(),
      findActiveTemporal: jest.fn(),
      findAll: jest.fn(),
      findByDateRange: jest.fn(),
      search: jest.fn(),
      releaseExpiredReservations: jest.fn(),
    } as unknown as jest.Mocked<IReservationRepository>;

    courtRepository = {
      findById: jest.fn(),
    } as unknown as jest.Mocked<ICourtRepository>;

    useCase = new RescheduleReservationUseCase(
      reservationRepository,
      courtRepository,
    );
  });

  it('debe lanzar error si la reserva no existe', async () => {
    reservationRepository.findById
      .mockResolvedValue(null);

    await expect(
      useCase.execute({
        reservationId: 'NO-EXISTE',
        newDate: '2026-10-25',
        newStartTime: '10:00',
        newEndTime: '11:00',
        handledBy: 'SEC-1',
      }),
    ).rejects.toBeInstanceOf(
      EntityNotFoundException,
    );

    expect(reservationRepository.findById)
      .toHaveBeenCalledWith('NO-EXISTE');

    expect(courtRepository.findById)
      .not.toHaveBeenCalled();
  });

  it('debe usar la cancha original si no se envía newCourtId', async () => {
    reservationRepository.findById
      .mockResolvedValue(oldReservation);

    courtRepository.findById
      .mockResolvedValue(activeCourt);

    reservationRepository.findConflicting
      .mockResolvedValue([]);

    reservationRepository.reschedule
      .mockResolvedValue();

    const result = await useCase.execute({
      reservationId: 'OLD-1',
      newDate: '2026-10-25',
      newStartTime: '11:00',
      newEndTime: '12:00',
      handledBy: 'SEC-1',
    });

    expect(courtRepository.findById)
      .toHaveBeenCalledWith(1);

    expect(result.courtId)
      .toBe(1);
  });

  it('debe usar newCourtId cuando se proporciona', async () => {
    reservationRepository.findById
      .mockResolvedValue(oldReservation);

    courtRepository.findById
      .mockResolvedValue({
        ...activeCourt,
        id: 5,
        pricePerHour: 200,
      });

    reservationRepository.findConflicting
      .mockResolvedValue([]);

    reservationRepository.reschedule
      .mockResolvedValue();

    const result = await useCase.execute({
      reservationId: 'OLD-1',
      newCourtId: 5,
      newDate: '2026-10-25',
      newStartTime: '10:00',
      newEndTime: '11:00',
      handledBy: 'SEC-1',
    });

    expect(courtRepository.findById)
      .toHaveBeenCalledWith(5);

    expect(result.courtId)
      .toBe(5);
  });

  it('debe lanzar error si la cancha no existe', async () => {
    reservationRepository.findById
      .mockResolvedValue(oldReservation);

    courtRepository.findById
      .mockResolvedValue(null);

    await expect(
      useCase.execute({
        reservationId: 'OLD-1',
        newCourtId: 5,
        newDate: '2026-10-25',
        newStartTime: '10:00',
        newEndTime: '11:00',
        handledBy: 'SEC-1',
      }),
    ).rejects.toBeInstanceOf(
      EntityNotFoundException,
    );

    expect(
      reservationRepository.findConflicting,
    ).not.toHaveBeenCalled();
  });

  it('debe lanzar error si la cancha está inactiva', async () => {
    reservationRepository.findById
      .mockResolvedValue(oldReservation);

    courtRepository.findById
      .mockResolvedValue({
        ...activeCourt,
        isActive: false,
      });

    await expect(
      useCase.execute({
        reservationId: 'OLD-1',
        newDate: '2026-10-25',
        newStartTime: '10:00',
        newEndTime: '11:00',
        handledBy: 'SEC-1',
      }),
    ).rejects.toThrow(
      'La cancha 1 no está disponible.',
    );
  });

  it('debe lanzar error si existe conflicto de horario', async () => {
    reservationRepository.findById
      .mockResolvedValue(oldReservation);

    courtRepository.findById
      .mockResolvedValue(activeCourt);

    reservationRepository.findConflicting
      .mockResolvedValue([
        {
          id: 'CONFLICT-1',
        } as any,
      ]);

    await expect(
      useCase.execute({
        reservationId: 'OLD-1',
        newDate: '2026-10-25',
        newStartTime: '10:00',
        newEndTime: '11:00',
        handledBy: 'SEC-1',
      }),
    ).rejects.toBeInstanceOf(
      CourtSlotOccupiedException,
    );

    expect(
      reservationRepository.findConflicting,
    ).toHaveBeenCalledWith(
      1,
      '2026-10-25',
      '10:00',
      '11:00',
      'OLD-1',
    );

    expect(reservationRepository.reschedule)
      .not.toHaveBeenCalled();
  });

  it('debe reprogramar correctamente', async () => {
    reservationRepository.findById
      .mockResolvedValue(oldReservation);

    courtRepository.findById
      .mockResolvedValue(activeCourt);

    reservationRepository.findConflicting
      .mockResolvedValue([]);

    reservationRepository.reschedule
      .mockResolvedValue();

    const result = await useCase.execute({
      reservationId: 'OLD-1',
      newDate: '2026-10-25',
      newStartTime: '14:00',
      newEndTime: '16:00',
      handledBy: 'SEC-1',
      reason: 'Cambio solicitado',
    });

    expect(
      reservationRepository.findConflicting,
    ).toHaveBeenCalledWith(
      1,
      '2026-10-25',
      '14:00',
      '16:00',
      'OLD-1',
    );

    expect(reservationRepository.reschedule)
      .toHaveBeenCalledTimes(1);

    const [
      newReservation,
      handledBy,
      reason,
    ] = reservationRepository.reschedule.mock.calls[0];

    expect(handledBy)
      .toBe('SEC-1');

    expect(reason)
      .toBe('Cambio solicitado');

    expect(newReservation.id)
      .toBeDefined();

    expect(newReservation.id)
      .not.toBe('OLD-1');

    expect(newReservation.clientId)
      .toBe('CLIENT-1');

    expect(newReservation.courtId)
      .toBe(1);

    expect(newReservation.reservationDate)
      .toBe('2026-10-25');

    expect(newReservation.startTime)
      .toBe('14:00');

    expect(newReservation.endTime)
      .toBe('16:00');

    // 2 horas x Bs 120
    expect(newReservation.pricePerHour)
      .toBe(120);

    expect(newReservation.totalPrice)
      .toBe(240);

    // 25% de 240
    expect(newReservation.advanceRequired)
      .toBe(60);

    expect(newReservation.status)
      .toBe('CONFIRMED');

    expect(newReservation.parentReservationId)
      .toBe('OLD-1');

    expect(result)
      .toBe(newReservation);
  });

  it('debe calcular precio usando la tarifa de la nueva cancha', async () => {
    reservationRepository.findById
      .mockResolvedValue(oldReservation);

    courtRepository.findById
      .mockResolvedValue({
        ...activeCourt,
        id: 5,
        pricePerHour: 200,
      });

    reservationRepository.findConflicting
      .mockResolvedValue([]);

    reservationRepository.reschedule
      .mockResolvedValue();

    const result = await useCase.execute({
      reservationId: 'OLD-1',
      newCourtId: 5,
      newDate: '2026-10-26',
      newStartTime: '10:00',
      newEndTime: '11:30',
      handledBy: 'SEC-2',
    });

    // 1.5 horas × 200
    expect(result.totalPrice)
      .toBe(300);

    expect(result.advanceRequired)
      .toBe(75);

    expect(result.pricePerHour)
      .toBe(200);
  });

  it('debe pasar reason como undefined si no se proporciona', async () => {
    reservationRepository.findById
      .mockResolvedValue(oldReservation);

    courtRepository.findById
      .mockResolvedValue(activeCourt);

    reservationRepository.findConflicting
      .mockResolvedValue([]);

    reservationRepository.reschedule
      .mockResolvedValue();

    await useCase.execute({
      reservationId: 'OLD-1',
      newDate: '2026-10-25',
      newStartTime: '10:00',
      newEndTime: '11:00',
      handledBy: 'SEC-1',
    });

    expect(
      reservationRepository.reschedule,
    ).toHaveBeenCalledWith(
      expect.anything(),
      'SEC-1',
      undefined,
    );
  });
});