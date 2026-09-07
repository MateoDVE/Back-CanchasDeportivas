import { Payment } from '../entities/payment.entity';

export const PAYMENT_REPOSITORY = 'IPaymentRepository';

export interface IPaymentRepository {
  findById(id: number): Promise<Payment | null>;
  findByReservationId(reservationId: string): Promise<Payment[]>;
  save(payment: Omit<Payment, 'id'>): Promise<Payment>;
  update(payment: Payment): Promise<void>;
  findPendingPayments(): Promise<Payment[]>;
  findAll(): Promise<Payment[]>;
  findByHandlerAndDate(handledBy: string, date: string): Promise<Payment[]>;
  findByDateRange(startDate: string, endDate: string): Promise<Payment[]>;
}
