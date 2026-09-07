import { Module } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { CASH_SHIFT_REPOSITORY } from './domain/repositories/cash-shift.repository.interface';
import { InMemoryCashShiftRepository } from './infrastructure/repositories/in-memory-cash-shift.repository';
import { SupabaseCashShiftRepository } from './infrastructure/repositories/supabase-cash-shift.repository';
import { SUPABASE_CLIENT } from '../../common/supabase/supabase.provider';

import { GetCurrentShiftSummaryUseCase } from './application/use-cases/get-current-shift-summary.use-case';
import { CloseCashShiftUseCase } from './application/use-cases/close-cash-shift.use-case';
import { AuditSecretaryShiftsUseCase } from './application/use-cases/audit-secretary-shifts.use-case';

import { SecretaryCashShiftsController } from './presentation/controllers/secretary-cash-shifts.controller';
import { AdminCashShiftsController } from './presentation/controllers/admin-cash-shifts.controller';

import { PaymentsModule } from '../payments/payments.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [PaymentsModule, UsersModule],
  controllers: [SecretaryCashShiftsController, AdminCashShiftsController],
  providers: [
    InMemoryCashShiftRepository,
    {
      provide: CASH_SHIFT_REPOSITORY,
      useFactory: (
        supabase: SupabaseClient | null,
        inMemoryRepo: InMemoryCashShiftRepository,
      ) => {
        if (supabase) {
          return new SupabaseCashShiftRepository(supabase);
        }
        return inMemoryRepo;
      },
      inject: [SUPABASE_CLIENT, InMemoryCashShiftRepository],
    },
    GetCurrentShiftSummaryUseCase,
    CloseCashShiftUseCase,
    AuditSecretaryShiftsUseCase,
  ],
  exports: [
    CASH_SHIFT_REPOSITORY,
    GetCurrentShiftSummaryUseCase,
    CloseCashShiftUseCase,
    AuditSecretaryShiftsUseCase,
  ],
})
export class CashShiftsModule {}
