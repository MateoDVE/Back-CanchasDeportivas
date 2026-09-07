import { Injectable, Inject } from '@nestjs/common';
import { IUserRepository, USER_REPOSITORY } from '../../../users/domain/repositories/user.repository.interface';
import { EntityNotFoundException, ValidationException } from '../../../../common/domain/exceptions/domain.exception';

export interface VerifyEmailInput {
  email: string;
  token: string;
}

export interface VerifyEmailOutputDto {
  success: boolean;
  message: string;
}

/**
 * @reference HU-CLI-02 Validación de correo electrónico
 */
@Injectable()
export class VerifyEmailUseCase {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
  ) {}

  async execute(input: VerifyEmailInput): Promise<VerifyEmailOutputDto> {
    if (!input.token || input.token.trim() === '') {
      throw new ValidationException('El token o código de verificación es obligatorio.');
    }

    const user = await this.userRepository.findByEmail(input.email);
    if (!user) {
      throw new EntityNotFoundException('El correo proporcionado no pertenece a ningún usuario registrado.');
    }

    if (user.status === 'ACTIVE') {
      return {
        success: true,
        message: 'La cuenta de correo ya se encontraba validada y activa.',
      };
    }

    user.activate();
    await this.userRepository.update(user);

    return {
      success: true,
      message: 'Correo electrónico validado exitosamente. Ahora puede iniciar sesión y realizar reservas.',
    };
  }
}
