import { Injectable, Inject } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { ICashShiftRepository } from '../../domain/repositories/cash-shift.repository.interface';
import { CashShift } from '../../domain/entities/cash-shift.entity';
import { SUPABASE_CLIENT } from '../../../../common/supabase/supabase.provider';

@Injectable()
export class SupabaseCashShiftRepository implements ICashShiftRepository {
  constructor(
    @Inject(SUPABASE_CLIENT)
    private readonly supabase: SupabaseClient,
  ) {}

  private toDomain(row: any): CashShift {
    return new CashShift(
      row.id,
      row.secretary_id,
      row.shift_date,
      parseFloat(row.total_system_cash || 0),
      parseFloat(row.total_system_qr || 0),
      parseFloat(row.total_system || 0),
      parseFloat(row.total_declared_cash || 0),
      parseFloat(row.difference || 0),
      row.notes,
      row.is_closed ?? false,
      row.closed_at ? new Date(row.closed_at) : null,
      new Date(row.created_at),
    );
  }

  async findById(id: number): Promise<CashShift | null> {
    const { data, error } = await this.supabase
      .from('cash_shifts')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error || !data) return null;
    return this.toDomain(data);
  }

  async findBySecretaryAndDate(secretaryId: string, date: string): Promise<CashShift | null> {
    const { data, error } = await this.supabase
      .from('cash_shifts')
      .select('*')
      .eq('secretary_id', secretaryId)
      .eq('shift_date', date)
      .maybeSingle();

    if (error || !data) return null;
    return this.toDomain(data);
  }

  async save(shift: Omit<CashShift, 'id'>): Promise<CashShift> {
    const { data, error } = await this.supabase
      .from('cash_shifts')
      .insert({
        secretary_id: shift.secretaryId,
        shift_date: shift.shiftDate,
        total_system_cash: shift.totalSystemCash,
        total_system_qr: shift.totalSystemQr,
        total_system: shift.totalSystem,
        total_declared_cash: shift.totalDeclaredCash,
        difference: shift.difference,
        notes: shift.notes,
        is_closed: shift.isClosed,
        closed_at: shift.closedAt ? shift.closedAt.toISOString() : null,
        created_at: (shift.createdAt || new Date()).toISOString(),
      })
      .select()
      .single();

    if (error || !data) {
      throw new Error(`Error al persistir cash shift en Supabase: ${error?.message}`);
    }
    return this.toDomain(data);
  }

  async update(shift: CashShift): Promise<void> {
    const { error } = await this.supabase
      .from('cash_shifts')
      .update({
        total_declared_cash: shift.totalDeclaredCash,
        difference: shift.difference,
        notes: shift.notes,
        is_closed: shift.isClosed,
        closed_at: shift.closedAt ? shift.closedAt.toISOString() : null,
      })
      .eq('id', shift.id);

    if (error) {
      throw new Error(`Error al actualizar cash shift en Supabase: ${error.message}`);
    }
  }

  async findAll(): Promise<CashShift[]> {
    const { data, error } = await this.supabase
      .from('cash_shifts')
      .select('*')
      .order('created_at', { ascending: false });

    if (error || !data) return [];
    return data.map((r) => this.toDomain(r));
  }

  async findByDateRange(startDate: string, endDate: string): Promise<CashShift[]> {
    const { data, error } = await this.supabase
      .from('cash_shifts')
      .select('*')
      .gte('shift_date', startDate)
      .lte('shift_date', endDate)
      .order('shift_date', { ascending: false });

    if (error || !data) return [];
    return data.map((r) => this.toDomain(r));
  }
}
