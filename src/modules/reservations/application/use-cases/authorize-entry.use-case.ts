import { Injectable, Inject } from '@nestjs/common';
import {
  IReservationRepository,
  RESERVATION_REPOSITORY,
} from '../../domain/repositories/reservation.repository.interface';
import {
  EntityNotFoundException,
  DomainException,
} from '../../../../common/domain/exceptions/domain.exception';
import { Reservation } from '../../domain/entities/reservation.entity';

/**
 * @reference HU-SEC-16 Autorizar ingreso a la cancha
 * @reference HU-CLI-25 Completar pago antes de ingresar (estado: Acceso Habilitado)
 */
@Injectable()
export class AuthorizeEntryUseCase {
  constructor(
    @Inject(RESERVATION_REPOSITORY)
    private readonly reservationRepository: IReservationRepository,
  ) {}

  async execute(reservationId: string): Promise<Reservation> {
    const reservation = await this.reservationRepository.findById(reservationId);
    if (!reservation) {
      throw new EntityNotFoundException(`Reserva con id ${reservationId} no encontrada.`);
    }

    reservation.authorizeEntry();
    await this.reservationRepository.update(reservation);

    return reservation;
  }
}
