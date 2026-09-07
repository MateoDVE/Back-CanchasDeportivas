import { Injectable, Inject } from '@nestjs/common';
import { IReservationRepository, RESERVATION_REPOSITORY } from '../../domain/repositories/reservation.repository.interface';
import { EntityNotFoundException, ValidationException } from '../../../../common/domain/exceptions/domain.exception';

export interface CancelReservationInput {
  reservationId: string;
  reason?: string;
  cancelledByUserId: string;
  isStaff?: boolean;
}

export interface CancelReservationOutputDto {
  reservationId: string;
  status: string;
  cancellationReason: string;
  advanceRefunded: boolean;
  message: string;
}

/**
 * @reference HU-CLI-21 Solicitar cancelación (Cliente)
 * @reference HU-SEC-19 Gestionar cancelación de reserva (Secretaria)
 * @reference RN-08 Política de anticipo no reembolsable
 */
@Injectable()
export class CancelReservationUseCase {
  constructor(
    @Inject(RESERVATION_REPOSITORY)
    private readonly reservationRepository: IReservationRepository,
  ) {}

  async execute(input: CancelReservationInput): Promise<CancelReservationOutputDto> {
    const reason = (input.reason && input.reason.trim()) || (input.isStaff ? 'Cancelado por administración' : 'Cancelado por cliente');

    const reservation = await this.reservationRepository.findById(input.reservationId);
    if (!reservation) {
      throw new EntityNotFoundException(`La reserva con ID ${input.reservationId} no existe.`);
    }

    if (reservation.status === 'CANCELLED') {
      throw new ValidationException('La reserva ya se encuentra cancelada.');
    }

    // Cliente solo cancela las suyas
    if (!input.isStaff && reservation.clientId !== input.cancelledByUserId) {
      throw new ValidationException('No tiene autorización para cancelar esta reserva.');
    }

    reservation.cancel(reason);
    await this.reservationRepository.update(reservation);

    return {
      reservationId: reservation.id,
      status: reservation.status,
      cancellationReason: reason,
      advanceRefunded: false, // RN-08: El anticipo no es reembolsable por defecto
      message: 'Reserva cancelada con éxito. Horario liberado para nuevos clientes.',
    };
  }
}
