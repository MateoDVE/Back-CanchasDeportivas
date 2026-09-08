import { Injectable, Inject } from '@nestjs/common';
import { ICourtRepository, COURT_REPOSITORY } from '../../domain/repositories/court.repository.interface';
import { EntityNotFoundException, ValidationException } from '../../../../common/domain/exceptions/domain.exception';
import { CourtOutputDto } from './create-court.use-case';

export interface UpdateCourtPriceInput {
  courtId: number;
  newPricePerHour: number;
}

/**
 * @reference HU-ADM-08 Configurar precio por hora
 */
@Injectable()
export class UpdateCourtPriceUseCase {
  constructor(
    @Inject(COURT_REPOSITORY)
    private readonly courtRepository: ICourtRepository,
  ) {}

  async execute(input: UpdateCourtPriceInput): Promise<CourtOutputDto> {
    if (input.newPricePerHour <= 0 || isNaN(input.newPricePerHour)) {
      throw new ValidationException('El precio por hora debe ser un valor mayor a 0.');
    }

    const court = await this.courtRepository.findById(input.courtId);
    if (!court) {
      throw new EntityNotFoundException(`La cancha con ID ${input.courtId} no existe.`);
    }

    court.updatePrice(input.newPricePerHour);
    await this.courtRepository.updatePrice(input.courtId, court.pricePerHour);

    return {
      id: court.id,
      complexId: court.complexId,
      name: court.name,
      courtType: court.courtType,
      pricePerHour: court.pricePerHour,
      isActive: court.isActive,
      images: court.images,
    };
  }
}
