import { Injectable } from '@nestjs/common';
import { IComplexRepository } from '../../domain/repositories/complex.repository.interface';
import { Complex } from '../../domain/entities/complex.entity';

@Injectable()
export class InMemoryComplexRepository implements IComplexRepository {
  private complexes: Map<number, Complex> = new Map();
  private nextId = 1;

  async findById(id: number): Promise<Complex | null> {
    return this.complexes.get(id) || null;
  }

  async findAll(onlyActive: boolean = false): Promise<Complex[]> {
    const list = Array.from(this.complexes.values());
    if (onlyActive) {
      return list.filter((c) => c.isActive);
    }
    return list;
  }

  async save(complex: Omit<Complex, 'id'>): Promise<Complex> {
    const id = this.nextId++;
    const entity = new Complex(
      id,
      complex.name,
      complex.location,
      complex.contactInfo,
      complex.paymentQrUrl,
      complex.isActive,
    );
    this.complexes.set(id, entity);
    return entity;
  }

  async update(complex: Complex): Promise<void> {
    this.complexes.set(complex.id, complex);
  }
}
