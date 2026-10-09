import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

/** @reference HU-CLI-13 Enlaces firmados, vinculados a la sesión del propietario. */
@Injectable()
export class ReservationRouteTokenService {
  constructor(private readonly jwt: JwtService) {}
  create(reservationId: string, userId: string): string {
    return this.jwt.sign({ reservationId, sub: userId, purpose: 'reservation-route' }, { expiresIn: '1h', audience: 'reservation-route' });
  }
  resolve(token: string, userId: string): string {
    try {
      const claims = this.jwt.verify(token, { algorithms: ['HS256'], audience: 'reservation-route' });
      if (claims.sub !== userId || claims.purpose !== 'reservation-route' || typeof claims.reservationId !== 'string') throw new Error();
      return claims.reservationId;
    } catch { throw new UnauthorizedException('El enlace de reserva es inválido o ha vencido. Abre la reserva desde Mis reservas.'); }
  }
}
