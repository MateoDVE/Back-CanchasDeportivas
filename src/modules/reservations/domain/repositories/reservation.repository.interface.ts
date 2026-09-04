import { Reservation } from '../entities/reservation.entity';

export const RESERVATION_REPOSITORY = 'IReservationRepository';

export interface IReservationRepository {
  findById(id: string): Promise<Reservation | null>;
  save(reservation: Reservation): Promise<void>;
  findConflicting(
    courtId: number,
    date: string,
    startTime: string,
    endTime: string,
    excludeId?: string,
  ): Promise<Reservation[]>;
  findByCourtAndDate(courtId: number, date: string): Promise<Reservation[]>;
  findByClient(clientId: string): Promise<Reservation[]>;
  findPendingValidation(): Promise<Reservation[]>;
  update(reservation: Reservation): Promise<void>;
  releaseExpiredReservations(): Promise<number>;
}
