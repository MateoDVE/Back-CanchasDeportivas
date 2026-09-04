import {
  Controller,
  Put,
  Get,
  Param,
  ParseIntPipe,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { SetWeeklyScheduleUseCase, CourtScheduleOutputDto } from '../../application/use-cases/set-weekly-schedule.use-case';
import { GetCourtSchedulesUseCase } from '../../application/use-cases/get-court-schedules.use-case';
import { SetWeeklyScheduleDto } from '../dtos/set-weekly-schedule.dto';
import { JwtAuthGuard } from '../../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../../common/guards/roles.guard';
import { Roles } from '../../../../common/decorators/roles.decorator';

@Controller('api/v1/admin/courts/:courtId/schedules')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AdminSchedulesController {
  constructor(
    private readonly setWeeklyScheduleUseCase: SetWeeklyScheduleUseCase,
    private readonly getCourtSchedulesUseCase: GetCourtSchedulesUseCase,
  ) {}

  /**
   * @reference HU-ADM-13 Configurar horarios de atención
   */
  @Put('weekly')
  @Roles('ADMIN')
  @HttpCode(HttpStatus.OK)
  async setWeeklySchedules(
    @Param('courtId', ParseIntPipe) courtId: number,
    @Body() dto: SetWeeklyScheduleDto,
  ): Promise<CourtScheduleOutputDto[]> {
    return this.setWeeklyScheduleUseCase.execute({
      courtId,
      schedules: dto.schedules,
    });
  }

  @Get()
  @Roles('ADMIN')
  async getSchedules(
    @Param('courtId', ParseIntPipe) courtId: number,
  ): Promise<CourtScheduleOutputDto[]> {
    return this.getCourtSchedulesUseCase.execute(courtId);
  }
}
