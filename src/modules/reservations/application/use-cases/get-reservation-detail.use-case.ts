import { Injectable, Inject } from '@nestjs/common';
import { IReservationRepository, RESERVATION_REPOSITORY } from '../../domain/repositories/reservation.repository.interface';
import { ICourtRepository, COURT_REPOSITORY } from '../../../courts/domain/repositories/court.repository.interface';
import { IComplexRepository, COMPLEX_REPOSITORY } from '../../../complexes/domain/repositories/complex.repository.interface';
import { IUserRepository, USER_REPOSITORY } from '../../../users/domain/repositories/user.repository.interface';
import { IPaymentRepository, PAYMENT_REPOSITORY } from '../../../payments/domain/repositories/payment.repository.interface';
import { EntityNotFoundException } from '../../../../common/domain/exceptions/domain.exception';

export interface ReservationDetailOutputDto {
  id: string;
  reservationDate: string;
  startTime: string;
  endTime: string;
  pricePerHour: number;
  totalPrice: number;
  advanceRequired: number;
  pendingBalance: number;
  status: string;
  expiresAt: Date | null;
  secondsRemaining: number;
  cancellationReason: string | null;
  parentReservationId: string | null;
  createdAt: Date;
  client: {
    id: string;
    name: string;
    email: string;
    phone: string;
    ci: string;
  } | null;
  court: {
    id: number;
    name: string;
    courtType: string;
  } | null;
  complex: {
    id: number;
    name: string;
    location: string;
    contactInfo: string;
    paymentQrUrl: string | null;
  } | null;
  payments: Array<{
    id: number;
    amount: number;
    paymentType: string;
    paymentMethod: string;
    receiptImageUrl: string | null;
    status: string;
    handledBy: string | null;
    createdAt: Date;
  }>;
}

/**
 * @reference HU-CLI-20 Consultar detalle de reserva (Cliente)
 * @reference HU-SEC-04 Consultar detalle de una reserva (Secretaria)
 */
@Injectable()
export class GetReservationDetailUseCase {
  constructor(
    @Inject(RESERVATION_REPOSITORY)
    private readonly reservationRepository: IReservationRepository,
    @Inject(COURT_REPOSITORY)
    private readonly courtRepository: ICourtRepository,
    @Inject(COMPLEX_REPOSITORY)
    private readonly complexRepository: IComplexRepository,
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
    @Inject(PAYMENT_REPOSITORY)
    private readonly paymentRepository: IPaymentRepository,
  ) {}

  async execute(reservationId: string): Promise<ReservationDetailOutputDto> {
    const reservation = await this.reservationRepository.findById(reservationId);
    if (!reservation) {
      throw new EntityNotFoundException(`La reserva con ID ${reservationId} no existe.`);
    }

    const client = await this.userRepository.findById(reservation.clientId);
    const court = await this.courtRepository.findById(reservation.courtId);
    const complex = court ? await this.complexRepository.findById(court.complexId) : null;
    const payments = await this.paymentRepository.findByReservationId(reservation.id);

    return {
      id: reservation.id,
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
      cancellationReason: reservation.cancellationReason || null,
      parentReservationId: reservation.parentReservationId || null,
      createdAt: reservation.createdAt,
      client: client
        ? {
            id: client.id,
            name: client.name,
            email: client.email,
            phone: client.phone,
            ci: client.ci,
          }
        : null,
      court: court
        ? {
            id: court.id,
            name: court.name,
            courtType: court.courtType,
          }
        : null,
      complex: complex
        ? {
            id: complex.id,
            name: complex.name,
            location: complex.location,
            contactInfo: complex.contactInfo,
            paymentQrUrl: complex.paymentQrUrl,
          }
        : null,
      payments: payments.map((p) => ({
        id: p.id,
        amount: p.amount,
        paymentType: p.paymentType,
        paymentMethod: p.paymentMethod,
        receiptImageUrl: p.receiptImageUrl,
        status: p.status,
        handledBy: p.handledBy,
        createdAt: p.createdAt,
      })),
    };
  }
}
