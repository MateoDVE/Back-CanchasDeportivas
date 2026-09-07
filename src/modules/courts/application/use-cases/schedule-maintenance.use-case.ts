import { Injectable, Inject } from '@nestjs/common';
import { ICourtRepository, COURT_REPOSITORY } from '../../domain/repositories/court.repository.interface';
import { ICourtIncidentRepository, COURT_INCIDENT_REPOSITORY } from '../../domain/repositories/court-incident.repository.interface';
import { EntityNotFoundException, ValidationException } from '../../../../common/domain/exceptions/domain.exception';
import { CourtIncident } from '../../domain/entities/court-incident.entity';

export interface ScheduleMaintenanceInput {
  courtId: number;
  startDatetime: string; // ISO string
  endDatetime: string;   // ISO string
  reason: string;
}

export interface IncidentOutputDto {
  id: number;
  courtId: number;
  startDatetime: Date;
  endDatetime: Date;
  reason: string;
  createdAt: Date;
}

/**
 * @reference HU-ADM-10 Programar mantenimiento
 */
@Injectable()
export class ScheduleMaintenanceUseCase {
  constructor(
    @Inject(COURT_INCIDENT_REPOSITORY)
    private readonly incidentRepository: ICourtIncidentRepository,
    @Inject(COURT_REPOSITORY)
    private readonly courtRepository: ICourtRepository,
  ) {}

  async execute(input: ScheduleMaintenanceInput): Promise<IncidentOutputDto> {
    const court = await this.courtRepository.findById(input.courtId);
    if (!court) {
      throw new EntityNotFoundException(`La cancha ${input.courtId} no existe.`);
    }

    const start = new Date(input.startDatetime);
    const end = new Date(input.endDatetime);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new ValidationException('Las fechas deben tener un formato ISO válido.');
    }

    const incident = await this.incidentRepository.save({
      courtId: input.courtId,
      startDatetime: start,
      endDatetime: end,
      reason: input.reason.trim(),
      createdAt: new Date(),
      isActiveAt(d: Date) { return this.isActiveAt(d); },
    });

    return {
      id: incident.id,
      courtId: incident.courtId,
      startDatetime: incident.startDatetime,
      endDatetime: incident.endDatetime,
      reason: incident.reason,
      createdAt: incident.createdAt,
    };
  }
}
