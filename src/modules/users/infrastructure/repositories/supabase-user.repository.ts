import { Injectable, Inject } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { IUserRepository } from '../../domain/repositories/user.repository.interface';
import { User, UserStatus } from '../../domain/entities/user.entity';
import { SUPABASE_CLIENT } from '../../../../common/supabase/supabase.provider';
import { UserRole } from '../../../../common/decorators/roles.decorator';

@Injectable()
export class SupabaseUserRepository implements IUserRepository {
  constructor(
    @Inject(SUPABASE_CLIENT)
    private readonly supabase: SupabaseClient,
  ) {}

  private toDomain(row: any): User {
    return new User(
      row.id,
      row.name,
      row.email,
      row.phone,
      row.ci ?? '',
      row.password_hash,
      row.role as UserRole,
      row.status as UserStatus,
      new Date(row.created_at),
      row.first_name ?? null,
      row.last_name ?? null,
    );
  }

  async findById(id: string): Promise<User | null> {
    const { data, error } = await this.supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error || !data) return null;
    return this.toDomain(data);
  }

  async findByEmail(email: string): Promise<User | null> {
    const { data, error } = await this.supabase
      .from('users')
      .select('*')
      .eq('email', email.trim().toLowerCase())
      .maybeSingle();

    if (error || !data) return null;
    return this.toDomain(data);
  }

  async findByCi(ci: string): Promise<User | null> {
    const { data, error } = await this.supabase
      .from('users')
      .select('*')
      .eq('ci', ci.trim().toUpperCase())
      .maybeSingle();

    if (error || !data) return null;
    return this.toDomain(data);
  }

  async save(user: User): Promise<void> {
    const { error } = await this.supabase.from('users').insert({
      id: user.id,
      name: user.name,
      first_name: user.firstName,
      last_name: user.lastName,
      email: user.email,
      phone: user.phone,
      ci: user.ci || null,
      password_hash: user.passwordHash,
      role: user.role,
      status: user.status,
      created_at: user.createdAt.toISOString(),
    });

    if (error) {
      throw new Error(`Error al persistir usuario en Supabase: ${error.message}`);
    }
  }

  async update(user: User): Promise<void> {
    const { error } = await this.supabase
      .from('users')
      .update({
        name: user.name,
      first_name: user.firstName,
      last_name: user.lastName,
        email: user.email,
        phone: user.phone,
        ci: user.ci || null,
        password_hash: user.passwordHash,
        role: user.role,
        status: user.status,
      })
      .eq('id', user.id);

    if (error) {
      throw new Error(`Error al actualizar usuario en Supabase: ${error.message}`);
    }
  }

  async searchClients(query: string): Promise<User[]> {
    const term = query.replace(/[^\p{L}\p{N}\s@.+-]/gu, '').trim().slice(0, 80);
    if (term.length < 2) return [];
    const pattern = '%' + term + '%';
    const { data, error } = await this.supabase.from('users').select('*')
      .eq('role', 'CLIENTE').eq('status', 'ACTIVE')
      .or(['name', 'phone', 'email'].map(field => field + '.ilike.' + pattern).join(','))
      .order('name').limit(20);
    if (error) throw new Error('No se pudieron buscar clientes.');
    return (data || []).map(row => this.toDomain(row));
  }

  async findAll(): Promise<User[]> {
    const { data, error } = await this.supabase.from('users').select('*');
    if (error || !data) return [];
    return data.map((row) => this.toDomain(row));
  }
}
