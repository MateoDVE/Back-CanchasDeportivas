import { EMAIL_VERIFICATION, IEmailVerification } from '../../domain/services/email-verification.interface';
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
    @Inject(EMAIL_VERIFICATION) private readonly verification: IEmailVerification,
  ) {}

  async execute(input: VerifyEmailInput): Promise<VerifyEmailOutputDto> {
    if (!input.token || input.token.trim() === '') {
      throw new ValidationException('El token o código de verificación es obligatorio.');
    }

    const user = await this.userRepository.findByEmail(input.email.trim().toLowerCase());
    if (!user) {
      throw new EntityNotFoundException('El correo proporcionado no pertenece a ningún usuario registrado.');
    }

    if (!await this.verification.verify(input.token, user.id, user.email)) {
      throw new ValidationException('El enlace es inválido o ha vencido. Solicita uno nuevo.');
    }
    if (user.status === 'INACTIVE') throw new ValidationException('La cuenta está deshabilitada.');
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
