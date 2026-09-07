import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import { GetActiveComplexesUseCase } from '../../application/use-cases/get-active-complexes.use-case';
import { GetComplexQrUseCase, ComplexQrOutputDto } from '../../application/use-cases/get-complex-qr.use-case';
import { ComplexOutputDto } from '../../application/use-cases/create-complex.use-case';
import { Public } from '../../../../common/decorators/public.decorator';

@Controller('api/v1/complexes')
export class ComplexesController {
  constructor(
    private readonly getActiveComplexesUseCase: GetActiveComplexesUseCase,
    private readonly getComplexQrUseCase: GetComplexQrUseCase,
  ) {}

  /**
   * @reference HU-CLI-04 Consultar complejos deportivos
   */
  @Public()
  @Get()
  async getActiveComplexes(): Promise<ComplexOutputDto[]> {
    return this.getActiveComplexesUseCase.execute();
  }

  /**
   * @reference HU-CLI-15 Realizar pago del anticipo (QR)
   */
  @Public()
  @Get(':id/qr')
  async getComplexQr(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<ComplexQrOutputDto> {
    return this.getComplexQrUseCase.execute(id);
  }
}
