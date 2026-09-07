import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  ParseIntPipe,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { GetAffectedReservationsUseCase, AffectedReservationsReportDto } from '../../application/use-cases/get-affected-reservations.use-case';
import { RescheduleIncidentUseCase, RescheduleIncidentOutputDto } from '../../application/use-cases/reschedule-incident.use-case';
import { RescheduleIncidentDto } from '../dtos/reschedule-incident.dto';
import { JwtAuthGuard } from '../../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../../common/guards/roles.guard';
import { Roles } from '../../../../common/decorators/roles.decorator';
import { CurrentUser, AuthenticatedUser } from '../../../../common/decorators/current-user.decorator';

@Controller('api/v1')
@UseGuards(JwtAuthGuard, RolesGuard)
export class IncidentsController {
  constructor(
    private readonly getAffectedReservationsUseCase: GetAffectedReservationsUseCase,
    private readonly rescheduleIncidentUseCase: RescheduleIncidentUseCase,
  ) {}

  /**
   * @reference HU-ADM-12 Consultar reservas afectadas por mantenimiento
   * @reference HU-SEC-22 Consultar reservas afectadas por cancha inhabilitada
   */
  @Get('incidents/:id/affected-reservations')
  @Roles('ADMIN', 'SECRETARIA')
  async getAffectedReservations(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<AffectedReservationsReportDto> {
    return this.getAffectedReservationsUseCase.execute(id);
  }

  /**
   * @reference HU-SEC-23 Gestionar reprogramación por incidente
   */
  @Post('secretary/reservations/:id/reschedule-incident')
  @Roles('SECRETARIA', 'ADMIN')
  @HttpCode(HttpStatus.OK)
  async rescheduleIncident(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') reservationId: string,
    @Body() dto: RescheduleIncidentDto,
  ): Promise<RescheduleIncidentOutputDto> {
    return this.rescheduleIncidentUseCase.execute({
      oldReservationId: reservationId,
      newCourtId: dto.newCourtId,
      newDate: dto.newDate,
      newStartTime: dto.newStartTime,
      newEndTime: dto.newEndTime,
      secretaryId: user.id,
    });
  }
}
