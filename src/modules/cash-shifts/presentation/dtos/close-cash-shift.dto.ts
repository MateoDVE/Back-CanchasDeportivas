import { IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CloseCashShiftDto {
  @IsNumber({}, { message: 'El monto físico declarado debe ser un número válido' })
  @Min(0, { message: 'El monto físico declarado debe ser mayor o igual a 0' })
  @IsNotEmpty({ message: 'El monto físico declarado es obligatorio' })
  totalDeclaredCash: number;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  date?: string;
}
