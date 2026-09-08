import { Injectable } from '@nestjs/common';
import { CourtType } from '../../domain/entities/court.entity';

export interface CourtTypeDescription {
  type: CourtType;
  description: string;
}

/**
 * @reference HU-CLI-06 Consultar tipo de cancha
 */
@Injectable()
export class GetCourtTypesUseCase {
  execute(): CourtTypeDescription[] {
    return [
      { type: 'Padel', description: 'Canchas de pádel.' },
      {
        type: 'Futsal',
        description: 'Canchas de fútbol de salón con césped sintético o parqué reglamentario.',
      },
      {
        type: 'Wally',
        description: 'Canchas cerradas de voleibol en muro reglamentario.',
      },
      {
        type: 'Racket',
        description: 'Canchas cerradas de raquetbol de alta velocidad.',
      },
    ];
  }
}
