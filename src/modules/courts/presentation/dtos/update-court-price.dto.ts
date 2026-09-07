import { IsNumber, IsPositive } from 'class-validator';

export class UpdateCourtPriceDto {
  @IsNumber({}, { message: 'El precio por hora debe ser un número válido' })
  @IsPositive({ message: 'El precio por hora debe ser mayor a 0' })
  pricePerHour: number;
}
