import { Module } from '@nestjs/common';
import { PaymentsModule } from '../payments/payments.module';
import { ReservationsModule } from '../reservations/reservations.module';
import { CourtsModule } from '../courts/courts.module';
import { ComplexesModule } from '../complexes/complexes.module';
import { UsersModule } from '../users/users.module';

import { GetRevenueReportUseCase } from './application/use-cases/get-revenue-report.use-case';
import { GetPendingReceivablesUseCase } from './application/use-cases/get-pending-receivables.use-case';
import { GetCourtOccupancyRankingUseCase } from './application/use-cases/get-court-occupancy-ranking.use-case';
import { GetPeakHoursAnalysisUseCase } from './application/use-cases/get-peak-hours-analysis.use-case';
import { CompareCourtsPerformanceUseCase } from './application/use-cases/compare-courts-performance.use-case';
import { GetExecutiveKpiSummaryUseCase } from './application/use-cases/get-executive-kpi-summary.use-case';

import { AdminAnalyticsController } from './presentation/controllers/admin-analytics.controller';

@Module({
  imports: [
    PaymentsModule,
    ReservationsModule,
    CourtsModule,
    ComplexesModule,
    UsersModule,
  ],
  controllers: [AdminAnalyticsController],
  providers: [
    GetRevenueReportUseCase,
    GetPendingReceivablesUseCase,
    GetCourtOccupancyRankingUseCase,
    GetPeakHoursAnalysisUseCase,
    CompareCourtsPerformanceUseCase,
    GetExecutiveKpiSummaryUseCase,
  ],
  exports: [
    GetRevenueReportUseCase,
    GetPendingReceivablesUseCase,
    GetCourtOccupancyRankingUseCase,
    GetPeakHoursAnalysisUseCase,
    CompareCourtsPerformanceUseCase,
    GetExecutiveKpiSummaryUseCase,
  ],
})
export class AnalyticsModule {}
