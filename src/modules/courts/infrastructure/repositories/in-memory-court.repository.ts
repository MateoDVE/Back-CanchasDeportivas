import { Injectable } from '@nestjs/common';
import { ICourtRepository } from '../../domain/repositories/court.repository.interface';
import { Court, CourtType } from '../../domain/entities/court.entity';

@Injectable()
export class InMemoryCourtRepository implements ICourtRepository {
  private courts: Map<number, Court> = new Map();
  private nextId = 1;

  async findById(id: number): Promise<Court | null> {
    return this.courts.get(id) || null;
  }

  async findByComplex(complexId: number, onlyActive: boolean = true): Promise<Court[]> {
    const list = Array.from(this.courts.values()).filter((c) => c.complexId === complexId);
    if (onlyActive) {
      return list.filter((c) => c.isActive);
    }
    return list;
  }

  async save(court: Omit<Court, 'id'>): Promise<Court> {
    const id = this.nextId++;
    const entity = new Court(
      id,
      court.complexId,
      court.name,
      court.courtType,
      court.pricePerHour,
      court.isActive,
      court.images,
    );
    this.courts.set(id, entity);
    return entity;
  }

  async updatePrice(id: number, newPrice: number): Promise<void> {
    const court = this.courts.get(id);
    if (court) {
      court.updatePrice(newPrice);
    }
  }

  async update(court: Court): Promise<void> {
    this.courts.set(court.id, court);
  }

  async findAll(onlyActive: boolean = true): Promise<Court[]> {
    const list = Array.from(this.courts.values());
    if (onlyActive) {
      return list.filter((c) => c.isActive);
    }
    return list;
  }
}
