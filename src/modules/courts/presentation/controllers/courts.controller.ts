import { Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import { GetCourtsByComplexUseCase } from '../../application/use-cases/get-courts-by-complex.use-case';
import { CourtOutputDto } from '../../application/use-cases/create-court.use-case';
import { Public } from '../../../../common/decorators/public.decorator';

@Controller('api/v1')
export class CourtsController {
  constructor(
    private readonly getCourtsByComplexUseCase: GetCourtsByComplexUseCase,
  ) {}

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
}
