import { Injectable } from '@nestjs/common';
import { ICourtRepository } from '../../domain/repositories/court.repository.interface';
import { Court, CourtType } from '../../domain/entities/court.entity';

@Injectable()
export class InMemoryCourtRepository implements ICourtRepository {
  private courts: Map<number, Court> = new Map();
  private nextId = 1;

  constructor() {
    this.seedDefaultCourts();
  }

  private seedDefaultCourts() {
    // Canchas para Complejo 1
    const court1 = new Court(this.nextId++, 1, 'Cancha Principal (Césped Sintético)', 'Futsal', 100.0, true);
    const court2 = new Court(this.nextId++, 1, 'Cancha Wally 1', 'Wally', 60.0, true);
    const court3 = new Court(this.nextId++, 1, 'Cancha Racket 1', 'Racket', 50.0, true);

    // Canchas para Complejo 2
    const court4 = new Court(this.nextId++, 2, 'Cancha Techada 1', 'Futsal', 120.0, true);
    const court5 = new Court(this.nextId++, 2, 'Cancha Wally Pro', 'Wally', 70.0, true);

    this.courts.set(court1.id, court1);
    this.courts.set(court2.id, court2);
    this.courts.set(court3.id, court3);
    this.courts.set(court4.id, court4);
    this.courts.set(court5.id, court5);
  }

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
