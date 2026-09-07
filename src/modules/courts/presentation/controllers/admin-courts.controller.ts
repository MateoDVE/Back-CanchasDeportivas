import {
  Controller,
  Post,
  Put,
  Patch,
  Body,
  Param,
  ParseIntPipe,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { CreateCourtUseCase, CourtOutputDto } from '../../application/use-cases/create-court.use-case';
import { UpdateCourtUseCase } from '../../application/use-cases/update-court.use-case';
import { UpdateCourtPriceUseCase } from '../../application/use-cases/update-court-price.use-case';
import { ToggleCourtStatusUseCase } from '../../application/use-cases/toggle-court-status.use-case';
import { ScheduleMaintenanceUseCase, IncidentOutputDto } from '../../application/use-cases/schedule-maintenance.use-case';
import { RegisterIncidentUseCase } from '../../application/use-cases/register-incident.use-case';
import { CreateCourtDto } from '../dtos/create-court.dto';
import { UpdateCourtDto } from '../dtos/update-court.dto';
import { UpdateCourtPriceDto } from '../dtos/update-court-price.dto';
import { ScheduleMaintenanceDto } from '../dtos/schedule-maintenance.dto';
import { RegisterIncidentDto } from '../dtos/register-incident.dto';
import { JwtAuthGuard } from '../../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../../common/guards/roles.guard';
import { Roles } from '../../../../common/decorators/roles.decorator';

@Controller('api/v1/admin/courts')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AdminCourtsController {
  constructor(
    private readonly createCourtUseCase: CreateCourtUseCase,
    private readonly updateCourtUseCase: UpdateCourtUseCase,
    private readonly updateCourtPriceUseCase: UpdateCourtPriceUseCase,
    private readonly toggleCourtStatusUseCase: ToggleCourtStatusUseCase,
    private readonly scheduleMaintenanceUseCase: ScheduleMaintenanceUseCase,
    private readonly registerIncidentUseCase: RegisterIncidentUseCase,
  ) {}

  /**
   * @reference HU-ADM-06 Registrar cancha
   */
  @Post()
  @Roles('ADMIN')
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateCourtDto): Promise<CourtOutputDto> {
    return this.createCourtUseCase.execute(dto);
  }

  /**
   * @reference HU-ADM-07 Editar cancha
   */
  @Put(':id')
  @Roles('ADMIN')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCourtDto,
  ): Promise<CourtOutputDto> {
    return this.updateCourtUseCase.execute({ id, ...dto });
  }

  /**
   * @reference HU-ADM-08 Configurar precio por hora
   */
  @Patch(':id/price')
  @Roles('ADMIN')
  @HttpCode(HttpStatus.OK)
  async updatePrice(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCourtPriceDto,
  ): Promise<CourtOutputDto> {
    return this.updateCourtPriceUseCase.execute({
      courtId: id,
      newPricePerHour: dto.pricePerHour,
    });
  }

  /**
   * @reference HU-ADM-09 Habilitar o deshabilitar cancha
   */
  @Patch(':id/toggle')
  @Roles('ADMIN')
  async toggle(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<CourtOutputDto> {
    return this.toggleCourtStatusUseCase.execute(id);
  }

  /**
   * @reference HU-ADM-10 Programar mantenimiento
   */
  @Post(':id/incidents')
  @Roles('ADMIN')
  @HttpCode(HttpStatus.CREATED)
  async scheduleMaintenance(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ScheduleMaintenanceDto,
  ): Promise<IncidentOutputDto> {
    return this.scheduleMaintenanceUseCase.execute({
      courtId: id,
      startDatetime: dto.startDatetime,
      endDatetime: dto.endDatetime,
      reason: dto.reason,
    });
  }

  /**
   * @reference HU-ADM-11 Inhabilitar cancha por incidente inmediato
   */
  @Post(':id/incidents/immediate')
  @Roles('ADMIN')
  @HttpCode(HttpStatus.CREATED)
  async registerIncident(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: RegisterIncidentDto,
  ): Promise<IncidentOutputDto> {
    return this.registerIncidentUseCase.execute({
      courtId: id,
      reason: dto.reason,
      durationHours: dto.durationHours,
    });
  }
}
