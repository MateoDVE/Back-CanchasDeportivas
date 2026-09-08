import { ValidationException } from '../../../../common/domain/exceptions/domain.exception';

export type CourtType = 'Futsal' | 'Wally' | 'Racket' | 'Padel';

export class Court {
  constructor(
    public id: number,
    public complexId: number,
    public name: string,
    public courtType: CourtType,
    private _pricePerHour: number,
    public isActive: boolean = true,
    public images: string[] = [],
  ) {
    this.validatePrice(_pricePerHour);
  }

  get pricePerHour(): number {
    return this._pricePerHour;
  }

  public updatePrice(newPrice: number): void {
    this.validatePrice(newPrice);
    this._pricePerHour = Number(newPrice.toFixed(2));
  }

  private validatePrice(price: number): void {
    if (price <= 0 || isNaN(price)) {
      throw new ValidationException('El precio por hora debe ser un número mayor a cero.');
    }
  }

  public activate(): void {
    this.isActive = true;
  }

  public deactivate(): void {
    this.isActive = false;
  }
}
