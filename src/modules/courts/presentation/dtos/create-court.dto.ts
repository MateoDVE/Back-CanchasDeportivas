import { IsIn, IsInt, IsNotEmpty, IsNumber, IsPositive, IsString } from 'class-validator';
import { CourtType } from '../../domain/entities/court.entity';

export class CreateCourtDto {
  @IsInt({ message: 'El ID del complejo debe ser un número entero' })
  @IsPositive({ message: 'El ID del complejo debe ser positivo' })
  complexId: number;

  @IsString({ message: 'El nombre debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'El nombre de la cancha es obligatorio' })
  name: string;

  @IsIn(['Futsal', 'Wally', 'Racket'], {
    message: 'El tipo de cancha debe ser uno de los siguientes: Futsal, Wally, Racket',
  })
  courtType: CourtType;

  @IsNumber({}, { message: 'El precio por hora debe ser un número' })
  @IsPositive({ message: 'El precio por hora debe ser mayor a 0' })
  pricePerHour: number;
}
