import { Module } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { COURT_REPOSITORY } from './domain/repositories/court.repository.interface';
import { InMemoryCourtRepository } from './infrastructure/repositories/in-memory-court.repository';
import { SupabaseCourtRepository } from './infrastructure/repositories/supabase-court.repository';
import { SUPABASE_CLIENT } from '../../common/supabase/supabase.provider';
import { CreateCourtUseCase } from './application/use-cases/create-court.use-case';
import { UpdateCourtPriceUseCase } from './application/use-cases/update-court-price.use-case';
import { GetCourtsByComplexUseCase } from './application/use-cases/get-courts-by-complex.use-case';
import { AdminCourtsController } from './presentation/controllers/admin-courts.controller';
import { CourtsController } from './presentation/controllers/courts.controller';
import { ComplexesModule } from '../complexes/complexes.module';

@Module({
  imports: [ComplexesModule],
  controllers: [AdminCourtsController, CourtsController],
  providers: [
    InMemoryCourtRepository,
    {
      provide: COURT_REPOSITORY,
      useFactory: (
        supabase: SupabaseClient | null,
        inMemoryRepo: InMemoryCourtRepository,
      ) => {
        if (supabase) {
          return new SupabaseCourtRepository(supabase);
        }
        return inMemoryRepo;
      },
      inject: [SUPABASE_CLIENT, InMemoryCourtRepository],
    },
    CreateCourtUseCase,
    UpdateCourtPriceUseCase,
    GetCourtsByComplexUseCase,
  ],
  exports: [
    COURT_REPOSITORY,
    CreateCourtUseCase,
    UpdateCourtPriceUseCase,
    GetCourtsByComplexUseCase,
  ],
})
export class CourtsModule {}
