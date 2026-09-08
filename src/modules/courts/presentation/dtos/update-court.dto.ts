import { IsArray, ArrayMaxSize, MaxLength, Matches } from 'class-validator';
import { IsBoolean, IsIn, IsNumber, IsOptional, IsPositive, IsString } from 'class-validator';
import { Transform } from 'class-transformer';
import { CourtType } from '../../domain/entities/court.entity';

export class UpdateCourtDto {
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(1)
  @IsString({ each: true })
  @MaxLength(2800000, { each: true })
  @Matches(/^(https:\/\/[^\s]+|data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2})$/, { each: true, message: 'La portada debe ser una imagen JPG, PNG o WebP válida.' })
  images?: string[];

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @Transform(({ value, obj }) => {
    const val = value || obj?.sportType;
    if (typeof val === 'string') {
      const lower = val.toLowerCase();
      if (lower === 'padel' || lower === 'pádel') return 'Padel';
      if (lower.includes('futsal') || lower.includes('futbol') || lower.includes('fútbol')) return 'Futsal';
      if (lower.includes('wally') || lower.includes('volei') || lower.includes('voley')) return 'Wally';
      if (lower.includes('racket') || lower.includes('raquet')) return 'Racket';
    }
    return val;
  })
  @IsIn(['Futsal', 'Wally', 'Racket', 'Padel'], { message: 'El tipo debe ser Futsal, Wally, Racket o Padel' })
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
