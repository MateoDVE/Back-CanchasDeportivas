import { IsNotEmpty, IsString } from 'class-validator';

export class UploadReceiptDto {
  @IsString({ message: 'La URL o ruta del comprobante debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'El comprobante de pago es obligatorio' })
  receiptImageUrl: string;
}
