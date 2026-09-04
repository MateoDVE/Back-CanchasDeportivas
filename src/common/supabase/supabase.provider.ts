import { Provider, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

export const SUPABASE_CLIENT = 'SUPABASE_CLIENT';

export const SupabaseProvider: Provider = {
  provide: SUPABASE_CLIENT,
  useFactory: (configService: ConfigService): SupabaseClient | null => {
    const logger = new Logger('SupabaseProvider');
    const url = configService.get<string>('SUPABASE_URL');
    const key =
      configService.get<string>('SUPABASE_SERVICE_ROLE_KEY') ||
      configService.get<string>('SUPABASE_ANON_KEY');

    if (url && key) {
      logger.log(`Conectando cliente Supabase a ${url}`);
      return createClient(url, key, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      });
    }

    logger.warn(
      'Variables de Supabase no detectadas. El sistema utilizará repositorios In-Memory con persistencia de sesión local.',
    );
    return null;
  },
  inject: [ConfigService],
};
