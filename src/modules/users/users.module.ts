import { Module } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { USER_REPOSITORY } from './domain/repositories/user.repository.interface';
import { InMemoryUserRepository } from './infrastructure/repositories/in-memory-user.repository';
import { SupabaseUserRepository } from './infrastructure/repositories/supabase-user.repository';
import { SUPABASE_CLIENT } from '../../common/supabase/supabase.provider';

@Module({
  providers: [
    InMemoryUserRepository,
    {
      provide: USER_REPOSITORY,
      useFactory: (
        supabase: SupabaseClient | null,
        inMemoryRepo: InMemoryUserRepository,
      ) => {
        if (supabase) {
          return new SupabaseUserRepository(supabase);
        }
        return inMemoryRepo;
      },
      inject: [SUPABASE_CLIENT, InMemoryUserRepository],
    },
  ],
  exports: [USER_REPOSITORY],
})
export class UsersModule {}
