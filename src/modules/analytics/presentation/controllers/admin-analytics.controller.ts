import {
  Controller,
  Get,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../../common/guards/roles.guard';
import { Roles } from '../../../../common/decorators/roles.decorator';

import { GetRevenueReportUseCase } from '../../application/use-cases/get-revenue-report.use-case';
import { GetPendingReceivablesUseCase } from '../../application/use-cases/get-pending-receivables.use-case';
import { GetCourtOccupancyRankingUseCase } from '../../application/use-cases/get-court-occupancy-ranking.use-case';
import { GetPeakHoursAnalysisUseCase } from '../../application/use-cases/get-peak-hours-analysis.use-case';
import { CompareCourtsPerformanceUseCase } from '../../application/use-cases/compare-courts-performance.use-case';
import { GetExecutiveKpiSummaryUseCase } from '../../application/use-cases/get-executive-kpi-summary.use-case';

@Controller('api/v1/admin/analytics')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class AdminAnalyticsController {
  constructor(
    private readonly getRevenueReportUseCase: GetRevenueReportUseCase,
    private readonly getPendingReceivablesUseCase: GetPendingReceivablesUseCase,
    private readonly getCourtOccupancyRankingUseCase: GetCourtOccupancyRankingUseCase,
    private readonly getPeakHoursAnalysisUseCase: GetPeakHoursAnalysisUseCase,
    private readonly compareCourtsPerformanceUseCase: CompareCourtsPerformanceUseCase,
    private readonly getExecutiveKpiSummaryUseCase: GetExecutiveKpiSummaryUseCase,
  ) {}

  /**
   * @reference HU-ADM-17 Consultar ingresos
   */
  @Get('revenue')
  async getRevenue(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('courtId') courtId?: string,
  ) {
    return this.getRevenueReportUseCase.execute({
      startDate,
      endDate,
      courtId: courtId ? parseInt(courtId, 10) : undefined,
    });
  }

  /**
   * @reference HU-ADM-18 Consultar pagos pendientes
   */
  @Get('pending-balances')
  async getPendingBalances(@Query('courtId') courtId?: string) {
    return this.getPendingReceivablesUseCase.execute(
      courtId ? parseInt(courtId, 10) : undefined,
    );
  }

  /**
   * @reference HU-ADM-20 Consultar ocupación de canchas
   */
  @Get('court-occupancy')
  async getCourtOccupancy(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.getCourtOccupancyRankingUseCase.execute(startDate, endDate);
  }

  /**
   * @reference HU-ADM-21 Consultar horarios de mayor demanda
   */
  @Get('peak-hours')
  async getPeakHours(@Query('courtId') courtId?: string) {
    return this.getPeakHoursAnalysisUseCase.execute(
      courtId ? parseInt(courtId, 10) : undefined,
    );
  }

  /**
   * @reference HU-ADM-22 Comparar rendimiento de canchas
   */
  @Get('court-performance')
  async getCourtPerformance() {
    return this.compareCourtsPerformanceUseCase.execute();
  }

  /**
   * @reference HU-ADM-23 Consultar indicadores generales (Executive Dashboard)
   */
  @Get('kpi-summary')
  async getKpiSummary() {
    return this.getExecutiveKpiSummaryUseCase.execute();
  }
}
