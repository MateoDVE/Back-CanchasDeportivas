import { Injectable, Inject } from '@nestjs/common';
import { IReservationRepository, RESERVATION_REPOSITORY } from '../../domain/repositories/reservation.repository.interface';
import { ICourtRepository, COURT_REPOSITORY } from '../../../courts/domain/repositories/court.repository.interface';
import { Reservation } from '../../domain/entities/reservation.entity';

export interface ClientReservationItemDto {
  id: string;
  courtId: number;
  courtName: string;
  reservationDate: string;
  startTime: string;
  endTime: string;
  totalPrice: number;
  advanceRequired: number;
  pendingBalance: number;
  status: string;
  expiresAt: Date | null;
  secondsRemaining: number;
  createdAt: Date;
}

export interface ClientReservationsGroupedOutputDto {
  upcoming: ClientReservationItemDto[];
  history: ClientReservationItemDto[];
}

/**
 * @reference HU-CLI-19 Consultar mis reservas
 */
@Injectable()
export class GetClientReservationsUseCase {
  constructor(
    @Inject(RESERVATION_REPOSITORY)
    private readonly reservationRepository: IReservationRepository,
    @Inject(COURT_REPOSITORY)
    private readonly courtRepository: ICourtRepository,
  ) {}

  async execute(clientId: string): Promise<ClientReservationsGroupedOutputDto> {
    const reservations = await this.reservationRepository.findByClient(clientId);
    const courts = await this.courtRepository.findAll(false);
    const courtMap = new Map(courts.map((c) => [c.id, c.name]));

    const todayStr = new Date().toISOString().split('T')[0];

    const upcoming: ClientReservationItemDto[] = [];
    const history: ClientReservationItemDto[] = [];

    for (const r of reservations) {
      const item: ClientReservationItemDto = {
        id: r.id,
        courtId: r.courtId,
        courtName: courtMap.get(r.courtId) || `Cancha #${r.courtId}`,
        reservationDate: r.reservationDate,
        startTime: r.startTime,
        endTime: r.endTime,
        totalPrice: r.totalPrice,
        advanceRequired: r.advanceRequired,
        pendingBalance: r.pendingBalance,
        status: r.status,
        expiresAt: r.expiresAt,
        secondsRemaining: r.secondsRemaining(),
        createdAt: r.createdAt,
      };

      const isUpcoming =
        r.reservationDate >= todayStr &&
        ['TEMPORAL', 'PENDING_VALIDATION', 'CONFIRMED'].includes(r.status);

      if (isUpcoming) {
        upcoming.push(item);
      } else {
        history.push(item);
      }
    }

    return { upcoming, history };
  }
}
