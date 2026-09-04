import { Injectable, Inject } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { IReservationRepository } from '../../domain/repositories/reservation.repository.interface';
import { Reservation, ReservationStatus } from '../../domain/entities/reservation.entity';
import { SUPABASE_CLIENT } from '../../../../common/supabase/supabase.provider';

@Injectable()
export class SupabaseReservationRepository implements IReservationRepository {
  constructor(
    @Inject(SUPABASE_CLIENT)
    private readonly supabase: SupabaseClient,
  ) {}

  private toDomain(row: any): Reservation {
    return new Reservation(
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
    );
  }

  async findById(id: string): Promise<Reservation | null> {
    const { data, error } = await this.supabase
      .from('reservations')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error || !data) return null;
    return this.toDomain(data);
  }

  async save(reservation: Reservation): Promise<void> {
    const { error } = await this.supabase.from('reservations').upsert({
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
      expires_at: reservation.expiresAt ? reservation.expiresAt.toISOString() : null,
      created_by: reservation.createdBy,
      parent_reservation_id: reservation.parentReservationId || null,
      cancellation_reason: reservation.cancellationReason || null,
      created_at: reservation.createdAt.toISOString(),
    });

    if (error) {
      throw new Error(`Error al persistir reserva en Supabase: ${error.message}`);
    }
  }

  async update(reservation: Reservation): Promise<void> {
    await this.save(reservation);
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
      .not('status', 'in', '("CANCELLED","EXPIRED","NO_SHOW")')
      .lt('start_time', endTime)
      .gt('end_time', startTime);

    if (excludeId) {
      query = query.neq('id', excludeId);
    }

    const { data, error } = await query;
    if (error || !data) return [];

    // Excluir temporales expiradas
    const now = new Date();
    return data
      .map((row) => this.toDomain(row))
      .filter((r) => !(r.status === 'TEMPORAL' && r.expiresAt && r.expiresAt < now));
  }

  async findByCourtAndDate(courtId: number, date: string): Promise<Reservation[]> {
    const { data, error } = await this.supabase
      .from('reservations')
      .select('*')
      .eq('court_id', courtId)
      .eq('reservation_date', date);

    if (error || !data) return [];
    return data.map((r) => this.toDomain(r));
  }

  async findByClient(clientId: string): Promise<Reservation[]> {
    const { data, error } = await this.supabase
      .from('reservations')
      .select('*')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false });

    if (error || !data) return [];
    return data.map((r) => this.toDomain(r));
  }

  async findPendingValidation(): Promise<Reservation[]> {
    const { data, error } = await this.supabase
      .from('reservations')
      .select('*')
      .eq('status', 'PENDING_VALIDATION')
      .order('created_at', { ascending: true });

    if (error || !data) return [];
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
