import { Injectable, Inject } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { ICourtRepository } from '../../domain/repositories/court.repository.interface';
import { Court, CourtType } from '../../domain/entities/court.entity';
import { SUPABASE_CLIENT } from '../../../../common/supabase/supabase.provider';

@Injectable()
export class SupabaseCourtRepository implements ICourtRepository {
  constructor(
    @Inject(SUPABASE_CLIENT)
    private readonly supabase: SupabaseClient,
  ) {}

  private toDomain(row: any): Court {
    return new Court(
      row.id,
      row.complex_id,
      row.name,
      row.court_type as CourtType,
      parseFloat(row.price_per_hour),
      row.is_active,
    );
  }

  async findById(id: number): Promise<Court | null> {
    const { data, error } = await this.supabase
      .from('courts')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error || !data) return null;
    return this.toDomain(data);
  }

  async findByComplex(complexId: number, onlyActive: boolean = true): Promise<Court[]> {
    let query = this.supabase.from('courts').select('*').eq('complex_id', complexId);
    if (onlyActive) {
      query = query.eq('is_active', true);
    }
    const { data, error } = await query;
    if (error || !data) return [];
    return data.map((r) => this.toDomain(r));
  }

  async save(court: Omit<Court, 'id'>): Promise<Court> {
    const { data, error } = await this.supabase
      .from('courts')
      .insert({
        complex_id: court.complexId,
        name: court.name,
        court_type: court.courtType,
        price_per_hour: court.pricePerHour,
        is_active: court.isActive,
      })
      .select()
      .single();

    if (error || !data) {
      throw new Error(`Error al crear cancha en Supabase: ${error?.message}`);
    }
    return this.toDomain(data);
  }

  async updatePrice(id: number, newPrice: number): Promise<void> {
    const { error } = await this.supabase
      .from('courts')
      .update({ price_per_hour: newPrice })
      .eq('id', id);

    if (error) {
      throw new Error(`Error al actualizar precio de cancha en Supabase: ${error.message}`);
    }
  }

  async update(court: Court): Promise<void> {
    const { error } = await this.supabase
      .from('courts')
      .update({
        name: court.name,
        court_type: court.courtType,
        price_per_hour: court.pricePerHour,
        is_active: court.isActive,
      })
      .eq('id', court.id);

    if (error) {
      throw new Error(`Error al actualizar cancha en Supabase: ${error.message}`);
    }
  }

  async findAll(onlyActive: boolean = true): Promise<Court[]> {
    let query = this.supabase.from('courts').select('*');
    if (onlyActive) {
      query = query.eq('is_active', true);
    }
    const { data, error } = await query;
    if (error || !data) return [];
    return data.map((r) => this.toDomain(r));
  }
}
