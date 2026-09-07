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
import { Payment } from '../../domain/entities/payment.entity';

export interface RegisterRefundExceptionInput {
  reservationId: string;
  amount: number;
  reason: string;
  authorizedBy: string;
  secretaryId: string;
}

/**
 * @reference HU-SEC-21 Gestionar excepciones de devolución
 */
@Injectable()
export class RegisterRefundExceptionUseCase {
  constructor(
    @Inject(PAYMENT_REPOSITORY)
    private readonly paymentRepository: IPaymentRepository,
    @Inject(RESERVATION_REPOSITORY)
    private readonly reservationRepository: IReservationRepository,
  ) {}

  async execute(input: RegisterRefundExceptionInput) {
    const reservation = await this.reservationRepository.findById(input.reservationId);
    if (!reservation) {
      throw new EntityNotFoundException(`Reserva ${input.reservationId} no encontrada.`);
    }

    if (!input.reason || input.reason.trim() === '') {
      throw new ValidationException('El motivo de la excepción de devolución es obligatorio.');
    }

    if (!input.authorizedBy || input.authorizedBy.trim() === '') {
      throw new ValidationException('El responsable que autoriza la excepción es obligatorio.');
    }

    const auditReason = `Excepción de devolución autorizada por: ${input.authorizedBy}. Motivo: ${input.reason}`;

    const refundPayment = new Payment(
      0,
      reservation.id,
      input.amount,
      'DEVOLUCION',
      'EFECTIVO',
      null,
      'REFUNDED',
      input.secretaryId,
      auditReason,
      new Date(),
    );

    const savedPayment = await this.paymentRepository.save(refundPayment);

    // Actualizar historial en la reserva
    reservation.cancellationReason = `${reservation.cancellationReason || ''} [DEVOLUCION: ${input.amount} Bs - ${auditReason}]`.trim();
    await this.reservationRepository.update(reservation);

    return {
      payment: savedPayment,
      reservationId: reservation.id,
      refundedAmount: input.amount,
      authorizedBy: input.authorizedBy,
      handledBy: input.secretaryId,
    };
  }
}
