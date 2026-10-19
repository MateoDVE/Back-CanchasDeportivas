import { MarkNoShowAndReleaseUseCase } from './mark-no-show-and-release.use-case';
import {
  IReservationRepository,
} from '../../domain/repositories/reservation.repository.interface';
import { Reservation } from '../../domain/entities/reservation.entity';
import { EntityNotFoundException } from '../../../../common/domain/exceptions/domain.exception';

describe('MarkNoShowAndReleaseUseCase', () => {
  let useCase: MarkNoShowAndReleaseUseCase;
  let repository: jest.Mocked<IReservationRepository>;

  beforeEach(() => {
    repository = {
      findById: jest.fn(),
      update: jest.fn(),

      // Métodos adicionales de la interfaz.
      // No se utilizan directamente en este use case,
      // por eso se dejan como mocks.
      save: jest.fn(),
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

    useCase = new MarkNoShowAndReleaseUseCase(
      repository,
    );
  });

  it('debe marcar la reserva como NO_SHOW y actualizarla con motivo personalizado', async () => {
    const reservation = {
      id: 'RES-001',
      markNoShow: jest.fn(),
    } as unknown as Reservation;

    repository.findById.mockResolvedValue(
      reservation,
    );

    repository.update.mockResolvedValue();

    const result = await useCase.execute({
      reservationId: 'RES-001',
      secretaryId: 'SEC-001',
      reason: 'Cliente no se presentó',
    });

    expect(repository.findById)
      .toHaveBeenCalledWith('RES-001');

    expect(reservation.markNoShow)
      .toHaveBeenCalledTimes(1);

    expect(repository.update)
      .toHaveBeenCalledWith(
        reservation,
        'SEC-001',
        'Cliente no se presentó',
      );

    expect(result)
      .toBe(reservation);
  });

  it('debe utilizar el motivo por defecto cuando no se proporciona reason', async () => {
    const reservation = {
      id: 'RES-002',
      markNoShow: jest.fn(),
    } as unknown as Reservation;

    repository.findById.mockResolvedValue(
      reservation,
    );

    repository.update.mockResolvedValue();

    const result = await useCase.execute({
      reservationId: 'RES-002',
      secretaryId: 'SEC-002',
    });

    expect(reservation.markNoShow)
      .toHaveBeenCalledTimes(1);

    expect(repository.update)
      .toHaveBeenCalledWith(
        reservation,
        'SEC-002',
        'Inasistencia declarada',
      );

    expect(result)
      .toBe(reservation);
  });

  it('debe utilizar el motivo por defecto si reason está vacío', async () => {
    const reservation = {
      id: 'RES-003',
      markNoShow: jest.fn(),
    } as unknown as Reservation;

    repository.findById.mockResolvedValue(
      reservation,
    );

    repository.update.mockResolvedValue();

    await useCase.execute({
      reservationId: 'RES-003',
      secretaryId: 'SEC-003',
      reason: '',
    });

    expect(repository.update)
      .toHaveBeenCalledWith(
        reservation,
        'SEC-003',
        'Inasistencia declarada',
      );
  });

  it('debe lanzar EntityNotFoundException cuando la reserva no existe', async () => {
    repository.findById.mockResolvedValue(
      null,
    );

    await expect(
      useCase.execute({
        reservationId: 'NO-EXISTE',
        secretaryId: 'SEC-001',
      }),
    ).rejects.toBeInstanceOf(
      EntityNotFoundException,
    );

    expect(repository.findById)
      .toHaveBeenCalledWith('NO-EXISTE');

    expect(repository.update)
      .not.toHaveBeenCalled();
  });

  it('debe incluir el id de la reserva en el error cuando no existe', async () => {
    repository.findById.mockResolvedValue(
      null,
    );

    await expect(
      useCase.execute({
        reservationId: 'RES-999',
        secretaryId: 'SEC-001',
      }),
    ).rejects.toThrow(
      'Reserva con id RES-999 no encontrada.',
    );
  });

  it('no debe llamar update si markNoShow falla', async () => {
    const reservation = {
      id: 'RES-004',
      markNoShow: jest.fn(() => {
        throw new Error('Estado inválido');
      }),
    } as unknown as Reservation;

    repository.findById.mockResolvedValue(
      reservation,
    );

    await expect(
      useCase.execute({
        reservationId: 'RES-004',
        secretaryId: 'SEC-001',
      }),
    ).rejects.toThrow(
      'Estado inválido',
    );

    expect(repository.update)
      .not.toHaveBeenCalled();
  });
});