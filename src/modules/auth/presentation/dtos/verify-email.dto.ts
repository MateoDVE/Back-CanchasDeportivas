import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class VerifyEmailDto {
  @IsEmail({}, { message: 'El correo electrónico debe ser válido' })
  @IsNotEmpty({ message: 'El correo electrónico es obligatorio' })
  email: string;

  @IsString({ message: 'El código o token debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'El código o token de verificación es obligatorio' })
  token: string;
}
