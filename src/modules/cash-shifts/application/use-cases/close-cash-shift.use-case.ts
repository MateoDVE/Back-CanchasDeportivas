import { Injectable, Inject } from '@nestjs/common';
import {
  ICashShiftRepository,
  CASH_SHIFT_REPOSITORY,
} from '../../domain/repositories/cash-shift.repository.interface';
import {
  IPaymentRepository,
  PAYMENT_REPOSITORY,
} from '../../../payments/domain/repositories/payment.repository.interface';
import {
  DomainException,
  ValidationException,
} from '../../../../common/domain/exceptions/domain.exception';
import { CashShift } from '../../domain/entities/cash-shift.entity';

export interface CloseCashShiftInput {
  secretaryId: string;
  totalDeclaredCash: number;
  notes?: string;
  date?: string;
}

/**
 * @reference HU-SEC-26 Realizar cierre de caja
 */
@Injectable()
export class CloseCashShiftUseCase {
  constructor(
    @Inject(CASH_SHIFT_REPOSITORY)
    private readonly cashShiftRepository: ICashShiftRepository,
    @Inject(PAYMENT_REPOSITORY)
    private readonly paymentRepository: IPaymentRepository,
  ) {}

  async execute(input: CloseCashShiftInput): Promise<CashShift> {
    const shiftDate = input.date || new Date().toISOString().split('T')[0];

    const existingShift = await this.cashShiftRepository.findBySecretaryAndDate(
      input.secretaryId,
      shiftDate,
    );

    if (existingShift && existingShift.isClosed) {
      throw new DomainException('El turno de caja de esta fecha ya fue cerrado y es inmutable.');
    }

    if (input.totalDeclaredCash < 0 || isNaN(input.totalDeclaredCash)) {
      throw new ValidationException('El monto físico declarado debe ser mayor o igual a 0.');
    }

    // Calcular cobros reales registrados en el sistema para esta secretaria hoy
    let payments = await this.paymentRepository.findByHandlerAndDate(
      input.secretaryId,
      shiftDate,
    );
    if (payments.length === 0) {
      const allDatePayments = await this.paymentRepository.findByDateRange(shiftDate, shiftDate);
      if (allDatePayments.length > 0) {
        payments = allDatePayments;
      }
    }
    const validatedPayments = payments.filter((p) => p.status === 'VALIDATED');

    const totalSystemCash = Number(
      validatedPayments
        .filter((p) => p.paymentMethod === 'EFECTIVO')
        .reduce((sum, p) => sum + p.amount, 0)
        .toFixed(2),
    );

    const totalSystemQr = Number(
      validatedPayments
        .filter((p) => p.paymentMethod === 'QR')
        .reduce((sum, p) => sum + p.amount, 0)
        .toFixed(2),
    );

    const totalSystem = Number((totalSystemCash + totalSystemQr).toFixed(2));
    const difference = Number((input.totalDeclaredCash - totalSystemCash).toFixed(2));

    let shift: CashShift;
    if (existingShift) {
      existingShift.close(input.totalDeclaredCash, input.notes);
      await this.cashShiftRepository.update(existingShift);
      shift = existingShift;
    } else {
      const newShift = new CashShift(
        0,
        input.secretaryId,
        shiftDate,
        totalSystemCash,
        totalSystemQr,
        totalSystem,
        input.totalDeclaredCash,
        difference,
        input.notes || null,
        true,
        new Date(),
        new Date(),
      );
      shift = await this.cashShiftRepository.save(newShift);
    }

    return shift;
  }
}
