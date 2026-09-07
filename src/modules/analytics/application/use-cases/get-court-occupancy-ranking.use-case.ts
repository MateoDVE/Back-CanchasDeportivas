import { Injectable, Inject } from '@nestjs/common';
import {
  ICourtRepository,
  COURT_REPOSITORY,
} from '../../../courts/domain/repositories/court.repository.interface';
import {
  IReservationRepository,
  RESERVATION_REPOSITORY,
} from '../../../reservations/domain/repositories/reservation.repository.interface';

export interface CourtOccupancyItemDto {
  courtId: number;
  courtName: string;
  courtType: string;
  totalBookings: number;
  totalHoursBooked: number;
  occupancyPercentage: number;
  recommendation: string;
}

/**
 * @reference HU-ADM-20 Consultar ocupación de canchas
 */
@Injectable()
export class GetCourtOccupancyRankingUseCase {
  constructor(
    @Inject(COURT_REPOSITORY)
    private readonly courtRepository: ICourtRepository,
    @Inject(RESERVATION_REPOSITORY)
    private readonly reservationRepository: IReservationRepository,
  ) {}

  async execute(startDate?: string, endDate?: string): Promise<CourtOccupancyItemDto[]> {
    const courts = await this.courtRepository.findAll();
    let reservations = await this.reservationRepository.findAll();

    reservations = reservations.filter((r) => r.status === 'CONFIRMED');

    if (startDate && endDate) {
      reservations = reservations.filter(
        (r) => r.reservationDate >= startDate && r.reservationDate <= endDate,
      );
    }

    // Supongamos un estimado base de 14 horas operativas por día (ej. 08:00 a 22:00)
    const daysCount = startDate && endDate
      ? Math.max(1, Math.round((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 3600 * 24)) + 1)
      : 30;
    const totalPotentialHours = daysCount * 14;

    const ranking: CourtOccupancyItemDto[] = courts.map((court) => {
      const courtRes = reservations.filter((r) => r.courtId === court.id);
      let totalHoursBooked = 0;

      for (const r of courtRes) {
        const [sh] = r.startTime.split(':').map(Number);
        const [eh] = r.endTime.split(':').map(Number);
        totalHoursBooked += Math.max(1, eh - sh);
      }

      const occupancyPercentage = Number(
        Math.min(100, (totalHoursBooked / totalPotentialHours) * 100).toFixed(1),
      );

      let recommendation = 'Ocupación normal';
      if (occupancyPercentage < 25) {
        recommendation = 'Baja ocupación: Candidata ideal para descuentos y promociones';
      } else if (occupancyPercentage > 75) {
        recommendation = 'Alta demanda: Posible ajuste de tarifa en horas pico';
      }

      return {
        courtId: court.id,
        courtName: court.name,
        courtType: court.courtType,
        totalBookings: courtRes.length,
        totalHoursBooked,
        occupancyPercentage,
        recommendation,
      };
    });

    // Ordenar de menor a mayor ocupación (canchas más vacías primero)
    return ranking.sort((a, b) => a.occupancyPercentage - b.occupancyPercentage);
  }
}
