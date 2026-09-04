import { Injectable, Inject } from '@nestjs/common';
import * as crypto from 'crypto';
import { IReservationRepository, RESERVATION_REPOSITORY } from '../../domain/repositories/reservation.repository.interface';
import { ICourtRepository, COURT_REPOSITORY } from '../../../courts/domain/repositories/court.repository.interface';
import { IScheduleRepository, SCHEDULE_REPOSITORY } from '../../../schedules/domain/repositories/schedule.repository.interface';
import {
  EntityNotFoundException,
  CourtSlotOccupiedException,
  ValidationException,
} from '../../../../common/domain/exceptions/domain.exception';
import { TimeSlot } from '../../domain/value-objects/time-slot.vo';
import { Reservation } from '../../domain/entities/reservation.entity';

export interface CreateTemporalReservationInput {
  clientId: string;
  courtId: number;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string;   // HH:mm
}

export interface TemporalReservationOutputDto {
  reservationId: string;
  clientId: string;
  courtId: number;
  reservationDate: string;
  startTime: string;
  endTime: string;
  durationHours: number;
  pricePerHour: number;
  totalPrice: number;
  advanceRequired: number; // 25%
  pendingBalance: number;  // 75%
  status: string;
  expiresAt: Date | null;
  secondsRemaining: number;
}

/**
 * @reference HU-CLI-10 Seleccionar horario
 * @reference HU-CLI-11 Solicitar reserva
 * @reference HU-CLI-12 Bloqueo temporal del horario (5 minutos)
 */
@Injectable()
export class CreateTemporalReservationUseCase {
  constructor(
    @Inject(RESERVATION_REPOSITORY)
    private readonly reservationRepository: IReservationRepository,
    @Inject(COURT_REPOSITORY)
    private readonly courtRepository: ICourtRepository,
    @Inject(SCHEDULE_REPOSITORY)
    private readonly scheduleRepository: IScheduleRepository,
  ) {}

  async execute(input: CreateTemporalReservationInput): Promise<TemporalReservationOutputDto> {
    // 1. Validar cancha
    const court = await this.courtRepository.findById(input.courtId);
    if (!court || !court.isActive) {
      throw new EntityNotFoundException(`La cancha ${input.courtId} no está disponible.`);
    }

    // 2. Validar Value Object TimeSlot (duración >= 1h entera, minutos válidos)
    const timeSlot = new TimeSlot(input.startTime, input.endTime);

    // 3. Validar horario de atención de la cancha en esa fecha
    const [year, month, day] = input.date.split('-').map(Number);
    const dateObj = new Date(year, month - 1, day);
    const jsDay = dateObj.getDay();
    const dayOfWeek = jsDay === 0 ? 7 : jsDay;

    let schedule = await this.scheduleRepository.findByCourtAndDate(input.courtId, input.date);
    if (!schedule) {
      schedule = await this.scheduleRepository.findByCourtAndDay(input.courtId, dayOfWeek);
    }

    if (!schedule) {
      throw new ValidationException(`La cancha no atiende el día seleccionado (${input.date}).`);
    }

    if (input.startTime < schedule.openTime || input.endTime > schedule.closeTime) {
      throw new ValidationException(
        `El horario seleccionado (${input.startTime} a ${input.endTime}) está fuera del horario de atención de la cancha (${schedule.openTime} a ${schedule.closeTime}).`,
      );
    }

    // 4. Verificar conflictos de traslape
    const conflicts = await this.reservationRepository.findConflicting(
      input.courtId,
      input.date,
      input.startTime,
      input.endTime,
    );

    if (conflicts.length > 0) {
      throw new CourtSlotOccupiedException(
        'El horario seleccionado ya se encuentra ocupado o bloqueado temporalmente por otro cliente.',
      );
    }

    // 5. Crear la entidad de Dominio aplicando reglas matemáticas e inmutabilidad de precio
    // Congela court.pricePerHour en reservation
    const reservation = Reservation.createTemporal({
      id: crypto.randomUUID(),
      clientId: input.clientId,
      courtId: input.courtId,
      reservationDate: input.date,
      timeSlot,
      pricePerHour: court.pricePerHour,
      createdBy: input.clientId,
    });

    // 6. Guardar en persistencia
    await this.reservationRepository.save(reservation);

    return {
      reservationId: reservation.id,
      clientId: reservation.clientId,
      courtId: reservation.courtId,
      reservationDate: reservation.reservationDate,
      startTime: reservation.startTime,
      endTime: reservation.endTime,
      durationHours: timeSlot.durationHours,
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
