import { Injectable, Inject } from '@nestjs/common';
import {
  IReservationRepository,
  RESERVATION_REPOSITORY,
  ReservationSearchFilters,
} from '../../domain/repositories/reservation.repository.interface';
import { Reservation } from '../../domain/entities/reservation.entity';

/**
 * @reference HU-ADM-15 Consultar todas las reservas
 */
@Injectable()
export class AdminListAllReservationsUseCase {
  constructor(
    @Inject(RESERVATION_REPOSITORY)
    private readonly reservationRepository: IReservationRepository,
  ) {}

  async execute(filters: ReservationSearchFilters): Promise<Reservation[]> {
    return this.reservationRepository.search(filters);
  }
}
