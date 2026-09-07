import { Injectable, Inject } from '@nestjs/common';
import {
  IReservationRepository,
  RESERVATION_REPOSITORY,
} from '../../domain/repositories/reservation.repository.interface';
import {
  IUserRepository,
  USER_REPOSITORY,
} from '../../../users/domain/repositories/user.repository.interface';
import { Reservation } from '../../domain/entities/reservation.entity';

export interface QuickSearchResultDto {
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
  ) {}

  async execute(query: string): Promise<QuickSearchResultDto[]> {
    const q = (query || '').trim().toLowerCase();
    if (!q) return [];

    const allUsers = await this.userRepository.findAll();
    const matchingUsers = allUsers.filter(
      (u) =>
        u.ci.toLowerCase().includes(q) ||
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q),
    );
    const matchingUserIds = new Set(matchingUsers.map((u) => u.id));
    const userMap = new Map(allUsers.map((u) => [u.id, u]));

    const allReservations = await this.reservationRepository.findAll();
    const matched = allReservations.filter(
      (r) =>
        r.id.toLowerCase().includes(q) ||
        matchingUserIds.has(r.clientId),
    );

    return matched.map((res) => {
      const u = userMap.get(res.clientId);
      return {
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
