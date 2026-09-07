import { Injectable, Inject } from '@nestjs/common';
import {
  ICashShiftRepository,
  CASH_SHIFT_REPOSITORY,
} from '../../domain/repositories/cash-shift.repository.interface';
import {
  IPaymentRepository,
  PAYMENT_REPOSITORY,
} from '../../../payments/domain/repositories/payment.repository.interface';

export interface ShiftPaymentItemDto {
  id: number;
  amount: number;
  paymentType: string;
  paymentMethod: string;
  createdAt: string;
  reservationId: string;
}

export interface CurrentShiftSummaryDto {
  secretaryId: string;
  shiftDate: string;
  date: string;
  totalCollected: number;
  totalCash: number;
  totalQr: number;
  transactionsCount: number;
  payments: ShiftPaymentItemDto[];
  totalSystemCash: number;
  totalSystemQr: number;
  totalSystem: number;
  paymentsCount: number;
  isAlreadyClosed: boolean;
  closedAt: Date | null;
  totalDeclaredCash: number | null;
  difference: number | null;
}

/**
 * @reference HU-SEC-25 Consultar ingresos de la jornada
 */
@Injectable()
export class GetCurrentShiftSummaryUseCase {
  constructor(
    @Inject(CASH_SHIFT_REPOSITORY)
    private readonly cashShiftRepository: ICashShiftRepository,
    @Inject(PAYMENT_REPOSITORY)
    private readonly paymentRepository: IPaymentRepository,
  ) {}

  async execute(
    secretaryId: string,
    date?: string,
    userRole?: string,
  ): Promise<CurrentShiftSummaryDto> {
    const shiftDate = date || new Date().toISOString().split('T')[0];

    let payments = await this.paymentRepository.findByHandlerAndDate(secretaryId, shiftDate);
    if (userRole === 'ADMIN' || payments.length === 0) {
      const allDatePayments = await this.paymentRepository.findByDateRange(shiftDate, shiftDate);
      if (userRole === 'ADMIN' || allDatePayments.length > 0) {
        payments = allDatePayments;
      }
    }

    const validatedPayments = payments.filter((p) => p.status === 'VALIDATED');

    const totalSystemCash = Number(
      validatedPayments
        .filter((p) => p.paymentMethod === 'EFECTIVO')
        .reduce((sum, p) => sum + p.amount, 0)
        .toFixed(2),
    );

    const totalSystemQr = Number(
      validatedPayments
        .filter((p) => p.paymentMethod === 'QR')
        .reduce((sum, p) => sum + p.amount, 0)
        .toFixed(2),
    );

    const totalSystem = Number((totalSystemCash + totalSystemQr).toFixed(2));

    const existingShift = await this.cashShiftRepository.findBySecretaryAndDate(
      secretaryId,
      shiftDate,
    );

    const paymentsList: ShiftPaymentItemDto[] = validatedPayments.map((p) => ({
      id: p.id,
      amount: p.amount,
      paymentType: p.paymentType,
      paymentMethod: p.paymentMethod,
      createdAt: p.createdAt instanceof Date ? p.createdAt.toISOString() : new Date(p.createdAt).toISOString(),
      reservationId: p.reservationId,
    }));

    return {
      secretaryId,
      shiftDate,
      date: shiftDate,
      totalCollected: totalSystem,
      totalCash: totalSystemCash,
      totalQr: totalSystemQr,
      transactionsCount: validatedPayments.length,
      payments: paymentsList,
      totalSystemCash,
      totalSystemQr,
      totalSystem,
      paymentsCount: validatedPayments.length,
      isAlreadyClosed: existingShift ? existingShift.isClosed : false,
      closedAt: existingShift ? existingShift.closedAt : null,
      totalDeclaredCash: existingShift ? existingShift.totalDeclaredCash : null,
      difference: existingShift ? existingShift.difference : null,
    };
  }
}
