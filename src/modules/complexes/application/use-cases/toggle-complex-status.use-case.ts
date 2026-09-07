import { Injectable, Inject } from '@nestjs/common';
import { IComplexRepository, COMPLEX_REPOSITORY } from '../../domain/repositories/complex.repository.interface';
import { EntityNotFoundException } from '../../../../common/domain/exceptions/domain.exception';
import { ComplexOutputDto } from './create-complex.use-case';

/**
 * @reference HU-ADM-05 Habilitar o deshabilitar complejo deportivo
 */
@Injectable()
export class ToggleComplexStatusUseCase {
  constructor(
    @Inject(COMPLEX_REPOSITORY)
    private readonly complexRepository: IComplexRepository,
  ) {}

  async execute(id: number): Promise<ComplexOutputDto> {
    const complex = await this.complexRepository.findById(id);
    if (!complex) {
      throw new EntityNotFoundException(`El complejo con ID ${id} no existe.`);
    }

    if (complex.isActive) {
      complex.deactivate();
    } else {
      complex.activate();
    }

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
