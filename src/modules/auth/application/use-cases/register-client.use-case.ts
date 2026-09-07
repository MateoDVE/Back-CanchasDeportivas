import { Injectable, Inject } from '@nestjs/common';
import * as crypto from 'crypto';
import { IUserRepository, USER_REPOSITORY } from '../../../users/domain/repositories/user.repository.interface';
import { IPasswordHasher, PASSWORD_HASHER } from '../../domain/services/password-hasher.interface';
import { User } from '../../../users/domain/entities/user.entity';
import { ConflictException } from '../../../../common/domain/exceptions/domain.exception';

export interface RegisterClientInput {
  name: string;
  email: string;
  phone: string;
  ci: string;
  password: string;
}

export interface UserOutputDto {
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
 * @reference HU-CLI-01 Registro de cliente
 */
@Injectable()
export class RegisterClientUseCase {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
    @Inject(PASSWORD_HASHER)
    private readonly passwordHasher: IPasswordHasher,
  ) {}

  async execute(input: RegisterClientInput): Promise<UserOutputDto> {
    const existingByEmail = await this.userRepository.findByEmail(input.email);
    if (existingByEmail) {
      throw new ConflictException('El correo electrónico ya se encuentra registrado.');
    }

    const existingByCi = await this.userRepository.findByCi(input.ci);
    if (existingByCi) {
      throw new ConflictException('El número de documento de identidad (CI) ya se encuentra registrado.');
    }

    const passwordHash = await this.passwordHasher.hash(input.password);
    const user = new User(
      crypto.randomUUID(),
      input.name.trim(),
      input.email.trim().toLowerCase(),
      input.phone.trim(),
      input.ci.trim(),
      passwordHash,
      'CLIENTE',
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
}
