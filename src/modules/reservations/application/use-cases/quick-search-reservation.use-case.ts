import { Injectable, Inject } from '@nestjs/common';
import {
  IReservationRepository,
  RESERVATION_REPOSITORY,
} from '../../domain/repositories/reservation.repository.interface';
import {
  IUserRepository,
  USER_REPOSITORY,
} from '../../../users/domain/repositories/user.repository.interface';
import {
  ICourtRepository,
  COURT_REPOSITORY,
} from '../../../courts/domain/repositories/court.repository.interface';
import {
  IPaymentRepository,
  PAYMENT_REPOSITORY,
} from '../../../payments/domain/repositories/payment.repository.interface';
import { Reservation } from '../../domain/entities/reservation.entity';

export interface QuickSearchResultDto {
  id: string;
  clientName: string;
  clientCi?: string;
  clientPhone?: string;
  courtId: number;
  courtName: string;
  status: string;
  startTime: string;
  endTime: string;
  reservationDate: string;
  totalAmount: number;
  pendingBalance: number;
  isAuthorized: boolean;
  reservation: Reservation;
  client: {
    id: string;
    fullName: string;
    ci: string;
    phone: string;
    email: string;
  } | null;
}

/**
 * @reference HU-SEC-13 Verificar reserva al ingreso
 */
@Injectable()
export class QuickSearchReservationUseCase {
  constructor(
    @Inject(RESERVATION_REPOSITORY)
    private readonly reservationRepository: IReservationRepository,
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
    @Inject(COURT_REPOSITORY)
    private readonly courtRepository: ICourtRepository,
    @Inject(PAYMENT_REPOSITORY)
    private readonly paymentRepository: IPaymentRepository,
  ) {}

  async execute(query: string): Promise<QuickSearchResultDto[]> {
    const q = (query || '').trim().toLowerCase();
    if (!q) return [];

    const [allUsers, allCourts, allReservations, allPayments] = await Promise.all([
      this.userRepository.findAll(),
      this.courtRepository.findAll(),
      this.reservationRepository.findAll(),
      this.paymentRepository.findAll(),
    ]);

    const courtMap = new Map(allCourts.map((c) => [c.id, c]));
    const fullyPaidReservationIds = new Set(
      allPayments
        .filter((p) => p.paymentType === 'SALDO_FINAL' && p.status === 'VALIDATED')
        .map((p) => p.reservationId),
    );

    const matchingUsers = allUsers.filter(
      (u) =>
        u.ci.toLowerCase().includes(q) ||
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q),
    );
    const matchingUserIds = new Set(matchingUsers.map((u) => u.id));
    const userMap = new Map(allUsers.map((u) => [u.id, u]));

    const matched = allReservations.filter(
      (r) =>
        r.id.toLowerCase().includes(q) ||
        matchingUserIds.has(r.clientId),
    );

    return matched.map((res) => {
      const u = userMap.get(res.clientId);
      const court = courtMap.get(res.courtId);
      const isPaid = fullyPaidReservationIds.has(res.id) || res.isFinalPaymentPaid;
      const isTerminal =
        res.status === 'CANCELLED' ||
        res.status === 'EXPIRED' ||
        res.status === 'TEMPORAL' ||
        res.status === 'COMPLETED';
      const balance = isPaid || isTerminal ? 0 : res.pendingBalance;
      const authorized = res.isEntryAuthorized || res.status === 'COMPLETED';

      return {
        id: res.id,
        clientName: u ? u.name : 'Cliente',
        clientCi: u?.ci,
        clientPhone: u?.phone,
        courtId: res.courtId,
        courtName: court ? court.name : `Cancha ${res.courtId}`,
        status: res.status,
        startTime: res.startTime,
        endTime: res.endTime,
        reservationDate: res.reservationDate,
        totalAmount: res.totalPrice,
        pendingBalance: balance,
        isAuthorized: authorized,
        reservation: res,
        client: u
          ? {
              id: u.id,
              fullName: u.name,
              ci: u.ci,
              phone: u.phone,
              email: u.email,
            }
          : null,
      };
    });
  }
}
