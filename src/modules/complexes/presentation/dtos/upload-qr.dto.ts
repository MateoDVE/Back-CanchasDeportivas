import { IsNotEmpty, IsString } from 'class-validator';

export class UploadComplexQrDto {
  @IsString()
  @IsNotEmpty({ message: 'La URL del QR de pago es obligatoria' })
  paymentQrUrl: string;
}
