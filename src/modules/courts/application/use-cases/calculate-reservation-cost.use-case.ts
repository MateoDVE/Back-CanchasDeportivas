import { Injectable, Inject } from '@nestjs/common';
import { ICourtRepository, COURT_REPOSITORY } from '../../domain/repositories/court.repository.interface';
import { EntityNotFoundException, ValidationException } from '../../../../common/domain/exceptions/domain.exception';

export interface CalculatedCostOutputDto {
  courtId: number;
  courtName: string;
  durationHours: number;
  pricePerHour: number;
  totalPrice: number;
  advanceRequired: number; // 25%
  pendingBalance: number;  // 75%
}

/**
 * @reference HU-CLI-07 Consultar precio y costo total estimado
 */
@Injectable()
export class CalculateReservationCostUseCase {
  constructor(
    @Inject(COURT_REPOSITORY)
    private readonly courtRepository: ICourtRepository,
  ) {}

  async execute(courtId: number, durationHours: number): Promise<CalculatedCostOutputDto> {
    if (durationHours < 1 || !Number.isInteger(durationHours)) {
      throw new ValidationException('La duración debe ser de al menos 1 hora y en bloques enteros.');
    }

    const court = await this.courtRepository.findById(courtId);
    if (!court) {
      throw new EntityNotFoundException(`La cancha con ID ${courtId} no existe.`);
    }

    const totalPrice = Number((durationHours * court.pricePerHour).toFixed(2));
    const advanceRequired = Number((totalPrice * 0.25).toFixed(2));
    const pendingBalance = Number((totalPrice - advanceRequired).toFixed(2));

    return {
      courtId: court.id,
      courtName: court.name,
      durationHours,
      pricePerHour: court.pricePerHour,
      totalPrice,
      advanceRequired,
      pendingBalance,
    };
  }
}
