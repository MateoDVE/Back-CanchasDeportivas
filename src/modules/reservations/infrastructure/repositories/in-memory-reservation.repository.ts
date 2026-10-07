import { Injectable, Inject, Optional } from '@nestjs/common';
import {
  IPaymentRepository,
  PAYMENT_REPOSITORY,
} from '../../../payments/domain/repositories/payment.repository.interface';
import {
  ConflictException,
  CourtSlotOccupiedException,
} from '../../../../common/domain/exceptions/domain.exception';
import { IReservationRepository } from '../../domain/repositories/reservation.repository.interface';
import {
  Reservation,
  ReservationStatus,
} from '../../domain/entities/reservation.entity';

@Injectable()
export class InMemoryReservationRepository implements IReservationRepository {
  private reservations: Map<string, Reservation> = new Map();

  constructor(
    @Optional()
    @Inject(PAYMENT_REPOSITORY)
    private readonly payments?: IPaymentRepository,
  ) {}

  private assertAvailable(reservation: Reservation, excludeId?: string): void {
    for (const other of this.reservations.values()) {
      if (
        other.id === reservation.id ||
        other.id === excludeId ||
        ['CANCELLED', 'EXPIRED', 'NO_SHOW', 'REPROGRAMMED'].includes(
          other.status,
        ) ||
        other.isExpired()
      )
        continue;
      if (
        other.courtId === reservation.courtId &&
        other.reservationDate === reservation.reservationDate &&
        other.startTime < reservation.endTime &&
        other.endTime > reservation.startTime
      )
        throw new CourtSlotOccupiedException();
    }
  }

  async reschedule(
    reservation: Reservation,
    actorId: string,
    reason?: string,
  ): Promise<void> {
    const payments =
      (await this.payments?.findByReservationId(
        reservation.parentReservationId!,
      )) ?? [];
    const old = this.reservations.get(reservation.parentReservationId!);
    if (!old || old.status !== 'CONFIRMED')
      throw new ConflictException('Reserva no reprogramable.');
    if (payments.some((p) => p.status === 'PENDING'))
      throw new ConflictException('Existen pagos pendientes.');
    const net = payments.reduce(
      (sum, p) =>
        sum +
        (p.status === 'VALIDATED'
          ? p.amount
          : p.status === 'REFUNDED'
            ? -p.amount
            : 0),
      0,
    );
    if (net > reservation.totalPrice)
      throw new ConflictException(
        'Devuelve el excedente antes de reprogramar.',
      );
    this.assertAvailable(reservation, old.id);
    // Después de validar, las mutaciones en memoria no contienen puntos de suspensión.
    old.markReprogrammed();
    for (const payment of payments)
      if (['VALIDATED', 'REFUNDED'].includes(payment.status))
        payment.reservationId = reservation.id;
    reservation.applyPaidAmount(net);
    this.reservations.set(reservation.id, reservation);
  }

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
    this.assertAvailable(reservation);
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
      if (
        ['CANCELLED', 'EXPIRED', 'NO_SHOW', 'REPROGRAMMED'].includes(r.status)
      )
        continue;

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

  async findByCourtAndDate(
    courtId: number,
    date: string,
  ): Promise<Reservation[]> {
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

  async findByDateRange(
    startDate: string,
    endDate: string,
  ): Promise<Reservation[]> {
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
