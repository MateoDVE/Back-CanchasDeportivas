import { Court } from '../entities/court.entity';

export const COURT_REPOSITORY = 'ICourtRepository';

export interface ICourtRepository {
  findById(id: number): Promise<Court | null>;
  findByComplex(complexId: number, onlyActive?: boolean): Promise<Court[]>;
  save(court: Omit<Court, 'id'>): Promise<Court>;
  updatePrice(id: number, newPrice: number): Promise<void>;
  update(court: Court): Promise<void>;
  findAll(onlyActive?: boolean): Promise<Court[]>;
}
