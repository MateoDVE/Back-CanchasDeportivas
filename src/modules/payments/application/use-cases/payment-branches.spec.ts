import {
  Payment,
  PaymentStatus,
  PaymentMethod,
} from '../../domain/entities/payment.entity';
import { InMemoryPaymentRepository } from '../../infrastructure/repositories/in-memory-payment.repository';
import { ValidateAdvancePaymentUseCase } from './validate-advance-payment.use-case';
import { RejectAdvancePaymentUseCase } from './reject-advance-payment.use-case';
import { RegisterFinalPaymentUseCase } from './register-final-payment.use-case';
import {
  Reservation,
  ReservationStatus,
} from '../../../reservations/domain/entities/reservation.entity';
import { IReservationRepository } from '../../../reservations/domain/repositories/reservation.repository.interface';
import {
  DomainException,
  ValidationException,
  EntityNotFoundException,
} from '../../../../common/domain/exceptions/domain.exception';

describe('Ramas de pagos y anticipos', () => {
  let repo: InMemoryPaymentRepository;
  let reservation: Reservation;
  let findReservation: jest.Mock;
  let reservations: IReservationRepository;
  function payment(amount = 50, status: PaymentStatus = 'PENDING') {
    return new Payment(
      0,
      'reservation',
      amount,
      'ANTICIPO',
      'QR',
      null,
      status,
    );
  }
  function booking(status: ReservationStatus = 'CONFIRMED') {
    return new Reservation(
      'reservation',
      'client',
      1,
      '2026-10-14',
      '10:00',
      '12:00',
      100,
      200,
      50,
      status,
      null,
      'staff',
    );
  }
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-10-14T02:00:00Z'));
    repo = new InMemoryPaymentRepository();
    reservation = booking();
    findReservation = jest
      .fn()
      .mockImplementation(() => Promise.resolve(reservation));
    reservations = {
      findById: findReservation,
    } as unknown as IReservationRepository;
  });
  afterEach(() => jest.useRealTimers());

  it.each([0, -1, NaN, Infinity, -Infinity])(
    'rechaza monto inválido %s',
    (amount) => {
      expect(() => payment(amount)).toThrow(ValidationException);
    },
  );
  it.each<PaymentStatus>(['VALIDATED', 'REJECTED', 'REFUNDED'])(
    'no vuelve a procesar un pago %s',
    (status) => {
      const p = payment(50, status);
      expect(() => p.validate('staff')).toThrow(DomainException);
      expect(() => p.reject('staff', 'No coincide')).toThrow(DomainException);
      expect(p.status).toBe(status);
    },
  );
  it.each(['', '   '])('exige motivo de rechazo %p', (reason) => {
    const p = payment();
    expect(() => p.reject('staff', reason)).toThrow(ValidationException);
    expect(p.status).toBe('PENDING');
    expect(p.processedAt).toBeNull();
  });
  it('exige responsable antes de validar', () => {
    const p = payment();
    expect(() => p.validate('')).toThrow(ValidationException);
    expect(p.status).toBe('PENDING');
    expect(p.handledBy).toBeNull();
  });
  it.each(['validate', 'reject'])(
    'rechaza pago o reserva ausentes al %s',
    async (action) => {
      const execute = () =>
        action === 'validate'
          ? new ValidateAdvancePaymentUseCase(repo, reservations).execute({
              paymentId: 1,
              secretaryId: 'staff',
            })
          : new RejectAdvancePaymentUseCase(repo, reservations).execute({
              paymentId: 1,
              secretaryId: 'staff',
              reason: 'No coincide',
            });
      await expect(execute()).rejects.toThrow(EntityNotFoundException);
      expect(findReservation).not.toHaveBeenCalled();
      const p = await repo.save(payment());
      findReservation.mockResolvedValue(null);
      await expect(execute()).rejects.toThrow(EntityNotFoundException);
      expect(p.status).toBe('PENDING');
    },
  );
  it.each<ReservationStatus>(['TEMPORAL', 'PENDING_VALIDATION'])(
    'confirma anticipo de reserva %s',
    async (status) => {
      reservation = booking(status);
      const p = await repo.save(payment());
      const result = await new ValidateAdvancePaymentUseCase(
        repo,
        reservations,
      ).execute({ paymentId: p.id, secretaryId: 'staff' });
      expect(result).toEqual({
        paymentId: p.id,
        reservationId: 'reservation',
        paymentStatus: 'VALIDATED',
        reservationStatus: 'CONFIRMED',
        amount: 50,
        handledBy: 'staff',
        validatedAt: new Date(),
      });
      expect(reservation.pendingBalance).toBe(150);
    },
  );
  it('rechaza comprobante, recorta motivo y libera la reserva', async () => {
    reservation = booking('PENDING_VALIDATION');
    const p = await repo.save(payment());
    const result = await new RejectAdvancePaymentUseCase(
      repo,
      reservations,
    ).execute({
      paymentId: p.id,
      secretaryId: 'staff',
      reason: '  Ilegible  ',
    });
    expect(result).toMatchObject({
      paymentStatus: 'REJECTED',
      reservationStatus: 'CANCELLED',
      rejectionReason: 'Ilegible',
      handledBy: 'staff',
    });
    expect(p.processedAt).toEqual(new Date());
    expect(reservation.pendingBalance).toBe(0);
  });
  it.each(['QR', 'EFECTIVO', 'CASH'])(
    'cobra saldo neto con método %s',
    async (method) => {
      await repo.save(payment(100, 'VALIDATED'));
      await repo.save(payment(20, 'REFUNDED'));
      await repo.save(payment(900, 'PENDING'));
      const result = await new RegisterFinalPaymentUseCase(
        repo,
        reservations,
      ).execute({
        reservationId: 'reservation',
        amount: 120,
        paymentMethod: method as PaymentMethod,
        secretaryId: 'staff',
      });
      expect(result).toMatchObject({
        isFullyPaid: true,
        pendingBalance: 0,
        totalPrice: 200,
        payment: {
          amount: 120,
          paymentMethod: method === 'CASH' ? 'EFECTIVO' : method,
          paymentType: 'SALDO_FINAL',
          status: 'VALIDATED',
        },
      });
      expect(reservation.pendingBalance).toBe(0);
    },
  );
  it.each([0, 199, 201, NaN, Infinity])(
    'no guarda cobro si el importe no cubre exactamente el saldo: %s',
    async (amount) => {
      await expect(
        new RegisterFinalPaymentUseCase(repo, reservations).execute({
          reservationId: 'reservation',
          amount,
          paymentMethod: 'QR',
          secretaryId: 'staff',
        }),
      ).rejects.toThrow(ValidationException);
      expect(await repo.findAll()).toEqual([]);
    },
  );
  it('rechaza reservas ausentes, no confirmadas o sin deuda', async () => {
    const useCase = new RegisterFinalPaymentUseCase(repo, reservations);
    const input = {
      reservationId: 'reservation',
      amount: 200,
      paymentMethod: 'QR' as const,
      secretaryId: 'staff',
    };
    findReservation.mockResolvedValueOnce(null);
    await expect(useCase.execute(input)).rejects.toThrow(
      EntityNotFoundException,
    );
    reservation = booking('CANCELLED');
    await expect(useCase.execute(input)).rejects.toThrow(ValidationException);
    reservation = booking();
    await repo.save(payment(200, 'VALIDATED'));
    await expect(useCase.execute(input)).rejects.toThrow(ValidationException);
    expect(await repo.findAll()).toHaveLength(1);
  });
  it('reemplaza comprobante pendiente, pero crea otro después del rechazo', async () => {
    const first = await repo.submitReceipt(reservation, 'first.png', 'client');
    const updated = await repo.submitReceipt(
      reservation,
      'second.png',
      'client',
    );
    expect(updated.id).toBe(first.id);
    expect(updated.receiptImageUrl).toBe('second.png');
    first.reject('staff', 'Ilegible');
    await repo.update(first);
    const next = await repo.submitReceipt(reservation, 'third.png', 'client');
    expect(next.id).not.toBe(first.id);
    expect(await repo.findPendingPayments()).toEqual([next]);
    expect(await repo.findById(first.id)).toBe(first);
    expect(await repo.findById(999)).toBeNull();
  });
  it('recalcula saldo descontando devoluciones e ignorando pagos no validados', async () => {
    const validated = await repo.save(payment(100, 'VALIDATED'));
    await repo.save(payment(20, 'REFUNDED'));
    await repo.save(payment(900));
    await repo.processAdvance(validated, reservation);
    expect(reservation.pendingBalance).toBe(120);
    expect(await repo.findByReservationId('missing')).toEqual([]);
  });
  it('filtra fecha boliviana y responsable y ordena pagos por creación', async () => {
    const oldest = payment();
    const first = await repo.save(oldest);
    jest.setSystemTime(new Date('2026-10-15T02:00:00Z'));
    const second = await repo.save(payment());
    expect(await repo.findPendingPayments()).toEqual([first, second]);
    expect(await repo.findAll()).toEqual([second, first]);
    second.validate('staff');
    await repo.update(second);
    expect(await repo.findByHandlerAndDate('staff', '2026-10-14')).toEqual([
      second,
    ]);
    expect(await repo.findByHandlerAndDate('staff', '2026-10-13')).toEqual([]);
    expect(await repo.findByDateRange('2026-10-13', '2026-10-14')).toEqual([
      first,
      second,
    ]);
    expect(await repo.findByDateRange('2026-10-14', '2026-10-14')).toEqual([
      second,
    ]);
    expect(await repo.findByDateRange('2026-10-12', '2026-10-12')).toEqual([]);
  });
});
