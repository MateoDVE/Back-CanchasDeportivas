import { Injectable, Inject } from '@nestjs/common';
import { IComplexRepository, COMPLEX_REPOSITORY } from '../../domain/repositories/complex.repository.interface';
import { ComplexOutputDto } from './create-complex.use-case';

/**
 * @reference HU-CLI-04 Consultar complejos deportivos
 */
@Injectable()
export class GetActiveComplexesUseCase {
  constructor(
    @Inject(COMPLEX_REPOSITORY)
    private readonly complexRepository: IComplexRepository,
  ) {}

  async execute(): Promise<ComplexOutputDto[]> {
    const complexes = await this.complexRepository.findAll(true);
    return complexes.map((c) => ({
      id: c.id,
      name: c.name,
      location: c.location,
      contactInfo: c.contactInfo,
      paymentQrUrl: c.paymentQrUrl,
      isActive: c.isActive,
    }));
  }
}
