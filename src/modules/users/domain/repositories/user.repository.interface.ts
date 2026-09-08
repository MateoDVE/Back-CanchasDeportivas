import { User } from '../entities/user.entity';

export const USER_REPOSITORY = 'IUserRepository';

export interface IUserRepository {
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  findByCi(ci: string): Promise<User | null>;
  save(user: User): Promise<void>;
  update(user: User): Promise<void>;
  findAll(): Promise<User[]>;
  searchClients(query: string): Promise<User[]>;
}
