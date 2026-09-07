import { IsInt, IsNotEmpty, IsOptional, IsPositive, IsString, Matches } from 'class-validator';

export class ManualReservationDto {
  @IsString({ message: 'El ID del cliente es obligatorio' })
  @IsNotEmpty({ message: 'El ID del cliente no puede estar vacío' })
  clientId: string;

  @IsInt({ message: 'El ID de la cancha debe ser un número entero' })
  @IsPositive({ message: 'El ID de la cancha debe ser positivo' })
  courtId: number;

  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'La fecha de reserva debe tener el formato YYYY-MM-DD',
  })
  @IsNotEmpty({ message: 'La fecha de reserva es obligatoria' })
  reservationDate: string;

  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, {
    message: 'La hora de inicio debe tener el formato HH:mm',
  })
  @IsNotEmpty({ message: 'La hora de inicio es obligatoria' })
  startTime: string;

  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, {
    message: 'La hora de fin debe tener el formato HH:mm',
  })
  @IsNotEmpty({ message: 'La hora de fin es obligatoria' })
  endTime: string;

  @IsOptional()
  @IsString()
  origin?: 'MANUAL' | 'WHATSAPP';
}
