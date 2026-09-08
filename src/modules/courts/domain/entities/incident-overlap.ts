import { CourtIncident } from './court-incident.entity';

// Reservation dates and times are local to the courts in Bolivia (UTC-04:00).
// Use half-open intervals: a booking may start exactly when a block ends.
export function overlapsIncident(incidents: CourtIncident[], date: string, startTime: string, endTime: string): boolean {
  const start = new Date(`${date}T${startTime.slice(0, 5)}:00-04:00`).getTime();
  const end = new Date(`${date}T${endTime.slice(0, 5)}:00-04:00`).getTime();
  return incidents.some(incident => start < incident.endDatetime.getTime() && end > incident.startDatetime.getTime());
}
