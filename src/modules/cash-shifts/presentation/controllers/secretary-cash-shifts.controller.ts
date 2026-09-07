import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../../common/guards/roles.guard';
import { Roles } from '../../../../common/decorators/roles.decorator';
import { CurrentUser, AuthenticatedUser } from '../../../../common/decorators/current-user.decorator';

import { GetCurrentShiftSummaryUseCase } from '../../application/use-cases/get-current-shift-summary.use-case';
import { CloseCashShiftUseCase } from '../../application/use-cases/close-cash-shift.use-case';
import { CloseCashShiftDto } from '../dtos/close-cash-shift.dto';

@Controller('api/v1/secretary/shifts')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SECRETARIA', 'ADMIN')
export class SecretaryCashShiftsController {
  constructor(
    private readonly getCurrentShiftSummaryUseCase: GetCurrentShiftSummaryUseCase,
    private readonly closeCashShiftUseCase: CloseCashShiftUseCase,
  ) {}

  /**
   * @reference HU-SEC-25 Consultar ingresos de la jornada
   */
  @Get('current-summary')
  async getCurrentSummary(
    @CurrentUser() user: AuthenticatedUser,
    @Query('date') date?: string,
  ) {
    return this.getCurrentShiftSummaryUseCase.execute(user.id, date);
  }

  /**
   * @reference HU-SEC-26 Realizar cierre de caja
   */
  @Post('close')
  @HttpCode(HttpStatus.OK)
  async closeShift(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CloseCashShiftDto,
  ) {
    return this.closeCashShiftUseCase.execute({
      secretaryId: user.id,
      totalDeclaredCash: dto.totalDeclaredCash,
      notes: dto.notes,
      date: dto.date,
    });
  }
}
