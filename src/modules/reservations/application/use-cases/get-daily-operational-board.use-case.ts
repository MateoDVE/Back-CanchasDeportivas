import { Injectable, Inject } from '@nestjs/common';
import {
  IReservationRepository,
  RESERVATION_REPOSITORY,
} from '../../domain/repositories/reservation.repository.interface';
import { Reservation } from '../../domain/entities/reservation.entity';
import {
  ICourtRepository,
  COURT_REPOSITORY,
} from '../../../courts/domain/repositories/court.repository.interface';
import {
  IUserRepository,
  USER_REPOSITORY,
} from '../../../users/domain/repositories/user.repository.interface';

import {
  IPaymentRepository,
  PAYMENT_REPOSITORY,
} from '../../../payments/domain/repositories/payment.repository.interface';

export interface OperationalCourtReservationSlot {
  id: string;
  startTime: string;
  endTime: string;
  status: string;
  clientName: string;
  clientPhone?: string;
  totalAmount: number;
  advancePaymentAmount: number;
  pendingBalance: number;
  isAuthorized: boolean;
}

export interface OperationalCourtDto {
  courtId: number;
  courtName: string;
  sportType: string;
  pricePerHour: number;
  reservations: OperationalCourtReservationSlot[];
}

export interface DailyOperationalBoardResponse {
  date: string;
  courts: OperationalCourtDto[];
  totalReservations: number;
  confirmedCount: number;
  pendingValidationCount: number;
  completedCount: number;
  // Legacy / backward-compatibility fields
  totalReservationsToday: number;
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
    @Inject(COURT_REPOSITORY)
    private readonly courtRepository: ICourtRepository,
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
    @Inject(PAYMENT_REPOSITORY)
    private readonly paymentRepository: IPaymentRepository,
  ) {}

  async execute(date?: string): Promise<DailyOperationalBoardResponse> {
    const targetDate = date || new Date().toISOString().split('T')[0];

    const [allToday, allPending, allCourts, allUsers, allPayments] = await Promise.all([
      this.reservationRepository.findByDateRange(targetDate, targetDate),
      this.reservationRepository.findPendingValidation(),
      this.courtRepository.findAll(),
      this.userRepository.findAll(),
      this.paymentRepository.findAll(),
    ]);

    const userMap = new Map(allUsers.map((u) => [u.id, u]));
    const fullyPaidReservationIds = new Set(
      allPayments
        .filter((p) => p.paymentType === 'SALDO_FINAL' && p.status === 'VALIDATED')
        .map((p) => p.reservationId),
    );

    const confirmedToday = allToday.filter((r) => r.status === 'CONFIRMED');
    const completedToday = allToday.filter((r) => r.status === 'COMPLETED');
    const pendingValidationToday = allToday.filter(
      (r) => r.status === 'PENDING_VALIDATION',
    );
    const pendingPaymentCount = confirmedToday.filter(
      (r) => !fullyPaidReservationIds.has(r.id) && r.pendingBalance > 0,
    ).length;

    // Group reservations by court
    const courts: OperationalCourtDto[] = allCourts.map((court) => {
      const courtReservations = allToday
        .filter((r) => r.courtId === court.id)
        .sort((a, b) => a.startTime.localeCompare(b.startTime));

      const mappedSlots: OperationalCourtReservationSlot[] = courtReservations.map(
        (r) => {
          const client = userMap.get(r.clientId);
          const isPaid = fullyPaidReservationIds.has(r.id) || r.isFinalPaymentPaid;
          const isTerminal =
            r.status === 'CANCELLED' ||
            r.status === 'EXPIRED' ||
            r.status === 'TEMPORAL' ||
            r.status === 'COMPLETED';
          const balance = isPaid || isTerminal ? 0 : r.pendingBalance;
          const authorized = r.isEntryAuthorized || r.status === 'COMPLETED';

          return {
            id: r.id,
            startTime: r.startTime,
            endTime: r.endTime,
            status: r.status,
            clientName: client ? client.name : 'Cliente Presencial',
            clientPhone: client?.phone,
            totalAmount: r.totalPrice,
            advancePaymentAmount: r.advanceRequired,
            pendingBalance: balance,
            isAuthorized: authorized,
          };
        },
      );

      return {
        courtId: court.id,
        courtName: court.name,
        sportType: court.courtType,
        pricePerHour: court.pricePerHour,
        reservations: mappedSlots,
      };
    });

    return {
      date: targetDate,
      courts,
      totalReservations: allToday.length,
      confirmedCount: confirmedToday.length,
      pendingValidationCount:
        pendingValidationToday.length > 0
          ? pendingValidationToday.length
          : allPending.length,
      completedCount: completedToday.length,
      // Compatibility fields
      totalReservationsToday: allToday.length,
      confirmedTodayCount: confirmedToday.length,
      pendingPaymentCount,
      pendingValidationList: allPending,
      confirmedTodayList: confirmedToday,
    };
  }
}
