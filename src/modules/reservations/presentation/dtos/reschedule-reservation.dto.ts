import { IsInt, IsNotEmpty, IsOptional, IsPositive, IsString, Matches } from 'class-validator';

export class RescheduleReservationDto {
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'La nueva fecha debe tener el formato YYYY-MM-DD',
  })
  @IsNotEmpty({ message: 'La nueva fecha es obligatoria' })
  newDate: string;

  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, {
    message: 'La nueva hora de inicio debe tener el formato HH:mm',
  })
  @IsNotEmpty({ message: 'La nueva hora de inicio es obligatoria' })
  newStartTime: string;

  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, {
    message: 'La nueva hora de fin debe tener el formato HH:mm',
  })
  @IsNotEmpty({ message: 'La nueva hora de fin es obligatoria' })
  newEndTime: string;

  @IsOptional()
  @IsInt()
  @IsPositive()
  newCourtId?: number;

  @IsOptional()
  @IsString()
  reason?: string;
}
