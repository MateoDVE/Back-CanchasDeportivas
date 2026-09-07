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

export interface CreateManualReservationInput {
  clientId: string;
  courtId: number;
  reservationDate: string; // YYYY-MM-DD
  startTime: string;       // HH:mm
  endTime: string;         // HH:mm
  origin?: 'MANUAL' | 'WHATSAPP';
  confirmImmediately?: boolean;
  secretaryId: string;
}

/**
 * @reference HU-SEC-05 Crear reserva manual
 * @reference HU-SEC-06 Registrar reserva proveniente de WhatsApp
 */
@Injectable()
export class CreateManualReservationUseCase {
  constructor(
    @Inject(RESERVATION_REPOSITORY)
    private readonly reservationRepository: IReservationRepository,
    @Inject(COURT_REPOSITORY)
    private readonly courtRepository: ICourtRepository,
  ) {}

  async execute(input: CreateManualReservationInput): Promise<Reservation> {
    const court = await this.courtRepository.findById(input.courtId);
    if (!court || !court.isActive) {
      throw new EntityNotFoundException(`La cancha ${input.courtId} no está disponible.`);
    }

    const timeSlot = new TimeSlot(input.startTime, input.endTime);

    // Verificar colisión de horario
    const conflicts = await this.reservationRepository.findConflicting(
      input.courtId,
      input.reservationDate,
      timeSlot.startTime,
      timeSlot.endTime,
    );
    if (conflicts.length > 0) {
      throw new CourtSlotOccupiedException(
        `El horario ${timeSlot.startTime}-${timeSlot.endTime} del ${input.reservationDate} ya está ocupado.`,
      );
    }

    const status = input.confirmImmediately !== false ? 'CONFIRMED' : 'PENDING_VALIDATION';

    const reservation = Reservation.createManual({
      id: crypto.randomUUID(),
      clientId: input.clientId,
      courtId: input.courtId,
      reservationDate: input.reservationDate,
      timeSlot,
      pricePerHour: court.pricePerHour,
      createdBy: input.secretaryId,
      origin: input.origin || 'MANUAL',
      status,
    });

    await this.reservationRepository.save(reservation);
    return reservation;
  }
}
