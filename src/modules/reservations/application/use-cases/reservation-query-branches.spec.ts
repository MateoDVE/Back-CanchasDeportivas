import {
  Reservation,
  ReservationStatus,
} from '../../domain/entities/reservation.entity';
import { Court } from '../../../courts/domain/entities/court.entity';
import { Complex } from '../../../complexes/domain/entities/complex.entity';
import { User } from '../../../users/domain/entities/user.entity';
import { Payment } from '../../../payments/domain/entities/payment.entity';
import { IReservationRepository } from '../../domain/repositories/reservation.repository.interface';
import { ICourtRepository } from '../../../courts/domain/repositories/court.repository.interface';
import { IComplexRepository } from '../../../complexes/domain/repositories/complex.repository.interface';
import { IUserRepository } from '../../../users/domain/repositories/user.repository.interface';
import { IPaymentRepository } from '../../../payments/domain/repositories/payment.repository.interface';
import { QuickSearchReservationUseCase } from './quick-search-reservation.use-case';
import { GetDailyOperationalBoardUseCase } from './get-daily-operational-board.use-case';
import { GetClientReservationsUseCase } from './get-client-reservations.use-case';
import { GetReservationDetailUseCase } from './get-reservation-detail.use-case';
import { GetReservationBalanceUseCase } from './get-reservation-balance.use-case';
import { GetCourtCalendarMonthUseCase } from './get-court-calendar-month.use-case';
import { GetMasterCalendarGridUseCase } from './get-master-calendar-grid.use-case';
import { GetRescheduleInfoUseCase } from './get-reschedule-info.use-case';

function booking(
  id = 'reservation',
  status: ReservationStatus = 'CONFIRMED',
  courtId = 1,
  clientId = 'user',
  date = '2026-10-14',
  parent?: string,
) {
  return new Reservation(
    id,
    clientId,
    courtId,
    date,
    '10:00',
    '12:00',
    100,
    200,
    50,
    status,
    null,
    'staff',
    parent,
  );
}

describe('Consultas de reservas: alternativas y datos relacionados', () => {
  let reservations: Reservation[];
  let courts: Court[];
  let users: User[];
  let payments: Payment[];
  let complexes: Complex[];
  let pending: Reservation[];
  let rr: IReservationRepository;
  let cr: ICourtRepository;
  let ur: IUserRepository;
  let pr: IPaymentRepository;
  let xr: IComplexRepository;
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-10-14T12:00:00Z'));
    reservations = [booking()];
    courts = [
      new Court(1, 2, 'Norte', 'Futsal', 100),
      new Court(2, 2, 'Sur', 'Tenis', 80),
    ];
    complexes = [new Complex(2, 'Complejo', 'La Paz', '70000000', 'qr.png')];
    users = [
      new User(
        'user',
        'Ana',
        'ana@example.test',
        '71234567',
        '',
        '',
        'CLIENTE',
      ),
    ];
    payments = [];
    pending = [];
    rr = {
      findAll: jest.fn(() => Promise.resolve(reservations)),
      findById: jest.fn((id: string) =>
        Promise.resolve(reservations.find((r) => r.id === id) ?? null),
      ),
      findByClient: jest.fn(() => Promise.resolve(reservations)),
      findByDateRange: jest.fn(() => Promise.resolve(reservations)),
      findPendingValidation: jest.fn(() => Promise.resolve(pending)),
    } as unknown as IReservationRepository;
    cr = {
      findAll: jest.fn(() => Promise.resolve(courts)),
      findById: jest.fn((id: number) =>
        Promise.resolve(courts.find((c) => c.id === id) ?? null),
      ),
      findByComplex: jest.fn(() => Promise.resolve(courts)),
    } as unknown as ICourtRepository;
    ur = {
      findAll: jest.fn(() => Promise.resolve(users)),
      findById: jest.fn((id: string) =>
        Promise.resolve(users.find((u) => u.id === id) ?? null),
      ),
    } as unknown as IUserRepository;
    pr = {
      findAll: jest.fn(() => Promise.resolve(payments)),
      findByReservationId: jest.fn(() => Promise.resolve(payments)),
    } as unknown as IPaymentRepository;
    xr = {
      findAll: jest.fn(() => Promise.resolve(complexes)),
      findById: jest.fn(() => Promise.resolve(complexes[0] ?? null)),
    } as unknown as IComplexRepository;
  });
  afterEach(() => jest.useRealTimers());

  it.each(['', '   '])(
    'búsqueda vacía %p no consulta persistencia',
    async (query) => {
      const findAll = jest.spyOn(rr, 'findAll');
      expect(
        await new QuickSearchReservationUseCase(rr, ur, cr, pr).execute(query),
      ).toEqual([]);
      expect(findAll).not.toHaveBeenCalled();
    },
  );
  it.each([' ANA ', '71234567', 'ana@example.test', 'reservation'])(
    'encuentra reserva por %s',
    async (query) => {
      expect(
        await new QuickSearchReservationUseCase(rr, ur, cr, pr).execute(query),
      ).toEqual([
        expect.objectContaining({
          id: 'reservation',
          clientName: 'Ana',
          courtName: 'Norte',
          pendingBalance: 150,
          isAuthorized: false,
          client: {
            id: 'user',
            fullName: 'Ana',
            phone: '71234567',
            email: 'ana@example.test',
          },
        }),
      ]);
    },
  );
  it('no devuelve reservas si no coincide usuario ni identificador', async () => {
    expect(
      await new QuickSearchReservationUseCase(rr, ur, cr, pr).execute(
        'missing',
      ),
    ).toEqual([]);
  });
  it.each<ReservationStatus>([
    'CANCELLED',
    'EXPIRED',
    'TEMPORAL',
    'COMPLETED',
    'PENDING_VALIDATION',
    'CONFIRMED',
  ])(
    'representa estado %s y datos ausentes en búsqueda y tablero',
    async (status) => {
      reservations = [booking('reservation', status, 1, 'missing')];
      const search = new QuickSearchReservationUseCase(rr, ur, cr, pr);
      const expectedBalance = ['PENDING_VALIDATION', 'CONFIRMED'].includes(
        status,
      )
        ? 150
        : 0;
      const result = await search.execute('reservation');
      expect(result[0]).toMatchObject({
        clientName: 'Cliente',
        client: null,
        pendingBalance: expectedBalance,
        isAuthorized: status === 'COMPLETED',
      });
      const board = await new GetDailyOperationalBoardUseCase(
        rr,
        cr,
        ur,
        pr,
      ).execute('2026-10-14');
      expect(board.courts[0].reservations[0]).toMatchObject({
        clientName: 'Cliente Presencial',
        pendingBalance: expectedBalance,
        isAuthorized: status === 'COMPLETED',
      });
      expect(board.courts[1].reservations).toEqual([]);
      courts = [];
      expect((await search.execute('reservation'))[0].courtName).toBe(
        'Cancha 1',
      );
    },
  );
  it('reconoce pago final y autorización, cuenta pendientes y ordena el tablero', async () => {
    const paid = booking('paid');
    const flagged = booking('flagged');
    flagged.markFinalPaymentPaid();
    flagged.isEntryAuthorized = true;
    const unpaid = booking('unpaid');
    reservations = [
      paid,
      flagged,
      unpaid,
      booking('pending', 'PENDING_VALIDATION'),
    ];
    payments = [
      new Payment(1, 'paid', 150, 'SALDO_FINAL', 'QR', null, 'VALIDATED'),
      new Payment(2, 'unpaid', 150, 'SALDO_FINAL', 'QR', null, 'PENDING'),
      new Payment(3, 'unpaid', 50, 'ANTICIPO', 'QR', null, 'VALIDATED'),
    ];
    const board = await new GetDailyOperationalBoardUseCase(
      rr,
      cr,
      ur,
      pr,
    ).execute();
    expect(board).toMatchObject({
      date: '2026-10-14',
      confirmedCount: 3,
      pendingValidationCount: 1,
      completedCount: 0,
      totalReservations: 4,
      pendingPaymentCount: 1,
    });
    expect(board.courts[0].reservations.map((r) => r.pendingBalance)).toEqual([
      0, 0, 150, 150,
    ]);
    const search = new QuickSearchReservationUseCase(rr, ur, cr, pr);
    expect((await search.execute('paid')).map((r) => r.pendingBalance)).toEqual(
      [0, 150],
    );
    expect((await search.execute('flagged'))[0]).toMatchObject({
      pendingBalance: 0,
      isAuthorized: true,
    });
    reservations = [];
    pending = [booking('pending-other-day', 'PENDING_VALIDATION')];
    expect(
      await new GetDailyOperationalBoardUseCase(rr, cr, ur, pr).execute(),
    ).toMatchObject({ totalReservations: 0, pendingValidationCount: 1 });
  });

  it('detalle calcula saldo neto y preserva relaciones y comprobantes', async () => {
    reservations = [
      booking('reservation', 'CONFIRMED', 1, 'user', '2026-10-14', 'parent'),
    ];
    reservations[0].cancellationReason = 'Motivo histórico';
    payments = [
      new Payment(1, 'reservation', 100, 'ANTICIPO', 'QR', null, 'VALIDATED'),
      new Payment(2, 'reservation', 20, 'DEVOLUCION', 'QR', null, 'REFUNDED'),
      new Payment(3, 'reservation', 99, 'ANTICIPO', 'QR', null, 'PENDING'),
    ];
    const result = await new GetReservationDetailUseCase(
      rr,
      cr,
      xr,
      ur,
      pr,
    ).execute('reservation');
    expect(result).toMatchObject({
      pendingBalance: 120,
      parentReservationId: 'parent',
      cancellationReason: 'Motivo histórico',
      client: { id: 'user', name: 'Ana' },
      court: { id: 1, name: 'Norte' },
      complex: { id: 2, paymentQrUrl: 'qr.png' },
    });
    expect(result.payments).toHaveLength(3);
    expect(
      await new GetReservationBalanceUseCase(rr, pr).execute('reservation'),
    ).toMatchObject({ totalPaid: 80, pendingBalance: 120, isFullyPaid: false });
    payments = [
      new Payment(
        4,
        'reservation',
        250,
        'SALDO_FINAL',
        'QR',
        null,
        'VALIDATED',
      ),
    ];
    expect(
      await new GetReservationBalanceUseCase(rr, pr).execute('reservation'),
    ).toMatchObject({ pendingBalance: 0, isFullyPaid: true });
  });
  it('detalle conserva null para relaciones ausentes y rechaza reserva inexistente', async () => {
    users = [];
    complexes = [];
    const detail = new GetReservationDetailUseCase(rr, cr, xr, ur, pr);
    expect(await detail.execute('reservation')).toMatchObject({
      client: null,
      complex: null,
      parentReservationId: null,
      cancellationReason: null,
    });
    courts = [];
    expect(await detail.execute('reservation')).toMatchObject({
      court: null,
      complex: null,
    });
    await expect(detail.execute('missing')).rejects.toThrow('no existe');
    await expect(
      new GetReservationBalanceUseCase(rr, pr).execute('missing'),
    ).rejects.toThrow('no existe');
  });

  it('agrupa y ordena reservas futuras e históricas, incluidos empates y temporales vencidas', async () => {
    reservations = [
      booking('b'),
      booking('a'),
      booking('old', 'CONFIRMED', 1, 'user', '2026-10-13'),
      booking('cancelled', 'CANCELLED'),
      booking('expired', 'EXPIRED', 99),
      booking('tomorrow', 'CONFIRMED', 1, 'user', '2026-10-15'),
    ];
    const result = await new GetClientReservationsUseCase(rr, cr).execute(
      'user',
    );
    expect(result.upcoming.map((r) => r.id)).toEqual(['a', 'b', 'tomorrow']);
    expect(result.history.map((r) => r.id)).toEqual([
      'expired',
      'cancelled',
      'old',
    ]);
    expect(result.history[0]).toMatchObject({
      status: 'EXPIRED',
      courtName: 'Cancha #99',
    });
  });

  it('calendario mensual clasifica vacío, parcial y lleno excluyendo canceladas y otras canchas', async () => {
    reservations = Array.from({ length: 10 }, (_, i) =>
      booking(`full-${i}`, 'CONFIRMED', 1, 'user', '2026-10-01'),
    );
    reservations.push(
      booking('partial', 'PENDING_VALIDATION', 1, 'user', '2026-10-02'),
      booking('cancelled', 'CANCELLED', 1, 'user', '2026-10-03'),
      booking('other', 'CONFIRMED', 2, 'user', '2026-10-03'),
    );
    const result = await new GetCourtCalendarMonthUseCase(rr, cr).execute(
      1,
      2026,
      10,
    );
    expect(result.days).toHaveLength(31);
    expect(result.days.slice(0, 3)).toEqual([
      {
        date: '2026-10-01',
        totalReservations: 10,
        confirmedCount: 10,
        status: 'FULL',
      },
      {
        date: '2026-10-02',
        totalReservations: 1,
        confirmedCount: 0,
        status: 'PARTIAL',
      },
      {
        date: '2026-10-03',
        totalReservations: 0,
        confirmedCount: 0,
        status: 'EMPTY',
      },
    ]);
  });
  it.each([0, 13])('rechaza mes %s', async (month) => {
    await expect(
      new GetCourtCalendarMonthUseCase(rr, cr).execute(1, 2026, month),
    ).rejects.toThrow('mes');
  });
  it('rechaza cancha ausente y calcula febrero bisiesto', async () => {
    const useCase = new GetCourtCalendarMonthUseCase(rr, cr);
    await expect(useCase.execute(99, 2026, 2)).rejects.toThrow('no existe');
    expect((await useCase.execute(1, 2028, 2)).days).toHaveLength(29);
  });
  it.each([undefined, '2026-10-15'])(
    'calendario general conserva canchas sin reservas para fecha %p',
    async (date) => {
      const result = await new GetMasterCalendarGridUseCase(rr, xr, cr).execute(
        date,
      );
      expect(result.date).toBe(date ?? '2026-10-14');
      expect(result.complexes[0].courts[0].reservations).toEqual([
        expect.objectContaining({ id: 'reservation', pendingBalance: 150 }),
      ]);
      expect(result.complexes[0].courts[1].reservations).toEqual([]);
    },
  );
  it('consulta reprogramación con padre presente, ausente y sin reprogramación', async () => {
    const useCase = new GetRescheduleInfoUseCase(rr);
    expect(await useCase.execute('reservation')).toMatchObject({
      isRescheduled: false,
      canBeRescheduled: true,
      parentReservationDate: null,
    });
    reservations = [
      booking('child', 'CONFIRMED', 1, 'user', '2026-10-14', 'parent'),
      booking('parent', 'REPROGRAMMED'),
    ];
    expect(await useCase.execute('child')).toMatchObject({
      isRescheduled: true,
      parentReservationDate: '2026-10-14',
      parentReservationTime: '10:00 - 12:00',
    });
    reservations.pop();
    expect(await useCase.execute('child')).toMatchObject({
      isRescheduled: true,
      parentReservationDate: null,
      parentReservationTime: null,
    });
    await expect(useCase.execute('missing')).rejects.toThrow('no existe');
  });
});
