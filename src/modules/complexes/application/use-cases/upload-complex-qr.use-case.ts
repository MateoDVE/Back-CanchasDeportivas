import { Injectable, Inject } from '@nestjs/common';
import { IComplexRepository, COMPLEX_REPOSITORY } from '../../domain/repositories/complex.repository.interface';
import { EntityNotFoundException, ValidationException } from '../../../../common/domain/exceptions/domain.exception';
import { ComplexOutputDto } from './create-complex.use-case';

export interface UploadComplexQrInput {
  complexId: number;
  paymentQrUrl: string;
}

/**
 * @reference HU-ADM-25 Configurar código QR de pago
 */
@Injectable()
export class UploadComplexQrUseCase {
  constructor(
    @Inject(COMPLEX_REPOSITORY)
    private readonly complexRepository: IComplexRepository,
  ) {}

  async execute(input: UploadComplexQrInput): Promise<ComplexOutputDto> {
    if (!input.paymentQrUrl || input.paymentQrUrl.trim() === '') {
      throw new ValidationException('La URL de la imagen QR es obligatoria.');
    }

    const complex = await this.complexRepository.findById(input.complexId);
    if (!complex) {
      throw new EntityNotFoundException(`El complejo deportivo ${input.complexId} no existe.`);
    }

    complex.paymentQrUrl = input.paymentQrUrl.trim();
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
