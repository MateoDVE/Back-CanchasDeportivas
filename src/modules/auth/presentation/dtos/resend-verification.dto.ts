import { IsEmail } from 'class-validator';
import { Transform } from 'class-transformer';
export class ResendVerificationDto {
  @Transform(({ value }) => typeof value === 'string' ? value.trim().toLowerCase() : value)
  @IsEmail()
  email: string;
}
