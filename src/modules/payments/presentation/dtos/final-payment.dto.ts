import { IsIn, IsNotEmpty, IsNumber, IsPositive } from 'class-validator';
import { Transform } from 'class-transformer';
import { PaymentMethod } from '../../domain/entities/payment.entity';

export class FinalPaymentDto {
  @IsNumber({}, { message: 'El monto debe ser un número válido' })
  @IsPositive({ message: 'El monto debe ser positivo' })
  amount: number;

  @Transform(({ value }) => {
    if (typeof value === 'string') {
      const v = value.trim().toUpperCase();
      if (v === 'CASH') return 'EFECTIVO';
      return v;
    }
    return value;
  })
  @IsIn(['EFECTIVO', 'QR', 'CASH'], { message: 'El método de pago debe ser EFECTIVO o QR' })
  @IsNotEmpty({ message: 'El método de pago es obligatorio' })
  paymentMethod: PaymentMethod;
}
