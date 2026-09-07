import { Injectable, Inject } from '@nestjs/common';
import { IComplexRepository, COMPLEX_REPOSITORY } from '../../domain/repositories/complex.repository.interface';
import { EntityNotFoundException } from '../../../../common/domain/exceptions/domain.exception';

export interface ComplexQrOutputDto {
  complexId: number;
  complexName: string;
  paymentQrUrl: string | null;
  contactInfo: string;
}

/**
 * @reference HU-CLI-15 Realizar pago del anticipo (QR)
 */
@Injectable()
export class GetComplexQrUseCase {
  constructor(
    @Inject(COMPLEX_REPOSITORY)
    private readonly complexRepository: IComplexRepository,
  ) {}

  async execute(complexId: number): Promise<ComplexQrOutputDto> {
    const complex = await this.complexRepository.findById(complexId);
    if (!complex) {
      throw new EntityNotFoundException(`El complejo deportivo con ID ${complexId} no existe.`);
    }

    return {
      complexId: complex.id,
      complexName: complex.name,
      paymentQrUrl: complex.paymentQrUrl,
      contactInfo: complex.contactInfo,
    };
  }
}
