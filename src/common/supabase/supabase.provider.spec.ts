import { FactoryProvider, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient } from '@supabase/supabase-js';
import { SupabaseProvider } from './supabase.provider';
import { auditedFetch } from './audit-context';

jest.mock('@supabase/supabase-js', () => ({ createClient: jest.fn() }));

describe('SupabaseProvider', () => {
  let warn: jest.SpyInstance;
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    warn = jest
      .spyOn(Logger.prototype, 'warn')
      .mockImplementation(() => undefined);
  });
  afterEach(() => jest.restoreAllMocks());
  const factory = (SupabaseProvider as FactoryProvider).useFactory as (
    config: ConfigService,
  ) => unknown;

  it.each([
    [
      ' https://example.test/rest/v1/ ',
      'test-service',
      'test-anon',
      'test-service',
    ],
    ['https://example.test///', undefined, 'test-anon', 'test-anon'],
  ])(
    'normaliza %s y configura un cliente sin sesión persistente',
    (url, service, anon, selected) => {
      const client = { marker: 'client' };
      (createClient as jest.Mock).mockReturnValue(client);
      expect(
        factory(
          new ConfigService({
            SUPABASE_URL: url,
            SUPABASE_SERVICE_ROLE_KEY: service,
            SUPABASE_ANON_KEY: anon,
          }),
        ),
      ).toBe(client);
      expect(createClient).toHaveBeenCalledWith(
        'https://example.test',
        selected,
        {
          global: { fetch: auditedFetch },
          auth: { persistSession: false, autoRefreshToken: false },
        },
      );
    },
  );

  it.each([
    {},
    { SUPABASE_URL: 'https://example.test' },
    { SUPABASE_ANON_KEY: 'test-anon' },
  ])('no crea cliente con configuración incompleta %p', (config) => {
    expect(factory(new ConfigService(config))).toBeNull();
    expect(createClient).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalledTimes(1);
  });
});
