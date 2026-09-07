import {
  Controller,
  Put,
  Post,
  Get,
  Param,
  ParseIntPipe,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { SetWeeklyScheduleUseCase, CourtScheduleOutputDto } from '../../application/use-cases/set-weekly-schedule.use-case';
import { SetSpecificDateScheduleUseCase } from '../../application/use-cases/set-specific-date-schedule.use-case';
import { GetCourtSchedulesUseCase } from '../../application/use-cases/get-court-schedules.use-case';
import { SetWeeklyScheduleDto } from '../dtos/set-weekly-schedule.dto';
import { SetSpecialScheduleDto } from '../dtos/set-special-schedule.dto';
import { JwtAuthGuard } from '../../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../../common/guards/roles.guard';
import { Roles } from '../../../../common/decorators/roles.decorator';

@Controller('api/v1/admin/courts/:courtId/schedules')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AdminSchedulesController {
  constructor(
    private readonly setWeeklyScheduleUseCase: SetWeeklyScheduleUseCase,
    private readonly setSpecificDateScheduleUseCase: SetSpecificDateScheduleUseCase,
    private readonly getCourtSchedulesUseCase: GetCourtSchedulesUseCase,
  ) {}

  /**
   * @reference HU-ADM-13 Configurar horarios de atención semanales
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

  /**
   * @reference HU-ADM-14 Configurar disponibilidad especial
   */
  @Post('special')
  @Roles('ADMIN')
  @HttpCode(HttpStatus.CREATED)
  async setSpecialSchedule(
    @Param('courtId', ParseIntPipe) courtId: number,
    @Body() dto: SetSpecialScheduleDto,
  ): Promise<CourtScheduleOutputDto> {
    return this.setSpecificDateScheduleUseCase.execute({
      courtId,
      specificDate: dto.specificDate,
      openTime: dto.openTime,
      closeTime: dto.closeTime,
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
