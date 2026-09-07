import { Injectable, Inject } from '@nestjs/common';
import { IReservationRepository, RESERVATION_REPOSITORY } from '../../domain/repositories/reservation.repository.interface';
import { IPaymentRepository, PAYMENT_REPOSITORY } from '../../../payments/domain/repositories/payment.repository.interface';
import { EntityNotFoundException } from '../../../../common/domain/exceptions/domain.exception';

export interface ReservationBalanceOutputDto {
  reservationId: string;
  totalPrice: number;
  advanceRequired: number;
  totalPaid: number;
  pendingBalance: number;
  isFullyPaid: boolean;
  status: string;
}

/**
 * @reference HU-CLI-24 Consultar saldo pendiente (Cliente)
 * @reference HU-SEC-14 Consultar saldo pendiente (Secretaria)
 */
@Injectable()
export class GetReservationBalanceUseCase {
  constructor(
    @Inject(RESERVATION_REPOSITORY)
    private readonly reservationRepository: IReservationRepository,
    @Inject(PAYMENT_REPOSITORY)
    private readonly paymentRepository: IPaymentRepository,
  ) {}

  async execute(reservationId: string): Promise<ReservationBalanceOutputDto> {
    const reservation = await this.reservationRepository.findById(reservationId);
    if (!reservation) {
      throw new EntityNotFoundException(`La reserva con ID ${reservationId} no existe.`);
    }

    const payments = await this.paymentRepository.findByReservationId(reservation.id);
    const validatedPayments = payments.filter((p) => p.status === 'VALIDATED');
    const totalPaid = validatedPayments.reduce((acc, curr) => acc + curr.amount, 0);
    const pendingBalance = Math.max(0, Number((reservation.totalPrice - totalPaid).toFixed(2)));

    return {
      reservationId: reservation.id,
      totalPrice: reservation.totalPrice,
      advanceRequired: reservation.advanceRequired,
      totalPaid: Number(totalPaid.toFixed(2)),
      pendingBalance,
      isFullyPaid: pendingBalance === 0,
      status: reservation.status,
    };
  }
}
