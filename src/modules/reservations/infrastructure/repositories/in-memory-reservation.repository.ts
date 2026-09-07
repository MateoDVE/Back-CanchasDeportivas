import { Injectable } from '@nestjs/common';
import { IReservationRepository } from '../../domain/repositories/reservation.repository.interface';
import { Reservation, ReservationStatus } from '../../domain/entities/reservation.entity';

@Injectable()
export class InMemoryReservationRepository implements IReservationRepository {
  private reservations: Map<string, Reservation> = new Map();

  async findById(id: string): Promise<Reservation | null> {
    const r = this.reservations.get(id);
    if (!r) return null;
    // Auto-expirar si es temporal y ya venció
    if (r.status === 'TEMPORAL' && r.isExpired()) {
      r.expire();
    }
    return r;
  }

  async save(reservation: Reservation): Promise<void> {
    this.reservations.set(reservation.id, reservation);
  }

  async update(reservation: Reservation): Promise<void> {
    this.reservations.set(reservation.id, reservation);
  }

  async findConflicting(
    courtId: number,
    date: string,
    startTime: string,
    endTime: string,
    excludeId?: string,
  ): Promise<Reservation[]> {
    const list = Array.from(this.reservations.values());
    const conflicts: Reservation[] = [];

    const toMinutes = (time: string) => {
      const [h, m] = time.split(':').map(Number);
      return h * 60 + m;
    };

    const targetStart = toMinutes(startTime);
    const targetEnd = toMinutes(endTime);

    for (const r of list) {
      if (excludeId && r.id === excludeId) continue;
      if (r.courtId !== courtId || r.reservationDate !== date) continue;

      // Excluir canceladas, expiradas o no-show
      if (['CANCELLED', 'EXPIRED', 'NO_SHOW'].includes(r.status)) continue;

      // Si es temporal pero ya expiró, marcar como expirada y no considerarla conflicto
      if (r.status === 'TEMPORAL' && r.isExpired()) {
        r.expire();
        continue;
      }

      // Chequeo de traslape: start1 < end2 && end1 > start2
      const resStart = toMinutes(r.startTime);
      const resEnd = toMinutes(r.endTime);

      if (targetStart < resEnd && targetEnd > resStart) {
        conflicts.push(r);
      }
    }

    return conflicts;
  }

  async findByCourtAndDate(courtId: number, date: string): Promise<Reservation[]> {
    const list = Array.from(this.reservations.values());
    return list.filter((r) => {
      if (r.courtId !== courtId || r.reservationDate !== date) return false;
      if (r.status === 'TEMPORAL' && r.isExpired()) {
        r.expire();
      }
      return true;
    });
  }

  async findByClient(clientId: string): Promise<Reservation[]> {
    const list = Array.from(this.reservations.values());
    return list
      .filter((r) => r.clientId === clientId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async findPendingValidation(): Promise<Reservation[]> {
    const list = Array.from(this.reservations.values());
    return list
      .filter((r) => r.status === 'PENDING_VALIDATION')
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }

  async findActiveTemporal(): Promise<Reservation[]> {
    const list = Array.from(this.reservations.values());
    return list.filter((r) => r.status === 'TEMPORAL' && !r.isExpired());
  }

  async findAll(): Promise<Reservation[]> {
    return Array.from(this.reservations.values()).sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
    );
  }

  async findByDateRange(startDate: string, endDate: string): Promise<Reservation[]> {
    return Array.from(this.reservations.values()).filter(
      (r) => r.reservationDate >= startDate && r.reservationDate <= endDate,
    );
  }

  async search(filters: {
    date?: string;
    courtId?: number;
    complexId?: number;
    status?: string;
    clientId?: string;
  }): Promise<Reservation[]> {
    let list = Array.from(this.reservations.values());
    if (filters.date) {
      list = list.filter((r) => r.reservationDate === filters.date);
    }
    if (filters.courtId) {
      list = list.filter((r) => r.courtId === filters.courtId);
    }
    if (filters.status) {
      list = list.filter((r) => r.status === filters.status);
    }
    if (filters.clientId) {
      list = list.filter((r) => r.clientId === filters.clientId);
    }
    return list.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async releaseExpiredReservations(): Promise<number> {
    let released = 0;
    for (const r of this.reservations.values()) {
      if (r.status === 'TEMPORAL' && r.isExpired()) {
        r.expire();
        released++;
      }
    }
    return released;
  }
}
