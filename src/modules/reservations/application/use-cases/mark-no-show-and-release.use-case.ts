import { Injectable, Inject } from '@nestjs/common';
import {
  IReservationRepository,
  RESERVATION_REPOSITORY,
} from '../../domain/repositories/reservation.repository.interface';
import { EntityNotFoundException } from '../../../../common/domain/exceptions/domain.exception';
import { Reservation } from '../../domain/entities/reservation.entity';

export interface MarkNoShowInput {
  reservationId: string;
  reason?: string;
  secretaryId: string;
}

/**
 * @reference HU-SEC-18 Liberar horario por inasistencia (No-Show)
 */
@Injectable()
export class MarkNoShowAndReleaseUseCase {
  constructor(
    @Inject(RESERVATION_REPOSITORY)
    private readonly reservationRepository: IReservationRepository,
  ) {}

  async execute(input: MarkNoShowInput): Promise<Reservation> {
    const reservation = await this.reservationRepository.findById(
      input.reservationId,
    );
    if (!reservation) {
      throw new EntityNotFoundException(
        `Reserva con id ${input.reservationId} no encontrada.`,
      );
    }

    reservation.markNoShow();

    await this.reservationRepository.update(
      reservation,
      input.secretaryId,
      input.reason || 'Inasistencia declarada',
    );

    return reservation;
  }
}
