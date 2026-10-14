import { CloseCashShiftUseCase } from './close-cash-shift.use-case';
import { GetCurrentShiftSummaryUseCase } from './get-current-shift-summary.use-case';
import { AuditSecretaryShiftsUseCase } from './audit-secretary-shifts.use-case';
import { InMemoryCashShiftRepository } from '../../infrastructure/repositories/in-memory-cash-shift.repository';
import { CashShift } from '../../domain/entities/cash-shift.entity';
import {
  Payment,
  PaymentMethod,
  PaymentStatus,
} from '../../../payments/domain/entities/payment.entity';
import { IPaymentRepository } from '../../../payments/domain/repositories/payment.repository.interface';
import { IUserRepository } from '../../../users/domain/repositories/user.repository.interface';
import { User } from '../../../users/domain/entities/user.entity';
import {
  DomainException,
  ValidationException,
} from '../../../../common/domain/exceptions/domain.exception';

describe('Cierre, resumen y auditoría de caja', () => {
  let repository: InMemoryCashShiftRepository;
  let findPayments: jest.Mock<Promise<Payment[]>, [string, string]>;
  let close: CloseCashShiftUseCase;
  let summary: GetCurrentShiftSummaryUseCase;
  const date = '2026-10-13';
  function payment(
    id: number,
    amount: number,
    method: PaymentMethod,
    status: PaymentStatus,
  ) {
    return new Payment(
      id,
      'reservation-1',
      amount,
      status === 'REFUNDED' ? 'DEVOLUCION' : 'ANTICIPO',
      method,
      null,
      status,
      'staff-1',
      null,
      new Date('2026-10-13T18:00:00Z'),
    );
  }

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-10-14T02:00:00Z'));
    repository = new InMemoryCashShiftRepository();
    findPayments = jest
      .fn<Promise<Payment[]>, [string, string]>()
      .mockResolvedValue([
        payment(1, 100.25, 'EFECTIVO', 'VALIDATED'),
        payment(2, 20, 'EFECTIVO', 'REFUNDED'),
        payment(3, 60.75, 'QR', 'VALIDATED'),
        payment(4, 10, 'QR', 'REFUNDED'),
        payment(5, 999, 'EFECTIVO', 'PENDING'),
        payment(6, 999, 'QR', 'REJECTED'),
      ]);
    const payments = {
      findByHandlerAndDate: findPayments,
    } as unknown as IPaymentRepository;
    close = new CloseCashShiftUseCase(repository, payments);
    summary = new GetCurrentShiftSummaryUseCase(repository, payments);
  });
  afterEach(() => jest.useRealTimers());

  it('cierra en fecha boliviana con cobros netos y diferencia respecto al efectivo', async () => {
    const result = await close.execute({
      secretaryId: 'staff-1',
      totalDeclaredCash: 80,
      notes: 'Faltan 0.25',
    });
    expect(findPayments).toHaveBeenCalledWith('staff-1', date);
    expect(result).toMatchObject({
      id: 1,
      secretaryId: 'staff-1',
      shiftDate: date,
      totalSystemCash: 80.25,
      totalSystemQr: 50.75,
      totalSystem: 131,
      totalDeclaredCash: 80,
      difference: -0.25,
      notes: 'Faltan 0.25',
    });
    expect(result.isClosed).toBe(true);
    expect(result.closedAt).toEqual(new Date());
    expect(await repository.findById(result.id)).toEqual(result);
    expect(await repository.findById(99)).toBeNull();
    expect(await repository.findBySecretaryAndDate('other', date)).toBeNull();
  });

  it('resume solo cobros validados y devoluciones, antes y después del cierre', async () => {
    const before = await summary.execute('staff-1');
    expect(before).toMatchObject({
      shiftDate: date,
      date,
      totalCollected: 131,
      totalCash: 80.25,
      totalQr: 50.75,
      totalSystemCash: 80.25,
      totalSystemQr: 50.75,
      totalSystem: 131,
      transactionsCount: 4,
      paymentsCount: 4,
      isAlreadyClosed: false,
      closedAt: null,
      totalDeclaredCash: null,
      difference: null,
    });
    expect(before.payments.map((p) => p.id)).toEqual([1, 2, 3, 4]);
    expect(before.payments[0]).toEqual({
      id: 1,
      amount: 100.25,
      paymentType: 'ANTICIPO',
      paymentMethod: 'EFECTIVO',
      createdAt: '2026-10-13T18:00:00.000Z',
      reservationId: 'reservation-1',
    });
    await close.execute({
      secretaryId: 'staff-1',
      date,
      totalDeclaredCash: 81,
    });
    expect(await summary.execute('staff-1', date)).toMatchObject({
      isAlreadyClosed: true,
      closedAt: new Date(),
      totalDeclaredCash: 81,
      difference: 0.75,
    });
  });

  it('permite cerrar una jornada vacía con monto cero', async () => {
    findPayments.mockResolvedValue([]);
    const result = await close.execute({
      secretaryId: 'staff-1',
      date: '2026-10-12',
      totalDeclaredCash: 0,
    });
    expect(findPayments).toHaveBeenCalledWith('staff-1', '2026-10-12');
    expect(result).toMatchObject({
      totalSystemCash: 0,
      totalSystemQr: 0,
      totalSystem: 0,
      difference: 0,
      notes: null,
    });
    expect(await summary.execute('staff-1', '2026-10-12')).toMatchObject({
      payments: [],
      paymentsCount: 0,
      totalCollected: 0,
    });
  });

  it('actualiza un turno abierto conservando su identificador', async () => {
    const open = await repository.save(
      new CashShift(0, 'staff-1', date, 80.25, 50.75, 131, 0, -80.25),
    );
    const result = await close.execute({
      secretaryId: 'staff-1',
      date,
      totalDeclaredCash: 80.25,
    });
    expect(result.id).toBe(open.id);
    expect(result.isClosed).toBe(true);
    expect(result.difference).toBe(0);
    expect(await repository.findAll()).toHaveLength(1);
  });

  it('rechaza un segundo cierre sin consultar pagos ni alterar el turno', async () => {
    const result = await close.execute({
      secretaryId: 'staff-1',
      date,
      totalDeclaredCash: 80,
    });
    findPayments.mockClear();
    await expect(
      close.execute({ secretaryId: 'staff-1', date, totalDeclaredCash: 999 }),
    ).rejects.toThrow(DomainException);
    expect(findPayments).not.toHaveBeenCalled();
    expect(result.totalDeclaredCash).toBe(80);
    expect(() => result.close(999)).toThrow(DomainException);
  });

  it.each([-1, Number.NaN])(
    'rechaza monto declarado inválido %s sin guardar',
    async (amount) => {
      await expect(
        close.execute({
          secretaryId: 'staff-1',
          date,
          totalDeclaredCash: amount,
        }),
      ).rejects.toThrow(ValidationException);
      expect(findPayments).not.toHaveBeenCalled();
      expect(await repository.findAll()).toEqual([]);
    },
  );

  it('la entidad rechaza efectivo negativo al crearse o cerrarse', () => {
    expect(() => new CashShift(0, 'staff-1', date, 0, 0, 0, -1, 0)).toThrow(
      ValidationException,
    );
    const open = new CashShift(0, 'staff-1', date, 0, 0, 0, 0, 0);
    expect(() => open.close(-1)).toThrow(ValidationException);
    expect(open.isClosed).toBe(false);
    expect(open.closedAt).toBeNull();
  });

  it('no guarda un cierre cuando falla la consulta de pagos', async () => {
    findPayments.mockRejectedValue(new Error('Pagos no disponibles'));
    await expect(
      close.execute({ secretaryId: 'staff-1', date, totalDeclaredCash: 0 }),
    ).rejects.toThrow('Pagos no disponibles');
    expect(await repository.findAll()).toEqual([]);
  });

  it('audita por intervalo inclusivo y secretaria, con contacto alternativo si falta el usuario', async () => {
    const shifts: CashShift[] = [];
    for (const [index, shiftDate] of [
      '2026-10-12',
      date,
      '2026-10-14',
      '2026-10-15',
    ].entries()) {
      shifts.push(
        await repository.save(
          new CashShift(
            0,
            index === 2 ? 'missing' : 'staff-1',
            shiftDate,
            0,
            0,
            0,
            0,
            0,
            null,
            false,
            null,
            new Date(`${shiftDate}T18:00:00Z`),
          ),
        ),
      );
    }
    const users = {
      findAll: jest
        .fn()
        .mockResolvedValue([
          new User(
            'staff-1',
            'Secretaria',
            'staff@example.test',
            '',
            '',
            '',
            'SECRETARIA',
          ),
        ]),
    } as unknown as IUserRepository;
    const audit = new AuditSecretaryShiftsUseCase(repository, users);
    expect((await audit.execute({})).map((item) => item.shift.id)).toEqual([
      4, 3, 2, 1,
    ]);
    const selected = await audit.execute({
      startDate: date,
      endDate: '2026-10-14',
    });
    expect(selected).toEqual([
      {
        shift: shifts[1],
        secretaryName: 'Secretaria',
        secretaryEmail: 'staff@example.test',
      },
      { shift: shifts[2], secretaryName: 'missing', secretaryEmail: '' },
    ]);
    expect(
      await audit.execute({
        startDate: date,
        endDate: '2026-10-14',
        secretaryId: 'staff-1',
      }),
    ).toEqual([selected[0]]);
    expect(await audit.execute({ secretaryId: 'unknown' })).toEqual([]);
  });
});
