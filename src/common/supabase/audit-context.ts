import { AsyncLocalStorage } from 'node:async_hooks';
import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';

// Only the verified JWT principal reaches the database; never forward client headers.
export const auditContext = new AsyncLocalStorage<string | null>();

@Injectable()
export class AuditContextInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest();
    const actor = request.user?.id ?? request.user?.userId ?? null;
    return new Observable(subscriber => auditContext.run(actor, () => {
      const subscription = next.handle().subscribe(subscriber);
      return () => subscription.unsubscribe();
    }));
  }
}

export const auditedFetch: typeof fetch = (input, init) => {
  const headers = new Headers(init?.headers);
  headers.delete('x-audit-actor');
  const actor = auditContext.getStore();
  if (actor) headers.set('x-audit-actor', actor);
  return fetch(input, { ...init, headers });
};
