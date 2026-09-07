import { IsOptional, IsString } from 'class-validator';

export class UpdateComplexDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsString()
  contactInfo?: string;

  @IsOptional()
  @IsString()
  paymentQrUrl?: string;
}
