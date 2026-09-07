import { Injectable, Inject } from '@nestjs/common';
import * as crypto from 'crypto';
import { IUserRepository, USER_REPOSITORY } from '../../domain/repositories/user.repository.interface';
import { IPasswordHasher, PASSWORD_HASHER } from '../../../auth/domain/services/password-hasher.interface';
import { User, UserStatus } from '../../domain/entities/user.entity';
import { ConflictException, EntityNotFoundException, ValidationException } from '../../../../common/domain/exceptions/domain.exception';
import { UserRole } from '../../../../common/decorators/roles.decorator';

export interface CreateStaffInput {
  name: string;
  email: string;
  phone: string;
  ci: string;
  password: string;
  role: 'SECRETARIA' | 'ADMIN';
}

export interface StaffOutputDto {
  id: string;
  name: string;
  email: string;
  phone: string;
  ci: string;
  role: string;
  status: string;
  createdAt: Date;
}

/**
 * @reference HU-ADM-02 Gestionar acceso de usuarios internos
 */
@Injectable()
export class ManageStaffUseCase {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
    @Inject(PASSWORD_HASHER)
    private readonly passwordHasher: IPasswordHasher,
  ) {}

  async createStaff(input: CreateStaffInput): Promise<StaffOutputDto> {
    const existingByEmail = await this.userRepository.findByEmail(input.email);
    if (existingByEmail) {
      throw new ConflictException('El correo electrónico ya está registrado.');
    }

    const existingByCi = await this.userRepository.findByCi(input.ci);
    if (existingByCi) {
      throw new ConflictException('El CI ya se encuentra registrado.');
    }

    const passwordHash = await this.passwordHasher.hash(input.password);
    const user = new User(
      crypto.randomUUID(),
      input.name.trim(),
      input.email.trim().toLowerCase(),
      input.phone.trim(),
      input.ci.trim(),
      passwordHash,
      input.role,
      'ACTIVE',
      new Date(),
    );

    await this.userRepository.save(user);

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      ci: user.ci,
      role: user.role,
      status: user.status,
      createdAt: user.createdAt,
    };
  }

  async listStaff(): Promise<StaffOutputDto[]> {
    const all = await this.userRepository.findAll();
    return all
      .filter((u) => u.role === 'SECRETARIA' || u.role === 'ADMIN')
      .map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        phone: u.phone,
        ci: u.ci,
        role: u.role,
        status: u.status,
        createdAt: u.createdAt,
      }));
  }

  async updateStatus(id: string, status: UserStatus): Promise<StaffOutputDto> {
    const user = await this.userRepository.findById(id);
    if (!user) {
      throw new EntityNotFoundException(`El usuario interno con ID ${id} no existe.`);
    }

    if (status === 'ACTIVE') {
      user.activate();
    } else if (status === 'INACTIVE') {
      user.deactivate();
    } else {
      throw new ValidationException(`Estado no válido: ${status}`);
    }

    await this.userRepository.update(user);

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      ci: user.ci,
      role: user.role,
      status: user.status,
      createdAt: user.createdAt,
    };
  }
}
