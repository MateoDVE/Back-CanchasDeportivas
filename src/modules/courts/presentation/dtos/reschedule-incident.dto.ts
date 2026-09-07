import { IsInt, IsNotEmpty, IsOptional, IsPositive, Matches } from 'class-validator';

export class RescheduleIncidentDto {
  @IsOptional()
  @IsInt()
  @IsPositive()
  newCourtId?: number;

  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'La nueva fecha debe tener formato YYYY-MM-DD' })
  @IsNotEmpty()
  newDate: string;

  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'La nueva hora de inicio debe tener formato HH:mm' })
  @IsNotEmpty()
  newStartTime: string;

  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'La nueva hora de fin debe tener formato HH:mm' })
  @IsNotEmpty()
  newEndTime: string;
}
