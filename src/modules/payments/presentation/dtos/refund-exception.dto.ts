import {
  IsOptional,
  IsNotEmpty,
  IsNumber,
  IsPositive,
  IsString,
} from 'class-validator';

export class RefundExceptionDto {
  @IsNumber({}, { message: 'El monto a devolver debe ser un número válido' })
  @IsPositive({ message: 'El monto a devolver debe ser positivo' })
  amount: number;

  @IsString({ message: 'El motivo es obligatorio' })
  @IsNotEmpty({ message: 'El motivo no puede estar vacío' })
  reason: string;

  // Compatibilidad del cliente anterior: la identidad efectiva se toma del JWT.
  @IsOptional()
  @IsString({ message: 'El responsable debe ser texto' })
  @IsNotEmpty({ message: 'El responsable que autoriza no puede estar vacío' })
  authorizedBy?: string;
}
