import { IsIn, IsNotEmpty, IsNumber, IsPositive } from 'class-validator';
import { PaymentMethod } from '../../domain/entities/payment.entity';

export class FinalPaymentDto {
  @IsNumber({}, { message: 'El monto debe ser un número válido' })
  @IsPositive({ message: 'El monto debe ser positivo' })
  amount: number;

  @IsIn(['EFECTIVO', 'QR'], { message: 'El método de pago debe ser EFECTIVO o QR' })
  @IsNotEmpty({ message: 'El método de pago es obligatorio' })
  paymentMethod: PaymentMethod;
}
