import { Injectable, Inject } from '@nestjs/common';
import { IPaymentRepository, PAYMENT_REPOSITORY } from '../../domain/repositories/payment.repository.interface';
import { IReservationRepository, RESERVATION_REPOSITORY } from '../../../reservations/domain/repositories/reservation.repository.interface';
import {
  EntityNotFoundException,
  ForbiddenException,
  ValidationException,
} from '../../../../common/domain/exceptions/domain.exception';
import { Payment } from '../../domain/entities/payment.entity';

export interface UploadReceiptInput {
  reservationId: string;
  clientId: string;
  receiptImageUrl: string;
}

export interface UploadReceiptOutputDto {
  paymentId: number;
  reservationId: string;
  amount: number;
  paymentType: string;
  paymentMethod: string;
  receiptImageUrl: string | null;
  paymentStatus: string;
  reservationStatus: string;
  createdAt: Date;
}

/**
 * @reference HU-CLI-16 Adjuntar comprobante
 */
@Injectable()
export class UploadReceiptUseCase {
  constructor(
    @Inject(PAYMENT_REPOSITORY)
    private readonly paymentRepository: IPaymentRepository,
    @Inject(RESERVATION_REPOSITORY)
    private readonly reservationRepository: IReservationRepository,
  ) {}

  async execute(input: UploadReceiptInput): Promise<UploadReceiptOutputDto> {
    if (!input.receiptImageUrl || input.receiptImageUrl.trim() === '') {
      throw new ValidationException('La URL o archivo del comprobante de pago es obligatorio.');
    }

    const reservation = await this.reservationRepository.findById(input.reservationId);
    if (!reservation) {
      throw new EntityNotFoundException(`La reserva con ID ${input.reservationId} no existe.`);
    }

    // Verificar que la reserva pertenezca al cliente
    if (reservation.clientId !== input.clientId) {
      throw new ForbiddenException('No tiene autorización para adjuntar comprobante a esta reserva.');
    }

    // La entidad valida que status sea TEMPORAL y que no haya expirado
    reservation.markAsPendingValidation();

    // Crear el pago del anticipo (25%)
    const payment = await this.paymentRepository.save({
      reservationId: reservation.id,
      amount: reservation.advanceRequired,
      paymentType: 'ANTICIPO',
      paymentMethod: 'QR',
      receiptImageUrl: input.receiptImageUrl.trim(),
      status: 'PENDING',
      handledBy: null,
      rejectionReason: null,
      validate(secId: string) { this.validate(secId); },
      reject(secId: string, reason: string) { this.reject(secId, reason); },
      createdAt: new Date(),
    });

    // Guardar el cambio de estado de la reserva a PENDING_VALIDATION
    await this.reservationRepository.update(reservation);

    return {
      paymentId: payment.id,
      reservationId: reservation.id,
      amount: payment.amount,
      paymentType: payment.paymentType,
      paymentMethod: payment.paymentMethod,
      receiptImageUrl: payment.receiptImageUrl,
      paymentStatus: payment.status,
      reservationStatus: reservation.status,
      createdAt: payment.createdAt,
    };
  }
}
