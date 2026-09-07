import { Module } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { COMPLEX_REPOSITORY } from './domain/repositories/complex.repository.interface';
import { InMemoryComplexRepository } from './infrastructure/repositories/in-memory-complex.repository';
import { SupabaseComplexRepository } from './infrastructure/repositories/supabase-complex.repository';
import { SUPABASE_CLIENT } from '../../common/supabase/supabase.provider';
import { CreateComplexUseCase } from './application/use-cases/create-complex.use-case';
import { GetActiveComplexesUseCase } from './application/use-cases/get-active-complexes.use-case';
import { GetComplexQrUseCase } from './application/use-cases/get-complex-qr.use-case';
import { UpdateComplexUseCase } from './application/use-cases/update-complex.use-case';
import { ToggleComplexStatusUseCase } from './application/use-cases/toggle-complex-status.use-case';
import { UpdateBusinessInfoUseCase } from './application/use-cases/update-business-info.use-case';
import { UploadComplexQrUseCase } from './application/use-cases/upload-complex-qr.use-case';
import { AdminComplexesController } from './presentation/controllers/admin-complexes.controller';
import { ComplexesController } from './presentation/controllers/complexes.controller';

@Module({
  controllers: [AdminComplexesController, ComplexesController],
  providers: [
    InMemoryComplexRepository,
    {
      provide: COMPLEX_REPOSITORY,
      useFactory: (
        supabase: SupabaseClient | null,
        inMemoryRepo: InMemoryComplexRepository,
      ) => {
        if (supabase) {
          return new SupabaseComplexRepository(supabase);
        }
        return inMemoryRepo;
      },
      inject: [SUPABASE_CLIENT, InMemoryComplexRepository],
    },
    CreateComplexUseCase,
    GetActiveComplexesUseCase,
    GetComplexQrUseCase,
    UpdateComplexUseCase,
    ToggleComplexStatusUseCase,
    UpdateBusinessInfoUseCase,
    UploadComplexQrUseCase,
  ],
  exports: [
    COMPLEX_REPOSITORY,
    CreateComplexUseCase,
    GetActiveComplexesUseCase,
    GetComplexQrUseCase,
    UpdateComplexUseCase,
    ToggleComplexStatusUseCase,
    UpdateBusinessInfoUseCase,
    UploadComplexQrUseCase,
  ],
})
export class ComplexesModule {}
