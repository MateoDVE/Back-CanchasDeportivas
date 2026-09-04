import {
  Controller,
  Post,
  Patch,
  Body,
  Param,
  ParseIntPipe,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { CreateCourtUseCase, CourtOutputDto } from '../../application/use-cases/create-court.use-case';
import { UpdateCourtPriceUseCase } from '../../application/use-cases/update-court-price.use-case';
import { CreateCourtDto } from '../dtos/create-court.dto';
import { UpdateCourtPriceDto } from '../dtos/update-court-price.dto';
import { JwtAuthGuard } from '../../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../../common/guards/roles.guard';
import { Roles } from '../../../../common/decorators/roles.decorator';

@Controller('api/v1/admin/courts')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AdminCourtsController {
  constructor(
    private readonly createCourtUseCase: CreateCourtUseCase,
    private readonly updateCourtPriceUseCase: UpdateCourtPriceUseCase,
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
}
