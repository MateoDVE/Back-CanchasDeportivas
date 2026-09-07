import { Injectable, Inject } from '@nestjs/common';
import { ICourtRepository, COURT_REPOSITORY } from '../../domain/repositories/court.repository.interface';
import { CourtType } from '../../domain/entities/court.entity';
import { EntityNotFoundException, ValidationException } from '../../../../common/domain/exceptions/domain.exception';
import { CourtOutputDto } from './create-court.use-case';

export interface UpdateCourtInput {
  id: number;
  name?: string;
  courtType?: CourtType;
  pricePerHour?: number;
}

/**
 * @reference HU-ADM-07 Editar cancha
 */
@Injectable()
export class UpdateCourtUseCase {
  constructor(
    @Inject(COURT_REPOSITORY)
    private readonly courtRepository: ICourtRepository,
  ) {}

  async execute(input: UpdateCourtInput): Promise<CourtOutputDto> {
    const court = await this.courtRepository.findById(input.id);
    if (!court) {
      throw new EntityNotFoundException(`La cancha con ID ${input.id} no existe.`);
    }

    if (input.name !== undefined) court.name = input.name.trim();
    if (input.courtType !== undefined) {
      const valid: CourtType[] = ['Futsal', 'Wally', 'Racket'];
      if (!valid.includes(input.courtType)) {
        throw new ValidationException(`Tipo de cancha no válido: ${input.courtType}`);
      }
      court.courtType = input.courtType;
    }
    if (input.pricePerHour !== undefined) {
      court.updatePrice(input.pricePerHour);
    }

    await this.courtRepository.update(court);

    return {
      id: court.id,
      complexId: court.complexId,
      name: court.name,
      courtType: court.courtType,
      pricePerHour: court.pricePerHour,
      isActive: court.isActive,
    };
  }
}
