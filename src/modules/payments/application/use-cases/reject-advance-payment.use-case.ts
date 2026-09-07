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
} from '../../../../common/domain/exceptions/domain.exception';

export interface RejectAdvancePaymentInput {
  paymentId: number;
  secretaryId: string;
  reason: string;
}

/**
 * @reference HU-SEC-10 Rechazar comprobante
 */
@Injectable()
export class RejectAdvancePaymentUseCase {
  constructor(
    @Inject(PAYMENT_REPOSITORY)
    private readonly paymentRepository: IPaymentRepository,
    @Inject(RESERVATION_REPOSITORY)
    private readonly reservationRepository: IReservationRepository,
  ) {}

  async execute(input: RejectAdvancePaymentInput) {
    const payment = await this.paymentRepository.findById(input.paymentId);
    if (!payment) {
      throw new EntityNotFoundException(`El registro de pago con ID ${input.paymentId} no existe.`);
    }

    const reservation = await this.reservationRepository.findById(payment.reservationId);
    if (!reservation) {
      throw new EntityNotFoundException(`La reserva asociada con ID ${payment.reservationId} no existe.`);
    }

    // 1. Rechazar el pago
    payment.reject(input.secretaryId, input.reason);
    await this.paymentRepository.update(payment);

    // 2. Cancelar la reserva liberando el horario
    reservation.cancel(`Comprobante rechazado por ${input.secretaryId}: ${input.reason}`);
    await this.reservationRepository.update(reservation);

    return {
      paymentId: payment.id,
      reservationId: reservation.id,
      paymentStatus: payment.status,
      reservationStatus: reservation.status,
      rejectionReason: payment.rejectionReason,
      handledBy: payment.handledBy,
    };
  }
}
