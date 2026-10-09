import { MaxLength, Matches } from 'class-validator';
import { IsOptional, IsString } from 'class-validator';

export class UpdateComplexDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  @Matches(/\S/, { message: 'El campo no puede estar vacío.' })
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  @Matches(/\S/, { message: 'El campo no puede estar vacío.' })
  location?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  @Matches(/\S/, { message: 'El campo no puede estar vacío.' })
  contactInfo?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  @Matches(/\S/, { message: 'El campo no puede estar vacío.' })
  paymentQrUrl?: string;
}
