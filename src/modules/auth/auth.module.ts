import { EMAIL_VERIFICATION } from './domain/services/email-verification.interface';
import { EmailVerificationService } from './infrastructure/services/email-verification.service';
import { ResendVerificationUseCase } from './application/use-cases/resend-verification.use-case';
import { AuthRateLimitGuard } from './presentation/guards/auth-rate-limit.guard';
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { UsersModule } from '../users/users.module';
import { AuthController } from './presentation/controllers/auth.controller';
import { RegisterClientUseCase } from './application/use-cases/register-client.use-case';
import { LoginUseCase } from './application/use-cases/login.use-case';
import { VerifyEmailUseCase } from './application/use-cases/verify-email.use-case';
import { PASSWORD_HASHER } from './domain/services/password-hasher.interface';
import { BcryptPasswordHasher } from './infrastructure/services/bcrypt-password-hasher.service';
import { JwtStrategy } from './infrastructure/strategies/jwt.strategy';

@Module({
  imports: [
    UsersModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret:
          configService.getOrThrow<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: (configService.get<string>('JWT_EXPIRATION') || '1h') as any,
        },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController],
  providers: [
    ResendVerificationUseCase, AuthRateLimitGuard,
    { provide: EMAIL_VERIFICATION, useClass: EmailVerificationService },
    RegisterClientUseCase,
    LoginUseCase,
    VerifyEmailUseCase,
    JwtStrategy,
    {
      provide: PASSWORD_HASHER,
      useClass: BcryptPasswordHasher,
    },
  ],
  exports: [JwtModule, RegisterClientUseCase, LoginUseCase, VerifyEmailUseCase, JwtStrategy, PassportModule, PASSWORD_HASHER],
})
export class AuthModule {}
