import { Injectable, Inject } from '@nestjs/common';
import { IComplexRepository, COMPLEX_REPOSITORY } from '../../domain/repositories/complex.repository.interface';
import { EntityNotFoundException } from '../../../../common/domain/exceptions/domain.exception';
import { ComplexOutputDto } from './create-complex.use-case';

export interface UpdateComplexInput {
  id: number;
  name?: string;
  location?: string;
  contactInfo?: string;
  paymentQrUrl?: string;
}

/**
 * @reference HU-ADM-04 Editar complejo deportivo
 */
@Injectable()
export class UpdateComplexUseCase {
  constructor(
    @Inject(COMPLEX_REPOSITORY)
    private readonly complexRepository: IComplexRepository,
  ) {}

  async execute(input: UpdateComplexInput): Promise<ComplexOutputDto> {
    const complex = await this.complexRepository.findById(input.id);
    if (!complex) {
      throw new EntityNotFoundException(`El complejo con ID ${input.id} no existe.`);
    }

    if (input.name !== undefined) complex.name = input.name.trim();
    if (input.location !== undefined) complex.location = input.location.trim();
    if (input.contactInfo !== undefined) complex.contactInfo = input.contactInfo.trim();
    if (input.paymentQrUrl !== undefined) complex.paymentQrUrl = input.paymentQrUrl.trim();

    await this.complexRepository.update(complex);

    return {
      id: complex.id,
      name: complex.name,
      location: complex.location,
      contactInfo: complex.contactInfo,
      paymentQrUrl: complex.paymentQrUrl,
      isActive: complex.isActive,
    };
  }
}
