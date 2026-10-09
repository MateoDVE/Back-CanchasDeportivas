import { auditContext, auditedFetch, AuditContextInterceptor } from './audit-context';
import { firstValueFrom, Observable } from 'rxjs';

describe('Audit principal isolation', () => {
  afterEach(() => jest.restoreAllMocks());
  it('does not accept an actor header without a verified principal', async () => {
    const transport = jest.spyOn(globalThis, 'fetch').mockResolvedValue(new Response());
    await auditedFetch('https://example.invalid', { headers: { 'x-audit-actor': 'forged' } });
    expect(new Headers(transport.mock.calls[0][1]?.headers).get('x-audit-actor')).toBeNull();
  });
  it('keeps concurrent requests attributed to their own user', async () => {
    const seen: string[] = [];
    jest.spyOn(globalThis, 'fetch').mockImplementation(async (_url, init) => {
      seen.push(new Headers(init?.headers).get('x-audit-actor')!);
      return new Response();
    });
    await Promise.all(['alice', 'bob'].map(actor => auditContext.run(actor, async () => {
      await new Promise(resolve => setTimeout(resolve, actor === 'alice' ? 10 : 1));
      await auditedFetch('https://example.invalid');
    })));
    expect(seen).toEqual(['bob', 'alice']);
    expect(auditContext.getStore()).toBeUndefined();
  });
  it('subscribes within the verified principal context and releases it afterward', async () => {
    const interceptor = new AuditContextInterceptor();
    const context = { switchToHttp: () => ({ getRequest: () => ({ user: { id: 'verified' }, headers: { 'x-audit-actor': 'forged' } }) }) };
    const result = await firstValueFrom(interceptor.intercept(context as any, {
      handle: () => new Observable(subscriber => { subscriber.next(auditContext.getStore()); subscriber.complete(); }),
    }));
    expect(result).toBe('verified');
    expect(auditContext.getStore()).toBeUndefined();
  });
});
