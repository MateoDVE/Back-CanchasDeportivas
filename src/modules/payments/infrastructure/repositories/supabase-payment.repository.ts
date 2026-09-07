import { Injectable, Inject } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { IPaymentRepository } from '../../domain/repositories/payment.repository.interface';
import { Payment, PaymentMethod, PaymentStatus, PaymentType } from '../../domain/entities/payment.entity';
import { SUPABASE_CLIENT } from '../../../../common/supabase/supabase.provider';

@Injectable()
export class SupabasePaymentRepository implements IPaymentRepository {
  constructor(
    @Inject(SUPABASE_CLIENT)
    private readonly supabase: SupabaseClient,
  ) {}

  private toDomain(row: any): Payment {
    return new Payment(
      row.id,
      row.reservation_id,
      parseFloat(row.amount),
      row.payment_type as PaymentType,
      row.payment_method as PaymentMethod,
      row.receipt_image_url,
      row.status as PaymentStatus,
      row.handled_by,
      row.rejection_reason,
      new Date(row.created_at),
    );
  }

  async findById(id: number): Promise<Payment | null> {
    const { data, error } = await this.supabase
      .from('payments')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error || !data) return null;
    return this.toDomain(data);
  }

  async findByReservationId(reservationId: string): Promise<Payment[]> {
    const { data, error } = await this.supabase
      .from('payments')
      .select('*')
      .eq('reservation_id', reservationId);

    if (error || !data) return [];
    return data.map((r) => this.toDomain(r));
  }

  async save(payment: Omit<Payment, 'id'>): Promise<Payment> {
    const { data, error } = await this.supabase
      .from('payments')
      .insert({
        reservation_id: payment.reservationId,
        amount: payment.amount,
        payment_type: payment.paymentType,
        payment_method: payment.paymentMethod,
        receipt_image_url: payment.receiptImageUrl,
        status: payment.status,
        handled_by: payment.handledBy,
        rejection_reason: payment.rejectionReason,
        created_at: (payment.createdAt || new Date()).toISOString(),
      })
      .select()
      .single();

    if (error || !data) {
      throw new Error(`Error al registrar pago en Supabase: ${error?.message}`);
    }
    return this.toDomain(data);
  }

  async update(payment: Payment): Promise<void> {
    const { error } = await this.supabase
      .from('payments')
      .update({
        status: payment.status,
        handled_by: payment.handledBy,
        rejection_reason: payment.rejectionReason,
        receipt_image_url: payment.receiptImageUrl,
      })
      .eq('id', payment.id);

    if (error) {
      throw new Error(`Error al actualizar pago en Supabase: ${error.message}`);
    }
  }

  async findPendingPayments(): Promise<Payment[]> {
    const { data, error } = await this.supabase
      .from('payments')
      .select('*')
      .eq('status', 'PENDING')
      .order('created_at', { ascending: true });

    if (error || !data) return [];
    return data.map((r) => this.toDomain(r));
  }

  async findAll(): Promise<Payment[]> {
    const { data, error } = await this.supabase
      .from('payments')
      .select('*')
      .order('created_at', { ascending: false });

    if (error || !data) return [];
    return data.map((r) => this.toDomain(r));
  }

  async findByHandlerAndDate(handledBy: string, date: string): Promise<Payment[]> {
    const startIso = `${date}T00:00:00.000Z`;
    const endIso = `${date}T23:59:59.999Z`;

    const { data, error } = await this.supabase
      .from('payments')
      .select('*')
      .eq('handled_by', handledBy)
      .gte('created_at', startIso)
      .lte('created_at', endIso);

    if (error || !data) return [];
    return data.map((r) => this.toDomain(r));
  }

  async findByDateRange(startDate: string, endDate: string): Promise<Payment[]> {
    const startIso = `${startDate}T00:00:00.000Z`;
    const endIso = `${endDate}T23:59:59.999Z`;

    const { data, error } = await this.supabase
      .from('payments')
      .select('*')
      .gte('created_at', startIso)
      .lte('created_at', endIso);

    if (error || !data) return [];
    return data.map((r) => this.toDomain(r));
  }
}
