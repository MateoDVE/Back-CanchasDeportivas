import { Injectable, Inject } from '@nestjs/common';
import {
  IReservationRepository,
  RESERVATION_REPOSITORY,
} from '../../domain/repositories/reservation.repository.interface';
import { Reservation } from '../../domain/entities/reservation.entity';

/**
 * @reference HU-SEC-17 Identificar cliente que no se presentó
 */
@Injectable()
export class GetNoShowCandidatesUseCase {
  constructor(
    @Inject(RESERVATION_REPOSITORY)
    private readonly reservationRepository: IReservationRepository,
  ) {}

  async execute(date?: string): Promise<Reservation[]> {
    const today = date || new Date().toISOString().split('T')[0];
    const nowTime = new Date().toTimeString().slice(0, 5); // HH:mm

    const reservations = await this.reservationRepository.findByDateRange(today, today);

    // Candidatos a No-Show: confirmadas, no autorizadas, cuya hora de inicio ya pasó
    return reservations.filter(
      (r) =>
        r.status === 'CONFIRMED' &&
        !r.isEntryAuthorized &&
        r.startTime <= nowTime,
    );
  }
}
