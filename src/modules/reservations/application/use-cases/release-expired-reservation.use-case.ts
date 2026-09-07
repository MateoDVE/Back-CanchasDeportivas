import { Injectable, Inject } from '@nestjs/common';
import {
  IReservationRepository,
  RESERVATION_REPOSITORY,
} from '../../domain/repositories/reservation.repository.interface';
import {
  EntityNotFoundException,
  DomainException,
} from '../../../../common/domain/exceptions/domain.exception';

/**
 * @reference HU-SEC-12 Liberar horario por expiración
 */
@Injectable()
export class ReleaseExpiredReservationUseCase {
  constructor(
    @Inject(RESERVATION_REPOSITORY)
    private readonly reservationRepository: IReservationRepository,
  ) {}

  async execute(reservationId: string): Promise<{ success: boolean; message: string }> {
    const reservation = await this.reservationRepository.findById(reservationId);
    if (!reservation) {
      throw new EntityNotFoundException(`Reserva con id ${reservationId} no encontrada.`);
    }

    if (reservation.status !== 'TEMPORAL') {
      throw new DomainException(
        `Solo se pueden liberar reservas en estado TEMPORAL. Estado actual: ${reservation.status}`,
      );
    }

    reservation.expire();
    await this.reservationRepository.update(reservation);

    return {
      success: true,
      message: `Horario liberado exitosamente para la reserva ${reservationId}.`,
    };
  }
}
