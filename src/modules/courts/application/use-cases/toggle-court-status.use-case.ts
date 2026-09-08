import { Injectable, Inject } from '@nestjs/common';
import { ICourtRepository, COURT_REPOSITORY } from '../../domain/repositories/court.repository.interface';
import { EntityNotFoundException } from '../../../../common/domain/exceptions/domain.exception';
import { CourtOutputDto } from './create-court.use-case';

/**
 * @reference HU-ADM-09 Habilitar o deshabilitar cancha
 */
@Injectable()
export class ToggleCourtStatusUseCase {
  constructor(
    @Inject(COURT_REPOSITORY)
    private readonly courtRepository: ICourtRepository,
  ) {}

  async execute(id: number): Promise<CourtOutputDto> {
    const court = await this.courtRepository.findById(id);
    if (!court) {
      throw new EntityNotFoundException(`La cancha con ID ${id} no existe.`);
    }

    if (court.isActive) {
      court.deactivate();
    } else {
      court.activate();
    }

    await this.courtRepository.update(court);

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
