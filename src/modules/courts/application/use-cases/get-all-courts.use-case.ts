import { Injectable, Inject } from '@nestjs/common';
import {
  ICourtRepository,
  COURT_REPOSITORY,
} from '../../domain/repositories/court.repository.interface';
import { CourtOutputDto } from './create-court.use-case';

@Injectable()
export class GetAllCourtsUseCase {
  constructor(
    @Inject(COURT_REPOSITORY)
    private readonly courtRepository: ICourtRepository,
  ) {}

  async execute(onlyActive: boolean = false): Promise<CourtOutputDto[]> {
    const courts = await this.courtRepository.findAll(onlyActive);
    return courts.map((court) => ({
      id: court.id,
      complexId: court.complexId,
      name: court.name,
      courtType: court.courtType,
      pricePerHour: court.pricePerHour,
      isActive: court.isActive,
      images: court.images,
    }));
  }
}
