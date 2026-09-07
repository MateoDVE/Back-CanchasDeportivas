import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  ParseIntPipe,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { GetCourtAvailabilityUseCase, CourtAvailabilityOutputDto } from '../../application/use-cases/get-court-availability.use-case';
import { CreateTemporalReservationUseCase, TemporalReservationOutputDto } from '../../application/use-cases/create-temporal-reservation.use-case';
import { GetReservationSummaryUseCase, ReservationSummaryOutputDto } from '../../application/use-cases/get-reservation-summary.use-case';
import { GetReservationStatusUseCase, ReservationStatusOutputDto } from '../../application/use-cases/get-reservation-status.use-case';
import { GetClientReservationsUseCase, ClientReservationsGroupedOutputDto } from '../../application/use-cases/get-client-reservations.use-case';
import { CreateReservationRequestDto } from '../dtos/create-reservation.request.dto';
import { JwtAuthGuard } from '../../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../../common/guards/roles.guard';
import { Roles } from '../../../../common/decorators/roles.decorator';
import { CurrentUser, AuthenticatedUser } from '../../../../common/decorators/current-user.decorator';
import { Public } from '../../../../common/decorators/public.decorator';

import { GetCourtCalendarMonthUseCase } from '../../application/use-cases/get-court-calendar-month.use-case';
import { GetReservationDetailUseCase } from '../../application/use-cases/get-reservation-detail.use-case';
import { CancelReservationUseCase } from '../../application/use-cases/cancel-reservation.use-case';
import { GetCancellationPolicyUseCase } from '../../application/use-cases/get-cancellation-policy.use-case';
import { GetRescheduleInfoUseCase } from '../../application/use-cases/get-reschedule-info.use-case';
import { GetReservationBalanceUseCase } from '../../application/use-cases/get-reservation-balance.use-case';

@Controller('api/v1')
export class ReservationsController {
  constructor(
    private readonly getCourtAvailabilityUseCase: GetCourtAvailabilityUseCase,
    private readonly createTemporalReservationUseCase: CreateTemporalReservationUseCase,
    private readonly getReservationSummaryUseCase: GetReservationSummaryUseCase,
    private readonly getReservationStatusUseCase: GetReservationStatusUseCase,
    private readonly getClientReservationsUseCase: GetClientReservationsUseCase,
    private readonly getCourtCalendarMonthUseCase: GetCourtCalendarMonthUseCase,
    private readonly getReservationDetailUseCase: GetReservationDetailUseCase,
    private readonly cancelReservationUseCase: CancelReservationUseCase,
    private readonly getCancellationPolicyUseCase: GetCancellationPolicyUseCase,
    private readonly getRescheduleInfoUseCase: GetRescheduleInfoUseCase,
    private readonly getReservationBalanceUseCase: GetReservationBalanceUseCase,
  ) {}

  /**
   * @reference HU-CLI-08 Consultar disponibilidad por fecha
   */
  @Public()
  @Get('courts/:courtId/availability')
  async getAvailability(
    @Param('courtId', ParseIntPipe) courtId: number,
    @Query('date') date: string,
  ): Promise<CourtAvailabilityOutputDto> {
    return this.getCourtAvailabilityUseCase.execute(courtId, date);
  }

  /**
   * @reference HU-CLI-09 Consultar calendario mensual de la cancha
   */
  @Public()
  @Get('courts/:courtId/calendar-month')
  async getCalendarMonth(
    @Param('courtId', ParseIntPipe) courtId: number,
    @Query('year') year: string,
    @Query('month') month: string,
  ) {
    const y = year ? parseInt(year, 10) : new Date().getFullYear();
    const m = month ? parseInt(month, 10) : new Date().getMonth() + 1;
    return this.getCourtCalendarMonthUseCase.execute(courtId, y, m);
  }

  /**
   * @reference HU-CLI-10 Seleccionar horario
   * @reference HU-CLI-11 Solicitar reserva
   * @reference HU-CLI-12 Bloqueo temporal del horario (los 5 minutos)
   */
  @Post('reservations')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('CLIENTE', 'ADMIN', 'SECRETARIA')
  @HttpCode(HttpStatus.CREATED)
  async createTemporal(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateReservationRequestDto,
  ): Promise<TemporalReservationOutputDto> {
    return this.createTemporalReservationUseCase.execute({
      clientId: user.id,
      courtId: dto.courtId,
      date: dto.date,
      startTime: dto.startTime,
      endTime: dto.endTime,
    });
  }

  /**
   * @reference HU-CLI-13 Consultar resumen de reserva
   * @reference HU-CLI-14 Consultar anticipo requerido (desglose 25% y 75%)
   */
  @Get('reservations/:id/summary')
  @UseGuards(JwtAuthGuard)
  async getSummary(
    @Param('id') id: string,
  ): Promise<ReservationSummaryOutputDto> {
    return this.getReservationSummaryUseCase.execute(id);
  }

  /**
   * @reference HU-CLI-18 Consultar estado de reserva
   */
  @Get('reservations/:id/status')
  @UseGuards(JwtAuthGuard)
  async getStatus(
    @Param('id') id: string,
  ): Promise<ReservationStatusOutputDto> {
    return this.getReservationStatusUseCase.execute(id);
  }

  /**
   * @reference HU-CLI-20 Consultar detalle de reserva
   */
  @Get('reservations/:id')
  @UseGuards(JwtAuthGuard)
  async getDetail(@Param('id') id: string) {
    return this.getReservationDetailUseCase.execute(id);
  }

  /**
   * @reference HU-CLI-24 Consultar saldo pendiente
   */
  @Get('reservations/:id/balance')
  @UseGuards(JwtAuthGuard)
  async getBalance(@Param('id') id: string) {
    return this.getReservationBalanceUseCase.execute(id);
  }

  /**
   * @reference HU-CLI-23 Consultar información de reprogramación
   */
  @Get('reservations/:id/reschedule-info')
  @UseGuards(JwtAuthGuard)
  async getRescheduleInfo(@Param('id') id: string) {
    return this.getRescheduleInfoUseCase.execute(id);
  }

  /**
   * @reference HU-CLI-21 Solicitar cancelación de reserva
   */
  @Post('reservations/:id/cancel')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async cancel(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body('reason') reason?: string,
  ) {
    return this.cancelReservationUseCase.execute({
      reservationId: id,
      cancelledByUserId: user.id,
      isStaff: false,
      reason,
    });
  }

  /**
   * @reference HU-CLI-22 Consultar política de cancelación
   */
  @Public()
  @Get('policies/cancellation')
  getCancellationPolicy() {
    return this.getCancellationPolicyUseCase.execute();
  }

  /**
   * @reference HU-CLI-19 Consultar mis reservas
   */
  @Get('client/my-reservations')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('CLIENTE', 'ADMIN')
  async getMyReservations(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ClientReservationsGroupedOutputDto> {
    return this.getClientReservationsUseCase.execute(user.id);
  }
}
