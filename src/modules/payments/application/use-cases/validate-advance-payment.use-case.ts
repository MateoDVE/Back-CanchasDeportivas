import { Injectable, Inject } from '@nestjs/common';
import { IPaymentRepository, PAYMENT_REPOSITORY } from '../../domain/repositories/payment.repository.interface';
import { IReservationRepository, RESERVATION_REPOSITORY } from '../../../reservations/domain/repositories/reservation.repository.interface';
import { EntityNotFoundException, ValidationException } from '../../../../common/domain/exceptions/domain.exception';

export interface ValidateAdvancePaymentInput {
  paymentId: number;
  secretaryId: string;
}

export interface ValidateAdvancePaymentOutputDto {
  paymentId: number;
  reservationId: string;
  paymentStatus: string;
  reservationStatus: string;
  amount: number;
  handledBy: string | null;
  validatedAt: Date;
}

/**
 * @reference HU-SEC-09 Validar anticipo
 */
@Injectable()
export class ValidateAdvancePaymentUseCase {
  constructor(
    @Inject(PAYMENT_REPOSITORY)
    private readonly paymentRepository: IPaymentRepository,
    @Inject(RESERVATION_REPOSITORY)
    private readonly reservationRepository: IReservationRepository,
  ) {}

  async execute(input: ValidateAdvancePaymentInput): Promise<ValidateAdvancePaymentOutputDto> {
    const payment = await this.paymentRepository.findById(input.paymentId);
    if (!payment) {
      throw new EntityNotFoundException(`El registro de pago con ID ${input.paymentId} no existe.`);
    }

    const reservation = await this.reservationRepository.findById(payment.reservationId);
    if (!reservation) {
      throw new EntityNotFoundException(`La reserva asociada con ID ${payment.reservationId} no existe.`);
    }

    // 1. Validar el pago en Dominio
    payment.validate(input.secretaryId);
    await this.paymentRepository.update(payment);

    // 2. Confirmar la reserva en Dominio
    reservation.confirm();
    await this.reservationRepository.update(reservation);

    return {
      paymentId: payment.id,
      reservationId: reservation.id,
      paymentStatus: payment.status,
      reservationStatus: reservation.status,
      amount: payment.amount,
      handledBy: payment.handledBy,
      validatedAt: new Date(),
    };
  }
}
