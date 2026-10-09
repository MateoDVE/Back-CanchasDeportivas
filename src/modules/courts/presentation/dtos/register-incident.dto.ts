import { MaxLength } from 'class-validator';
import { IsNotEmpty, IsNumber, IsOptional, IsPositive, IsString } from 'class-validator';

export class RegisterIncidentDto {
  @IsString()
  @IsNotEmpty({ message: 'El motivo del incidente es obligatorio' })
  @MaxLength(500)
  reason: string;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  durationHours?: number;
}
