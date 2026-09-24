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
  ForbiddenException,
  ValidationException,
} from '../../../../common/domain/exceptions/domain.exception';
import { Payment } from '../../domain/entities/payment.entity';
import { SupabaseStorageService } from '../../../../common/supabase/supabase-storage.service';

export interface UploadReceiptInput {
  reservationId: string;
  clientId: string;
  userRole?: string;
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
    private readonly storageService: SupabaseStorageService,
  ) {}

  async execute(input: UploadReceiptInput): Promise<UploadReceiptOutputDto> {
    if (!input.receiptImageUrl || input.receiptImageUrl.trim() === '') {
      throw new ValidationException(
        'La URL o archivo del comprobante de pago es obligatorio.',
      );
    }

    const reservation = await this.reservationRepository.findById(
      input.reservationId,
    );
    if (!reservation) {
      throw new EntityNotFoundException(
        `La reserva con ID ${input.reservationId} no existe.`,
      );
    }

    // Verificar que la reserva pertenezca al cliente (o al personal administrativo)
    const isStaff =
      input.userRole === 'ADMIN' || input.userRole === 'SECRETARIA';
    if (!isStaff && reservation.clientId !== input.clientId) {
      throw new ForbiddenException(
        'No tiene autorización para adjuntar comprobante a esta reserva.',
      );
    }

    if (
      !['TEMPORAL', 'PENDING_VALIDATION'].includes(reservation.status) ||
      reservation.isExpired()
    ) {
      throw new ValidationException(
        'La reserva no admite comprobantes o ya expiró.',
      );
    }

    // Subir imagen decodificada a Supabase Storage bucket 'payment-receipts'
    const publicReceiptUrl = await this.storageService.uploadFile(
      'payment-receipts',
      input.reservationId,
      input.receiptImageUrl.trim(),
    );

    if (reservation.status === 'TEMPORAL')
      reservation.markAsPendingValidation();
    const payment = await this.paymentRepository.submitReceipt(
      reservation,
      publicReceiptUrl,
      input.clientId,
    );

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
