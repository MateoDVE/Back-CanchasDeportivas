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
import { CreateComplexUseCase, ComplexOutputDto } from '../../application/use-cases/create-complex.use-case';
import { UpdateComplexUseCase } from '../../application/use-cases/update-complex.use-case';
import { ToggleComplexStatusUseCase } from '../../application/use-cases/toggle-complex-status.use-case';
import { UpdateBusinessInfoUseCase } from '../../application/use-cases/update-business-info.use-case';
import { UploadComplexQrUseCase } from '../../application/use-cases/upload-complex-qr.use-case';
import { CreateComplexDto } from '../dtos/create-complex.dto';
import { UpdateComplexDto } from '../dtos/update-complex.dto';
import { UpdateBusinessInfoDto } from '../dtos/update-business-info.dto';
import { UploadComplexQrDto } from '../dtos/upload-qr.dto';
import { JwtAuthGuard } from '../../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../../common/guards/roles.guard';
import { Roles } from '../../../../common/decorators/roles.decorator';

@Controller('api/v1/admin')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AdminComplexesController {
  constructor(
    private readonly createComplexUseCase: CreateComplexUseCase,
    private readonly updateComplexUseCase: UpdateComplexUseCase,
    private readonly toggleComplexStatusUseCase: ToggleComplexStatusUseCase,
    private readonly updateBusinessInfoUseCase: UpdateBusinessInfoUseCase,
    private readonly uploadComplexQrUseCase: UploadComplexQrUseCase,
  ) {}

  /**
   * @reference HU-ADM-03 Crear complejo deportivo
   */
  @Post('complexes')
  @Roles('ADMIN')
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateComplexDto): Promise<ComplexOutputDto> {
    return this.createComplexUseCase.execute(dto);
  }

  /**
   * @reference HU-ADM-04 Editar complejo deportivo
   */
  @Put('complexes/:id')
  @Roles('ADMIN')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateComplexDto,
  ): Promise<ComplexOutputDto> {
    return this.updateComplexUseCase.execute({ id, ...dto });
  }

  /**
   * @reference HU-ADM-05 Habilitar o deshabilitar complejo
   */
  @Patch('complexes/:id/toggle')
  @Roles('ADMIN')
  async toggle(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<ComplexOutputDto> {
    return this.toggleComplexStatusUseCase.execute(id);
  }

  /**
   * @reference HU-ADM-24 Configurar información del establecimiento
   */
  @Put('business-info')
  @Roles('ADMIN')
  async updateBusinessInfo(
    @Body() dto: UpdateBusinessInfoDto,
  ): Promise<ComplexOutputDto> {
    return this.updateBusinessInfoUseCase.execute(dto);
  }

  /**
   * @reference HU-ADM-25 Configurar código QR de pago
   */
  @Post('complexes/:id/qr')
  @Roles('ADMIN')
  async uploadQr(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UploadComplexQrDto,
  ): Promise<ComplexOutputDto> {
    return this.uploadComplexQrUseCase.execute({
      complexId: id,
      paymentQrUrl: dto.paymentQrUrl,
    });
  }
}
