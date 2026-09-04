import { DomainException, ValidationException } from '../../../../common/domain/exceptions/domain.exception';
import { TimeSlot } from '../value-objects/time-slot.vo';

export type ReservationStatus =
  | 'TEMPORAL'
  | 'PENDING_VALIDATION'
  | 'CONFIRMED'
  | 'CANCELLED'
  | 'REPROGRAMMED'
  | 'EXPIRED'
  | 'NO_SHOW'
  | 'COMPLETED';

export class Reservation {
  constructor(
    public readonly id: string,
    public readonly clientId: string,
    public readonly courtId: number,
    public readonly reservationDate: string, // YYYY-MM-DD
    public readonly startTime: string,       // HH:mm
    public readonly endTime: string,         // HH:mm
    public readonly pricePerHour: number,    // Precio congelado históricamente
    public readonly totalPrice: number,
    public readonly advanceRequired: number, // Exactamente 25%
    private _status: ReservationStatus,
    private _expiresAt: Date | null,
    public readonly createdBy: string,
    public readonly parentReservationId?: string | null,
    public cancellationReason?: string | null,
    public readonly createdAt: Date = new Date(),
  ) {}

  public static createTemporal(props: {
    id: string;
    clientId: string;
    courtId: number;
    reservationDate: string;
    timeSlot: TimeSlot;
    pricePerHour: number;
    createdBy: string;
  }): Reservation {
    if (props.pricePerHour <= 0) {
      throw new ValidationException('El precio de la cancha debe ser mayor a 0.');
    }

    const totalPrice = Number(
      (props.timeSlot.durationHours * props.pricePerHour).toFixed(2),
    );
    const advanceRequired = Number((totalPrice * 0.25).toFixed(2));
    // Regla RN-03 & HU-CLI-12: Bloqueo de 5 minutos exactos
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    return new Reservation(
      props.id,
      props.clientId,
      props.courtId,
      props.reservationDate,
      props.timeSlot.startTime,
      props.timeSlot.endTime,
      props.pricePerHour,
      totalPrice,
      advanceRequired,
      'TEMPORAL',
      expiresAt,
      props.createdBy,
      null,
      null,
      new Date(),
    );
  }

  get status(): ReservationStatus {
    return this._status;
  }

  get expiresAt(): Date | null {
    return this._expiresAt;
  }

  get pendingBalance(): number {
    return Number((this.totalPrice - this.advanceRequired).toFixed(2));
  }

  public isExpired(): boolean {
    if (this._status !== 'TEMPORAL' || !this._expiresAt) {
      return false;
    }
    return new Date() > this._expiresAt;
  }

  public secondsRemaining(): number {
    if (this._status !== 'TEMPORAL' || !this._expiresAt) {
      return 0;
    }
    const diffMs = this._expiresAt.getTime() - Date.now();
    return Math.max(0, Math.floor(diffMs / 1000));
  }

  public markAsPendingValidation(): void {
    if (this._status !== 'TEMPORAL') {
      throw new DomainException(
        `Solo una reserva en estado TEMPORAL puede pasar a PENDING_VALIDATION. Estado actual: ${this._status}`,
      );
    }
    if (this.isExpired()) {
      this._status = 'EXPIRED';
      throw new DomainException(
        'El tiempo de reserva temporal (5 minutos) ha expirado. Por favor seleccione un horario nuevamente.',
      );
    }
    this._status = 'PENDING_VALIDATION';
    // El cronómetro se detiene al entrar en validación humana
  }

  public confirm(): void {
    if (this._status !== 'PENDING_VALIDATION' && this._status !== 'TEMPORAL') {
      throw new DomainException(
        `No se puede confirmar una reserva en estado ${this._status}.`,
      );
    }
    this._status = 'CONFIRMED';
  }

  public cancel(reason?: string): void {
    this._status = 'CANCELLED';
    if (reason) {
      this.cancellationReason = reason;
    }
  }

  public expire(): void {
    if (this._status === 'TEMPORAL') {
      this._status = 'EXPIRED';
    }
  }
}
