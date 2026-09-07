import { Complex } from '../entities/complex.entity';

export const COMPLEX_REPOSITORY = 'IComplexRepository';

export interface IComplexRepository {
  findById(id: number): Promise<Complex | null>;
  findAll(onlyActive?: boolean): Promise<Complex[]>;
  save(complex: Omit<Complex, 'id'>): Promise<Complex>;
  update(complex: Complex): Promise<void>;
}
