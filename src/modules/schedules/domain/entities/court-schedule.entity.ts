import { ValidationException } from '../../../../common/domain/exceptions/domain.exception';

export class CourtSchedule {
  constructor(
    public id: number,
    public courtId: number,
    public dayOfWeek: number | null, // 1 = Lunes, 7 = Domingo
    public specificDate: string | null,
    public openTime: string,
    public closeTime: string,
  ) {
    this.validate();
  }

  private validate(): void {
    if (this.dayOfWeek !== null && (this.dayOfWeek < 1 || this.dayOfWeek > 7)) {
      throw new ValidationException('El día de la semana debe estar entre 1 (Lunes) y 7 (Domingo).');
    }

    if (this.openTime >= this.closeTime) {
      throw new ValidationException(
        `La hora de apertura (${this.openTime}) debe ser anterior a la hora de cierre (${this.closeTime}).`,
      );
    }
  }
}
