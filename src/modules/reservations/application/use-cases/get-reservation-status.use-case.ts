import { Injectable, Inject } from '@nestjs/common';
import { IReservationRepository, RESERVATION_REPOSITORY } from '../../domain/repositories/reservation.repository.interface';
import { EntityNotFoundException } from '../../../../common/domain/exceptions/domain.exception';

export interface ReservationStatusOutputDto {
  id: string;
  status: string;
  isExpired: boolean;
  expiresAt: Date | null;
  secondsRemaining: number;
}

/**
 * @reference HU-CLI-18 Consultar estado de reserva
 */
@Injectable()
export class GetReservationStatusUseCase {
  constructor(
    @Inject(RESERVATION_REPOSITORY)
    private readonly reservationRepository: IReservationRepository,
  ) {}

  async execute(reservationId: string): Promise<ReservationStatusOutputDto> {
    const reservation = await this.reservationRepository.findById(reservationId);
    if (!reservation) {
      throw new EntityNotFoundException(`La reserva con ID ${reservationId} no existe.`);
    }

    return {
      id: reservation.id,
      status: reservation.status,
      isExpired: reservation.isExpired(),
      expiresAt: reservation.expiresAt,
      secondsRemaining: reservation.secondsRemaining(),
    };
  }
}
