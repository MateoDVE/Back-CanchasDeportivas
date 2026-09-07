import {
  Controller,
  Get,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../../common/guards/roles.guard';
import { Roles } from '../../../../common/decorators/roles.decorator';

import { AuditSecretaryShiftsUseCase } from '../../application/use-cases/audit-secretary-shifts.use-case';

@Controller('api/v1/admin/analytics')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class AdminCashShiftsController {
  constructor(
    private readonly auditSecretaryShiftsUseCase: AuditSecretaryShiftsUseCase,
  ) {}

  /**
   * @reference HU-ADM-19 Supervisar ingresos de secretaria
   */
  @Get('cash-shifts')
  async auditCashShifts(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('secretaryId') secretaryId?: string,
  ) {
    return this.auditSecretaryShiftsUseCase.execute({
      startDate,
      endDate,
      secretaryId,
    });
  }
}
