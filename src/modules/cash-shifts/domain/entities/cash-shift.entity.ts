import { DomainException, ValidationException } from '../../../../common/domain/exceptions/domain.exception';

export class CashShift {
  constructor(
    public id: number,
    public readonly secretaryId: string,
    public readonly shiftDate: string, // YYYY-MM-DD
    public readonly totalSystemCash: number,
    public readonly totalSystemQr: number,
    public readonly totalSystem: number,
    public totalDeclaredCash: number,
    public difference: number,
    public notes: string | null = null,
    private _isClosed: boolean = false,
    private _closedAt: Date | null = null,
    public readonly createdAt: Date = new Date(),
  ) {
    if (totalDeclaredCash < 0) {
      throw new ValidationException('El monto físico declarado no puede ser negativo.');
    }
  }

  get isClosed(): boolean {
    return this._isClosed;
  }

  get closedAt(): Date | null {
    return this._closedAt;
  }

  public close(totalDeclaredCash: number, notes?: string): void {
    if (this._isClosed) {
      throw new DomainException('Este turno de caja ya se encuentra cerrado e inmutable.');
    }
    if (totalDeclaredCash < 0) {
      throw new ValidationException('El monto físico declarado no puede ser negativo.');
    }
    this.totalDeclaredCash = totalDeclaredCash;
    this.difference = Number((totalDeclaredCash - this.totalSystemCash).toFixed(2));
    this.notes = notes || null;
    this._isClosed = true;
    this._closedAt = new Date();
  }
}
