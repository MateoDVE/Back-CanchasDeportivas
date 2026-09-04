import { Module } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { RESERVATION_REPOSITORY } from './domain/repositories/reservation.repository.interface';
import { InMemoryReservationRepository } from './infrastructure/repositories/in-memory-reservation.repository';
import { SupabaseReservationRepository } from './infrastructure/repositories/supabase-reservation.repository';
import { SUPABASE_CLIENT } from '../../common/supabase/supabase.provider';
import { ReservationExpirationCron } from './infrastructure/cron/reservation-expiration.cron';
import { GetCourtAvailabilityUseCase } from './application/use-cases/get-court-availability.use-case';
import { CreateTemporalReservationUseCase } from './application/use-cases/create-temporal-reservation.use-case';
import { GetReservationSummaryUseCase } from './application/use-cases/get-reservation-summary.use-case';
import { GetReservationStatusUseCase } from './application/use-cases/get-reservation-status.use-case';
import { GetClientReservationsUseCase } from './application/use-cases/get-client-reservations.use-case';
import { ReservationsController } from './presentation/controllers/reservations.controller';
import { CourtsModule } from '../courts/courts.module';
import { ComplexesModule } from '../complexes/complexes.module';
import { SchedulesModule } from '../schedules/schedules.module';

@Module({
  imports: [CourtsModule, ComplexesModule, SchedulesModule],
  controllers: [ReservationsController],
  providers: [
    InMemoryReservationRepository,
    {
      provide: RESERVATION_REPOSITORY,
      useFactory: (
        supabase: SupabaseClient | null,
        inMemoryRepo: InMemoryReservationRepository,
      ) => {
        if (supabase) {
          return new SupabaseReservationRepository(supabase);
        }
        return inMemoryRepo;
      },
      inject: [SUPABASE_CLIENT, InMemoryReservationRepository],
    },
    ReservationExpirationCron,
    GetCourtAvailabilityUseCase,
    CreateTemporalReservationUseCase,
    GetReservationSummaryUseCase,
    GetReservationStatusUseCase,
    GetClientReservationsUseCase,
  ],
  exports: [
    RESERVATION_REPOSITORY,
    GetCourtAvailabilityUseCase,
    CreateTemporalReservationUseCase,
    GetReservationSummaryUseCase,
    GetReservationStatusUseCase,
    GetClientReservationsUseCase,
  ],
})
export class ReservationsModule {}
