import { IsBoolean, IsIn, IsNumber, IsOptional, IsPositive, IsString } from 'class-validator';
import { Transform } from 'class-transformer';
import { CourtType } from '../../domain/entities/court.entity';

export class UpdateCourtDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @Transform(({ value, obj }) => {
    const val = value || obj?.sportType;
    if (typeof val === 'string') {
      const lower = val.toLowerCase();
      if (lower.includes('futsal') || lower.includes('futbol') || lower.includes('fútbol')) return 'Futsal';
      if (lower.includes('wally') || lower.includes('volei') || lower.includes('voley')) return 'Wally';
      if (lower.includes('racket') || lower.includes('raquet')) return 'Racket';
    }
    return val;
  })
  @IsIn(['Futsal', 'Wally', 'Racket'], { message: 'El tipo debe ser Futsal, Wally o Racket' })
  courtType?: CourtType;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  pricePerHour?: number;

  @IsOptional()
  @IsString()
  sportType?: string;

  @IsOptional()
  @IsString()
  surfaceType?: string;

  @IsOptional()
  @IsBoolean()
  hasLighting?: boolean;
}

