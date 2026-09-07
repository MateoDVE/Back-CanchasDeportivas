import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ManageStaffUseCase, StaffOutputDto } from '../../application/use-cases/manage-staff.use-case';
import { CreateStaffDto } from '../dtos/create-staff.dto';
import { UpdateStaffStatusDto } from '../dtos/update-staff-status.dto';
import { JwtAuthGuard } from '../../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../../common/guards/roles.guard';
import { Roles } from '../../../../common/decorators/roles.decorator';

@Controller('api/v1/admin/staff')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AdminStaffController {
  constructor(private readonly manageStaffUseCase: ManageStaffUseCase) {}

  /**
   * @reference HU-ADM-02 Gestionar acceso de usuarios internos (Crear personal)
   */
  @Post()
  @Roles('ADMIN')
  @HttpCode(HttpStatus.CREATED)
  async createStaff(@Body() dto: CreateStaffDto): Promise<StaffOutputDto> {
    return this.manageStaffUseCase.createStaff(dto);
  }

  /**
   * @reference HU-ADM-02 Gestionar acceso de usuarios internos (Listar personal)
   */
  @Get()
  @Roles('ADMIN')
  async listStaff(): Promise<StaffOutputDto[]> {
    return this.manageStaffUseCase.listStaff();
  }

  /**
   * @reference HU-ADM-02 Gestionar acceso de usuarios internos (Habilitar/Deshabilitar)
   */
  @Patch(':id/status')
  @Roles('ADMIN')
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateStaffStatusDto,
  ): Promise<StaffOutputDto> {
    return this.manageStaffUseCase.updateStatus(id, dto.status);
  }
}
