import {
  ArrayMinSize,
  IsArray,
  IsInt,
  Matches,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ScheduleItemDto {
  @IsInt({ message: 'El día de la semana debe ser un número entero' })
  @Min(1, { message: 'El día de la semana mínimo es 1 (Lunes)' })
  @Max(7, { message: 'El día de la semana máximo es 7 (Domingo)' })
  dayOfWeek: number;

  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, {
    message: 'La hora de apertura debe tener formato HH:mm (ej. 08:00)',
  })
  openTime: string;

  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, {
    message: 'La hora de cierre debe tener formato HH:mm (ej. 23:00)',
  })
  closeTime: string;
}

export class SetWeeklyScheduleDto {
  @IsArray({ message: 'Los horarios deben ser proporcionados en una lista' })
  @ArrayMinSize(1, { message: 'Debe configurar al menos un día' })
  @ValidateNested({ each: true })
  @Type(() => ScheduleItemDto)
  schedules: ScheduleItemDto[];
}
