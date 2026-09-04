import { Injectable, Inject } from '@nestjs/common';
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

    if (error || !data) return [];
    return data.map((r) => this.toDomain(r));
  }

  async setWeeklySchedules(
    courtId: number,
    schedules: ScheduleConfigItem[],
  ): Promise<CourtSchedule[]> {
    // 1. Eliminar anteriores
    await this.supabase
      .from('court_schedules')
      .delete()
      .eq('court_id', courtId)
      .not('day_of_week', 'is', null);

    // 2. Insertar nuevos
    const rowsToInsert = schedules.map((item) => ({
      court_id: courtId,
      day_of_week: item.dayOfWeek,
      open_time: item.openTime,
      close_time: item.closeTime,
    }));

    const { data, error } = await this.supabase
      .from('court_schedules')
      .insert(rowsToInsert)
      .select();

    if (error || !data) {
      throw new Error(`Error al guardar horarios en Supabase: ${error?.message}`);
    }

    return data.map((r) => this.toDomain(r));
  }
}
