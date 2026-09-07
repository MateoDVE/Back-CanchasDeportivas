import { IsInt, IsNotEmpty, IsPositive, Matches } from 'class-validator';

export class CreateReservationRequestDto {
  @IsInt({ message: 'El ID de la cancha debe ser un número entero' })
  @IsPositive({ message: 'El ID de la cancha debe ser positivo' })
  courtId: number;

  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'La fecha de reserva debe tener el formato YYYY-MM-DD',
  })
  @IsNotEmpty({ message: 'La fecha de reserva es obligatoria' })
  date: string;

  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, {
    message: 'La hora de inicio debe tener el formato HH:mm (ej. 08:00 o 19:30)',
  })
  @IsNotEmpty({ message: 'La hora de inicio es obligatoria' })
  startTime: string;

  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, {
    message: 'La hora de fin debe tener el formato HH:mm (ej. 09:00 o 20:30)',
  })
  @IsNotEmpty({ message: 'La hora de fin es obligatoria' })
  endTime: string;
}
