import {
  Controller,
  Get,
  Post,
  Param,
  ParseIntPipe,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { GetPendingPaymentsUseCase, PendingPaymentItemDto } from '../../application/use-cases/get-pending-payments.use-case';
import { ValidateAdvancePaymentUseCase, ValidateAdvancePaymentOutputDto } from '../../application/use-cases/validate-advance-payment.use-case';
import { JwtAuthGuard } from '../../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../../common/guards/roles.guard';
import { Roles } from '../../../../common/decorators/roles.decorator';
import { CurrentUser, AuthenticatedUser } from '../../../../common/decorators/current-user.decorator';

@Controller('api/v1/secretary/payments')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SecretaryPaymentsController {
  constructor(
    private readonly getPendingPaymentsUseCase: GetPendingPaymentsUseCase,
    private readonly validateAdvancePaymentUseCase: ValidateAdvancePaymentUseCase,
  ) {}

  /**
   * @reference HU-SEC-07 Consultar solicitudes pendientes
   * @reference HU-SEC-08 Visualizar comprobante
   */
  @Get('pending')
  @Roles('SECRETARIA', 'ADMIN')
  async getPendingPayments(): Promise<PendingPaymentItemDto[]> {
    return this.getPendingPaymentsUseCase.execute();
  }

  /**
   * @reference HU-SEC-09 Validar anticipo
   */
  @Post(':id/validate')
  @Roles('SECRETARIA', 'ADMIN')
  @HttpCode(HttpStatus.OK)
  async validatePayment(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<ValidateAdvancePaymentOutputDto> {
    return this.validateAdvancePaymentUseCase.execute({
      paymentId: id,
      secretaryId: user.id,
    });
  }
}
