import { CourtIncident } from '../entities/court-incident.entity';

export const COURT_INCIDENT_REPOSITORY = 'ICourtIncidentRepository';

export interface ICourtIncidentRepository {
  findById(id: number): Promise<CourtIncident | null>;
  findByCourt(courtId: number): Promise<CourtIncident[]>;
  save(incident: Omit<CourtIncident, 'id'>): Promise<CourtIncident>;
  findActiveIncidents(courtId: number, datetime: Date): Promise<CourtIncident[]>;
}
