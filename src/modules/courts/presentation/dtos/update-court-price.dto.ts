import { Max } from 'class-validator';
import { IsNumber, IsPositive } from 'class-validator';

export class UpdateCourtPriceDto {
  @IsNumber({ maxDecimalPlaces: 2, allowNaN: false, allowInfinity: false }, { message: 'El precio por hora debe ser un número válido' })
  @IsPositive({ message: 'El precio por hora debe ser mayor a 0' })
  @Max(99999999.99)
  pricePerHour: number;
}
