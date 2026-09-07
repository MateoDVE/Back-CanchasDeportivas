import {
  Controller,
  Get,
  Post,
  Body,
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

import { RejectAdvancePaymentUseCase } from '../../application/use-cases/reject-advance-payment.use-case';
import { RegisterFinalPaymentUseCase } from '../../application/use-cases/register-final-payment.use-case';
import { RegisterRefundExceptionUseCase } from '../../application/use-cases/register-refund-exception.use-case';
import { FinalPaymentDto } from '../dtos/final-payment.dto';
import { RefundExceptionDto } from '../dtos/refund-exception.dto';

@Controller('api/v1/secretary')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SECRETARIA', 'ADMIN')
export class SecretaryPaymentsController {
  constructor(
    private readonly getPendingPaymentsUseCase: GetPendingPaymentsUseCase,
    private readonly validateAdvancePaymentUseCase: ValidateAdvancePaymentUseCase,
    private readonly rejectAdvancePaymentUseCase: RejectAdvancePaymentUseCase,
    private readonly registerFinalPaymentUseCase: RegisterFinalPaymentUseCase,
    private readonly registerRefundExceptionUseCase: RegisterRefundExceptionUseCase,
  ) {}

  /**
   * @reference HU-SEC-07 Consultar solicitudes pendientes
   * @reference HU-SEC-08 Visualizar comprobante
   */
  @Get('payments/pending')
  async getPendingPayments(): Promise<PendingPaymentItemDto[]> {
    return this.getPendingPaymentsUseCase.execute();
  }

  /**
   * @reference HU-SEC-09 Validar anticipo
   */
  @Post('payments/:id/validate')
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

  /**
   * @reference HU-SEC-10 Rechazar comprobante
   */
  @Post('payments/:id/reject')
  @HttpCode(HttpStatus.OK)
  async rejectPayment(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
    @Body('reason') reason: string,
  ) {
    return this.rejectAdvancePaymentUseCase.execute({
      paymentId: id,
      secretaryId: user.id,
      reason,
    });
  }

  /**
   * @reference HU-SEC-15 Registrar pago restante (Simulado)
   */
  @Post('reservations/:id/final-payment')
  @HttpCode(HttpStatus.CREATED)
  async registerFinalPayment(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') reservationId: string,
    @Body() dto: FinalPaymentDto,
  ) {
    return this.registerFinalPaymentUseCase.execute({
      reservationId,
      amount: dto.amount,
      paymentMethod: dto.paymentMethod,
      secretaryId: user.id,
    });
  }

  /**
   * @reference HU-SEC-21 Gestionar excepciones de devolución
   */
  @Post('reservations/:id/refund-exception')
  @HttpCode(HttpStatus.CREATED)
  async registerRefundException(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') reservationId: string,
    @Body() dto: RefundExceptionDto,
  ) {
    return this.registerRefundExceptionUseCase.execute({
      reservationId,
      amount: dto.amount,
      reason: dto.reason,
      authorizedBy: dto.authorizedBy,
      secretaryId: user.id,
    });
  }
}
