import { Module, forwardRef } from '@nestjs/common';
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
import { GetCourtCalendarMonthUseCase } from './application/use-cases/get-court-calendar-month.use-case';
import { GetReservationDetailUseCase } from './application/use-cases/get-reservation-detail.use-case';
import { CancelReservationUseCase } from './application/use-cases/cancel-reservation.use-case';
import { GetCancellationPolicyUseCase } from './application/use-cases/get-cancellation-policy.use-case';
import { GetRescheduleInfoUseCase } from './application/use-cases/get-reschedule-info.use-case';
import { GetReservationBalanceUseCase } from './application/use-cases/get-reservation-balance.use-case';

import { GetDailyOperationalBoardUseCase } from './application/use-cases/get-daily-operational-board.use-case';
import { SearchReservationsUseCase } from './application/use-cases/search-reservations.use-case';
import { CreateManualReservationUseCase } from './application/use-cases/create-manual-reservation.use-case';
import { GetActiveTemporalReservationsUseCase } from './application/use-cases/get-active-temporal-reservations.use-case';
import { ReleaseExpiredReservationUseCase } from './application/use-cases/release-expired-reservation.use-case';
import { QuickSearchReservationUseCase } from './application/use-cases/quick-search-reservation.use-case';
import { AuthorizeEntryUseCase } from './application/use-cases/authorize-entry.use-case';
import { GetNoShowCandidatesUseCase } from './application/use-cases/get-no-show-candidates.use-case';
import { MarkNoShowAndReleaseUseCase } from './application/use-cases/mark-no-show-and-release.use-case';
import { RescheduleReservationUseCase } from './application/use-cases/reschedule-reservation.use-case';
import { AdminListAllReservationsUseCase } from './application/use-cases/admin-list-all-reservations.use-case';
import { GetMasterCalendarGridUseCase } from './application/use-cases/get-master-calendar-grid.use-case';

import { ReservationsController } from './presentation/controllers/reservations.controller';
import { SecretaryReservationsController } from './presentation/controllers/secretary-reservations.controller';
import { AdminReservationsController } from './presentation/controllers/admin-reservations.controller';

import { CourtsModule } from '../courts/courts.module';
import { ComplexesModule } from '../complexes/complexes.module';
import { SchedulesModule } from '../schedules/schedules.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    forwardRef(() => CourtsModule),
    ComplexesModule,
    SchedulesModule,
    UsersModule,
  ],
  controllers: [
    ReservationsController,
    SecretaryReservationsController,
    AdminReservationsController,
  ],
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
    GetCourtCalendarMonthUseCase,
    GetReservationDetailUseCase,
    CancelReservationUseCase,
    GetCancellationPolicyUseCase,
    GetRescheduleInfoUseCase,
    GetReservationBalanceUseCase,
    GetDailyOperationalBoardUseCase,
    SearchReservationsUseCase,
    CreateManualReservationUseCase,
    GetActiveTemporalReservationsUseCase,
    ReleaseExpiredReservationUseCase,
    QuickSearchReservationUseCase,
    AuthorizeEntryUseCase,
    GetNoShowCandidatesUseCase,
    MarkNoShowAndReleaseUseCase,
    RescheduleReservationUseCase,
    AdminListAllReservationsUseCase,
    GetMasterCalendarGridUseCase,
  ],
  exports: [
    RESERVATION_REPOSITORY,
    GetCourtAvailabilityUseCase,
    CreateTemporalReservationUseCase,
    GetReservationSummaryUseCase,
    GetReservationStatusUseCase,
    GetClientReservationsUseCase,
    GetCourtCalendarMonthUseCase,
    GetReservationDetailUseCase,
    CancelReservationUseCase,
    GetCancellationPolicyUseCase,
    GetRescheduleInfoUseCase,
    GetReservationBalanceUseCase,
    GetDailyOperationalBoardUseCase,
    SearchReservationsUseCase,
    CreateManualReservationUseCase,
    GetActiveTemporalReservationsUseCase,
    ReleaseExpiredReservationUseCase,
    QuickSearchReservationUseCase,
    AuthorizeEntryUseCase,
    GetNoShowCandidatesUseCase,
    MarkNoShowAndReleaseUseCase,
    RescheduleReservationUseCase,
    AdminListAllReservationsUseCase,
    GetMasterCalendarGridUseCase,
  ],
})
export class ReservationsModule {}
