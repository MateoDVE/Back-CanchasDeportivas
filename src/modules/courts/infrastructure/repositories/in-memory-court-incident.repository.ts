import { Injectable } from '@nestjs/common';
import { ICourtIncidentRepository } from '../../domain/repositories/court-incident.repository.interface';
import { CourtIncident } from '../../domain/entities/court-incident.entity';

@Injectable()
export class InMemoryCourtIncidentRepository implements ICourtIncidentRepository {
  private incidents: Map<number, CourtIncident> = new Map();
  private nextId = 1;

  async findById(id: number): Promise<CourtIncident | null> {
    return this.incidents.get(id) || null;
  }

  async findByCourt(courtId: number): Promise<CourtIncident[]> {
    return Array.from(this.incidents.values()).filter((i) => i.courtId === courtId);
  }

  async save(incident: Omit<CourtIncident, 'id'>): Promise<CourtIncident> {
    const id = this.nextId++;
    const entity = new CourtIncident(
      id,
      incident.courtId,
      incident.startDatetime,
      incident.endDatetime,
      incident.reason,
      incident.createdAt || new Date(),
    );
    this.incidents.set(id, entity);
    return entity;
  }

  async findActiveIncidents(courtId: number, datetime: Date): Promise<CourtIncident[]> {
    return Array.from(this.incidents.values()).filter(
      (i) => i.courtId === courtId && i.isActiveAt(datetime),
    );
  }
}
