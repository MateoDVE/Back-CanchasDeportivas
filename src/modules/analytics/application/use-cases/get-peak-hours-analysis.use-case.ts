import { Injectable, Inject } from '@nestjs/common';
import {
  IReservationRepository,
  RESERVATION_REPOSITORY,
} from '../../../reservations/domain/repositories/reservation.repository.interface';

export interface PeakHourItemDto {
  hour: number;
  count: number;
  hourLabel: string;
  isPeak: boolean;
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

  async execute(courtId?: number): Promise<PeakHourItemDto[]> {
    let reservations = await this.reservationRepository.findAll();
    reservations = reservations.filter(
      (r) =>
        r.status === 'CONFIRMED' &&
        (!courtId || r.courtId === courtId),
    );

    const hourCounts: Record<number, number> = {};
    for (let h = 8; h <= 22; h++) {
      hourCounts[h] = 0;
    }

    for (const res of reservations) {
      const [startHour] = res.startTime.split(':').map(Number);
      const [endHour] = res.endTime.split(':').map(Number);

      for (let h = startHour; h < endHour; h++) {
        if (hourCounts[h] !== undefined) {
          hourCounts[h]++;
        }
      }
    }

    let maxCount = 0;
    for (const count of Object.values(hourCounts)) {
      if (count > maxCount) {
        maxCount = count;
      }
    }

    return Object.entries(hourCounts).map(([hStr, count]) => {
      const hour = parseInt(hStr, 10);
      return {
        hour,
        count,
        hourLabel: `${hour.toString().padStart(2, '0')}:00 - ${(hour + 1).toString().padStart(2, '0')}:00`,
        isPeak: count === maxCount && maxCount > 0,
      };
    });
  }
}
