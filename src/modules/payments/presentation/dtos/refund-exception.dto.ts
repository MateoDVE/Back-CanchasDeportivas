import { IsNotEmpty, IsNumber, IsPositive, IsString } from 'class-validator';

export class RefundExceptionDto {
  @IsNumber({}, { message: 'El monto a devolver debe ser un número válido' })
  @IsPositive({ message: 'El monto a devolver debe ser positivo' })
  amount: number;

  @IsString({ message: 'El motivo es obligatorio' })
  @IsNotEmpty({ message: 'El motivo no puede estar vacío' })
  reason: string;

  @IsString({ message: 'El nombre del responsable que autoriza es obligatorio' })
  @IsNotEmpty({ message: 'El responsable que autoriza no puede estar vacío' })
  authorizedBy: string;
}
