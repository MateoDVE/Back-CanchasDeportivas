import { Injectable, Inject } from '@nestjs/common';
import {
  IReservationRepository,
  RESERVATION_REPOSITORY,
} from '../../domain/repositories/reservation.repository.interface';
import { Reservation } from '../../domain/entities/reservation.entity';

export interface DailyOperationalBoardResponse {
  date: string;
  totalReservationsToday: number;
  pendingValidationCount: number;
  confirmedTodayCount: number;
  pendingPaymentCount: number;
  pendingValidationList: Reservation[];
  confirmedTodayList: Reservation[];
}

@Injectable()
export class GetDailyOperationalBoardUseCase {
  constructor(
    @Inject(RESERVATION_REPOSITORY)
    private readonly reservationRepository: IReservationRepository,
  ) {}

  async execute(date?: string): Promise<DailyOperationalBoardResponse> {
    const targetDate = date || new Date().toISOString().split('T')[0];

    const allToday = await this.reservationRepository.findByDateRange(
      targetDate,
      targetDate,
    );
    const allPending = await this.reservationRepository.findPendingValidation();

    const confirmedToday = allToday.filter((r) => r.status === 'CONFIRMED');
    const pendingPaymentCount = confirmedToday.filter((r) => r.pendingBalance > 0).length;

    return {
      date: targetDate,
      totalReservationsToday: allToday.length,
      pendingValidationCount: allPending.length,
      confirmedTodayCount: confirmedToday.length,
      pendingPaymentCount,
      pendingValidationList: allPending,
      confirmedTodayList: confirmedToday,
    };
  }
}
