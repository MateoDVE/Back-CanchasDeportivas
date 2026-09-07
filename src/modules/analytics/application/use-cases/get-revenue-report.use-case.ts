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

export interface RevenueReportFilter {
  startDate?: string;
  endDate?: string;
  courtId?: number;
}

export interface CourtRevenueSummaryDto {
  courtId: number;
  courtName: string;
  totalAmount: number;
  count: number;
}

export interface RevenueReportOutputDto {
  totalRevenue: number;
  advancePaymentsTotal: number;
  finalPaymentsTotal: number;
  advanceRevenue: number;
  finalPaymentRevenue: number;
  byPaymentMethod: {
    CASH: number;
    QR: number;
    efectivo: number;
    qr: number;
  };
  byCourt: CourtRevenueSummaryDto[];
  totalTransactions: number;
}

/**
 * @reference HU-ADM-17 Consultar ingresos
 */
@Injectable()
export class GetRevenueReportUseCase {
  constructor(
    @Inject(PAYMENT_REPOSITORY)
    private readonly paymentRepository: IPaymentRepository,
    @Inject(RESERVATION_REPOSITORY)
    private readonly reservationRepository: IReservationRepository,
    @Inject(COURT_REPOSITORY)
    private readonly courtRepository: ICourtRepository,
  ) {}

  async execute(filter: RevenueReportFilter): Promise<RevenueReportOutputDto> {
    let payments = await this.paymentRepository.findAll();
    payments = payments.filter((p) => p.status === 'VALIDATED');

    if (filter.startDate && filter.endDate) {
      payments = payments.filter((p) => {
        const pDate = p.createdAt.toISOString().split('T')[0];
        return pDate >= filter.startDate! && pDate <= filter.endDate!;
      });
    }

    const allReservations = await this.reservationRepository.findAll();
    const resMap = new Map(allReservations.map((r) => [r.id, r]));

    if (filter.courtId) {
      payments = payments.filter((p) => {
        const res = resMap.get(p.reservationId);
        return res && res.courtId === filter.courtId;
      });
    }

    let advanceRevenue = 0;
    let finalPaymentRevenue = 0;
    let efectivo = 0;
    let qr = 0;

    const courtMap: Record<number, { totalAmount: number; count: number }> = {};

    for (const p of payments) {
      if (p.paymentType === 'ANTICIPO') {
        advanceRevenue += p.amount;
      } else if (p.paymentType === 'SALDO_FINAL') {
        finalPaymentRevenue += p.amount;
      }

      if (p.paymentMethod === 'EFECTIVO') {
        efectivo += p.amount;
      } else if (p.paymentMethod === 'QR') {
        qr += p.amount;
      }

      const res = resMap.get(p.reservationId);
      if (res) {
        if (!courtMap[res.courtId]) {
          courtMap[res.courtId] = { totalAmount: 0, count: 0 };
        }
        courtMap[res.courtId].totalAmount += p.amount;
        courtMap[res.courtId].count++;
      }
    }

    const courts = await this.courtRepository.findAll();
    const courtNameMap = new Map(courts.map((c) => [c.id, c.name]));

    const byCourt: CourtRevenueSummaryDto[] = courts.map((court) => ({
      courtId: court.id,
      courtName: courtNameMap.get(court.id) || court.name,
      totalAmount: Number((courtMap[court.id]?.totalAmount || 0).toFixed(2)),
      count: courtMap[court.id]?.count || 0,
    }));

    const totalRevenue = Number((advanceRevenue + finalPaymentRevenue).toFixed(2));

    return {
      totalRevenue,
      advancePaymentsTotal: Number(advanceRevenue.toFixed(2)),
      finalPaymentsTotal: Number(finalPaymentRevenue.toFixed(2)),
      advanceRevenue: Number(advanceRevenue.toFixed(2)),
      finalPaymentRevenue: Number(finalPaymentRevenue.toFixed(2)),
      byPaymentMethod: {
        CASH: Number(efectivo.toFixed(2)),
        QR: Number(qr.toFixed(2)),
        efectivo: Number(efectivo.toFixed(2)),
        qr: Number(qr.toFixed(2)),
      },
      byCourt,
      totalTransactions: payments.length,
    };
  }
}
