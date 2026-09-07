import { CashShift } from '../entities/cash-shift.entity';

export const CASH_SHIFT_REPOSITORY = 'ICashShiftRepository';

export interface ICashShiftRepository {
  findById(id: number): Promise<CashShift | null>;
  findBySecretaryAndDate(secretaryId: string, date: string): Promise<CashShift | null>;
  save(shift: Omit<CashShift, 'id'>): Promise<CashShift>;
  update(shift: CashShift): Promise<void>;
  findAll(): Promise<CashShift[]>;
  findByDateRange(startDate: string, endDate: string): Promise<CashShift[]>;
}
