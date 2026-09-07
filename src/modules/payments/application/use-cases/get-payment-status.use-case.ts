import { Injectable, Inject } from '@nestjs/common';
import {
  IPaymentRepository,
  PAYMENT_REPOSITORY,
} from '../../domain/repositories/payment.repository.interface';
import { Payment } from '../../domain/entities/payment.entity';

export interface PaymentStatusOutputDto {
  reservationId: string;
  hasPayment: boolean;
  status: 'PENDIENTE' | 'COMPROBANTE_ENVIADO' | 'VALIDADO' | 'RECHAZADO' | 'SIN_PAGO';
  amount?: number;
  paymentType?: string;
  paymentMethod?: string;
  receiptImageUrl?: string | null;
  rejectionReason?: string | null;
  handledBy?: string | null;
}

/**
 * @reference HU-CLI-17 Consultar estado del pago
 */
@Injectable()
export class GetPaymentStatusUseCase {
  constructor(
    @Inject(PAYMENT_REPOSITORY)
    private readonly paymentRepository: IPaymentRepository,
  ) {}

  async execute(reservationId: string): Promise<PaymentStatusOutputDto> {
    const payments = await this.paymentRepository.findByReservationId(reservationId);
    if (!payments || payments.length === 0) {
      return {
        reservationId,
        hasPayment: false,
        status: 'SIN_PAGO',
      };
    }

    // El anticipo más reciente
    const advancePayment = payments
      .filter((p) => p.paymentType === 'ANTICIPO')
      .pop() || payments[payments.length - 1];

    let displayStatus: PaymentStatusOutputDto['status'] = 'PENDIENTE';
    if (advancePayment.status === 'VALIDATED') {
      displayStatus = 'VALIDADO';
    } else if (advancePayment.status === 'REJECTED') {
      displayStatus = 'RECHAZADO';
    } else if (advancePayment.receiptImageUrl) {
      displayStatus = 'COMPROBANTE_ENVIADO';
    }

    return {
      reservationId,
      hasPayment: true,
      status: displayStatus,
      amount: advancePayment.amount,
      paymentType: advancePayment.paymentType,
      paymentMethod: advancePayment.paymentMethod,
      receiptImageUrl: advancePayment.receiptImageUrl,
      rejectionReason: advancePayment.rejectionReason,
      handledBy: advancePayment.handledBy,
    };
  }
}
