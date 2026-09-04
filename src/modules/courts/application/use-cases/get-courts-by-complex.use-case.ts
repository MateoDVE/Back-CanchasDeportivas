import { Injectable, Inject } from '@nestjs/common';
import { ICourtRepository, COURT_REPOSITORY } from '../../domain/repositories/court.repository.interface';
import { IComplexRepository, COMPLEX_REPOSITORY } from '../../../complexes/domain/repositories/complex.repository.interface';
import { EntityNotFoundException } from '../../../../common/domain/exceptions/domain.exception';
import { CourtOutputDto } from './create-court.use-case';

/**
 * @reference HU-CLI-05 Consultar canchas
 */
@Injectable()
export class GetCourtsByComplexUseCase {
  constructor(
    @Inject(COURT_REPOSITORY)
    private readonly courtRepository: ICourtRepository,
    @Inject(COMPLEX_REPOSITORY)
    private readonly complexRepository: IComplexRepository,
  ) {}

  async execute(complexId: number, onlyActive: boolean = true): Promise<CourtOutputDto[]> {
    const complex = await this.complexRepository.findById(complexId);
    if (!complex) {
      throw new EntityNotFoundException(`El complejo deportivo con ID ${complexId} no existe.`);
    }

    const courts = await this.courtRepository.findByComplex(complexId, onlyActive);
    return courts.map((court) => ({
      id: court.id,
      complexId: court.complexId,
      name: court.name,
      courtType: court.courtType,
      pricePerHour: court.pricePerHour,
      isActive: court.isActive,
    }));
  }
}
