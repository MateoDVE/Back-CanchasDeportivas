import { Injectable, Inject } from '@nestjs/common';
import {
  IReservationRepository,
  RESERVATION_REPOSITORY,
} from '../../domain/repositories/reservation.repository.interface';
import { Reservation } from '../../domain/entities/reservation.entity';

export interface TemporalHoldDto {
  id: string;
  clientId: string;
  courtId: number;
  reservationDate: string;
  startTime: string;
  endTime: string;
  totalPrice: number;
  advanceRequired: number;
  expiresAt: Date | null;
  secondsRemaining: number;
}

/**
 * @reference HU-SEC-11 Visualizar reservas temporales
 */
@Injectable()
export class GetActiveTemporalReservationsUseCase {
  constructor(
    @Inject(RESERVATION_REPOSITORY)
    private readonly reservationRepository: IReservationRepository,
  ) {}

  async execute(): Promise<TemporalHoldDto[]> {
    const temporals = await this.reservationRepository.findActiveTemporal();
    return temporals.map((r: Reservation) => ({
      id: r.id,
      clientId: r.clientId,
      courtId: r.courtId,
      reservationDate: r.reservationDate,
      startTime: r.startTime,
      endTime: r.endTime,
      totalPrice: r.totalPrice,
      advanceRequired: r.advanceRequired,
      expiresAt: r.expiresAt,
      secondsRemaining: r.secondsRemaining(),
    }));
  }
}
