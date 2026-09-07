import { Injectable, Inject } from '@nestjs/common';
import { ICourtRepository, COURT_REPOSITORY } from '../../domain/repositories/court.repository.interface';
import { EntityNotFoundException } from '../../../../common/domain/exceptions/domain.exception';
import { CourtOutputDto } from './create-court.use-case';

/**
 * @reference HU-CLI-05 Consultar detalle de cancha
 */
@Injectable()
export class GetCourtByIdUseCase {
  constructor(
    @Inject(COURT_REPOSITORY)
    private readonly courtRepository: ICourtRepository,
  ) {}

  async execute(courtId: number): Promise<CourtOutputDto> {
    const court = await this.courtRepository.findById(courtId);
    if (!court) {
      throw new EntityNotFoundException(`La cancha con ID ${courtId} no existe.`);
    }

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
