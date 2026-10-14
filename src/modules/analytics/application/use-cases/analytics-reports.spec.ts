import { CompareCourtsPerformanceUseCase } from './compare-courts-performance.use-case';
import { GetCourtOccupancyRankingUseCase } from './get-court-occupancy-ranking.use-case';
import { GetExecutiveKpiSummaryUseCase } from './get-executive-kpi-summary.use-case';
import { GetPeakHoursAnalysisUseCase } from './get-peak-hours-analysis.use-case';
import { GetPendingReceivablesUseCase } from './get-pending-receivables.use-case';
import { GetRevenueReportUseCase } from './get-revenue-report.use-case';
import { Court } from '../../../courts/domain/entities/court.entity';
import {
  Reservation,
  ReservationStatus,
} from '../../../reservations/domain/entities/reservation.entity';
import {
  Payment,
  PaymentStatus,
  PaymentType,
  PaymentMethod,
} from '../../../payments/domain/entities/payment.entity';
import { User } from '../../../users/domain/entities/user.entity';
import { ICourtRepository } from '../../../courts/domain/repositories/court.repository.interface';
import { IReservationRepository } from '../../../reservations/domain/repositories/reservation.repository.interface';
import { IPaymentRepository } from '../../../payments/domain/repositories/payment.repository.interface';
import { IUserRepository } from '../../../users/domain/repositories/user.repository.interface';

function reservation(
  id: string,
  courtId = 1,
  status: ReservationStatus = 'CONFIRMED',
  start = '08:00',
  end = '10:00',
  date = '2026-10-13',
  clientId = 'client-1',
) {
  return new Reservation(
    id,
    clientId,
    courtId,
    date,
    start,
    end,
    100,
    200,
    50,
    status,
    null,
    'staff',
  );
}
function payment(
  id: number,
  reservationId: string,
  amount: number,
  type: PaymentType = 'ANTICIPO',
  method: PaymentMethod = 'EFECTIVO',
  status: PaymentStatus = 'VALIDATED',
  date = '2026-10-13',
) {
  return new Payment(
    id,
    reservationId,
    amount,
    type,
    method,
    null,
    status,
    null,
    null,
    new Date(`${date}T12:00:00Z`),
  );
}

describe('Reportes de analítica', () => {
  let courts: Court[];
  let reservations: Reservation[];
  let payments: Payment[];
  let users: User[];
  let courtRepo: ICourtRepository;
  let reservationRepo: IReservationRepository;
  let paymentRepo: IPaymentRepository;
  let userRepo: IUserRepository;

  beforeEach(() => {
    courts = [
      new Court(1, 1, 'Norte', 'Futsal', 100),
      new Court(2, 1, 'Sur', 'Tenis', 80),
    ];
    reservations = [];
    payments = [];
    users = [];
    // Solo se simula la frontera de persistencia; los cálculos y entidades son reales.
    courtRepo = {
      findAll: jest.fn(() => Promise.resolve(courts)),
    } as unknown as ICourtRepository;
    reservationRepo = {
      findAll: jest.fn(() => Promise.resolve(reservations)),
    } as unknown as IReservationRepository;
    paymentRepo = {
      findAll: jest.fn(() => Promise.resolve(payments)),
    } as unknown as IPaymentRepository;
    userRepo = {
      findAll: jest.fn(() => Promise.resolve(users)),
    } as unknown as IUserRepository;
  });
  afterEach(() => jest.useRealTimers());

  it('compara reservas confirmadas y completadas, excluye canceladas y conserva canchas vacías', async () => {
    reservations = [
      reservation('a'),
      reservation('b', 1, 'COMPLETED', '10:00', '13:00'),
      reservation('c', 1, 'CANCELLED'),
    ];
    const result = await new CompareCourtsPerformanceUseCase(
      courtRepo,
      reservationRepo,
    ).execute();
    expect(result).toEqual([
      {
        courtId: 1,
        courtName: 'Norte',
        courtType: 'Futsal',
        pricePerHour: 100,
        totalBookings: 2,
        totalHoursPlayed: 5,
        totalRevenueGenerated: 400,
        averageRevenuePerHour: 80,
      },
      {
        courtId: 2,
        courtName: 'Sur',
        courtType: 'Tenis',
        pricePerHour: 80,
        totalBookings: 0,
        totalHoursPlayed: 0,
        totalRevenueGenerated: 0,
        averageRevenuePerHour: 80,
      },
    ]);
  });

  it('clasifica y ordena ocupación baja, normal y alta dentro del intervalo inclusivo', async () => {
    courts.push(new Court(3, 1, 'Este', 'Futsal', 90));
    reservations = [
      reservation('a', 1, 'CONFIRMED', '08:00', '22:00'),
      reservation('b', 2, 'CONFIRMED', '08:00', '15:00'),
      reservation('c', 3, 'COMPLETED'),
      reservation('d', 3, 'CONFIRMED', '08:00', '22:00', '2026-10-12'),
      reservation('e', 3, 'CONFIRMED', '08:00', '22:00', '2026-10-14'),
    ];
    const result = await new GetCourtOccupancyRankingUseCase(
      courtRepo,
      reservationRepo,
    ).execute('2026-10-13', '2026-10-13');
    expect(
      result.map((r) => [
        r.courtId,
        r.totalBookings,
        r.totalHoursBooked,
        r.occupancyPercentage,
      ]),
    ).toEqual([
      [3, 0, 0, 0],
      [2, 1, 7, 50],
      [1, 1, 14, 100],
    ]);
    expect(result.map((r) => r.recommendation)).toEqual([
      'Baja ocupación: Candidata ideal para descuentos y promociones',
      'Ocupación normal',
      'Alta demanda: Posible ajuste de tarifa en horas pico',
    ]);
  });

  it('usa 30 días sin intervalo y limita la ocupación al 100%', async () => {
    reservations = [
      reservation('a', 1, 'CONFIRMED', '08:00', '22:00'),
      reservation('b', 1, 'CONFIRMED', '08:00', '22:00'),
    ];
    const useCase = new GetCourtOccupancyRankingUseCase(
      courtRepo,
      reservationRepo,
    );
    expect(
      (await useCase.execute()).find((r) => r.courtId === 1)
        ?.occupancyPercentage,
    ).toBe(6.7);
    expect(
      (await useCase.execute('2026-10-13', '2026-10-13')).find(
        (r) => r.courtId === 1,
      )?.occupancyPercentage,
    ).toBe(100);
  });

  it('cuenta horas pico por cancha y excluye reservas no confirmadas y horas fuera del rango', async () => {
    reservations = [
      reservation('a', 1, 'CONFIRMED', '07:00', '10:00'),
      reservation('b', 1, 'CONFIRMED', '09:00', '11:00'),
      reservation('c', 2, 'CONFIRMED', '09:00', '10:00'),
      reservation('d', 1, 'CANCELLED'),
    ];
    const useCase = new GetPeakHoursAnalysisUseCase(reservationRepo);
    const result = await useCase.execute(1);
    expect(result).toHaveLength(15);
    expect(result.filter((r) => r.count > 0)).toEqual([
      { hour: 8, count: 1, hourLabel: '08:00 - 09:00', isPeak: false },
      { hour: 9, count: 2, hourLabel: '09:00 - 10:00', isPeak: true },
      { hour: 10, count: 1, hourLabel: '10:00 - 11:00', isPeak: false },
    ]);
    expect((await useCase.execute()).find((r) => r.hour === 9)?.count).toBe(3);
  });

  it('no marca horas pico si no existen reservas', async () => {
    const result = await new GetPeakHoursAnalysisUseCase(
      reservationRepo,
    ).execute();
    expect(result).toHaveLength(15);
    expect(result.every((r) => r.count === 0 && !r.isPeak)).toBe(true);
  });

  it('suma saldos reales y recupera contactos con alternativa para clientes ausentes', async () => {
    const first = reservation('a');
    first.applyPaidAmount(120.25);
    const missing = reservation(
      'b',
      2,
      'CONFIRMED',
      '08:00',
      '10:00',
      '2026-10-13',
      'missing',
    );
    const paid = reservation('paid');
    paid.applyPaidAmount(200);
    reservations = [
      first,
      missing,
      paid,
      reservation('cancelled', 1, 'CANCELLED'),
      reservation('pending', 1, 'PENDING_VALIDATION'),
    ];
    users = [
      new User(
        'client-1',
        'Cliente de prueba',
        'client@example.test',
        '70000000',
        '',
        '',
        'CLIENTE',
      ),
    ];
    const useCase = new GetPendingReceivablesUseCase(reservationRepo, userRepo);
    expect(await useCase.execute()).toEqual({
      totalPendingAmount: 229.75,
      count: 2,
      items: [
        {
          reservation: first,
          clientName: 'Cliente de prueba',
          clientPhone: '70000000',
          clientEmail: 'client@example.test',
          pendingBalance: 79.75,
        },
        {
          reservation: missing,
          clientName: 'missing',
          clientPhone: '',
          clientEmail: '',
          pendingBalance: 150,
        },
      ],
    });
    expect(await useCase.execute(1)).toMatchObject({
      totalPendingAmount: 79.75,
      count: 1,
    });
    expect(await useCase.execute(99)).toEqual({
      totalPendingAmount: 0,
      count: 0,
      items: [],
    });
  });

  it('desglosa ingresos validados por tipo, método y cancha', async () => {
    reservations = [reservation('a'), reservation('b', 2)];
    payments = [
      payment(1, 'a', 50.25),
      payment(2, 'a', 149.75, 'SALDO_FINAL', 'QR'),
      payment(3, 'b', 80),
      payment(4, 'a', 900, 'ANTICIPO', 'QR', 'PENDING'),
      payment(5, 'missing', 10),
    ];
    const result = await new GetRevenueReportUseCase(
      paymentRepo,
      reservationRepo,
      courtRepo,
    ).execute({});
    expect(result).toEqual({
      totalRevenue: 290,
      advancePaymentsTotal: 140.25,
      finalPaymentsTotal: 149.75,
      advanceRevenue: 140.25,
      finalPaymentRevenue: 149.75,
      byPaymentMethod: {
        CASH: 140.25,
        QR: 149.75,
        efectivo: 140.25,
        qr: 149.75,
      },
      byCourt: [
        { courtId: 1, courtName: 'Norte', totalAmount: 200, count: 2 },
        { courtId: 2, courtName: 'Sur', totalAmount: 80, count: 1 },
      ],
      totalTransactions: 4,
    });
  });

  it('filtra ingresos por fechas inclusivas y cancha, incluyendo canchas sin transacciones', async () => {
    reservations = [reservation('a'), reservation('b', 2)];
    payments = [
      payment(1, 'a', 25, 'ANTICIPO', 'QR', 'VALIDATED', '2026-10-01'),
      payment(2, 'a', 75, 'SALDO_FINAL', 'EFECTIVO', 'VALIDATED', '2026-10-31'),
      payment(3, 'a', 100, 'ANTICIPO', 'QR', 'VALIDATED', '2026-09-30'),
      payment(4, 'a', 100, 'ANTICIPO', 'QR', 'VALIDATED', '2026-11-01'),
      payment(5, 'b', 80),
      payment(6, 'missing', 10),
    ];
    const result = await new GetRevenueReportUseCase(
      paymentRepo,
      reservationRepo,
      courtRepo,
    ).execute({ startDate: '2026-10-01', endDate: '2026-10-31', courtId: 1 });
    expect(result).toMatchObject({
      totalRevenue: 100,
      totalTransactions: 2,
      advanceRevenue: 25,
      finalPaymentRevenue: 75,
      byCourt: [
        { courtId: 1, totalAmount: 100, count: 2 },
        { courtId: 2, totalAmount: 0, count: 0 },
      ],
    });
  });

  it('devuelve ingresos en cero sin pagos', async () => {
    const result = await new GetRevenueReportUseCase(
      paymentRepo,
      reservationRepo,
      courtRepo,
    ).execute({});
    expect(result).toMatchObject({
      totalRevenue: 0,
      totalTransactions: 0,
      advanceRevenue: 0,
      finalPaymentRevenue: 0,
      byPaymentMethod: { CASH: 0, QR: 0, efectivo: 0, qr: 0 },
    });
  });

  it('calcula indicadores, ingresos mensuales, saldos y cancha líder con reloj fijo', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-10-13T12:00:00Z'));
    reservations = [
      reservation('a'),
      reservation('b', 1, 'COMPLETED'),
      reservation('c', 2, 'CANCELLED'),
      reservation('d', 2, 'PENDING_VALIDATION'),
    ];
    payments = [
      payment(1, 'a', 50),
      payment(2, 'b', 150, 'SALDO_FINAL', 'QR', 'VALIDATED', '2026-09-30'),
      payment(3, 'd', 500, 'ANTICIPO', 'QR', 'PENDING'),
    ];
    const result = await new GetExecutiveKpiSummaryUseCase(
      paymentRepo,
      reservationRepo,
      courtRepo,
    ).execute();
    expect(result).toEqual({
      totalRevenue: 200,
      totalReservations: 4,
      completedReservations: 2,
      cancelledReservations: 1,
      pendingReceivables: 150,
      averageTicket: 100,
      occupancyRate: 0.5,
      monthlyRevenue: 50,
      activeReservationsCount: 2,
      totalReservationsCount: 4,
      cancellationRatePercentage: 25,
      topCourt: { courtId: 1, name: 'Norte', revenue: 400 },
      averageOccupancyPercentage: 0.5,
    });
  });

  it('evita divisiones por cero sin canchas, reservas ni pagos', async () => {
    courts = [];
    const result = await new GetExecutiveKpiSummaryUseCase(
      paymentRepo,
      reservationRepo,
      courtRepo,
    ).execute();
    expect(result).toEqual({
      totalRevenue: 0,
      totalReservations: 0,
      completedReservations: 0,
      cancelledReservations: 0,
      pendingReceivables: 0,
      averageTicket: 0,
      occupancyRate: 0,
      monthlyRevenue: 0,
      activeReservationsCount: 0,
      totalReservationsCount: 0,
      cancellationRatePercentage: 0,
      topCourt: null,
      averageOccupancyPercentage: 0,
    });
  });

  it('propaga fallos de persistencia sin presentar un reporte de ingresos vacío', async () => {
    jest
      .spyOn(paymentRepo, 'findAll')
      .mockRejectedValue(new Error('Persistencia no disponible'));
    await expect(
      new GetRevenueReportUseCase(
        paymentRepo,
        reservationRepo,
        courtRepo,
      ).execute({}),
    ).rejects.toThrow('Persistencia no disponible');
  });
});
