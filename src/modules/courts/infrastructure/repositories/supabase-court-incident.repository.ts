import { Injectable, Inject } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { ICourtIncidentRepository } from '../../domain/repositories/court-incident.repository.interface';
import { CourtIncident } from '../../domain/entities/court-incident.entity';
import { SUPABASE_CLIENT } from '../../../../common/supabase/supabase.provider';

@Injectable()
export class SupabaseCourtIncidentRepository implements ICourtIncidentRepository {
  constructor(
    @Inject(SUPABASE_CLIENT)
    private readonly supabase: SupabaseClient,
  ) {}

  private toDomain(row: any): CourtIncident {
    return new CourtIncident(
      row.id,
      row.court_id,
      new Date(row.start_datetime),
      new Date(row.end_datetime),
      row.reason,
      new Date(row.created_at || row.start_datetime),
    );
  }

  async findById(id: number): Promise<CourtIncident | null> {
    const { data, error } = await this.supabase
      .from('court_incidents')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error || !data) return null;
    return this.toDomain(data);
  }

  async findByCourt(courtId: number): Promise<CourtIncident[]> {
    const { data, error } = await this.supabase
      .from('court_incidents')
      .select('*')
      .eq('court_id', courtId);

    if (error || !data) return [];
    return data.map((r) => this.toDomain(r));
  }

  async save(incident: Omit<CourtIncident, 'id'>): Promise<CourtIncident> {
    const { data, error } = await this.supabase
      .from('court_incidents')
      .insert({
        court_id: incident.courtId,
        start_datetime: incident.startDatetime.toISOString(),
        end_datetime: incident.endDatetime.toISOString(),
        reason: incident.reason,
      })
      .select()
      .single();

    if (error || !data) {
      throw new Error(`Error al persistir incidente en Supabase: ${error?.message}`);
    }
    return this.toDomain(data);
  }

  async findActiveIncidents(courtId: number, datetime: Date): Promise<CourtIncident[]> {
    const iso = datetime.toISOString();
    const { data, error } = await this.supabase
      .from('court_incidents')
      .select('*')
      .eq('court_id', courtId)
      .lte('start_datetime', iso)
      .gte('end_datetime', iso);

    if (error || !data) return [];
    return data.map((r) => this.toDomain(r));
  }
}
