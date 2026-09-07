import { ValidationException } from '../../../../common/domain/exceptions/domain.exception';

export class CourtIncident {
  constructor(
    public id: number,
    public courtId: number,
    public startDatetime: Date,
    public endDatetime: Date,
    public reason: string,
    public createdAt: Date = new Date(),
  ) {
    if (this.startDatetime >= this.endDatetime) {
      throw new ValidationException(
        'La fecha y hora de inicio debe ser anterior a la fecha y hora de fin del incidente/mantenimiento.',
      );
    }
    if (!this.reason || this.reason.trim() === '') {
      throw new ValidationException('El motivo del incidente o mantenimiento es obligatorio.');
    }
  }

  public isActiveAt(date: Date): boolean {
    return date >= this.startDatetime && date <= this.endDatetime;
  }
}
