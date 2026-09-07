import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Query,
} from '@nestjs/common';
import { GetCourtsByComplexUseCase } from '../../application/use-cases/get-courts-by-complex.use-case';
import { GetCourtTypesUseCase, CourtTypeDescription } from '../../application/use-cases/get-court-types.use-case';
import { CalculateReservationCostUseCase, CalculatedCostOutputDto } from '../../application/use-cases/calculate-reservation-cost.use-case';
import { CourtOutputDto } from '../../application/use-cases/create-court.use-case';
import { Public } from '../../../../common/decorators/public.decorator';

@Controller('api/v1')
export class CourtsController {
  constructor(
    private readonly getCourtsByComplexUseCase: GetCourtsByComplexUseCase,
    private readonly getCourtTypesUseCase: GetCourtTypesUseCase,
    private readonly calculateReservationCostUseCase: CalculateReservationCostUseCase,
  ) {}

  /**
   * @reference HU-CLI-06 Consultar tipo de cancha
   */
  @Public()
  @Get('courts/types')
  getCourtTypes(): CourtTypeDescription[] {
    return this.getCourtTypesUseCase.execute();
  }

  /**
   * @reference HU-CLI-05 Consultar canchas por complejo
   */
  @Public()
  @Get('complexes/:complexId/courts')
  async getCourtsByComplex(
    @Param('complexId', ParseIntPipe) complexId: number,
  ): Promise<CourtOutputDto[]> {
    return this.getCourtsByComplexUseCase.execute(complexId, true);
  }

  /**
   * @reference HU-CLI-07 Consultar precio / cálculo de costo total estimado
   */
  @Public()
  @Get('courts/:id/calculate-cost')
  async calculateCost(
    @Param('id', ParseIntPipe) id: number,
    @Query('durationHours', ParseIntPipe) durationHours: number,
  ): Promise<CalculatedCostOutputDto> {
    return this.calculateReservationCostUseCase.execute(id, durationHours);
  }
}
