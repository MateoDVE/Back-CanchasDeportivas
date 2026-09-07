import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SupabaseProvider, SUPABASE_CLIENT } from './supabase.provider';
import { SupabaseStorageService } from './supabase-storage.service';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [SupabaseProvider, SupabaseStorageService],
  exports: [SUPABASE_CLIENT, SupabaseStorageService],
})
export class SupabaseModule {}
