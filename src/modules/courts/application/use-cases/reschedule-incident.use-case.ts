import { Injectable, Inject } from '@nestjs/common';
import * as crypto from 'crypto';
import { IReservationRepository, RESERVATION_REPOSITORY } from '../../../reservations/domain/repositories/reservation.repository.interface';
import { ICourtRepository, COURT_REPOSITORY } from '../../domain/repositories/court.repository.interface';
import { EntityNotFoundException, CourtSlotOccupiedException } from '../../../../common/domain/exceptions/domain.exception';
import { Reservation } from '../../../reservations/domain/entities/reservation.entity';
import { TimeSlot } from '../../../reservations/domain/value-objects/time-slot.vo';

export interface RescheduleIncidentInput {
  oldReservationId: string;
  newCourtId?: number;
  newDate: string;
  newStartTime: string;
  newEndTime: string;
  secretaryId: string;
}

export interface RescheduleIncidentOutputDto {
  originalReservationId: string;
  newReservationId: string;
  courtId: number;
  date: string;
  startTime: string;
  endTime: string;
  status: string;
  parentReservationId: string;
  message: string;
}

/**
 * @reference HU-SEC-23 Gestionar reprogramación por incidente
 */
@Injectable()
export class RescheduleIncidentUseCase {
  constructor(
    @Inject(RESERVATION_REPOSITORY)
    private readonly reservationRepository: IReservationRepository,
    @Inject(COURT_REPOSITORY)
    private readonly courtRepository: ICourtRepository,
  ) {}

  async execute(input: RescheduleIncidentInput): Promise<RescheduleIncidentOutputDto> {
    const oldRes = await this.reservationRepository.findById(input.oldReservationId);
    if (!oldRes) {
      throw new EntityNotFoundException(`La reserva con ID ${input.oldReservationId} no existe.`);
    }

    const targetCourtId = input.newCourtId || oldRes.courtId;
    const court = await this.courtRepository.findById(targetCourtId);
    if (!court || !court.isActive) {
      throw new EntityNotFoundException(`La cancha ${targetCourtId} no está disponible.`);
    }

    const timeSlot = new TimeSlot(input.newStartTime, input.newEndTime);

    // Verificar traslapes
    const conflicts = await this.reservationRepository.findConflicting(
      targetCourtId,
      input.newDate,
      input.newStartTime,
      input.newEndTime,
    );

    if (conflicts.length > 0) {
      throw new CourtSlotOccupiedException('El nuevo horario seleccionado ya se encuentra ocupado.');
    }

    // 1. Marcar reserva original como REPROGRAMADA por incidente
    (oldRes as any)._status = 'REPROGRAMMED';
    oldRes.cancellationReason = 'REPROGRAMADA_POR_INCIDENTE_CANCHA';
    await this.reservationRepository.update(oldRes);

    // 2. Crear nueva reserva conservando el pago validado
    const newReservationId = crypto.randomUUID();
    const totalPrice = Number((timeSlot.durationHours * oldRes.pricePerHour).toFixed(2));
    const advanceRequired = Number((totalPrice * 0.25).toFixed(2));

    const newReservation = new Reservation(
      newReservationId,
      oldRes.clientId,
      targetCourtId,
      input.newDate,
      input.newStartTime,
      input.newEndTime,
      oldRes.pricePerHour, // Inmutabilidad histórica
      totalPrice,
      advanceRequired,
      'CONFIRMED', // Conserva confirmación previa
      null,
      input.secretaryId,
      oldRes.id,
      null,
      new Date(),
    );

    await this.reservationRepository.save(newReservation);

    return {
      originalReservationId: oldRes.id,
      newReservationId: newReservation.id,
      courtId: newReservation.courtId,
      date: newReservation.reservationDate,
      startTime: newReservation.startTime,
      endTime: newReservation.endTime,
      status: newReservation.status,
      parentReservationId: oldRes.id,
      message: 'Reprogramación por incidente realizada con éxito conservando el anticipo.',
    };
  }
}
