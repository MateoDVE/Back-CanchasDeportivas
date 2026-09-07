import { Module, forwardRef } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { COURT_REPOSITORY } from './domain/repositories/court.repository.interface';
import { COURT_INCIDENT_REPOSITORY } from './domain/repositories/court-incident.repository.interface';
import { InMemoryCourtRepository } from './infrastructure/repositories/in-memory-court.repository';
import { SupabaseCourtRepository } from './infrastructure/repositories/supabase-court.repository';
import { InMemoryCourtIncidentRepository } from './infrastructure/repositories/in-memory-court-incident.repository';
import { SupabaseCourtIncidentRepository } from './infrastructure/repositories/supabase-court-incident.repository';
import { SUPABASE_CLIENT } from '../../common/supabase/supabase.provider';
import { CreateCourtUseCase } from './application/use-cases/create-court.use-case';
import { UpdateCourtPriceUseCase } from './application/use-cases/update-court-price.use-case';
import { GetCourtsByComplexUseCase } from './application/use-cases/get-courts-by-complex.use-case';
import { GetCourtTypesUseCase } from './application/use-cases/get-court-types.use-case';
import { CalculateReservationCostUseCase } from './application/use-cases/calculate-reservation-cost.use-case';
import { UpdateCourtUseCase } from './application/use-cases/update-court.use-case';
import { ToggleCourtStatusUseCase } from './application/use-cases/toggle-court-status.use-case';
import { ScheduleMaintenanceUseCase } from './application/use-cases/schedule-maintenance.use-case';
import { RegisterIncidentUseCase } from './application/use-cases/register-incident.use-case';
import { GetAffectedReservationsUseCase } from './application/use-cases/get-affected-reservations.use-case';
import { RescheduleIncidentUseCase } from './application/use-cases/reschedule-incident.use-case';
import { GetAllCourtsUseCase } from './application/use-cases/get-all-courts.use-case';
import { GetCourtByIdUseCase } from './application/use-cases/get-court-by-id.use-case';
import { AdminCourtsController } from './presentation/controllers/admin-courts.controller';
import { CourtsController } from './presentation/controllers/courts.controller';
import { IncidentsController } from './presentation/controllers/incidents.controller';
import { ComplexesModule } from '../complexes/complexes.module';
import { UsersModule } from '../users/users.module';
import { ReservationsModule } from '../reservations/reservations.module';

@Module({
  imports: [
    ComplexesModule,
    UsersModule,
    forwardRef(() => ReservationsModule),
  ],
  controllers: [AdminCourtsController, CourtsController, IncidentsController],
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
    InMemoryCourtIncidentRepository,
    {
      provide: COURT_INCIDENT_REPOSITORY,
      useFactory: (
        supabase: SupabaseClient | null,
        inMemoryRepo: InMemoryCourtIncidentRepository,
      ) => {
        if (supabase) {
          return new SupabaseCourtIncidentRepository(supabase);
        }
        return inMemoryRepo;
      },
      inject: [SUPABASE_CLIENT, InMemoryCourtIncidentRepository],
    },
    CreateCourtUseCase,
    UpdateCourtPriceUseCase,
    GetCourtsByComplexUseCase,
    GetCourtTypesUseCase,
    CalculateReservationCostUseCase,
    UpdateCourtUseCase,
    ToggleCourtStatusUseCase,
    ScheduleMaintenanceUseCase,
    RegisterIncidentUseCase,
    GetAffectedReservationsUseCase,
    RescheduleIncidentUseCase,
    GetAllCourtsUseCase,
    GetCourtByIdUseCase,
  ],
  exports: [
    COURT_REPOSITORY,
    COURT_INCIDENT_REPOSITORY,
    CreateCourtUseCase,
    UpdateCourtPriceUseCase,
    GetCourtsByComplexUseCase,
    GetCourtTypesUseCase,
    CalculateReservationCostUseCase,
    UpdateCourtUseCase,
    ToggleCourtStatusUseCase,
    ScheduleMaintenanceUseCase,
    RegisterIncidentUseCase,
    GetAffectedReservationsUseCase,
    RescheduleIncidentUseCase,
    GetAllCourtsUseCase,
    GetCourtByIdUseCase,
  ],
})
export class CourtsModule {}
