import { Injectable, Inject } from '@nestjs/common';
import * as crypto from 'crypto';
import {
  IReservationRepository,
  RESERVATION_REPOSITORY,
} from '../../domain/repositories/reservation.repository.interface';
import {
  ICourtRepository,
  COURT_REPOSITORY,
} from '../../../courts/domain/repositories/court.repository.interface';
import {
  EntityNotFoundException,
  CourtSlotOccupiedException,
} from '../../../../common/domain/exceptions/domain.exception';
import { TimeSlot } from '../../domain/value-objects/time-slot.vo';
import { Reservation } from '../../domain/entities/reservation.entity';

export interface RescheduleReservationInput {
  reservationId: string;
  newDate: string; // YYYY-MM-DD
  newStartTime: string; // HH:mm
  newEndTime: string; // HH:mm
  newCourtId?: number;
  reason?: string;
  handledBy: string;
}

/**
 * @reference HU-SEC-20 Gestionar reprogramación
 * @reference HU-SEC-23 Gestionar reprogramación por incidente
 */
@Injectable()
export class RescheduleReservationUseCase {
  constructor(
    @Inject(RESERVATION_REPOSITORY)
    private readonly reservationRepository: IReservationRepository,
    @Inject(COURT_REPOSITORY)
    private readonly courtRepository: ICourtRepository,
  ) {}

  async execute(input: RescheduleReservationInput): Promise<Reservation> {
    const oldReservation = await this.reservationRepository.findById(
      input.reservationId,
    );
    if (!oldReservation) {
      throw new EntityNotFoundException(
        `Reserva ${input.reservationId} no encontrada.`,
      );
    }

    const targetCourtId = input.newCourtId || oldReservation.courtId;
    const court = await this.courtRepository.findById(targetCourtId);
    if (!court || !court.isActive) {
      throw new EntityNotFoundException(
        `La cancha ${targetCourtId} no está disponible.`,
      );
    }

    const timeSlot = new TimeSlot(input.newStartTime, input.newEndTime);

    // Verificar colisión en el nuevo horario
    const conflicts = await this.reservationRepository.findConflicting(
      targetCourtId,
      input.newDate,
      timeSlot.startTime,
      timeSlot.endTime,
      oldReservation.id,
    );
    if (conflicts.length > 0) {
      throw new CourtSlotOccupiedException(
        `El nuevo horario ${timeSlot.startTime}-${timeSlot.endTime} del ${input.newDate} ya está ocupado.`,
      );
    }

    // La sustitución y la imputación de movimientos se confirman en una transacción.
    const totalPrice = Number(
      (timeSlot.durationHours * court.pricePerHour).toFixed(2),
    );
    const newReservation = new Reservation(
      crypto.randomUUID(),
      oldReservation.clientId,
      targetCourtId,
      input.newDate,
      timeSlot.startTime,
      timeSlot.endTime,
      court.pricePerHour,
      totalPrice,
      Number((totalPrice * 0.25).toFixed(2)), // Requerido distinto del dinero efectivamente transferido
      'CONFIRMED',
      null,
      input.handledBy,
      oldReservation.id, // Vincula la reserva padre
      null,
      new Date(),
      false,
      false,
      'MANUAL',
    );

    await this.reservationRepository.reschedule(
      newReservation,
      input.handledBy,
      input.reason,
    );
    return newReservation;
  }
}
