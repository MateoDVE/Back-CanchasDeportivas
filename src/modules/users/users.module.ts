import { Module } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { USER_REPOSITORY } from './domain/repositories/user.repository.interface';
import { InMemoryUserRepository } from './infrastructure/repositories/in-memory-user.repository';
import { SupabaseUserRepository } from './infrastructure/repositories/supabase-user.repository';
import { SUPABASE_CLIENT } from '../../common/supabase/supabase.provider';
import { ManageStaffUseCase } from './application/use-cases/manage-staff.use-case';
import { AdminStaffController } from './presentation/controllers/admin-staff.controller';
import { PASSWORD_HASHER } from '../auth/domain/services/password-hasher.interface';
import { BcryptPasswordHasher } from '../auth/infrastructure/services/bcrypt-password-hasher.service';

@Module({
  controllers: [AdminStaffController],
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
    {
      provide: PASSWORD_HASHER,
      useClass: BcryptPasswordHasher,
    },
    ManageStaffUseCase,
  ],
  exports: [USER_REPOSITORY, ManageStaffUseCase],
})
export class UsersModule {}
