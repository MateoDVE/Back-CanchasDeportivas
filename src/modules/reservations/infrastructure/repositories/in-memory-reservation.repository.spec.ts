import { InMemoryReservationRepository } from './in-memory-reservation.repository';
import {
  ConflictException,
  CourtSlotOccupiedException,
} from '../../../../common/domain/exceptions/domain.exception';

describe('InMemoryReservationRepository', () => {
  let repository: InMemoryReservationRepository;

  const makeReservation = (overrides: any = {}) => {
    return {
      id: 'R1',
      courtId: 1,
      complexId: 1,
      clientId: 'CLIENT-1',
      reservationDate: '2026-10-20',
      startTime: '10:00',
      endTime: '11:00',
      status: 'CONFIRMED',
      totalPrice: 100,
      parentReservationId: undefined,
      createdAt: new Date('2026-10-10T10:00:00'),
      isExpired: jest.fn().mockReturnValue(false),
      expire: jest.fn(),
      markReprogrammed: jest.fn(),
      applyPaidAmount: jest.fn(),
      ...overrides,
    } as any;
  };

  beforeEach(() => {
    repository = new InMemoryReservationRepository();
  });

  // =====================================================
  // SAVE / FIND BY ID / UPDATE
  // =====================================================

  it('debe guardar y encontrar una reserva por id', async () => {
    const reservation = makeReservation();

    await repository.save(reservation);

    const result = await repository.findById('R1');

    expect(result).toBe(reservation);
  });

  it('debe retornar null si la reserva no existe', async () => {
    const result = await repository.findById('NO-EXISTE');

    expect(result).toBeNull();
  });

  it('debe actualizar una reserva existente', async () => {
    const reservation = makeReservation();

    await repository.save(reservation);

    const updated = makeReservation({
      id: 'R1',
      status: 'CANCELLED',
    });

    await repository.update(updated);

    const result = await repository.findById('R1');

    expect(result).toBe(updated);
    expect(result?.status).toBe('CANCELLED');
  });

  // =====================================================
  // AUTOEXPIRACIÓN
  // =====================================================

  it('debe expirar automáticamente una reserva TEMPORAL vencida al buscarla', async () => {
    const reservation = makeReservation({
      status: 'TEMPORAL',
      isExpired: jest.fn().mockReturnValue(true),
      expire: jest.fn(function (this: any) {
        this.status = 'EXPIRED';
      }),
    });

    await repository.save(reservation);

    await repository.findById('R1');

    expect(reservation.isExpired).toHaveBeenCalled();
    expect(reservation.expire).toHaveBeenCalled();
    expect(reservation.status).toBe('EXPIRED');
  });

  it('no debe expirar una reserva TEMPORAL activa', async () => {
    const reservation = makeReservation({
      status: 'TEMPORAL',
      isExpired: jest.fn().mockReturnValue(false),
    });

    await repository.save(reservation);

    await repository.findById('R1');

    expect(reservation.expire).not.toHaveBeenCalled();
  });

  // =====================================================
  // CONFLICTOS AL GUARDAR
  // =====================================================

  it('debe rechazar una reserva que se superpone con otra de la misma cancha', async () => {
    const existing = makeReservation({
      id: 'R1',
      startTime: '10:00',
      endTime: '11:00',
    });

    const conflicting = makeReservation({
      id: 'R2',
      startTime: '10:30',
      endTime: '11:30',
    });

    await repository.save(existing);

    await expect(
      repository.save(conflicting),
    ).rejects.toBeInstanceOf(CourtSlotOccupiedException);
  });

  it('debe permitir reservas en diferentes canchas aunque coincidan en horario', async () => {
    const first = makeReservation({
      id: 'R1',
      courtId: 1,
    });

    const second = makeReservation({
      id: 'R2',
      courtId: 2,
    });

    await repository.save(first);
    await repository.save(second);

    expect(
      await repository.findById('R2'),
    ).toBe(second);
  });

  it('debe permitir reservas en fechas diferentes', async () => {
    const first = makeReservation({
      id: 'R1',
      reservationDate: '2026-10-20',
    });

    const second = makeReservation({
      id: 'R2',
      reservationDate: '2026-10-21',
    });

    await repository.save(first);
    await repository.save(second);

    expect(
      await repository.findById('R2'),
    ).toBe(second);
  });

  it('debe ignorar reservas canceladas al validar disponibilidad', async () => {
    const cancelled = makeReservation({
      id: 'R1',
      status: 'CANCELLED',
    });

    const newReservation = makeReservation({
      id: 'R2',
    });

    await repository.save(cancelled);
    await repository.save(newReservation);

    expect(
      await repository.findById('R2'),
    ).toBe(newReservation);
  });

  it('debe ignorar reservas expiradas al validar disponibilidad', async () => {
    const expired = makeReservation({
      id: 'R1',
      status: 'EXPIRED',
    });

    const newReservation = makeReservation({
      id: 'R2',
    });

    await repository.save(expired);
    await repository.save(newReservation);

    expect(
      await repository.findById('R2'),
    ).toBe(newReservation);
  });

  it('debe ignorar reservas NO_SHOW al validar disponibilidad', async () => {
    const noShow = makeReservation({
      id: 'R1',
      status: 'NO_SHOW',
    });

    const newReservation = makeReservation({
      id: 'R2',
    });

    await repository.save(noShow);
    await repository.save(newReservation);

    expect(
      await repository.findById('R2'),
    ).toBe(newReservation);
  });

  it('debe ignorar reservas REPROGRAMMED al validar disponibilidad', async () => {
    const reprogrammed = makeReservation({
      id: 'R1',
      status: 'REPROGRAMMED',
    });

    const newReservation = makeReservation({
      id: 'R2',
    });

    await repository.save(reprogrammed);
    await repository.save(newReservation);

    expect(
      await repository.findById('R2'),
    ).toBe(newReservation);
  });

  // =====================================================
  // FIND CONFLICTING
  // =====================================================

  it('debe encontrar reservas que se superponen', async () => {
    const reservation = makeReservation({
      id: 'R1',
      startTime: '10:00',
      endTime: '11:00',
    });

    await repository.save(reservation);

    const result = await repository.findConflicting(
      1,
      '2026-10-20',
      '10:30',
      '11:30',
    );

    expect(result).toHaveLength(1);
    expect(result[0]).toBe(reservation);
  });

  it('no debe considerar conflicto cuando los horarios no se superponen', async () => {
    await repository.save(
      makeReservation({
        id: 'R1',
        startTime: '10:00',
        endTime: '11:00',
      }),
    );

    const result = await repository.findConflicting(
      1,
      '2026-10-20',
      '11:00',
      '12:00',
    );

    expect(result).toHaveLength(0);
  });

  it('debe excluir una reserva por id en findConflicting', async () => {
    await repository.save(
      makeReservation({
        id: 'R1',
      }),
    );

    const result = await repository.findConflicting(
      1,
      '2026-10-20',
      '10:00',
      '11:00',
      'R1',
    );

    expect(result).toHaveLength(0);
  });

  it('debe ignorar reservas canceladas en findConflicting', async () => {
    await repository.save(
      makeReservation({
        id: 'R1',
        status: 'CANCELLED',
      }),
    );

    const result = await repository.findConflicting(
      1,
      '2026-10-20',
      '10:00',
      '11:00',
    );

    expect(result).toHaveLength(0);
  });

  it('debe expirar y omitir un TEMPORAL vencido en findConflicting', async () => {
    const temporal = makeReservation({
      id: 'R1',
      status: 'TEMPORAL',
      isExpired: jest.fn().mockReturnValue(true),
      expire: jest.fn(function (this: any) {
        this.status = 'EXPIRED';
      }),
    });

    // Se inserta directamente para evitar que save() lo descarte
    // durante la validación de disponibilidad.
    (repository as any).reservations.set(
      temporal.id,
      temporal,
    );

    const result = await repository.findConflicting(
      1,
      '2026-10-20',
      '10:00',
      '11:00',
    );

    expect(temporal.expire).toHaveBeenCalled();
    expect(result).toHaveLength(0);
  });

  // =====================================================
  // FIND BY COURT AND DATE
  // =====================================================

  it('debe encontrar reservas por cancha y fecha', async () => {
    await repository.save(
      makeReservation({
        id: 'R1',
        courtId: 1,
        reservationDate: '2026-10-20',
      }),
    );

    await repository.save(
      makeReservation({
        id: 'R2',
        courtId: 2,
        reservationDate: '2026-10-20',
      }),
    );

    const result =
      await repository.findByCourtAndDate(
        1,
        '2026-10-20',
      );

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('R1');
  });

  it('debe autoexpirar temporales vencidas en findByCourtAndDate', async () => {
    const temporal = makeReservation({
      id: 'R1',
      status: 'TEMPORAL',
      isExpired: jest.fn().mockReturnValue(true),
      expire: jest.fn(function (this: any) {
        this.status = 'EXPIRED';
      }),
    });

    (repository as any).reservations.set(
      temporal.id,
      temporal,
    );

    const result =
      await repository.findByCourtAndDate(
        1,
        '2026-10-20',
      );

    expect(result).toHaveLength(1);
    expect(temporal.expire).toHaveBeenCalled();
  });

  // =====================================================
  // FIND BY CLIENT
  // =====================================================

  it('debe encontrar reservas por cliente ordenadas de más reciente a más antigua', async () => {
    const oldReservation = makeReservation({
      id: 'OLD',
      clientId: 'CLIENT-1',
      courtId: 1,
      startTime: '08:00',
      endTime: '09:00',
      createdAt: new Date('2026-10-01'),
    });

    const newReservation = makeReservation({
      id: 'NEW',
      clientId: 'CLIENT-1',
      courtId: 2,
      startTime: '10:00',
      endTime: '11:00',
      createdAt: new Date('2026-10-15'),
    });

    await repository.save(oldReservation);
    await repository.save(newReservation);

    const result =
      await repository.findByClient('CLIENT-1');

    expect(result).toHaveLength(2);
    expect(result[0].id).toBe('NEW');
    expect(result[1].id).toBe('OLD');
  });

  // =====================================================
  // PENDING VALIDATION
  // =====================================================

  it('debe encontrar reservas PENDING_VALIDATION ordenadas por fecha de creación', async () => {
    const newer = makeReservation({
      id: 'NEW',
      courtId: 1,
      startTime: '12:00',
      endTime: '13:00',
      status: 'PENDING_VALIDATION',
      createdAt: new Date('2026-10-15'),
    });

    const older = makeReservation({
      id: 'OLD',
      courtId: 2,
      startTime: '10:00',
      endTime: '11:00',
      status: 'PENDING_VALIDATION',
      createdAt: new Date('2026-10-01'),
    });

    await repository.save(newer);
    await repository.save(older);

    const result =
      await repository.findPendingValidation();

    expect(result).toHaveLength(2);
    expect(result[0].id).toBe('OLD');
    expect(result[1].id).toBe('NEW');
  });

  // =====================================================
  // TEMPORALES ACTIVAS
  // =====================================================

  it('debe retornar solamente reservas temporales no expiradas', async () => {
    const active = makeReservation({
      id: 'ACTIVE',
      status: 'TEMPORAL',
      isExpired: jest.fn().mockReturnValue(false),
    });

    const expired = makeReservation({
      id: 'EXPIRED',
      courtId: 2,
      status: 'TEMPORAL',
      isExpired: jest.fn().mockReturnValue(true),
    });

    (repository as any).reservations.set(
      active.id,
      active,
    );

    (repository as any).reservations.set(
      expired.id,
      expired,
    );

    const result =
      await repository.findActiveTemporal();

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('ACTIVE');
  });

  // =====================================================
  // FIND ALL
  // =====================================================

  it('debe retornar todas las reservas ordenadas por fecha descendente', async () => {
    await repository.save(
      makeReservation({
        id: 'OLD',
        courtId: 1,
        createdAt: new Date('2026-10-01'),
      }),
    );

    await repository.save(
      makeReservation({
        id: 'NEW',
        courtId: 2,
        createdAt: new Date('2026-10-20'),
      }),
    );

    const result = await repository.findAll();

    expect(result).toHaveLength(2);
    expect(result[0].id).toBe('NEW');
    expect(result[1].id).toBe('OLD');
  });

  // =====================================================
  // DATE RANGE
  // =====================================================

  it('debe encontrar reservas dentro de un rango de fechas', async () => {
    await repository.save(
      makeReservation({
        id: 'R1',
        courtId: 1,
        reservationDate: '2026-10-10',
      }),
    );

    await repository.save(
      makeReservation({
        id: 'R2',
        courtId: 2,
        reservationDate: '2026-11-10',
      }),
    );

    const result =
      await repository.findByDateRange(
        '2026-10-01',
        '2026-10-31',
      );

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('R1');
  });

  // =====================================================
  // SEARCH
  // =====================================================

  it('debe buscar utilizando todos los filtros disponibles', async () => {
    const target = makeReservation({
      id: 'TARGET',
      courtId: 5,
      complexId: 10,
      clientId: 'CLIENT-X',
      reservationDate: '2026-10-25',
      status: 'CONFIRMED',
    });

    await repository.save(target);

    await repository.save(
      makeReservation({
        id: 'OTHER',
        courtId: 6,
        complexId: 11,
        clientId: 'CLIENT-Y',
        reservationDate: '2026-10-26',
        status: 'PENDING_VALIDATION',
      }),
    );

    const result = await repository.search({
      date: '2026-10-25',
      courtId: 5,
      complexId: 10,
      status: 'CONFIRMED',
      clientId: 'CLIENT-X',
    });

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('TARGET');
  });

  it('debe retornar todas las reservas ordenadas cuando search recibe filtros vacíos', async () => {
    await repository.save(
      makeReservation({
        id: 'OLD',
        courtId: 1,
        createdAt: new Date('2026-10-01'),
      }),
    );

    await repository.save(
      makeReservation({
        id: 'NEW',
        courtId: 2,
        createdAt: new Date('2026-10-20'),
      }),
    );

    const result = await repository.search({});

    expect(result).toHaveLength(2);
    expect(result[0].id).toBe('NEW');
  });

  // =====================================================
  // RELEASE EXPIRED
  // =====================================================

  it('debe liberar todas las reservas TEMPORAL expiradas', async () => {
    const expired1 = makeReservation({
      id: 'E1',
      status: 'TEMPORAL',
      isExpired: jest.fn().mockReturnValue(true),
      expire: jest.fn(function (this: any) {
        this.status = 'EXPIRED';
      }),
    });

    const expired2 = makeReservation({
      id: 'E2',
      status: 'TEMPORAL',
      isExpired: jest.fn().mockReturnValue(true),
      expire: jest.fn(function (this: any) {
        this.status = 'EXPIRED';
      }),
    });

    const active = makeReservation({
      id: 'ACTIVE',
      status: 'TEMPORAL',
      isExpired: jest.fn().mockReturnValue(false),
    });

    (repository as any).reservations.set(
      expired1.id,
      expired1,
    );
    (repository as any).reservations.set(
      expired2.id,
      expired2,
    );
    (repository as any).reservations.set(
      active.id,
      active,
    );

    const released =
      await repository.releaseExpiredReservations();

    expect(released).toBe(2);
    expect(expired1.expire).toHaveBeenCalled();
    expect(expired2.expire).toHaveBeenCalled();
    expect(active.expire).not.toHaveBeenCalled();
  });

  it('debe retornar cero cuando no existen temporales vencidas', async () => {
    const reservation = makeReservation({
      id: 'R1',
      status: 'CONFIRMED',
    });

    await repository.save(reservation);

    const released =
      await repository.releaseExpiredReservations();

    expect(released).toBe(0);
  });

  // =====================================================
  // RESCHEDULE
  // =====================================================

  it('debe rechazar reprogramación cuando reserva original no existe', async () => {
    const replacement = makeReservation({
      id: 'NEW',
      parentReservationId: 'OLD',
    });

    await expect(
      repository.reschedule(
        replacement,
        'ADMIN-1',
        'Cambio',
      ),
    ).rejects.toThrow(
      'Reserva no reprogramable.',
    );
  });

  it('debe rechazar reprogramación si original no está CONFIRMED', async () => {
    const old = makeReservation({
      id: 'OLD',
      status: 'CANCELLED',
    });

    await repository.save(old);

    const replacement = makeReservation({
      id: 'NEW',
      parentReservationId: 'OLD',
    });

    await expect(
      repository.reschedule(
        replacement,
        'ADMIN-1',
      ),
    ).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('debe rechazar reprogramación cuando existen pagos pendientes', async () => {
    const payments = {
      findByReservationId: jest.fn().mockResolvedValue([
        {
          id: 'P1',
          status: 'PENDING',
          amount: 20,
          reservationId: 'OLD',
        },
      ]),
    } as any;

    repository =
      new InMemoryReservationRepository(
        payments,
      );

    const old = makeReservation({
      id: 'OLD',
      status: 'CONFIRMED',
    });

    await repository.save(old);

    const replacement = makeReservation({
      id: 'NEW',
      parentReservationId: 'OLD',
    });

    await expect(
      repository.reschedule(
        replacement,
        'ADMIN-1',
      ),
    ).rejects.toThrow(
      'Existen pagos pendientes.',
    );
  });

  it('debe rechazar reprogramación cuando el pago neto supera el nuevo total', async () => {
    const payments = {
      findByReservationId: jest.fn().mockResolvedValue([
        {
          id: 'P1',
          status: 'VALIDATED',
          amount: 150,
          reservationId: 'OLD',
        },
      ]),
    } as any;

    repository =
      new InMemoryReservationRepository(
        payments,
      );

    const old = makeReservation({
      id: 'OLD',
      status: 'CONFIRMED',
    });

    await repository.save(old);

    const replacement = makeReservation({
      id: 'NEW',
      parentReservationId: 'OLD',
      totalPrice: 100,
    });

    await expect(
      repository.reschedule(
        replacement,
        'ADMIN-1',
      ),
    ).rejects.toThrow(
      'Devuelve el excedente antes de reprogramar.',
    );
  });

  it('debe reprogramar correctamente y transferir pagos válidos', async () => {
    const validatedPayment = {
      id: 'P1',
      status: 'VALIDATED',
      amount: 50,
      reservationId: 'OLD',
    };

    const refundedPayment = {
      id: 'P2',
      status: 'REFUNDED',
      amount: 10,
      reservationId: 'OLD',
    };

    const rejectedPayment = {
      id: 'P3',
      status: 'REJECTED',
      amount: 20,
      reservationId: 'OLD',
    };

    const payments = {
      findByReservationId: jest.fn().mockResolvedValue([
        validatedPayment,
        refundedPayment,
        rejectedPayment,
      ]),
    } as any;

    repository =
      new InMemoryReservationRepository(
        payments,
      );

    const old = makeReservation({
      id: 'OLD',
      courtId: 1,
      status: 'CONFIRMED',
      startTime: '08:00',
      endTime: '09:00',
    });

    await repository.save(old);

    const replacement = makeReservation({
      id: 'NEW',
      courtId: 1,
      startTime: '10:00',
      endTime: '11:00',
      parentReservationId: 'OLD',
      totalPrice: 100,
    });

    await repository.reschedule(
      replacement,
      'ADMIN-1',
      'Cambio solicitado',
    );

    expect(old.markReprogrammed)
      .toHaveBeenCalled();

    expect(
      replacement.applyPaidAmount,
    ).toHaveBeenCalledWith(40);

    expect(validatedPayment.reservationId)
      .toBe('NEW');

    expect(refundedPayment.reservationId)
      .toBe('NEW');

    expect(rejectedPayment.reservationId)
      .toBe('OLD');

    expect(
      await repository.findById('NEW'),
    ).toBe(replacement);
  });
});