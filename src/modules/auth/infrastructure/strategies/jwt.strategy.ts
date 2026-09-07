import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

export interface JwtPayload {
  sub: string;
  id: string;
  email: string;
  role: 'CLIENTE' | 'SECRETARIA' | 'ADMIN';
  name: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey:
        configService.get<string>('JWT_SECRET') ||
        'super-secret-jwt-key-canchas-deportivas-2026',
    });
  }

  async validate(payload: JwtPayload) {
    if (!payload || !payload.id || !payload.role) {
      throw new UnauthorizedException('Token inválido o corrupto.');
    }
    return {
      id: payload.id,
      email: payload.email,
      role: payload.role,
      name: payload.name,
    };
  }
}
