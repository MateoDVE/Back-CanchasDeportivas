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

import { GetAllCourtsUseCase } from '../../application/use-cases/get-all-courts.use-case';
import { GetCourtByIdUseCase } from '../../application/use-cases/get-court-by-id.use-case';

@Controller('api/v1')
export class CourtsController {
  constructor(
    private readonly getCourtsByComplexUseCase: GetCourtsByComplexUseCase,
    private readonly getCourtTypesUseCase: GetCourtTypesUseCase,
    private readonly calculateReservationCostUseCase: CalculateReservationCostUseCase,
    private readonly getAllCourtsUseCase: GetAllCourtsUseCase,
    private readonly getCourtByIdUseCase: GetCourtByIdUseCase,
  ) {}

  /**
   * @reference HU-CLI-05 Consultar canchas generales
   */
  @Public()
  @Get('courts')
  async getAllCourts(@Query('onlyActive') onlyActive?: string): Promise<CourtOutputDto[]> {
    const active = onlyActive !== 'false';
    return this.getAllCourtsUseCase.execute(active);
  }

  /**
   * @reference HU-CLI-06 Consultar tipo de cancha
   */
  @Public()
  @Get('courts/types')
  getCourtTypes(): CourtTypeDescription[] {
    return this.getCourtTypesUseCase.execute();
  }

  /**
   * @reference Consultar detalle de cancha por ID
   */
  @Public()
  @Get('courts/:id')
  async getCourtById(@Param('id', ParseIntPipe) id: number): Promise<CourtOutputDto> {
    return this.getCourtByIdUseCase.execute(id);
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
