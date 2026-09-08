import { Injectable, Inject, ServiceUnavailableException, ConflictException } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { ICashShiftRepository } from '../../domain/repositories/cash-shift.repository.interface';
import { CashShift } from '../../domain/entities/cash-shift.entity';
import { SUPABASE_CLIENT } from '../../../../common/supabase/supabase.provider';

@Injectable()
export class SupabaseCashShiftRepository implements ICashShiftRepository {
  private handleError(error: { code?: string; message: string }): never {
    if (error.code === 'PGRST204' || error.code === '42703' || error.code === '42P01') {
      throw new ServiceUnavailableException('El cierre de caja requiere actualizar la base de datos. Ejecuta la migración 20260908_cash_shift_schema.sql. No se registró el cierre.');
    }
    if (error.code === '23505') {
      throw new ConflictException('Ya existe un cierre para esta secretaria y fecha. Actualiza la pantalla antes de continuar.');
    }
    throw new Error(`Error de persistencia de cierre: ${error.message}`);
  }
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
      parseFloat(row.total_declared_cash ?? row.total_declared ?? 0),
      parseFloat(row.difference || 0),
      row.notes,
      row.is_closed ?? Boolean(row.closed_at),
      row.closed_at ? new Date(row.closed_at) : null,
      new Date(row.created_at || row.closed_at || row.shift_date),
    );
  }

  async findById(id: number): Promise<CashShift | null> {
    const { data, error } = await this.supabase
      .from('cash_shifts')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) this.handleError(error);
    if (!data) return null;
    return this.toDomain(data);
  }

  async findBySecretaryAndDate(secretaryId: string, date: string): Promise<CashShift | null> {
    const { data, error } = await this.supabase
      .from('cash_shifts')
      .select('*')
      .eq('secretary_id', secretaryId)
      .eq('shift_date', date)
      .maybeSingle();

    if (error) this.handleError(error);
    if (!data) return null;
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

    if (error) this.handleError(error);
    if (!data) {
      throw new Error('Supabase no devolvió el cierre guardado.');
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
      this.handleError(error);
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
