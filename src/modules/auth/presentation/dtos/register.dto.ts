import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class RegisterDto {
  @IsString({ message: 'El nombre debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'El nombre completo es obligatorio' })
  name: string;

  @IsEmail({}, { message: 'El correo electrónico no tiene un formato válido' })
  @IsNotEmpty({ message: 'El correo electrónico es obligatorio' })
  email: string;

  @IsString({ message: 'El número de celular debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'El número de celular es obligatorio' })
  phone: string;

  @IsString({ message: 'El documento de identidad (CI) debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'El documento de identidad (CI) es obligatorio' })
  ci: string;

  @IsString()
  @MinLength(6, { message: 'La contraseña debe tener al menos 6 caracteres' })
  @IsNotEmpty({ message: 'La contraseña es obligatoria' })
  password: string;
}
