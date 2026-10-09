import { Inject, Injectable } from '@nestjs/common';
import { EMAIL_VERIFICATION, IEmailVerification } from '../../domain/services/email-verification.interface';
import { USER_REPOSITORY, IUserRepository } from '../../../users/domain/repositories/user.repository.interface';

/** @reference HU-CLI-02 Reenviar enlace sin revelar cuentas registradas. */
@Injectable()
export class ResendVerificationUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: IUserRepository,
    @Inject(EMAIL_VERIFICATION) private readonly verification: IEmailVerification,
  ) {}
  async execute(email: string) {
    const user = await this.users.findByEmail(email.trim().toLowerCase());
    if (user?.status === 'PENDING_VERIFICATION') await this.verification.send(user.id, user.email);
    return { message: 'Si la cuenta está pendiente, recibirás un enlace de verificación.' };
  }
}
