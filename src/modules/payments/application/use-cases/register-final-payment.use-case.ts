import { Injectable, Inject } from '@nestjs/common';
import {
  IPaymentRepository,
  PAYMENT_REPOSITORY,
} from '../../domain/repositories/payment.repository.interface';
import {
  IReservationRepository,
  RESERVATION_REPOSITORY,
} from '../../../reservations/domain/repositories/reservation.repository.interface';
import {
  EntityNotFoundException,
  ValidationException,
} from '../../../../common/domain/exceptions/domain.exception';
import { Payment, PaymentMethod } from '../../domain/entities/payment.entity';

export interface RegisterFinalPaymentInput {
  reservationId: string;
  amount: number;
  paymentMethod: PaymentMethod;
  secretaryId: string;
}

/**
 * @reference HU-SEC-15 Registrar pago restante
 * @reference HU-CLI-25 Completar pago antes de ingresar
 */
@Injectable()
export class RegisterFinalPaymentUseCase {
  constructor(
    @Inject(PAYMENT_REPOSITORY)
    private readonly paymentRepository: IPaymentRepository,
    @Inject(RESERVATION_REPOSITORY)
    private readonly reservationRepository: IReservationRepository,
  ) {}

  async execute(input: RegisterFinalPaymentInput) {
    const reservation = await this.reservationRepository.findById(
      input.reservationId,
    );
    if (!reservation) {
      throw new EntityNotFoundException(
        `Reserva ${input.reservationId} no encontrada.`,
      );
    }

    if (reservation.status !== 'CONFIRMED')
      throw new ValidationException(
        'Solo se cobra el saldo de reservas confirmadas.',
      );
    const payments = await this.paymentRepository.findByReservationId(
      input.reservationId,
    );
    const paid = payments.reduce(
      (sum, p) =>
        sum +
        (p.status === 'VALIDATED'
          ? p.amount
          : p.status === 'REFUNDED'
            ? -p.amount
            : 0),
      0,
    );
    const pending = Number((reservation.totalPrice - paid).toFixed(2));
    if (
      pending <= 0 ||
      !Number.isFinite(input.amount) ||
      input.amount !== pending
    ) {
      throw new ValidationException(
        'El pago final debe cubrir exactamente el saldo real: ' +
          pending +
          ' Bs.',
      );
    }

    const method: PaymentMethod =
      (input.paymentMethod as string) === 'CASH'
        ? 'EFECTIVO'
        : input.paymentMethod;

    // Registrar pago final validado
    const payment = new Payment(
      0, // Asignado por repo
      reservation.id,
      input.amount,
      'SALDO_FINAL',
      method,
      null,
      'VALIDATED',
      input.secretaryId,
      null,
      new Date(),
    );

    const savedPayment = await this.paymentRepository.save(payment);

    // Marcar saldo como pagado en la reserva
    reservation.applyPaidAmount(paid + savedPayment.amount);

    return {
      payment: savedPayment,
      reservationId: reservation.id,
      totalPrice: reservation.totalPrice,
      pendingBalance: reservation.pendingBalance,
      isFullyPaid: reservation.pendingBalance === 0,
    };
  }
}
