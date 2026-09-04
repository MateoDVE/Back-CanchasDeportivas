import { DomainException, ValidationException } from '../../../../common/domain/exceptions/domain.exception';

export type PaymentType = 'ANTICIPO' | 'SALDO_FINAL';
export type PaymentMethod = 'QR' | 'EFECTIVO';
export type PaymentStatus = 'PENDING' | 'VALIDATED' | 'REJECTED';

export class Payment {
  constructor(
    public id: number,
    public readonly reservationId: string,
    public readonly amount: number,
    public readonly paymentType: PaymentType,
    public readonly paymentMethod: PaymentMethod,
    public receiptImageUrl: string | null,
    private _status: PaymentStatus,
    private _handledBy: string | null = null,
    private _rejectionReason: string | null = null,
    public readonly createdAt: Date = new Date(),
  ) {
    if (amount <= 0 || isNaN(amount)) {
      throw new ValidationException('El monto de pago debe ser mayor a 0.');
    }
  }

  get status(): PaymentStatus {
    return this._status;
  }

  get handledBy(): string | null {
    return this._handledBy;
  }

  get rejectionReason(): string | null {
    return this._rejectionReason;
  }

  public validate(handledByUserId: string): void {
    if (this._status !== 'PENDING') {
      throw new DomainException(
        `Solo se pueden validar pagos en estado PENDING. Estado actual: ${this._status}`,
      );
    }
    if (!handledByUserId) {
      throw new ValidationException('Se requiere el identificador de la secretaria responsable.');
    }
    this._status = 'VALIDATED';
    this._handledBy = handledByUserId;
  }

  public reject(handledByUserId: string, reason: string): void {
    if (this._status !== 'PENDING') {
      throw new DomainException(
        `Solo se pueden rechazar pagos en estado PENDING. Estado actual: ${this._status}`,
      );
    }
    if (!reason || reason.trim() === '') {
      throw new ValidationException('El motivo de rechazo del comprobante es obligatorio.');
    }
    this._status = 'REJECTED';
    this._handledBy = handledByUserId;
    this._rejectionReason = reason.trim();
  }
}
