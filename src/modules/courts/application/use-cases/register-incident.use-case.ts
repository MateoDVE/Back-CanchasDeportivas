import { Injectable, Inject } from '@nestjs/common';
import { ICourtRepository, COURT_REPOSITORY } from '../../domain/repositories/court.repository.interface';
import { ICourtIncidentRepository, COURT_INCIDENT_REPOSITORY } from '../../domain/repositories/court-incident.repository.interface';
import { EntityNotFoundException } from '../../../../common/domain/exceptions/domain.exception';
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
    const duration = input.durationHours && input.durationHours > 0 ? input.durationHours : 24;
    const end = new Date(start.getTime() + duration * 60 * 60 * 1000);

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
