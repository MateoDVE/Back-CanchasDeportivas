import { CanActivate, ExecutionContext, HttpException, Injectable } from '@nestjs/common';

/** Límite por IP. En despliegues de varias instancias complementar en el proxy compartido. */
@Injectable()
export class AuthRateLimitGuard implements CanActivate {
  private readonly requests = new Map<string, { count: number; until: number }>();
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const now = Date.now();
    for (const [key, value] of this.requests) if (value.until <= now) this.requests.delete(key);
    const key = `${req.ip}:${req.path}`;
    const bucket = this.requests.get(key) ?? { count: 0, until: now + 60000 };
    if (++bucket.count > 5) throw new HttpException('Demasiados intentos. Espera un minuto.', 429);
    this.requests.set(key, bucket);
    return true;
  }
}
