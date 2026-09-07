import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { UploadReceiptUseCase, UploadReceiptOutputDto } from '../../application/use-cases/upload-receipt.use-case';
import { UploadReceiptDto } from '../dtos/upload-receipt.dto';
import { JwtAuthGuard } from '../../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../../common/guards/roles.guard';
import { Roles } from '../../../../common/decorators/roles.decorator';
import { CurrentUser, AuthenticatedUser } from '../../../../common/decorators/current-user.decorator';

import { GetPaymentStatusUseCase } from '../../application/use-cases/get-payment-status.use-case';

@Controller('api/v1/payments')
export class PaymentsController {
  constructor(
    private readonly uploadReceiptUseCase: UploadReceiptUseCase,
    private readonly getPaymentStatusUseCase: GetPaymentStatusUseCase,
  ) {}

  /**
   * @reference HU-CLI-16 Adjuntar comprobante
   */
  @Post(':reservationId/receipt')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('CLIENTE', 'ADMIN', 'SECRETARIA')
  @HttpCode(HttpStatus.OK)
  async uploadReceipt(
    @CurrentUser() user: AuthenticatedUser,
    @Param('reservationId') reservationId: string,
    @Body() dto: UploadReceiptDto,
  ): Promise<UploadReceiptOutputDto> {
    return this.uploadReceiptUseCase.execute({
      reservationId,
      clientId: user.id,
      userRole: user.role,
      receiptImageUrl: dto.receiptImageUrl,
    });
  }

  /**
   * @reference HU-CLI-17 Consultar estado del pago
   */
  @Get(':reservationId/status')
  @UseGuards(JwtAuthGuard)
  async getPaymentStatus(
    @Param('reservationId') reservationId: string,
  ) {
    return this.getPaymentStatusUseCase.execute(reservationId);
  }
}
