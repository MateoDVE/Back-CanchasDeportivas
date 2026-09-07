import { Injectable, Inject } from '@nestjs/common';
import {
  IReservationRepository,
  RESERVATION_REPOSITORY,
} from '../../../reservations/domain/repositories/reservation.repository.interface';
import {
  IUserRepository,
  USER_REPOSITORY,
} from '../../../users/domain/repositories/user.repository.interface';
import { Reservation } from '../../../reservations/domain/entities/reservation.entity';

export interface PendingReceivableItemDto {
  reservation: Reservation;
  clientName: string;
  clientPhone: string;
  clientEmail: string;
  pendingBalance: number;
}

export interface PendingReceivablesResponse {
  totalPendingAmount: number;
  count: number;
  items: PendingReceivableItemDto[];
}

/**
 * @reference HU-ADM-18 Consultar pagos pendientes
 */
@Injectable()
export class GetPendingReceivablesUseCase {
  constructor(
    @Inject(RESERVATION_REPOSITORY)
    private readonly reservationRepository: IReservationRepository,
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
  ) {}

  async execute(courtId?: number): Promise<PendingReceivablesResponse> {
    const all = await this.reservationRepository.findAll();
    const confirmedWithBalance = all.filter(
      (r) =>
        r.status === 'CONFIRMED' &&
        r.pendingBalance > 0 &&
        (!courtId || r.courtId === courtId),
    );

    const allUsers = await this.userRepository.findAll();
    const userMap = new Map(allUsers.map((u) => [u.id, u]));

    let totalPendingAmount = 0;
    const items: PendingReceivableItemDto[] = confirmedWithBalance.map((res) => {
      const u = userMap.get(res.clientId);
      totalPendingAmount += res.pendingBalance;
      return {
        reservation: res,
        clientName: u ? u.name : res.clientId,
        clientPhone: u ? u.phone : '',
        clientEmail: u ? u.email : '',
        pendingBalance: res.pendingBalance,
      };
    });

    return {
      totalPendingAmount: Number(totalPendingAmount.toFixed(2)),
      count: items.length,
      items,
    };
  }
}
