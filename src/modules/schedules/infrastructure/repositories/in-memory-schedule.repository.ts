import { Injectable } from '@nestjs/common';
import {
  IScheduleRepository,
  ScheduleConfigItem,
} from '../../domain/repositories/schedule.repository.interface';
import { CourtSchedule } from '../../domain/entities/court-schedule.entity';

@Injectable()
export class InMemoryScheduleRepository implements IScheduleRepository {
  private schedules: CourtSchedule[] = [];
  private nextId = 1;

  constructor() {
    this.seedDefaultSchedules();
  }

  private seedDefaultSchedules() {
    // Horario por defecto: 1 al 5 para todas las canchas (de 08:00 a 23:00 de Lunes a Domingo)
    for (let courtId = 1; courtId <= 5; courtId++) {
      for (let day = 1; day <= 7; day++) {
        this.schedules.push(
          new CourtSchedule(
            this.nextId++,
            courtId,
            day,
            null,
            '08:00',
            '23:00',
          ),
        );
      }
    }
  }

  async findByCourtAndDay(courtId: number, dayOfWeek: number): Promise<CourtSchedule | null> {
    const found = this.schedules.find(
      (s) => s.courtId === courtId && s.dayOfWeek === dayOfWeek,
    );
    return found || null;
  }

  async findByCourtAndDate(courtId: number, date: string): Promise<CourtSchedule | null> {
    const found = this.schedules.find(
      (s) => s.courtId === courtId && s.specificDate === date,
    );
    return found || null;
  }

  async getWeeklySchedules(courtId: number): Promise<CourtSchedule[]> {
    return this.schedules.filter(
      (s) => s.courtId === courtId && s.dayOfWeek !== null,
    );
  }

  async setWeeklySchedules(
    courtId: number,
    schedules: ScheduleConfigItem[],
  ): Promise<CourtSchedule[]> {
    // Eliminar horarios semanales previos de la cancha
    this.schedules = this.schedules.filter(
      (s) => !(s.courtId === courtId && s.dayOfWeek !== null),
    );

    const created: CourtSchedule[] = [];
    for (const item of schedules) {
      const entity = new CourtSchedule(
        this.nextId++,
        courtId,
        item.dayOfWeek,
        null,
        item.openTime,
        item.closeTime,
      );
      this.schedules.push(entity);
      created.push(entity);
    }

    return created;
  }

  async setSpecificDateSchedule(
    courtId: number,
    specificDate: string,
    openTime: string,
    closeTime: string,
  ): Promise<CourtSchedule> {
    this.schedules = this.schedules.filter(
      (s) => !(s.courtId === courtId && s.specificDate === specificDate),
    );

    const schedule = new CourtSchedule(
      this.nextId++,
      courtId,
      null,
      specificDate,
      openTime,
      closeTime,
    );
    this.schedules.push(schedule);
    return schedule;
  }
}
