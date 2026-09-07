import { Injectable, Inject } from '@nestjs/common';
import { ICourtIncidentRepository, COURT_INCIDENT_REPOSITORY } from '../../domain/repositories/court-incident.repository.interface';
import { IReservationRepository, RESERVATION_REPOSITORY } from '../../../reservations/domain/repositories/reservation.repository.interface';
import { IUserRepository, USER_REPOSITORY } from '../../../users/domain/repositories/user.repository.interface';
import { EntityNotFoundException } from '../../../../common/domain/exceptions/domain.exception';

export interface AffectedReservationDto {
  reservationId: string;
  courtId: number;
  date: string;
  startTime: string;
  endTime: string;
  totalPrice: number;
  advanceRequired: number;
  status: string;
  client: {
    id: string;
    name: string;
    email: string;
    phone: string;
    ci: string;
  } | null;
}

export interface AffectedReservationsReportDto {
  incidentId: number;
  courtId: number;
  reason: string;
  startDatetime: Date;
  endDatetime: Date;
  affectedReservationsCount: number;
  reservations: AffectedReservationDto[];
}

/**
 * @reference HU-ADM-12 Consultar reservas afectadas por mantenimiento
 * @reference HU-SEC-22 Consultar reservas afectadas por cancha inhabilitada
 */
@Injectable()
export class GetAffectedReservationsUseCase {
  constructor(
    @Inject(COURT_INCIDENT_REPOSITORY)
    private readonly incidentRepository: ICourtIncidentRepository,
    @Inject(RESERVATION_REPOSITORY)
    private readonly reservationRepository: IReservationRepository,
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
  ) {}

  async execute(incidentId: number): Promise<AffectedReservationsReportDto> {
    const incident = await this.incidentRepository.findById(incidentId);
    if (!incident) {
      throw new EntityNotFoundException(`El incidente con ID ${incidentId} no existe.`);
    }

    const startISO = incident.startDatetime.toISOString().slice(0, 10);
    const endISO = incident.endDatetime.toISOString().slice(0, 10);

    // Buscar reservas de la cancha en la fecha
    const courtReservations = await this.reservationRepository.findByCourtAndDate(
      incident.courtId,
      startISO,
    );

    const affected: AffectedReservationDto[] = [];

    for (const res of courtReservations) {
      if (['CANCELLED', 'EXPIRED', 'NO_SHOW'].includes(res.status)) continue;

      const client = await this.userRepository.findById(res.clientId);

      affected.push({
        reservationId: res.id,
        courtId: res.courtId,
        date: res.reservationDate,
        startTime: res.startTime,
        endTime: res.endTime,
        totalPrice: res.totalPrice,
        advanceRequired: res.advanceRequired,
        status: res.status,
        client: client
          ? {
              id: client.id,
              name: client.name,
              email: client.email,
              phone: client.phone,
              ci: client.ci,
            }
          : null,
      });
    }

    return {
      incidentId: incident.id,
      courtId: incident.courtId,
      reason: incident.reason,
      startDatetime: incident.startDatetime,
      endDatetime: incident.endDatetime,
      affectedReservationsCount: affected.length,
      reservations: affected,
    };
  }
}
