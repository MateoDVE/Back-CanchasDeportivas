import { Injectable, Inject } from '@nestjs/common';
import { IPaymentRepository, PAYMENT_REPOSITORY } from '../../domain/repositories/payment.repository.interface';
import { IReservationRepository, RESERVATION_REPOSITORY } from '../../../reservations/domain/repositories/reservation.repository.interface';
import { ICourtRepository, COURT_REPOSITORY } from '../../../courts/domain/repositories/court.repository.interface';
import { IUserRepository, USER_REPOSITORY } from '../../../users/domain/repositories/user.repository.interface';
import { IComplexRepository, COMPLEX_REPOSITORY } from '../../../complexes/domain/repositories/complex.repository.interface';

export interface PendingPaymentItemDto {
  paymentId: number;
  reservationId: string;
  amount: number;
  paymentType: string;
  paymentMethod: string;
  receiptImageUrl: string | null;
  paymentStatus: string;
  reservationStatus: string;
  reservationDate: string;
  startTime: string;
  endTime: string;
  totalPrice: number;
  advanceRequired: number;
  pendingBalance: number;
  client: {
    id: string;
    name: string;
    email: string;
    phone: string;
    ci: string;
  } | null;
  court: {
    id: number;
    name: string;
    courtType: string;
  } | null;
  complex: {
    id: number;
    name: string;
  } | null;
  createdAt: Date;
}

/**
 * @reference HU-SEC-07 Consultar solicitudes pendientes
 * @reference HU-SEC-08 Visualizar comprobante
 */
@Injectable()
export class GetPendingPaymentsUseCase {
  constructor(
    @Inject(PAYMENT_REPOSITORY)
    private readonly paymentRepository: IPaymentRepository,
    @Inject(RESERVATION_REPOSITORY)
    private readonly reservationRepository: IReservationRepository,
    @Inject(COURT_REPOSITORY)
    private readonly courtRepository: ICourtRepository,
    @Inject(COMPLEX_REPOSITORY)
    private readonly complexRepository: IComplexRepository,
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
  ) {}

  async execute(): Promise<PendingPaymentItemDto[]> {
    const payments = await this.paymentRepository.findPendingPayments();
    const result: PendingPaymentItemDto[] = [];

    for (const payment of payments) {
      const reservation = await this.reservationRepository.findById(payment.reservationId);
      if (!reservation) continue;

      const client = await this.userRepository.findById(reservation.clientId);
      const court = await this.courtRepository.findById(reservation.courtId);
      const complex = court ? await this.complexRepository.findById(court.complexId) : null;

      result.push({
        paymentId: payment.id,
        reservationId: reservation.id,
        amount: payment.amount,
        paymentType: payment.paymentType,
        paymentMethod: payment.paymentMethod,
        receiptImageUrl: payment.receiptImageUrl,
        paymentStatus: payment.status,
        reservationStatus: reservation.status,
        reservationDate: reservation.reservationDate,
        startTime: reservation.startTime,
        endTime: reservation.endTime,
        totalPrice: reservation.totalPrice,
        advanceRequired: reservation.advanceRequired,
        pendingBalance: reservation.pendingBalance,
        client: client
          ? {
              id: client.id,
              name: client.name,
              email: client.email,
              phone: client.phone,
              ci: client.ci,
            }
          : null,
        court: court
          ? {
              id: court.id,
              name: court.name,
              courtType: court.courtType,
            }
          : null,
        complex: complex
          ? {
              id: complex.id,
              name: complex.name,
            }
          : null,
        createdAt: payment.createdAt,
      });
    }

    return result;
  }
}
