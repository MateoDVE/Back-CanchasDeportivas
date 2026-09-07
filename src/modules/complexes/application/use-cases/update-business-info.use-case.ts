import { Injectable, Inject } from '@nestjs/common';
import { IComplexRepository, COMPLEX_REPOSITORY } from '../../domain/repositories/complex.repository.interface';
import { EntityNotFoundException } from '../../../../common/domain/exceptions/domain.exception';
import { ComplexOutputDto } from './create-complex.use-case';

export interface UpdateBusinessInfoInput {
  complexId: number;
  businessName: string;
  contactInfo: string;
  location: string;
}

/**
 * @reference HU-ADM-24 Configurar información del establecimiento
 */
@Injectable()
export class UpdateBusinessInfoUseCase {
  constructor(
    @Inject(COMPLEX_REPOSITORY)
    private readonly complexRepository: IComplexRepository,
  ) {}

  async execute(input: UpdateBusinessInfoInput): Promise<ComplexOutputDto> {
    const complex = await this.complexRepository.findById(input.complexId);
    if (!complex) {
      throw new EntityNotFoundException(`El complejo deportivo ${input.complexId} no fue encontrado.`);
    }

    complex.name = input.businessName.trim();
    complex.contactInfo = input.contactInfo.trim();
    complex.location = input.location.trim();

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
