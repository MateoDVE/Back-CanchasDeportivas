import { Inject, Injectable } from '@nestjs/common';
import { IUserRepository, USER_REPOSITORY } from '../../../users/domain/repositories/user.repository.interface';
import { IReservationRepository, RESERVATION_REPOSITORY } from '../../domain/repositories/reservation.repository.interface';
import { EntityNotFoundException } from '../../../../common/domain/exceptions/domain.exception';

/** @reference HU-CLI-20 Solo el propietario o personal autorizado puede consultar una reserva. */
@Injectable()
export class AuthorizeReservationAccessUseCase {
  constructor(
    @Inject(RESERVATION_REPOSITORY) private readonly reservations: IReservationRepository,
    @Inject(USER_REPOSITORY) private readonly users: IUserRepository,
  ) {}
  async execute(reservationId: string, userId: string): Promise<void> {
    const [reservation, user] = await Promise.all([this.reservations.findById(reservationId), this.users.findById(userId)]);
    if (!reservation || !user?.isActive() ||
      (reservation.clientId !== user.id && !['ADMIN', 'SECRETARIA'].includes(user.role))) {
      throw new EntityNotFoundException('La reserva no está disponible.');
    }
  }
}
