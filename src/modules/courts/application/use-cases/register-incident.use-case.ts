import { CourtIncident } from '../../domain/entities/court-incident.entity';
import { Injectable, Inject } from '@nestjs/common';
import { ICourtRepository, COURT_REPOSITORY } from '../../domain/repositories/court.repository.interface';
import { ICourtIncidentRepository, COURT_INCIDENT_REPOSITORY } from '../../domain/repositories/court-incident.repository.interface';
import { EntityNotFoundException, ValidationException } from '../../../../common/domain/exceptions/domain.exception';
import { IncidentOutputDto } from './schedule-maintenance.use-case';

export interface RegisterIncidentInput {
  courtId: number;
  reason: string;
  durationHours?: number; // Por defecto 24 horas
}

/**
 * @reference HU-ADM-11 Inhabilitar cancha por incidente inmediato
 */
@Injectable()
export class RegisterIncidentUseCase {
  constructor(
    @Inject(COURT_INCIDENT_REPOSITORY)
    private readonly incidentRepository: ICourtIncidentRepository,
    @Inject(COURT_REPOSITORY)
    private readonly courtRepository: ICourtRepository,
  ) {}

  async execute(input: RegisterIncidentInput): Promise<IncidentOutputDto> {
    const court = await this.courtRepository.findById(input.courtId);
    if (!court) {
      throw new EntityNotFoundException(`La cancha ${input.courtId} no existe.`);
    }

    const start = new Date();
    const duration = input.durationHours ?? 24;
    if (!Number.isFinite(duration) || duration <= 0) throw new ValidationException('La duración debe ser mayor que cero.');
    const end = new Date(start.getTime() + duration * 60 * 60 * 1000);

    const validated = new CourtIncident(0, input.courtId, start, end, input.reason.trim());
    const incident = await this.incidentRepository.save({
      courtId: input.courtId,
      startDatetime: start,
      endDatetime: end,
      reason: input.reason.trim(),
      createdAt: new Date(),
      isActiveAt(d: Date) { return validated.isActiveAt(d); },
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
