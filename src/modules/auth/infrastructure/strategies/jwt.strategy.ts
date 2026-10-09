import { USER_REPOSITORY, IUserRepository } from '../../../users/domain/repositories/user.repository.interface';
import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

export interface JwtPayload {
  purpose: string;
  sub: string;
  id: string;
  email: string;
  role: 'CLIENTE' | 'SECRETARIA' | 'ADMIN';
  name: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService, @Inject(USER_REPOSITORY) private readonly users: IUserRepository) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      algorithms: ['HS256'],
      secretOrKey:
        configService.getOrThrow<string>('JWT_SECRET'),
    });
  }

  async validate(payload: JwtPayload) {
    if (!payload || payload.purpose !== 'access' || !payload.id || payload.sub !== payload.id) {
      throw new UnauthorizedException('Token inválido o corrupto.');
    }
    const user = await this.users.findById(payload.id);
    if (!user?.isActive()) throw new UnauthorizedException('La cuenta no está activa o verificada.');
    return { id: user.id, email: user.email, role: user.role, name: user.name,
      phone: user.phone, status: user.status, createdAt: user.createdAt };
  }
}
