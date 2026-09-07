import { Injectable, Inject } from '@nestjs/common';
import { IReservationRepository, RESERVATION_REPOSITORY } from '../../domain/repositories/reservation.repository.interface';
import { EntityNotFoundException } from '../../../../common/domain/exceptions/domain.exception';

export interface RescheduleInfoOutputDto {
  reservationId: string;
  isRescheduled: boolean;
  parentReservationId: string | null;
  parentReservationDate: string | null;
  parentReservationTime: string | null;
  canBeRescheduled: boolean;
  rescheduleNotice: string;
}

/**
 * @reference HU-CLI-23 Consultar reprogramación
 */
@Injectable()
export class GetRescheduleInfoUseCase {
  constructor(
    @Inject(RESERVATION_REPOSITORY)
    private readonly reservationRepository: IReservationRepository,
  ) {}

  async execute(reservationId: string): Promise<RescheduleInfoOutputDto> {
    const reservation = await this.reservationRepository.findById(reservationId);
    if (!reservation) {
      throw new EntityNotFoundException(`La reserva ${reservationId} no existe.`);
    }

    let parentDate: string | null = null;
    let parentTime: string | null = null;

    if (reservation.parentReservationId) {
      const parent = await this.reservationRepository.findById(reservation.parentReservationId);
      if (parent) {
        parentDate = parent.reservationDate;
        parentTime = `${parent.startTime} - ${parent.endTime}`;
      }
    }

    return {
      reservationId: reservation.id,
      isRescheduled: !!reservation.parentReservationId,
      parentReservationId: reservation.parentReservationId || null,
      parentReservationDate: parentDate,
      parentReservationTime: parentTime,
      canBeRescheduled: ['CONFIRMED', 'PENDING_VALIDATION'].includes(reservation.status),
      rescheduleNotice:
        'Las reprogramaciones no son automáticas: deben ser autorizadas por la administración o secretaría para reubicar su turno preservando el anticipo.',
    };
  }
}
