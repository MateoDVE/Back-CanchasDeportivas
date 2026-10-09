import { IsEmail, IsIn, IsNotEmpty, IsString, MinLength, MaxLength } from 'class-validator';

export class CreateStaffDto {
  @IsString({ message: 'El nombre debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'El nombre es obligatorio' })
  @MaxLength(161)
  name: string;

  @IsEmail({}, { message: 'El correo electrónico debe ser válido' })
  @IsNotEmpty({ message: 'El correo electrónico es obligatorio' })
  @MaxLength(100)
  email: string;

  @IsString({ message: 'El número de celular debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'El número de celular es obligatorio' })
  @MaxLength(20)
  phone: string;


  @IsString()
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
  @IsNotEmpty({ message: 'La contraseña es obligatoria' })
  @MaxLength(72)
  password: string;

  @IsIn(['SECRETARIA', 'ADMIN'], { message: 'El rol debe ser SECRETARIA o ADMIN' })
  role: 'SECRETARIA' | 'ADMIN';
}
