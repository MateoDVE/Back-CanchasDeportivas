import {
  CourtSlotOccupiedException,
  ConflictException,
  ValidationException,
} from '../../../../common/domain/exceptions/domain.exception';
import { Injectable, Inject } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { IReservationRepository } from '../../domain/repositories/reservation.repository.interface';
import {
  Reservation,
  ReservationStatus,
} from '../../domain/entities/reservation.entity';
import { SUPABASE_CLIENT } from '../../../../common/supabase/supabase.provider';

@Injectable()
export class SupabaseReservationRepository implements IReservationRepository {
  constructor(
    @Inject(SUPABASE_CLIENT)
    private readonly supabase: SupabaseClient,
  ) {}

  private toDomain(row: any): Reservation {
    const isFinalPaid =
      Boolean(row.is_final_payment_paid) ||
      (Array.isArray(row.payments) &&
        row.payments.some(
          (p: any) =>
            p.payment_type === 'SALDO_FINAL' && p.status === 'VALIDATED',
        ));
    const isAuthorized =
      Boolean(row.is_entry_authorized) || row.status === 'COMPLETED';

    const reservation = new Reservation(
      row.id,
      row.client_id,
      row.court_id,
      row.reservation_date,
      row.start_time.slice(0, 5), // '08:00:00' -> '08:00'
      row.end_time.slice(0, 5),
      parseFloat(row.price_per_hour),
      parseFloat(row.total_price),
      parseFloat(row.advance_required),
      row.status as ReservationStatus,
      row.expires_at ? new Date(row.expires_at) : null,
      row.created_by,
      row.parent_reservation_id,
      row.cancellation_reason,
      new Date(row.created_at),
      isAuthorized,
      isFinalPaid,
      row.origin || 'UNKNOWN',
    );
    if (Array.isArray(row.payments))
      reservation.applyPaidAmount(
        row.payments.reduce(
          (sum: number, p: any) =>
            sum +
            (p.status === 'VALIDATED'
              ? Number(p.amount)
              : p.status === 'REFUNDED'
                ? -Number(p.amount)
                : 0),
          0,
        ),
      );
    return reservation;
  }

  async findById(id: string): Promise<Reservation | null> {
    const { data, error } = await this.supabase
      .from('reservations')
      .select('*, payments!payments_reservation_id_fkey(*)')
      .eq('id', id)
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!data) return null;
    return this.toDomain(data);
  }

  private payload(reservation: Reservation) {
    return {
      id: reservation.id,
      client_id: reservation.clientId,
      court_id: reservation.courtId,
      reservation_date: reservation.reservationDate,
      start_time: reservation.startTime,
      end_time: reservation.endTime,
      price_per_hour: reservation.pricePerHour,
      total_price: reservation.totalPrice,
      advance_required: reservation.advanceRequired,
      status: reservation.status,
      expires_at: reservation.expiresAt?.toISOString() ?? null,
      created_by: reservation.createdBy,
      parent_reservation_id: reservation.parentReservationId ?? null,
      cancellation_reason: reservation.cancellationReason ?? null,
      created_at: reservation.createdAt.toISOString(),
      origin: reservation.origin === 'UNKNOWN' ? null : reservation.origin,
    };
  }

  private checkError(error: { code?: string; message: string } | null): void {
    if (!error) return;
    if (error.code === '23P01') throw new CourtSlotOccupiedException();
    if (error.code === '40001' || error.code === '23505')
      throw new ConflictException(
        'La reserva cambió. Actualiza y vuelve a intentarlo.',
      );
    if (error.code === 'P0001' || error.code === '23514')
      throw new ValidationException(error.message);
    throw new Error('Error de persistencia de reserva: ' + error.message);
  }

  async save(reservation: Reservation): Promise<void> {
    const { error } = await this.supabase.rpc('persist_reservation', {
      p_data: this.payload(reservation),
      p_actor: reservation.createdBy,
    });
    this.checkError(error);
  }

  async update(
    reservation: Reservation,
    actorId?: string,
    reason?: string,
  ): Promise<void> {
    const { error } = await this.supabase.rpc('persist_reservation', {
      p_data: this.payload(reservation),
      p_actor: actorId ?? null,
      p_expected_status: reservation.persistedStatus,
      p_reason: reason ?? null,
    });
    this.checkError(error);
  }

  async reschedule(
    reservation: Reservation,
    actorId: string,
    reason?: string,
  ): Promise<void> {
    const { error } = await this.supabase.rpc('reschedule_reservation', {
      p_data: this.payload(reservation),
      p_actor: actorId,
      p_reason: reason ?? null,
    });
    this.checkError(error);
  }

  async findConflicting(
    courtId: number,
    date: string,
    startTime: string,
    endTime: string,
    excludeId?: string,
  ): Promise<Reservation[]> {
    let query = this.supabase
      .from('reservations')
      .select('*')
      .eq('court_id', courtId)
      .eq('reservation_date', date)
      .not('status', 'in', '("CANCELLED","EXPIRED","NO_SHOW","REPROGRAMMED")')
      .lt('start_time', endTime)
      .gt('end_time', startTime);

    if (excludeId) {
      query = query.neq('id', excludeId);
    }

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    if (!data) return [];

    // Excluir temporales expiradas
    const now = new Date();
    return data
      .map((row) => this.toDomain(row))
      .filter(
        (r) => !(r.status === 'TEMPORAL' && r.expiresAt && r.expiresAt < now),
      );
  }

  async findByCourtAndDate(
    courtId: number,
    date: string,
  ): Promise<Reservation[]> {
    const { data, error } = await this.supabase
      .from('reservations')
      .select('*, payments!payments_reservation_id_fkey(*)')
      .eq('court_id', courtId)
      .eq('reservation_date', date);

    if (error) throw new Error(error.message);
    if (!data) return [];
    return data.map((r) => this.toDomain(r));
  }

  async findByClient(clientId: string): Promise<Reservation[]> {
    const { data, error } = await this.supabase
      .from('reservations')
      .select('*, payments!payments_reservation_id_fkey(*)')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    if (!data) return [];
    return data.map((r) => this.toDomain(r));
  }

  async findPendingValidation(): Promise<Reservation[]> {
    const { data, error } = await this.supabase
      .from('reservations')
      .select('*, payments!payments_reservation_id_fkey(*)')
      .eq('status', 'PENDING_VALIDATION')
      .order('created_at', { ascending: true });

    if (error) throw new Error(error.message);
    if (!data) return [];
    return data.map((r) => this.toDomain(r));
  }

  async findActiveTemporal(): Promise<Reservation[]> {
    const now = new Date().toISOString();
    const { data, error } = await this.supabase
      .from('reservations')
      .select('*, payments!payments_reservation_id_fkey(*)')
      .eq('status', 'TEMPORAL')
      .gt('expires_at', now)
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    if (!data) return [];
    return data.map((r) => this.toDomain(r));
  }

  async findAll(): Promise<Reservation[]> {
    const { data, error } = await this.supabase
      .from('reservations')
      .select('*, payments!payments_reservation_id_fkey(*)')
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    if (!data) return [];
    return data.map((r) => this.toDomain(r));
  }

  async findByDateRange(
    startDate: string,
    endDate: string,
  ): Promise<Reservation[]> {
    const { data, error } = await this.supabase
      .from('reservations')
      .select('*, payments!payments_reservation_id_fkey(*)')
      .gte('reservation_date', startDate)
      .lte('reservation_date', endDate);

    if (error) throw new Error(error.message);
    if (!data) return [];
    return data.map((r) => this.toDomain(r));
  }

  async search(filters: {
    date?: string;
    courtId?: number;
    complexId?: number;
    status?: string;
    clientId?: string;
  }): Promise<Reservation[]> {
    let query = this.supabase
      .from('reservations')
      .select('*, payments!payments_reservation_id_fkey(*)');
    if (filters.date) query = query.eq('reservation_date', filters.date);
    if (filters.courtId) query = query.eq('court_id', filters.courtId);
    if (filters.status) query = query.eq('status', filters.status);
    if (filters.clientId) query = query.eq('client_id', filters.clientId);

    const { data, error } = await query.order('created_at', {
      ascending: false,
    });
    if (error) throw new Error(error.message);
    if (!data) return [];
    return data.map((r) => this.toDomain(r));
  }

  async releaseExpiredReservations(): Promise<number> {
    const { data, error } = await this.supabase
      .from('reservations')
      .update({ status: 'EXPIRED' })
      .eq('status', 'TEMPORAL')
      .lt('expires_at', new Date().toISOString())
      .select('id');

    if (error || !data) return 0;
    return data.length;
  }
}
