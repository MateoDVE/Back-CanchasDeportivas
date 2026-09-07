import { Injectable, Inject } from '@nestjs/common';
import {
  IReservationRepository,
  RESERVATION_REPOSITORY,
} from '../../../reservations/domain/repositories/reservation.repository.interface';

export interface HourSlotStatDto {
  hour: string; // "08:00", "09:00", etc.
  bookingsCount: number;
  isPeak: boolean;
}

export interface PeakHoursAnalysisResponse {
  peakHour: string;
  peakHourBookingsCount: number;
  totalAnalyzedReservations: number;
  hourlyDistribution: HourSlotStatDto[];
}

/**
 * @reference HU-ADM-21 Consultar horarios de mayor demanda
 */
@Injectable()
export class GetPeakHoursAnalysisUseCase {
  constructor(
    @Inject(RESERVATION_REPOSITORY)
    private readonly reservationRepository: IReservationRepository,
  ) {}

  async execute(courtId?: number): Promise<PeakHoursAnalysisResponse> {
    let reservations = await this.reservationRepository.findAll();
    reservations = reservations.filter(
      (r) =>
        r.status === 'CONFIRMED' &&
        (!courtId || r.courtId === courtId),
    );

    const hourCounts: Record<string, number> = {};
    for (let h = 8; h <= 23; h++) {
      const label = `${h.toString().padStart(2, '0')}:00`;
      hourCounts[label] = 0;
    }

    for (const res of reservations) {
      const [startHour] = res.startTime.split(':').map(Number);
      const [endHour] = res.endTime.split(':').map(Number);

      for (let h = startHour; h < endHour; h++) {
        const label = `${h.toString().padStart(2, '0')}:00`;
        if (hourCounts[label] !== undefined) {
          hourCounts[label]++;
        }
      }
    }

    let peakHour = '19:00';
    let maxCount = 0;

    for (const [hour, count] of Object.entries(hourCounts)) {
      if (count > maxCount) {
        maxCount = count;
        peakHour = hour;
      }
    }

    const hourlyDistribution: HourSlotStatDto[] = Object.entries(hourCounts).map(
      ([hour, count]) => ({
        hour,
        bookingsCount: count,
        isPeak: count === maxCount && maxCount > 0,
      }),
    );

    return {
      peakHour,
      peakHourBookingsCount: maxCount,
      totalAnalyzedReservations: reservations.length,
      hourlyDistribution,
    };
  }
}
