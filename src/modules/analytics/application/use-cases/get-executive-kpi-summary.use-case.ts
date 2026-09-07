import { Injectable, Inject } from '@nestjs/common';
import {
  IPaymentRepository,
  PAYMENT_REPOSITORY,
} from '../../../payments/domain/repositories/payment.repository.interface';
import {
  IReservationRepository,
  RESERVATION_REPOSITORY,
} from '../../../reservations/domain/repositories/reservation.repository.interface';
import {
  ICourtRepository,
  COURT_REPOSITORY,
} from '../../../courts/domain/repositories/court.repository.interface';

export interface ExecutiveKpiSummaryDto {
  totalRevenue: number;
  totalReservations: number;
  completedReservations: number;
  cancelledReservations: number;
  pendingReceivables: number;
  averageTicket: number;
  occupancyRate: number;
  // Campos complementarios
  monthlyRevenue: number;
  activeReservationsCount: number;
  totalReservationsCount: number;
  cancellationRatePercentage: number;
  topCourt: {
    courtId: number;
    name: string;
    revenue: number;
  } | null;
  averageOccupancyPercentage: number;
}

/**
 * @reference HU-ADM-23 Consultar indicadores generales (Executive Dashboard)
 */
@Injectable()
export class GetExecutiveKpiSummaryUseCase {
  constructor(
    @Inject(PAYMENT_REPOSITORY)
    private readonly paymentRepository: IPaymentRepository,
    @Inject(RESERVATION_REPOSITORY)
    private readonly reservationRepository: IReservationRepository,
    @Inject(COURT_REPOSITORY)
    private readonly courtRepository: ICourtRepository,
  ) {}

  async execute(): Promise<ExecutiveKpiSummaryDto> {
    const now = new Date();
    const currentMonthPrefix = now.toISOString().slice(0, 7); // YYYY-MM

    // 1. Ingresos
    const payments = await this.paymentRepository.findAll();
    const validatedPayments = payments.filter((p) => p.status === 'VALIDATED');
    const monthlyValidatedPayments = validatedPayments.filter((p) => {
      const pMonth = p.createdAt.toISOString().slice(0, 7);
      return pMonth === currentMonthPrefix;
    });

    const monthlyRevenue = Number(
      monthlyValidatedPayments.reduce((sum, p) => sum + p.amount, 0).toFixed(2),
    );
    const totalAllRevenue = Number(
      validatedPayments.reduce((sum, p) => sum + p.amount, 0).toFixed(2),
    );

    // 2. Reservas
    const allReservations = await this.reservationRepository.findAll();
    const activeReservations = allReservations.filter(
      (r) => r.status === 'CONFIRMED' || r.status === 'PENDING_VALIDATION',
    );
    const completedReservations = allReservations.filter(
      (r) => r.status === 'COMPLETED' || r.status === 'CONFIRMED',
    );
    const cancelledReservations = allReservations.filter((r) => r.status === 'CANCELLED');

    const cancellationRatePercentage =
      allReservations.length > 0
        ? Number(((cancelledReservations.length / allReservations.length) * 100).toFixed(1))
        : 0;

    const pendingReceivables = Number(
      allReservations
        .filter((r) => r.status === 'CONFIRMED')
        .reduce((sum, r) => sum + r.pendingBalance, 0)
        .toFixed(2),
    );

    const averageTicket =
      completedReservations.length > 0
        ? Number((totalAllRevenue / completedReservations.length).toFixed(2))
        : 0;

    // 3. Cancha líder
    const courts = await this.courtRepository.findAll();
    const courtRevenueMap: Record<number, number> = {};
    for (const r of allReservations) {
      if (r.status === 'CONFIRMED' || r.status === 'COMPLETED') {
        courtRevenueMap[r.courtId] = (courtRevenueMap[r.courtId] || 0) + r.totalPrice;
      }
    }

    let topCourt: ExecutiveKpiSummaryDto['topCourt'] = null;
    let maxRev = -1;

    for (const court of courts) {
      const rev = courtRevenueMap[court.id] || 0;
      if (rev > maxRev) {
        maxRev = rev;
        topCourt = {
          courtId: court.id,
          name: court.name,
          revenue: Number(rev.toFixed(2)),
        };
      }
    }

    // 4. Tasa de ocupación promedio estimada (30 días base)
    const totalPotentialHours = courts.length * 30 * 14;
    let totalHoursPlayed = 0;
    for (const r of allReservations) {
      if (r.status === 'CONFIRMED' || r.status === 'COMPLETED') {
        const [sh] = r.startTime.split(':').map(Number);
        const [eh] = r.endTime.split(':').map(Number);
        totalHoursPlayed += Math.max(1, eh - sh);
      }
    }

    const averageOccupancyPercentage =
      totalPotentialHours > 0
        ? Number(Math.min(100, (totalHoursPlayed / totalPotentialHours) * 100).toFixed(1))
        : 0;

    return {
      totalRevenue: totalAllRevenue > 0 ? totalAllRevenue : monthlyRevenue,
      totalReservations: allReservations.length,
      completedReservations: completedReservations.length,
      cancelledReservations: cancelledReservations.length,
      pendingReceivables,
      averageTicket,
      occupancyRate: averageOccupancyPercentage,

      monthlyRevenue,
      activeReservationsCount: activeReservations.length,
      totalReservationsCount: allReservations.length,
      cancellationRatePercentage,
      topCourt,
      averageOccupancyPercentage,
    };
  }
}
