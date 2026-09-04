import { Injectable, Inject } from '@nestjs/common';
import { IReservationRepository, RESERVATION_REPOSITORY } from '../../domain/repositories/reservation.repository.interface';
import { ICourtRepository, COURT_REPOSITORY } from '../../../courts/domain/repositories/court.repository.interface';
import { IComplexRepository, COMPLEX_REPOSITORY } from '../../../complexes/domain/repositories/complex.repository.interface';
import { EntityNotFoundException } from '../../../../common/domain/exceptions/domain.exception';

export interface ReservationSummaryOutputDto {
  id: string;
  clientId: string;
  complex: {
    id: number;
    name: string;
    location: string;
    contactInfo: string;
    paymentQrUrl: string | null;
  };
  court: {
    id: number;
    name: string;
    courtType: string;
  };
  reservationDate: string;
  startTime: string;
  endTime: string;
  pricePerHour: number;
  totalPrice: number;
  advanceRequired: number; // 25% (HU-CLI-14)
  pendingBalance: number;  // 75% (HU-CLI-14)
  status: string;
  expiresAt: Date | null;
  secondsRemaining: number;
}

/**
 * @reference HU-CLI-13 Consultar resumen de reserva
 * @reference HU-CLI-14 Consultar anticipo requerido
 */
@Injectable()
export class GetReservationSummaryUseCase {
  constructor(
    @Inject(RESERVATION_REPOSITORY)
    private readonly reservationRepository: IReservationRepository,
    @Inject(COURT_REPOSITORY)
    private readonly courtRepository: ICourtRepository,
    @Inject(COMPLEX_REPOSITORY)
    private readonly complexRepository: IComplexRepository,
  ) {}

  async execute(reservationId: string): Promise<ReservationSummaryOutputDto> {
    const reservation = await this.reservationRepository.findById(reservationId);
    if (!reservation) {
      throw new EntityNotFoundException(`La reserva con ID ${reservationId} no existe.`);
    }

    const court = await this.courtRepository.findById(reservation.courtId);
    if (!court) {
      throw new EntityNotFoundException(`La cancha asociada a la reserva no existe.`);
    }

    const complex = await this.complexRepository.findById(court.complexId);
    if (!complex) {
      throw new EntityNotFoundException(`El complejo deportivo asociado no existe.`);
    }

    return {
      id: reservation.id,
      clientId: reservation.clientId,
      complex: {
        id: complex.id,
        name: complex.name,
        location: complex.location,
        contactInfo: complex.contactInfo,
        paymentQrUrl: complex.paymentQrUrl,
      },
      court: {
        id: court.id,
        name: court.name,
        courtType: court.courtType,
      },
      reservationDate: reservation.reservationDate,
      startTime: reservation.startTime,
      endTime: reservation.endTime,
      pricePerHour: reservation.pricePerHour,
      totalPrice: reservation.totalPrice,
      advanceRequired: reservation.advanceRequired,
      pendingBalance: reservation.pendingBalance,
      status: reservation.status,
      expiresAt: reservation.expiresAt,
      secondsRemaining: reservation.secondsRemaining(),
    };
  }
}
