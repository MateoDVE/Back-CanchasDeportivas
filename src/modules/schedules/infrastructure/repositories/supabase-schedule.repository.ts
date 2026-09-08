import { Injectable, Inject, ServiceUnavailableException } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import {
  IScheduleRepository,
  ScheduleConfigItem,
} from '../../domain/repositories/schedule.repository.interface';
import { CourtSchedule } from '../../domain/entities/court-schedule.entity';
import { SUPABASE_CLIENT } from '../../../../common/supabase/supabase.provider';

@Injectable()
export class SupabaseScheduleRepository implements IScheduleRepository {
  constructor(
    @Inject(SUPABASE_CLIENT)
    private readonly supabase: SupabaseClient,
  ) {}

  private toDomain(row: any): CourtSchedule {
    return new CourtSchedule(
      row.id,
      row.court_id,
      row.day_of_week,
      row.specific_date,
      row.open_time,
      row.close_time,
    );
  }

  async findByCourtAndDay(courtId: number, dayOfWeek: number): Promise<CourtSchedule | null> {
    const { data, error } = await this.supabase
      .from('court_schedules')
      .select('*')
      .eq('court_id', courtId)
      .eq('day_of_week', dayOfWeek)
      .maybeSingle();

    if (error || !data) return null;
    return this.toDomain(data);
  }

  async findByCourtAndDate(courtId: number, date: string): Promise<CourtSchedule | null> {
    const { data, error } = await this.supabase
      .from('court_schedules')
      .select('*')
      .eq('court_id', courtId)
      .eq('specific_date', date)
      .maybeSingle();

    if (error || !data) return null;
    return this.toDomain(data);
  }

  async getWeeklySchedules(courtId: number): Promise<CourtSchedule[]> {
    const { data, error } = await this.supabase
      .from('court_schedules')
      .select('*')
      .eq('court_id', courtId)
      .not('day_of_week', 'is', null)
      .order('day_of_week', { ascending: true });

    if (error) throw new ServiceUnavailableException('No se pudieron cargar los horarios.');
    if (!data) return [];
    return data.map((r) => this.toDomain(r));
  }

  async setWeeklySchedules(
    courtId: number,
    schedules: ScheduleConfigItem[],
  ): Promise<CourtSchedule[]> {
    // Keep existing rows until every requested open day has been saved.
    const { data: existing, error: readError } = await this.supabase
      .from('court_schedules').select('*').eq('court_id', courtId)
      .not('day_of_week', 'is', null);
    if (readError || !existing) throw new ServiceUnavailableException('No se pudieron leer los horarios actuales.');

    const keptIds: number[] = [];
    const result: CourtSchedule[] = [];
    for (const item of schedules) {
      const previous = existing.find(row => row.day_of_week === item.dayOfWeek);
      const values = { court_id: courtId, day_of_week: item.dayOfWeek,
        open_time: item.openTime, close_time: item.closeTime };
      if (previous) {
        const { data, error } = await this.supabase.from('court_schedules')
          .update(values).eq('id', previous.id).eq('court_id', courtId).select().single();
        if (error || !data) throw new ServiceUnavailableException('No se pudo actualizar el horario. Los demás días no se eliminaron.');
        keptIds.push(previous.id);
        result.push(this.toDomain(data));
      } else {
        const row = await this.insertSchedule(values);
        keptIds.push(row.id);
        result.push(this.toDomain(row));
      }
    }

    // Delete only the previously stored days explicitly marked closed.
    const removedIds = existing.filter(row => !keptIds.includes(row.id)).map(row => row.id);
    if (removedIds.length) {
      const { error } = await this.supabase.from('court_schedules').delete()
        .eq('court_id', courtId).in('id', removedIds);
      if (error) throw new ServiceUnavailableException('Los horarios se guardaron, pero no se pudieron cerrar los días seleccionados. Recarga y revisa la semana.');
    }
    return result;
  }

  private async insertSchedule(values: {
    court_id: number; day_of_week?: number; specific_date?: string; open_time: string; close_time: string;
  }): Promise<any> {
    // Support legacy schemas with missing defaults or sequences behind imported IDs.
    const first = await this.supabase.from('court_schedules').insert(values).select().single();
    if (!first.error && first.data) return first.data;
    const missingId = first.error?.code === '23502' && first.error.message.includes('"id"');
    const duplicateId = (error: any) => error?.code === '23505'
      && error.message?.includes('"court_schedules_pkey"');
    if (!missingId && !duplicateId(first.error)) {
      throw new ServiceUnavailableException('No se pudo crear el horario. Los horarios anteriores se conservan.');
    }
    for (let attempt = 0; attempt < 3; attempt++) {
      const { data: last, error: readError } = await this.supabase.from('court_schedules')
        .select('id').order('id', { ascending: false }).limit(1).maybeSingle();
      if (readError) throw new ServiceUnavailableException('No se pudo asignar el identificador del horario.');
      const saved = await this.supabase.from('court_schedules')
        .insert({ ...values, id: Number(last?.id || 0) + 1 }).select().single();
      if (!saved.error && saved.data) return saved.data;
      if (!duplicateId(saved.error)) break;
    }
    throw new ServiceUnavailableException('No se pudo crear el horario. Recarga la pantalla e intenta nuevamente.');
  }
  async setSpecificDateSchedule(
    courtId: number,
    specificDate: string,
    openTime: string,
    closeTime: string,
  ): Promise<CourtSchedule> {
    const { data: existing, error: readError } = await this.supabase.from('court_schedules')
      .select('id').eq('court_id', courtId).eq('specific_date', specificDate).maybeSingle();
    if (readError) throw new ServiceUnavailableException('No se pudo leer el horario especial.');
    const values = { court_id: courtId, specific_date: specificDate, open_time: openTime, close_time: closeTime };
    if (!existing) return this.toDomain(await this.insertSchedule(values));
    const { data, error } = await this.supabase.from('court_schedules').update(values)
      .eq('id', existing.id).select().single();
    if (error || !data) throw new ServiceUnavailableException('No se pudo actualizar el horario especial.');
    return this.toDomain(data);
  }
}
