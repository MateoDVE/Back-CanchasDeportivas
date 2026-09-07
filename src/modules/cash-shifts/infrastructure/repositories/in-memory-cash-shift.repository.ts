import { Injectable } from '@nestjs/common';
import { ICashShiftRepository } from '../../domain/repositories/cash-shift.repository.interface';
import { CashShift } from '../../domain/entities/cash-shift.entity';

@Injectable()
export class InMemoryCashShiftRepository implements ICashShiftRepository {
  private shifts: Map<number, CashShift> = new Map();
  private nextId = 1;

  async findById(id: number): Promise<CashShift | null> {
    return this.shifts.get(id) || null;
  }

  async findBySecretaryAndDate(secretaryId: string, date: string): Promise<CashShift | null> {
    const list = Array.from(this.shifts.values());
    return list.find((s) => s.secretaryId === secretaryId && s.shiftDate === date) || null;
  }

  async save(shift: Omit<CashShift, 'id'>): Promise<CashShift> {
    const id = this.nextId++;
    const entity = new CashShift(
      id,
      shift.secretaryId,
      shift.shiftDate,
      shift.totalSystemCash,
      shift.totalSystemQr,
      shift.totalSystem,
      shift.totalDeclaredCash,
      shift.difference,
      shift.notes,
      shift.isClosed,
      shift.closedAt,
      shift.createdAt || new Date(),
    );
    this.shifts.set(id, entity);
    return entity;
  }

  async update(shift: CashShift): Promise<void> {
    this.shifts.set(shift.id, shift);
  }

  async findAll(): Promise<CashShift[]> {
    return Array.from(this.shifts.values()).sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
    );
  }

  async findByDateRange(startDate: string, endDate: string): Promise<CashShift[]> {
    return Array.from(this.shifts.values()).filter(
      (s) => s.shiftDate >= startDate && s.shiftDate <= endDate,
    );
  }
}
