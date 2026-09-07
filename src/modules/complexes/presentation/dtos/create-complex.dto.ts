import { IsNotEmpty, IsOptional, IsString, IsUrl } from 'class-validator';

export class CreateComplexDto {
  @IsString({ message: 'El nombre debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'El nombre del complejo es obligatorio' })
  name: string;

  @IsString({ message: 'La ubicación debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'La ubicación del complejo es obligatoria' })
  location: string;

  @IsString({ message: 'La información de contacto debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'La información de contacto es obligatoria' })
  contactInfo: string;

  @IsOptional()
  @IsString()
  paymentQrUrl?: string;
}
