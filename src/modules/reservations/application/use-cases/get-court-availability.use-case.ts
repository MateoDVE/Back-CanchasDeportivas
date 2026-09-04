import { Injectable, Inject } from '@nestjs/common';
import { IReservationRepository, RESERVATION_REPOSITORY } from '../../domain/repositories/reservation.repository.interface';
import { ICourtRepository, COURT_REPOSITORY } from '../../../courts/domain/repositories/court.repository.interface';
import { IScheduleRepository, SCHEDULE_REPOSITORY } from '../../../schedules/domain/repositories/schedule.repository.interface';
import { EntityNotFoundException, ValidationException } from '../../../../common/domain/exceptions/domain.exception';
import { TimeSlot } from '../../domain/value-objects/time-slot.vo';

export interface SlotAvailabilityDto {
  startTime: string;
  endTime: string;
  isAvailable: boolean;
  status: 'AVAILABLE' | 'OCCUPIED' | 'TEMPORAL_HOLD';
}

export interface CourtAvailabilityOutputDto {
  courtId: number;
  courtName: string;
  date: string;
  dayOfWeek: number;
  isOpen: boolean;
  openTime: string | null;
  closeTime: string | null;
  slots: SlotAvailabilityDto[];
}

/**
 * @reference HU-CLI-08 Consultar disponibilidad por fecha
 */
@Injectable()
export class GetCourtAvailabilityUseCase {
  constructor(
    @Inject(RESERVATION_REPOSITORY)
    private readonly reservationRepository: IReservationRepository,
    @Inject(COURT_REPOSITORY)
    private readonly courtRepository: ICourtRepository,
    @Inject(SCHEDULE_REPOSITORY)
    private readonly scheduleRepository: IScheduleRepository,
  ) {}

  async execute(courtId: number, date: string): Promise<CourtAvailabilityOutputDto> {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
      throw new ValidationException('El formato de fecha debe ser YYYY-MM-DD.');
    }

    const court = await this.courtRepository.findById(courtId);
    if (!court || !court.isActive) {
      throw new EntityNotFoundException(`La cancha con ID ${courtId} no está disponible.`);
    }

    // Calcular día de la semana (1 = Lunes, ..., 7 = Domingo)
    // Usar split para evitar desfases de zona horaria
    const [year, month, day] = date.split('-').map(Number);
    const dateObj = new Date(year, month - 1, day);
    const jsDay = dateObj.getDay();
    const dayOfWeek = jsDay === 0 ? 7 : jsDay;

    // Buscar horario específico o regular
    let schedule = await this.scheduleRepository.findByCourtAndDate(courtId, date);
    if (!schedule) {
      schedule = await this.scheduleRepository.findByCourtAndDay(courtId, dayOfWeek);
    }

    if (!schedule) {
      return {
        courtId: court.id,
        courtName: court.name,
        date,
        dayOfWeek,
        isOpen: false,
        openTime: null,
        closeTime: null,
        slots: [],
      };
    }

    // Obtener reservas activas en la fecha
    const reservations = await this.reservationRepository.findByCourtAndDate(courtId, date);
    const activeReservations = reservations.filter((r) => {
      if (['CANCELLED', 'EXPIRED', 'NO_SHOW'].includes(r.status)) return false;
      if (r.status === 'TEMPORAL' && r.isExpired()) return false;
      return true;
    });

    // Generar franjas horarias de 1 hora entre openTime y closeTime
    const slots: SlotAvailabilityDto[] = [];
    const openMinutes = this.timeToMinutes(schedule.openTime);
    const closeMinutes = this.timeToMinutes(schedule.closeTime);

    // Iteramos cada 60 minutos
    for (let current = openMinutes; current + 60 <= closeMinutes; current += 60) {
      const slotStart = this.minutesToTime(current);
      const slotEnd = this.minutesToTime(current + 60);
      const timeSlot = new TimeSlot(slotStart, slotEnd);

      const conflict = activeReservations.find((res) =>
        timeSlot.overlapsWith(res.startTime, res.endTime),
      );

      if (!conflict) {
        slots.push({
          startTime: slotStart,
          endTime: slotEnd,
          isAvailable: true,
          status: 'AVAILABLE',
        });
      } else if (conflict.status === 'TEMPORAL' && !conflict.isExpired()) {
        slots.push({
          startTime: slotStart,
          endTime: slotEnd,
          isAvailable: false,
          status: 'TEMPORAL_HOLD',
        });
      } else {
        slots.push({
          startTime: slotStart,
          endTime: slotEnd,
          isAvailable: false,
          status: 'OCCUPIED',
        });
      }
    }

    return {
      courtId: court.id,
      courtName: court.name,
      date,
      dayOfWeek,
      isOpen: true,
      openTime: schedule.openTime,
      closeTime: schedule.closeTime,
      slots,
    };
  }

  private timeToMinutes(time: string): number {
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
  }

  private minutesToTime(minutes: number): string {
    const h = Math.floor(minutes / 60)
      .toString()
      .padStart(2, '0');
    const m = (minutes % 60).toString().padStart(2, '0');
    return `${h}:${m}`;
  }
}
