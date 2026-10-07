import { Injectable, Inject } from '@nestjs/common';
import {
  IReservationRepository,
  RESERVATION_REPOSITORY,
} from '../../domain/repositories/reservation.repository.interface';
import {
  IPaymentRepository,
  PAYMENT_REPOSITORY,
} from '../../../payments/domain/repositories/payment.repository.interface';
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
    @Inject(PAYMENT_REPOSITORY)
    private readonly paymentRepository: IPaymentRepository,
  ) {}

  async execute(reservationId: string, actorId?: string): Promise<Reservation> {
    const reservation =
      await this.reservationRepository.findById(reservationId);
    if (!reservation) {
      throw new EntityNotFoundException(
        `Reserva con id ${reservationId} no encontrada.`,
      );
    }

    const payments =
      await this.paymentRepository.findByReservationId(reservationId);
    const paid = payments.reduce(
      (sum, p) =>
        sum +
        (p.status === 'VALIDATED'
          ? p.amount
          : p.status === 'REFUNDED'
            ? -p.amount
            : 0),
      0,
    );
    reservation.applyPaidAmount(paid);
    reservation.authorizeEntry();
    await this.reservationRepository.update(
      reservation,
      actorId,
      'Ingreso autorizado con pago completo',
    );

    return reservation;
  }
}
