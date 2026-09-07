import { IsIn, IsNumber, IsOptional, IsPositive, IsString } from 'class-validator';
import { CourtType } from '../../domain/entities/court.entity';

export class UpdateCourtDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsIn(['Futsal', 'Wally', 'Racket'], { message: 'El tipo debe ser Futsal, Wally o Racket' })
  courtType?: CourtType;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  pricePerHour?: number;
}
