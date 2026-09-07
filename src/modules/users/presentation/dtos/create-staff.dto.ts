import { IsEmail, IsIn, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class CreateStaffDto {
  @IsString({ message: 'El nombre debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'El nombre es obligatorio' })
  name: string;

  @IsEmail({}, { message: 'El correo electrónico debe ser válido' })
  @IsNotEmpty({ message: 'El correo electrónico es obligatorio' })
  email: string;

  @IsString({ message: 'El número de celular debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'El número de celular es obligatorio' })
  phone: string;

  @IsString({ message: 'El documento de identidad (CI) debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'El CI es obligatorio' })
  ci: string;

  @IsString()
  @MinLength(6, { message: 'La contraseña debe tener al menos 6 caracteres' })
  @IsNotEmpty({ message: 'La contraseña es obligatoria' })
  password: string;

  @IsIn(['SECRETARIA', 'ADMIN'], { message: 'El rol debe ser SECRETARIA o ADMIN' })
  role: 'SECRETARIA' | 'ADMIN';
}
