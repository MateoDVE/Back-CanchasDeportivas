import { Injectable } from '@nestjs/common';
import { IComplexRepository } from '../../domain/repositories/complex.repository.interface';
import { Complex } from '../../domain/entities/complex.entity';

@Injectable()
export class InMemoryComplexRepository implements IComplexRepository {
  private complexes: Map<number, Complex> = new Map();
  private nextId = 1;

  constructor() {
    this.seedDefaultComplexes();
  }

  private seedDefaultComplexes() {
    const c1 = new Complex(
      this.nextId++,
      'Complejo Deportivo Mariscal',
      'Av. América #1234, Zona Norte',
      'Cel: 71234567 - reservas@mariscal.com',
      'https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=COMPLEJO_MARISCAL_PAGO_QR',
      true,
    );
    const c2 = new Complex(
      this.nextId++,
      'Polideportivo Los Álamos',
      'Calle Los Sauces esq. Palmeras #45',
      'Cel: 72345678 - contacto@losalamos.com',
      'https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=POLIDEPORTIVO_LOS_ALAMOS_QR',
      true,
    );
    this.complexes.set(c1.id, c1);
    this.complexes.set(c2.id, c2);
  }

  async findById(id: number): Promise<Complex | null> {
    return this.complexes.get(id) || null;
  }

  async findAll(onlyActive: boolean = false): Promise<Complex[]> {
    const list = Array.from(this.complexes.values());
    if (onlyActive) {
      return list.filter((c) => c.isActive);
    }
    return list;
  }

  async save(complex: Omit<Complex, 'id'>): Promise<Complex> {
    const id = this.nextId++;
    const entity = new Complex(
      id,
      complex.name,
      complex.location,
      complex.contactInfo,
      complex.paymentQrUrl,
      complex.isActive,
    );
    this.complexes.set(id, entity);
    return entity;
  }

  async update(complex: Complex): Promise<void> {
    this.complexes.set(complex.id, complex);
  }
}
