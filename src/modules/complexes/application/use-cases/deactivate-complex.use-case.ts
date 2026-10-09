import { Inject, Injectable } from '@nestjs/common';
import { COMPLEX_REPOSITORY, IComplexRepository } from '../../domain/repositories/complex.repository.interface';
import { EntityNotFoundException } from '../../../../common/domain/exceptions/domain.exception';

@Injectable()
export class DeactivateComplexUseCase {
  constructor(@Inject(COMPLEX_REPOSITORY) private readonly complexes: IComplexRepository) {}
  async execute(id: number): Promise<void> {
    const complex = await this.complexes.findById(id);
    if (!complex) throw new EntityNotFoundException('El complejo no existe.');
    complex.deactivate();
    await this.complexes.update(complex);
  }
}
