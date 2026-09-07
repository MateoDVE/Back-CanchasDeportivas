import { IsNotEmpty, IsNumber, IsOptional, IsPositive, IsString } from 'class-validator';

export class RegisterIncidentDto {
  @IsString()
  @IsNotEmpty({ message: 'El motivo del incidente es obligatorio' })
  reason: string;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  durationHours?: number;
}
