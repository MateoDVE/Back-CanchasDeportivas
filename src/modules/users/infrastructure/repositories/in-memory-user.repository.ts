import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { IUserRepository } from '../../domain/repositories/user.repository.interface';
import { User } from '../../domain/entities/user.entity';

@Injectable()
export class InMemoryUserRepository implements IUserRepository {
  private users: Map<string, User> = new Map();

  constructor() {
    const accounts = [
      new User('11111111-1111-1111-1111-111111111111', 'Administrador General', 'admin@canchas.com', '70000001', '1234567', bcrypt.hashSync('Admin123!', 10), 'ADMIN', 'ACTIVE'),
      new User('22222222-2222-2222-2222-222222222222', 'Secretaria de Turno', 'secretaria@canchas.com', '70000002', '7654321', bcrypt.hashSync('Secre123!', 10), 'SECRETARIA', 'ACTIVE'),
      new User('33333333-3333-3333-3333-333333333333', 'Cliente Demostración', 'cliente@canchas.com', '70000003', '9876543', bcrypt.hashSync('Cliente123!', 10), 'CLIENTE', 'ACTIVE'),
    ];
    accounts.forEach(user => this.users.set(user.id, user));
  }

  async findById(id: string): Promise<User | null> {
    return this.users.get(id) || null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const normalized = email.trim().toLowerCase();
    for (const user of this.users.values()) {
      if (user.email.toLowerCase() === normalized) {
        return user;
      }
    }
    return null;
  }

  async findByCi(ci: string): Promise<User | null> {
    const normalized = ci.trim();
    for (const user of this.users.values()) {
      if (user.ci === normalized) {
        return user;
      }
    }
    return null;
  }

  async save(user: User): Promise<void> {
    this.users.set(user.id, user);
  }

  async update(user: User): Promise<void> {
    this.users.set(user.id, user);
  }

  async searchClients(query: string): Promise<User[]> {
    const term = query.trim().toLocaleLowerCase();
    return Array.from(this.users.values()).filter(user =>
      user.role === 'CLIENTE' && user.isActive() &&
      [user.name, user.ci, user.phone, user.email].some(value => value.toLocaleLowerCase().includes(term))
    ).slice(0, 20);
  }

  async findAll(): Promise<User[]> {
    return Array.from(this.users.values());
  }
}
