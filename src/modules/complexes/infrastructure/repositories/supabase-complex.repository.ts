import { Injectable, Inject } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { IComplexRepository } from '../../domain/repositories/complex.repository.interface';
import { Complex } from '../../domain/entities/complex.entity';
import { SUPABASE_CLIENT } from '../../../../common/supabase/supabase.provider';

@Injectable()
export class SupabaseComplexRepository implements IComplexRepository {
  constructor(
    @Inject(SUPABASE_CLIENT)
    private readonly supabase: SupabaseClient,
  ) {}

  private toDomain(row: any): Complex {
    return new Complex(
      row.id,
      row.name,
      row.location,
      row.contact_info,
      row.payment_qr_url,
      row.is_active,
    );
  }

  async findById(id: number): Promise<Complex | null> {
    const { data, error } = await this.supabase
      .from('complexes')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error || !data) return null;
    return this.toDomain(data);
  }

  async findAll(onlyActive: boolean = false): Promise<Complex[]> {
    let query = this.supabase.from('complexes').select('*');
    if (onlyActive) {
      query = query.eq('is_active', true);
    }
    const { data, error } = await query;
    if (error || !data) return [];
    return data.map((r) => this.toDomain(r));
  }

  async save(complex: Omit<Complex, 'id'>): Promise<Complex> {
    const { data, error } = await this.supabase
      .from('complexes')
      .insert({
        name: complex.name,
        location: complex.location,
        contact_info: complex.contactInfo,
        payment_qr_url: complex.paymentQrUrl,
        is_active: complex.isActive,
      })
      .select()
      .single();

    if (error || !data) {
      throw new Error(`Error al crear complejo en Supabase: ${error?.message}`);
    }
    return this.toDomain(data);
  }

  async update(complex: Complex): Promise<void> {
    const { error } = await this.supabase
      .from('complexes')
      .update({
        name: complex.name,
        location: complex.location,
        contact_info: complex.contactInfo,
        payment_qr_url: complex.paymentQrUrl,
        is_active: complex.isActive,
      })
      .eq('id', complex.id);

    if (error) {
      throw new Error(`Error al actualizar complejo en Supabase: ${error.message}`);
    }
  }
}
