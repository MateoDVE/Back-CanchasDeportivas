import { IsArray, ArrayMaxSize, MaxLength, Matches } from 'class-validator';
import { IsBoolean, IsIn, IsInt, IsNotEmpty, IsNumber, IsOptional, IsPositive, IsString } from 'class-validator';
import { Transform } from 'class-transformer';
import { CourtType } from '../../domain/entities/court.entity';

export class CreateCourtDto {
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(1)
  @IsString({ each: true })
  @MaxLength(2800000, { each: true })
  @Matches(/^(https:\/\/[^\s]+|data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2})$/, { each: true, message: 'La portada debe ser una imagen JPG, PNG o WebP válida.' })
  images?: string[];

  @IsInt({ message: 'El ID del complejo debe ser un número entero' })
  @IsPositive({ message: 'El ID del complejo debe ser positivo' })
  complexId: number;

  @IsString({ message: 'El nombre debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'El nombre de la cancha es obligatorio' })
  name: string;

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
  @IsIn(['Futsal', 'Wally', 'Racket', 'Padel'], {
    message: 'El tipo de cancha debe ser uno de los siguientes: Futsal, Wally, Racket, Padel',
  })
  courtType: CourtType;

  @IsNumber({}, { message: 'El precio por hora debe ser un número' })
  @IsPositive({ message: 'El precio por hora debe ser mayor a 0' })
  pricePerHour: number;

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
