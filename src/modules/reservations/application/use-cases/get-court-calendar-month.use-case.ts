import { Injectable, Inject } from '@nestjs/common';
import { IReservationRepository, RESERVATION_REPOSITORY } from '../../domain/repositories/reservation.repository.interface';
import { ICourtRepository, COURT_REPOSITORY } from '../../../courts/domain/repositories/court.repository.interface';
import { EntityNotFoundException, ValidationException } from '../../../../common/domain/exceptions/domain.exception';

export interface DayOccupancySummaryDto {
  date: string; // YYYY-MM-DD
  totalReservations: number;
  confirmedCount: number;
  status: 'FULL' | 'PARTIAL' | 'EMPTY';
}

export interface CalendarMonthOutputDto {
  courtId: number;
  year: number;
  month: number;
  days: DayOccupancySummaryDto[];
}

/**
 * @reference HU-CLI-09 Consultar disponibilidad mediante calendario
 */
@Injectable()
export class GetCourtCalendarMonthUseCase {
  constructor(
    @Inject(RESERVATION_REPOSITORY)
    private readonly reservationRepository: IReservationRepository,
    @Inject(COURT_REPOSITORY)
    private readonly courtRepository: ICourtRepository,
  ) {}

  async execute(courtId: number, year: number, month: number): Promise<CalendarMonthOutputDto> {
    if (month < 1 || month > 12) {
      throw new ValidationException('El mes debe estar entre 1 y 12.');
    }

    const court = await this.courtRepository.findById(courtId);
    if (!court) {
      throw new EntityNotFoundException(`La cancha con ID ${courtId} no existe.`);
    }

    const startStr = `${year}-${month.toString().padStart(2, '0')}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const endStr = `${year}-${month.toString().padStart(2, '0')}-${lastDay.toString().padStart(2, '0')}`;

    const reservations = await this.reservationRepository.findByDateRange(startStr, endStr);
    const courtRes = reservations.filter(
      (r) => r.courtId === courtId && !['CANCELLED', 'EXPIRED'].includes(r.status),
    );

    const days: DayOccupancySummaryDto[] = [];
    for (let d = 1; d <= lastDay; d++) {
      const dateStr = `${year}-${month.toString().padStart(2, '0')}-${d.toString().padStart(2, '0')}`;
      const dayRes = courtRes.filter((r) => r.reservationDate === dateStr);
      const confirmed = dayRes.filter((r) => r.status === 'CONFIRMED').length;

      let status: 'FULL' | 'PARTIAL' | 'EMPTY' = 'EMPTY';
      if (dayRes.length >= 10) {
        status = 'FULL';
      } else if (dayRes.length > 0) {
        status = 'PARTIAL';
      }

      days.push({
        date: dateStr,
        totalReservations: dayRes.length,
        confirmedCount: confirmed,
        status,
      });
    }

    return {
      courtId,
      year,
      month,
      days,
    };
  }
}
