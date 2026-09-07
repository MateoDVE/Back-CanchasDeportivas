import { CourtSchedule } from '../entities/court-schedule.entity';

export const SCHEDULE_REPOSITORY = 'IScheduleRepository';

export interface ScheduleConfigItem {
  dayOfWeek: number;
  openTime: string;
  closeTime: string;
}

export interface IScheduleRepository {
  findByCourtAndDay(courtId: number, dayOfWeek: number): Promise<CourtSchedule | null>;
  findByCourtAndDate(courtId: number, date: string): Promise<CourtSchedule | null>;
  getWeeklySchedules(courtId: number): Promise<CourtSchedule[]>;
  setWeeklySchedules(courtId: number, schedules: ScheduleConfigItem[]): Promise<CourtSchedule[]>;
  setSpecificDateSchedule(
    courtId: number,
    specificDate: string,
    openTime: string,
    closeTime: string,
  ): Promise<CourtSchedule>;
}
