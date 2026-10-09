import { MaxLength } from 'class-validator';
import { Max } from 'class-validator';
import { IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CloseCashShiftDto {
  @IsNumber({ maxDecimalPlaces: 2, allowNaN: false, allowInfinity: false }, { message: 'El monto físico declarado debe ser un número válido' })
  @Min(0, { message: 'El monto físico declarado debe ser mayor o igual a 0' })
  @IsNotEmpty({ message: 'El monto físico declarado es obligatorio' })
  @Max(99999999.99)
  totalDeclaredCash: number;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;

  @IsOptional()
  @IsString()
  date?: string;
}
