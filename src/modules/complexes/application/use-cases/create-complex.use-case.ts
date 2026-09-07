import { Injectable, Inject } from '@nestjs/common';
import { IComplexRepository, COMPLEX_REPOSITORY } from '../../domain/repositories/complex.repository.interface';
import { Complex } from '../../domain/entities/complex.entity';

export interface CreateComplexInput {
  name: string;
  location: string;
  contactInfo: string;
  paymentQrUrl?: string;
}

export interface ComplexOutputDto {
  id: number;
  name: string;
  location: string;
  contactInfo: string;
  paymentQrUrl: string | null;
  isActive: boolean;
}

/**
 * @reference HU-ADM-03 Crear complejo deportivo
 */
@Injectable()
export class CreateComplexUseCase {
  constructor(
    @Inject(COMPLEX_REPOSITORY)
    private readonly complexRepository: IComplexRepository,
  ) {}

  async execute(input: CreateComplexInput): Promise<ComplexOutputDto> {
    const complex = await this.complexRepository.save({
      name: input.name.trim(),
      location: input.location.trim(),
      contactInfo: input.contactInfo ? input.contactInfo.trim() : '',
      paymentQrUrl: input.paymentQrUrl ? input.paymentQrUrl.trim() : null,
      isActive: true,
      activate() { this.isActive = true; },
      deactivate() { this.isActive = false; },
    });

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
