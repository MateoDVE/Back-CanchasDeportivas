import { IsInt, IsNotEmpty, IsPositive, IsString } from 'class-validator';

export class UpdateBusinessInfoDto {
  @IsInt()
  @IsPositive()
  complexId: number;

  @IsString()
  @IsNotEmpty()
  businessName: string;

  @IsString()
  @IsNotEmpty()
  contactInfo: string;

  @IsString()
  @IsNotEmpty()
  location: string;
}
