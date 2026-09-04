import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SupabaseProvider, SUPABASE_CLIENT } from './supabase.provider';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [SupabaseProvider],
  exports: [SUPABASE_CLIENT],
})
export class SupabaseModule {}
