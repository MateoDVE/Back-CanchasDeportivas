import { Injectable } from '@nestjs/common';
import { IPaymentRepository } from '../../domain/repositories/payment.repository.interface';
import { Payment } from '../../domain/entities/payment.entity';

@Injectable()
export class InMemoryPaymentRepository implements IPaymentRepository {
  private payments: Map<number, Payment> = new Map();
  private nextId = 1;

  async findById(id: number): Promise<Payment | null> {
    return this.payments.get(id) || null;
  }

  async findByReservationId(reservationId: string): Promise<Payment[]> {
    return Array.from(this.payments.values()).filter(
      (p) => p.reservationId === reservationId,
    );
  }

  async save(payment: Omit<Payment, 'id'>): Promise<Payment> {
    const id = this.nextId++;
    const entity = new Payment(
      id,
      payment.reservationId,
      payment.amount,
      payment.paymentType,
      payment.paymentMethod,
      payment.receiptImageUrl,
      payment.status,
      payment.handledBy,
      payment.rejectionReason,
      payment.createdAt || new Date(),
    );
    this.payments.set(id, entity);
    return entity;
  }

  async update(payment: Payment): Promise<void> {
    this.payments.set(payment.id, payment);
  }

  async findPendingPayments(): Promise<Payment[]> {
    return Array.from(this.payments.values())
      .filter((p) => p.status === 'PENDING')
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }
}
