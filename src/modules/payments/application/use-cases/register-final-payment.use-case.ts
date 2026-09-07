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
 * @reference HU-SEC-15 Registrar pago restante (Simulado)
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
    const reservation = await this.reservationRepository.findById(input.reservationId);
    if (!reservation) {
      throw new EntityNotFoundException(`Reserva ${input.reservationId} no encontrada.`);
    }

    if (reservation.pendingBalance <= 0) {
      throw new ValidationException('Esta reserva ya no tiene saldo pendiente por pagar.');
    }

    // Registrar pago final simulado
    const payment = new Payment(
      0, // Asignado por repo
      reservation.id,
      input.amount,
      'SALDO_FINAL',
      input.paymentMethod,
      null,
      'VALIDATED',
      input.secretaryId,
      null,
      new Date(),
    );

    const savedPayment = await this.paymentRepository.save(payment);

    // Marcar saldo como pagado en la reserva
    reservation.markFinalPaymentPaid();
    await this.reservationRepository.update(reservation);

    return {
      payment: savedPayment,
      reservationId: reservation.id,
      totalPrice: reservation.totalPrice,
      pendingBalance: reservation.pendingBalance,
      isFullyPaid: reservation.pendingBalance === 0,
    };
  }
}
