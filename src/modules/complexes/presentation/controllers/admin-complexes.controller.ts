import {
  Controller,
  Post,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { CreateComplexUseCase, ComplexOutputDto } from '../../application/use-cases/create-complex.use-case';
import { CreateComplexDto } from '../dtos/create-complex.dto';
import { JwtAuthGuard } from '../../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../../common/guards/roles.guard';
import { Roles } from '../../../../common/decorators/roles.decorator';

@Controller('api/v1/admin/complexes')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AdminComplexesController {
  constructor(private readonly createComplexUseCase: CreateComplexUseCase) {}

  /**
   * @reference HU-ADM-03 Crear complejo deportivo
   */
  @Post()
  @Roles('ADMIN')
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateComplexDto): Promise<ComplexOutputDto> {
    return this.createComplexUseCase.execute(dto);
  }
}
