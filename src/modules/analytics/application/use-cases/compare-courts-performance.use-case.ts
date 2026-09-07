import { Injectable, Inject } from '@nestjs/common';
import {
  ICourtRepository,
  COURT_REPOSITORY,
} from '../../../courts/domain/repositories/court.repository.interface';
import {
  IReservationRepository,
  RESERVATION_REPOSITORY,
} from '../../../reservations/domain/repositories/reservation.repository.interface';

export interface CourtPerformanceDto {
  courtId: number;
  courtName: string;
  courtType: string;
  pricePerHour: number;
  totalBookings: number;
  totalHoursPlayed: number;
  totalRevenueGenerated: number;
  averageRevenuePerHour: number;
}

/**
 * @reference HU-ADM-22 Comparar rendimiento de canchas
 */
@Injectable()
export class CompareCourtsPerformanceUseCase {
  constructor(
    @Inject(COURT_REPOSITORY)
    private readonly courtRepository: ICourtRepository,
    @Inject(RESERVATION_REPOSITORY)
    private readonly reservationRepository: IReservationRepository,
  ) {}

  async execute(): Promise<CourtPerformanceDto[]> {
    const courts = await this.courtRepository.findAll();
    const allReservations = await this.reservationRepository.findAll();

    const confirmedReservations = allReservations.filter(
      (r) => r.status === 'CONFIRMED' || r.status === 'COMPLETED',
    );

    return courts.map((court) => {
      const courtRes = confirmedReservations.filter((r) => r.courtId === court.id);

      let totalHours = 0;
      let totalRevenue = 0;

      for (const res of courtRes) {
        const [sh] = res.startTime.split(':').map(Number);
        const [eh] = res.endTime.split(':').map(Number);
        const hours = Math.max(1, eh - sh);
        totalHours += hours;
        totalRevenue += res.totalPrice;
      }

      const avgRevenuePerHour =
        totalHours > 0 ? Number((totalRevenue / totalHours).toFixed(2)) : court.pricePerHour;

      return {
        courtId: court.id,
        courtName: court.name,
        courtType: court.courtType,
        pricePerHour: court.pricePerHour,
        totalBookings: courtRes.length,
        totalHoursPlayed: totalHours,
        totalRevenueGenerated: Number(totalRevenue.toFixed(2)),
        averageRevenuePerHour: avgRevenuePerHour,
      };
    });
  }
}
