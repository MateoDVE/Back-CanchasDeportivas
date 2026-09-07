import {
  Controller,
  Get,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../../common/guards/roles.guard';
import { Roles } from '../../../../common/decorators/roles.decorator';

import { AdminListAllReservationsUseCase } from '../../application/use-cases/admin-list-all-reservations.use-case';
import { GetMasterCalendarGridUseCase } from '../../application/use-cases/get-master-calendar-grid.use-case';

@Controller('api/v1/admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class AdminReservationsController {
  constructor(
    private readonly adminListAllReservationsUseCase: AdminListAllReservationsUseCase,
    private readonly getMasterCalendarGridUseCase: GetMasterCalendarGridUseCase,
  ) {}

  /**
   * @reference HU-ADM-15 Consultar todas las reservas (búsqueda global multicriterio)
   */
  @Get('reservations')
  async getAllReservations(
    @Query('date') date?: string,
    @Query('courtId') courtId?: string,
    @Query('complexId') complexId?: string,
    @Query('status') status?: string,
    @Query('clientId') clientId?: string,
  ) {
    return this.adminListAllReservationsUseCase.execute({
      date,
      courtId: courtId ? parseInt(courtId, 10) : undefined,
      complexId: complexId ? parseInt(complexId, 10) : undefined,
      status,
      clientId,
    });
  }

  /**
   * @reference HU-ADM-16 Consultar calendario general (Master Grid)
   */
  @Get('calendar-master')
  async getMasterCalendarGrid(@Query('date') date?: string) {
    return this.getMasterCalendarGridUseCase.execute(date);
  }
}
