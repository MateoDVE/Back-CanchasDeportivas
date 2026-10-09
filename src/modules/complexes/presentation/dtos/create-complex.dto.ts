import { MaxLength, Matches } from 'class-validator';
import { IsNotEmpty, IsOptional, IsString, IsUrl } from 'class-validator';

export class CreateComplexDto {
  @IsString({ message: 'El nombre debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'El nombre del complejo es obligatorio' })
  @MaxLength(100)
  @Matches(/\S/, { message: 'El campo no puede estar vacío.' })
  name: string;

  @IsString({ message: 'La ubicación debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'La ubicación del complejo es obligatoria' })
  @MaxLength(255)
  @Matches(/\S/, { message: 'El campo no puede estar vacío.' })
  location: string;

  @IsString({ message: 'La información de contacto debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'La información de contacto es obligatoria' })
  @MaxLength(255)
  @Matches(/\S/, { message: 'El campo no puede estar vacío.' })
  contactInfo: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  @Matches(/\S/, { message: 'El campo no puede estar vacío.' })
  paymentQrUrl?: string;
}
