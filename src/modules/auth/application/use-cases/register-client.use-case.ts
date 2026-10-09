import { EMAIL_VERIFICATION, IEmailVerification } from '../../domain/services/email-verification.interface';
import { Injectable, Inject } from '@nestjs/common';
import * as crypto from 'crypto';
import { IUserRepository, USER_REPOSITORY } from '../../../users/domain/repositories/user.repository.interface';
import { IPasswordHasher, PASSWORD_HASHER } from '../../domain/services/password-hasher.interface';
import { User } from '../../../users/domain/entities/user.entity';
import { ConflictException } from '../../../../common/domain/exceptions/domain.exception';

export interface RegisterClientInput {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
}

export interface UserOutputDto {
  id: string;
  name: string;
  email: string;
  phone: string;
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
    @Inject(EMAIL_VERIFICATION) private readonly verification: IEmailVerification,
  ) {}

  async execute(input: RegisterClientInput): Promise<UserOutputDto> {
    const existingByEmail = await this.userRepository.findByEmail(input.email);
    if (existingByEmail) {
      throw new ConflictException('El correo electrónico ya se encuentra registrado.');
    }


    const passwordHash = await this.passwordHasher.hash(input.password);
    const user = new User(
      crypto.randomUUID(),
      `${input.firstName.trim()} ${input.lastName.trim()}`,
      input.email.trim().toLowerCase(),
      input.phone.trim(),
      '',
      passwordHash,
      'CLIENTE',
      'PENDING_VERIFICATION',
      new Date(),
      input.firstName.trim(),
      input.lastName.trim(),
    );

    await this.userRepository.save(user);
    await this.verification.send(user.id, user.email);

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      status: user.status,
      createdAt: user.createdAt,
    };
  }
}
