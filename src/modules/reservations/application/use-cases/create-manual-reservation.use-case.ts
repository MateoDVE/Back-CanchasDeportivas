import { ICourtIncidentRepository, COURT_INCIDENT_REPOSITORY } from '../../../courts/domain/repositories/court-incident.repository.interface';
import { overlapsIncident } from '../../../courts/domain/entities/incident-overlap';
import { BadRequestException, Injectable, Inject } from '@nestjs/common';
import * as crypto from 'crypto';
import { User } from '../../../users/domain/entities/user.entity';
import { IUserRepository, USER_REPOSITORY } from '../../../users/domain/repositories/user.repository.interface';

export const WALK_IN_CLIENT_ID = '00000000-0000-4000-8000-000000000001';
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
  clientId?: string;
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
    @Inject(COURT_INCIDENT_REPOSITORY) private readonly incidents: ICourtIncidentRepository,
    @Inject(RESERVATION_REPOSITORY)
    private readonly reservationRepository: IReservationRepository,
    @Inject(COURT_REPOSITORY)
    private readonly courtRepository: ICourtRepository,
    @Inject(USER_REPOSITORY) private readonly userRepository: IUserRepository,
  ) {}

  private async resolveClient(clientId?: string): Promise<string> {
    if (clientId?.trim()) {
      const client = await this.userRepository.findById(clientId.trim());
      if (!client || client.role !== 'CLIENTE' || !client.isActive()) {
        throw new BadRequestException('Selecciona un cliente activo de los resultados de búsqueda.');
      }
      return client.id;
    }
    if (!await this.userRepository.findById(WALK_IN_CLIENT_ID)) {
      const guest = new User(WALK_IN_CLIENT_ID, 'Cliente presencial',
        'cliente-presencial@reservas.invalid', '', 'PRESENCIAL',
        crypto.randomBytes(48).toString('hex'), 'CLIENTE', 'INACTIVE');
      try {
        await this.userRepository.save(guest);
      } catch (error) {
        // Another request may have created the same internal record concurrently.
        if (!await this.userRepository.findById(WALK_IN_CLIENT_ID)) throw error;
      }
    }
    return WALK_IN_CLIENT_ID;
  }

  async execute(input: CreateManualReservationInput): Promise<Reservation> {
    const court = await this.courtRepository.findById(input.courtId);
    if (!court || !court.isActive) {
      throw new EntityNotFoundException(`La cancha ${input.courtId} no está disponible.`);
    }

    const timeSlot = new TimeSlot(input.startTime, input.endTime);
    if (overlapsIncident(await this.incidents.findByCourt(input.courtId), input.reservationDate, input.startTime, input.endTime)) {
      throw new CourtSlotOccupiedException('El horario coincide con un mantenimiento o incidente. Selecciona otro horario.');
    }

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
      clientId: await this.resolveClient(input.clientId),
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
