import { MaxLength } from 'class-validator';
import { IsInt, IsNotEmpty, IsPositive, IsString } from 'class-validator';

export class UpdateBusinessInfoDto {
  @IsInt()
  @IsPositive()
  complexId: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  businessName: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  contactInfo: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  location: string;
}
