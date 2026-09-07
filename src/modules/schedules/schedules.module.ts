import { Module } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { SCHEDULE_REPOSITORY } from './domain/repositories/schedule.repository.interface';
import { InMemoryScheduleRepository } from './infrastructure/repositories/in-memory-schedule.repository';
import { SupabaseScheduleRepository } from './infrastructure/repositories/supabase-schedule.repository';
import { SUPABASE_CLIENT } from '../../common/supabase/supabase.provider';
import { SetWeeklyScheduleUseCase } from './application/use-cases/set-weekly-schedule.use-case';
import { SetSpecificDateScheduleUseCase } from './application/use-cases/set-specific-date-schedule.use-case';
import { GetCourtSchedulesUseCase } from './application/use-cases/get-court-schedules.use-case';
import { AdminSchedulesController } from './presentation/controllers/admin-schedules.controller';
import { CourtsModule } from '../courts/courts.module';

@Module({
  imports: [CourtsModule],
  controllers: [AdminSchedulesController],
  providers: [
    InMemoryScheduleRepository,
    {
      provide: SCHEDULE_REPOSITORY,
      useFactory: (
        supabase: SupabaseClient | null,
        inMemoryRepo: InMemoryScheduleRepository,
      ) => {
        if (supabase) {
          return new SupabaseScheduleRepository(supabase);
        }
        return inMemoryRepo;
      },
      inject: [SUPABASE_CLIENT, InMemoryScheduleRepository],
    },
    SetWeeklyScheduleUseCase,
    SetSpecificDateScheduleUseCase,
    GetCourtSchedulesUseCase,
  ],
  exports: [
    SCHEDULE_REPOSITORY,
    SetWeeklyScheduleUseCase,
    SetSpecificDateScheduleUseCase,
    GetCourtSchedulesUseCase,
  ],
})
export class SchedulesModule {}
