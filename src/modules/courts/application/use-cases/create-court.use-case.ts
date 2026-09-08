import { Injectable, Inject } from '@nestjs/common';
import { ICourtRepository, COURT_REPOSITORY } from '../../domain/repositories/court.repository.interface';
import { IComplexRepository, COMPLEX_REPOSITORY } from '../../../complexes/domain/repositories/complex.repository.interface';
import { Court, CourtType } from '../../domain/entities/court.entity';
import { EntityNotFoundException, ValidationException } from '../../../../common/domain/exceptions/domain.exception';

export interface CreateCourtInput {
  complexId: number;
  name: string;
  courtType: CourtType;
  pricePerHour: number;
  images?: string[];
}

export interface CourtOutputDto {
  id: number;
  complexId: number;
  name: string;
  courtType: string;
  pricePerHour: number;
  images?: string[];
  isActive: boolean;
}

/**
 * @reference HU-ADM-06 Registrar cancha
 */
@Injectable()
export class CreateCourtUseCase {
  constructor(
    @Inject(COURT_REPOSITORY)
    private readonly courtRepository: ICourtRepository,
    @Inject(COMPLEX_REPOSITORY)
    private readonly complexRepository: IComplexRepository,
  ) {}

  async execute(input: CreateCourtInput): Promise<CourtOutputDto> {
    const complex = await this.complexRepository.findById(input.complexId);
    if (!complex) {
      throw new EntityNotFoundException(`El complejo deportivo con ID ${input.complexId} no existe.`);
    }

    const validTypes: CourtType[] = ['Futsal', 'Wally', 'Racket', 'Padel'];
    if (!validTypes.includes(input.courtType)) {
      throw new ValidationException(`Tipo de cancha inválido. Tipos permitidos: ${validTypes.join(', ')}.`);
    }

    const court = await this.courtRepository.save({
      complexId: input.complexId,
      name: input.name.trim(),
      courtType: input.courtType,
      pricePerHour: input.pricePerHour,
      isActive: true,
      images: input.images || [],
      updatePrice(p: number) { this.updatePrice(p); },
      activate() { this.isActive = true; },
      deactivate() { this.isActive = false; },
    });

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
