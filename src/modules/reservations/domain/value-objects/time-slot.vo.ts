import {
  InvalidReservationDurationException,
  ValidationException,
} from '../../../../common/domain/exceptions/domain.exception';

/**
 * @reference RN-01 Duración mínima y fracciones prohibidas
 * @reference RN-02 Flexibilidad de hora de inicio (:00 o :30)
 * @reference HU-CLI-10 Seleccionar horario
 */
export class TimeSlot {
  private readonly _durationHours: number;

  constructor(
    public readonly startTime: string,
    public readonly endTime: string,
  ) {
    this.validateFormat(startTime, 'inicio');
    this.validateFormat(endTime, 'fin');

    const startMinutes = this.toMinutes(startTime);
    const endMinutes = this.toMinutes(endTime);

    if (endMinutes <= startMinutes) {
      throw new ValidationException(
        `La hora de fin (${endTime}) debe ser posterior a la hora de inicio (${startTime}).`,
      );
    }

    const durationMinutes = endMinutes - startMinutes;
    const hours = durationMinutes / 60;

    // Regla RN-01: Duración mínima 1 hora y solo múltiplos enteros de hora (no fracciones)
    if (hours < 1 || !Number.isInteger(hours)) {
      throw new InvalidReservationDurationException(
        `Duración inválida (${hours} horas). La duración mínima es de 1 hora y solo se admiten múltiplos enteros (ej. 1h, 2h, 3h). No se permiten fracciones.`,
      );
    }

    // Regla RN-02: Minutos permitidos :00 o :30
    const startMins = parseInt(startTime.split(':')[1], 10);
    const endMins = parseInt(endTime.split(':')[1], 10);
    if (![0, 30].includes(startMins) || ![0, 30].includes(endMins)) {
      throw new ValidationException(
        'Las horas de reserva solo pueden iniciar y finalizar en minuto :00 o :30.',
      );
    }

    this._durationHours = hours;
  }

  get durationHours(): number {
    return this._durationHours;
  }

  public overlapsWith(otherStart: string, otherEnd: string): boolean {
    const s1 = this.toMinutes(this.startTime);
    const e1 = this.toMinutes(this.endTime);
    const s2 = this.toMinutes(otherStart);
    const e2 = this.toMinutes(otherEnd);

    return s1 < e2 && e1 > s2;
  }

  private validateFormat(time: string, label: string): void {
    const regex = /^([01]\d|2[0-3]):[0-5]\d$/;
    if (!regex.test(time)) {
      throw new ValidationException(
        `La hora de ${label} (${time}) no cumple con el formato HH:mm requerido (ej. 08:00, 19:30).`,
      );
    }
  }

  private toMinutes(time: string): number {
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
  }
}
