import { Injectable, Inject } from '@nestjs/common';
import {
  IReservationRepository,
  RESERVATION_REPOSITORY,
  ReservationSearchFilters,
} from '../../domain/repositories/reservation.repository.interface';
import { Reservation } from '../../domain/entities/reservation.entity';

@Injectable()
export class SearchReservationsUseCase {
  constructor(
    @Inject(RESERVATION_REPOSITORY)
    private readonly reservationRepository: IReservationRepository,
  ) {}

  async execute(filters: ReservationSearchFilters): Promise<Reservation[]> {
    return this.reservationRepository.search(filters);
  }
}
