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

export interface RevenueReportOutputDto {
  totalRevenue: number;
  advanceRevenue: number;
  finalPaymentRevenue: number;
  byPaymentMethod: {
    efectivo: number;
    qr: number;
  };
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

    if (filter.courtId) {
      const courtReservations = await this.reservationRepository.search({
        courtId: filter.courtId,
      });
      const resIds = new Set(courtReservations.map((r) => r.id));
      payments = payments.filter((p) => resIds.has(p.reservationId));
    }

    let advanceRevenue = 0;
    let finalPaymentRevenue = 0;
    let efectivo = 0;
    let qr = 0;

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
    }

    const totalRevenue = Number((advanceRevenue + finalPaymentRevenue).toFixed(2));

    return {
      totalRevenue,
      advanceRevenue: Number(advanceRevenue.toFixed(2)),
      finalPaymentRevenue: Number(finalPaymentRevenue.toFixed(2)),
      byPaymentMethod: {
        efectivo: Number(efectivo.toFixed(2)),
        qr: Number(qr.toFixed(2)),
      },
      totalTransactions: payments.length,
    };
  }
}
