import { Injectable, Inject } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { IUserRepository, USER_REPOSITORY } from '../../../users/domain/repositories/user.repository.interface';
import { IPasswordHasher, PASSWORD_HASHER } from '../../domain/services/password-hasher.interface';
import {
  UnauthorizedException,
  ForbiddenException,
} from '../../../../common/domain/exceptions/domain.exception';
import { UserOutputDto } from './register-client.use-case';

export interface LoginInput {
  email: string;
  password: string;
}

export interface LoginOutputDto {
  accessToken: string;
  user: UserOutputDto;
}

/**
 * @reference HU-CLI-03 Inicio de sesión Cliente
 * @reference HU-SEC-01 Iniciar sesión Secretaria
 * @reference HU-ADM-01 Iniciar sesión Admin
 */
@Injectable()
export class LoginUseCase {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
    @Inject(PASSWORD_HASHER)
    private readonly passwordHasher: IPasswordHasher,
    private readonly jwtService: JwtService,
  ) {}

  async execute(input: LoginInput): Promise<LoginOutputDto> {
    const user = await this.userRepository.findByEmail(input.email.trim().toLowerCase());
    if (!user) {
      throw new UnauthorizedException('Credenciales inválidas.');
    }

    const isMatch = await this.passwordHasher.compare(input.password, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedException('Credenciales inválidas.');
    }

    if (!user.isActive()) {
      throw new ForbiddenException('La cuenta de usuario se encuentra inactiva o deshabilitada.');
    }

    const payload = {
      sub: user.id,
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
    };

    const accessToken = this.jwtService.sign(payload);

    return {
      accessToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        ci: user.ci,
        role: user.role,
        status: user.status,
        createdAt: user.createdAt,
      },
    };
  }
}
