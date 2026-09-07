import { IsNotEmpty, Matches } from 'class-validator';

export class SetSpecialScheduleDto {
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'La fecha debe tener formato YYYY-MM-DD' })
  @IsNotEmpty({ message: 'La fecha específica es obligatoria' })
  specificDate: string;

  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, {
    message: 'La hora de apertura debe tener formato HH:mm (ej. 09:00)',
  })
  openTime: string;

  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, {
    message: 'La hora de cierre debe tener formato HH:mm (ej. 18:00)',
  })
  closeTime: string;
}
