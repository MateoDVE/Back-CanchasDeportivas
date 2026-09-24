import { Reservation } from '../../domain/entities/reservation.entity';
import { Payment } from '../../../payments/domain/entities/payment.entity';
import { InMemoryReservationRepository } from '../../infrastructure/repositories/in-memory-reservation.repository';
import { InMemoryPaymentRepository } from '../../../payments/infrastructure/repositories/in-memory-payment.repository';
import { AuthorizeEntryUseCase } from './authorize-entry.use-case';
import { RegisterFinalPaymentUseCase } from '../../../payments/application/use-cases/register-final-payment.use-case';
import { RegisterRefundExceptionUseCase } from '../../../payments/application/use-cases/register-refund-exception.use-case';
import { GetCurrentShiftSummaryUseCase } from '../../../cash-shifts/application/use-cases/get-current-shift-summary.use-case';
import { InMemoryCashShiftRepository } from '../../../cash-shifts/infrastructure/repositories/in-memory-cash-shift.repository';
import { SupabaseReservationRepository } from '../../infrastructure/repositories/supabase-reservation.repository';

describe('Regresiones de inspección formal', () => {
  const booking = (id = 'r', start = '10:00', end = '11:00', parent?: string) =>
    new Reservation(
      id,
      'client',
      1,
      '2030-01-07',
      start,
      end,
      100,
      100,
      25,
      'CONFIRMED',
      null,
      'staff',
      parent,
      null,
      new Date(),
      false,
      false,
      'WHATSAPP',
    );
  let payments: InMemoryPaymentRepository;
  let reservations: InMemoryReservationRepository;
  beforeEach(() => {
    payments = new InMemoryPaymentRepository();
    reservations = new InMemoryReservationRepository(payments);
  });

  it('rechaza saldo final inferior y superior al saldo real', async () => {
    await reservations.save(booking());
    await payments.save(
      new Payment(0, 'r', 25, 'ANTICIPO', 'QR', null, 'VALIDATED', 'staff'),
    );
    const useCase = new RegisterFinalPaymentUseCase(payments, reservations);
    for (const amount of [1, 74, 76, 100])
      await expect(
        useCase.execute({
          reservationId: 'r',
          amount,
          paymentMethod: 'EFECTIVO',
          secretaryId: 'staff',
        }),
      ).rejects.toThrow('saldo real');
    expect(await payments.findAll()).toHaveLength(1);
    expect(
      (
        await useCase.execute({
          reservationId: 'r',
          amount: 75,
          paymentMethod: 'EFECTIVO',
          secretaryId: 'staff',
        })
      ).isFullyPaid,
    ).toBe(true);
  });

  it('un pago marcado SALDO_FINAL no autoriza ingreso si el total es insuficiente', async () => {
    await reservations.save(booking());
    await payments.save(
      new Payment(
        0,
        'r',
        1,
        'SALDO_FINAL',
        'EFECTIVO',
        null,
        'VALIDATED',
        'staff',
      ),
    );
    await expect(
      new AuthorizeEntryUseCase(reservations, payments).execute('r', 'staff'),
    ).rejects.toThrow('saldo pendiente');
  });

  it('la reprogramación conserva la procedencia del anticipo y libera el bloque original', async () => {
    await reservations.save(booking());
    await payments.save(
      new Payment(0, 'r', 25, 'ANTICIPO', 'QR', null, 'VALIDATED', 'staff'),
    );
    await reservations.reschedule(
      booking('next', '12:00', '13:00', 'r'),
      'staff',
    );
    const transferred = await payments.findByReservationId('next');
    expect(transferred[0].originalReservationId).toBe('r');
    expect(transferred[0].amount).toBe(25);
    expect(
      await reservations.findConflicting(1, '2030-01-07', '10:00', '11:00'),
    ).toEqual([]);
    expect((await reservations.findById('next'))!.pendingBalance).toBe(75);
  });

  it('un conflicto de reprogramación conserva la reserva y sus pagos', async () => {
    await reservations.save(booking());
    await reservations.save(booking('busy', '12:00', '13:00'));
    await payments.save(
      new Payment(0, 'r', 25, 'ANTICIPO', 'QR', null, 'VALIDATED', 'staff'),
    );
    await expect(
      reservations.reschedule(booking('next', '12:00', '13:00', 'r'), 'staff'),
    ).rejects.toThrow();
    expect((await reservations.findById('r'))!.status).toBe('CONFIRMED');
    expect(await payments.findByReservationId('r')).toHaveLength(1);
  });

  it('la devolución guarda al actor efectivo y no concatena auditoría en cancelación', async () => {
    await reservations.save(booking());
    await payments.save(
      new Payment(0, 'r', 25, 'ANTICIPO', 'QR', null, 'VALIDATED', 'staff'),
    );
    const useCase = new RegisterRefundExceptionUseCase(payments, reservations);
    const result = await useCase.execute({
      reservationId: 'r',
      amount: 5,
      reason: 'Excepción',
      authorizedBy: 'texto-no-confiable',
      secretaryId: 'staff',
    });
    expect(result.payment.authorizedBy).toBe('staff');
    expect(result.payment.refundReason).toBe('Excepción');
    expect((await reservations.findById('r'))!.cancellationReason).toBeNull();
    await expect(
      useCase.execute({
        reservationId: 'r',
        amount: 21,
        reason: 'Excepción',
        authorizedBy: 'staff',
        secretaryId: 'staff',
      }),
    ).rejects.toThrow('excede');
  });

  it('una caja sin cobros propios no incorpora los de otra secretaria', async () => {
    await payments.save(
      new Payment(
        0,
        'r',
        25,
        'ANTICIPO',
        'EFECTIVO',
        null,
        'VALIDATED',
        'other',
      ),
    );
    const result = await new GetCurrentShiftSummaryUseCase(
      new InMemoryCashShiftRepository(),
      payments,
    ).execute('staff');
    expect(result.totalSystem).toBe(0);
    expect(result.paymentsCount).toBe(0);
  });

  it('el adaptador persiste origen y traduce una exclusión SQL a conflicto de horario', async () => {
    const rpc = jest.fn().mockResolvedValue({ error: null });
    const repo = new SupabaseReservationRepository({ rpc } as any);
    await repo.save(booking());
    expect(rpc).toHaveBeenCalledWith(
      'persist_reservation',
      expect.objectContaining({
        p_data: expect.objectContaining({ origin: 'WHATSAPP' }),
      }),
    );
    rpc.mockResolvedValue({ error: { code: '23P01', message: 'conflict' } });
    await expect(repo.save(booking())).rejects.toThrow('ocupado');
  });

  it('el adaptador actualiza usando estado esperado y autor de la acción', async () => {
    const rpc = jest.fn().mockResolvedValue({ error: null });
    const repo = new SupabaseReservationRepository({ rpc } as any);
    const r = booking();
    r.markNoShow();
    await repo.update(r, 'staff', 'Inasistencia');
    expect(rpc).toHaveBeenCalledWith(
      'persist_reservation',
      expect.objectContaining({
        p_actor: 'staff',
        p_expected_status: 'CONFIRMED',
        p_reason: 'Inasistencia',
      }),
    );
  });
});
