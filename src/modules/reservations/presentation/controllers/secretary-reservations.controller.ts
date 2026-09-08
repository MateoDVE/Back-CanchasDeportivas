import {
  Controller,
  Inject,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { IUserRepository, USER_REPOSITORY } from '../../../users/domain/repositories/user.repository.interface';
import { JwtAuthGuard } from '../../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../../common/guards/roles.guard';
import { Roles } from '../../../../common/decorators/roles.decorator';
import { CurrentUser, AuthenticatedUser } from '../../../../common/decorators/current-user.decorator';

import { GetDailyOperationalBoardUseCase } from '../../application/use-cases/get-daily-operational-board.use-case';
import { SearchReservationsUseCase } from '../../application/use-cases/search-reservations.use-case';
import { GetReservationDetailUseCase } from '../../application/use-cases/get-reservation-detail.use-case';
import { CreateManualReservationUseCase } from '../../application/use-cases/create-manual-reservation.use-case';
import { GetActiveTemporalReservationsUseCase } from '../../application/use-cases/get-active-temporal-reservations.use-case';
import { ReleaseExpiredReservationUseCase } from '../../application/use-cases/release-expired-reservation.use-case';
import { QuickSearchReservationUseCase } from '../../application/use-cases/quick-search-reservation.use-case';
import { AuthorizeEntryUseCase } from '../../application/use-cases/authorize-entry.use-case';
import { GetNoShowCandidatesUseCase } from '../../application/use-cases/get-no-show-candidates.use-case';
import { MarkNoShowAndReleaseUseCase } from '../../application/use-cases/mark-no-show-and-release.use-case';
import { CancelReservationUseCase } from '../../application/use-cases/cancel-reservation.use-case';
import { RescheduleReservationUseCase } from '../../application/use-cases/reschedule-reservation.use-case';

import { ManualReservationDto } from '../dtos/manual-reservation.dto';
import { RescheduleReservationDto } from '../dtos/reschedule-reservation.dto';

@Controller('api/v1/secretary')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SECRETARIA', 'ADMIN')
export class SecretaryReservationsController {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: IUserRepository,
    private readonly getDailyOperationalBoardUseCase: GetDailyOperationalBoardUseCase,
    private readonly searchReservationsUseCase: SearchReservationsUseCase,
    private readonly getReservationDetailUseCase: GetReservationDetailUseCase,
    private readonly createManualReservationUseCase: CreateManualReservationUseCase,
    private readonly getActiveTemporalReservationsUseCase: GetActiveTemporalReservationsUseCase,
    private readonly releaseExpiredReservationUseCase: ReleaseExpiredReservationUseCase,
    private readonly quickSearchReservationUseCase: QuickSearchReservationUseCase,
    private readonly authorizeEntryUseCase: AuthorizeEntryUseCase,
    private readonly getNoShowCandidatesUseCase: GetNoShowCandidatesUseCase,
    private readonly markNoShowAndReleaseUseCase: MarkNoShowAndReleaseUseCase,
    private readonly cancelReservationUseCase: CancelReservationUseCase,
    private readonly rescheduleReservationUseCase: RescheduleReservationUseCase,
  ) {}

  /**
   * @reference HU-SEC-02 Consultar panel operativo
   */
  @Get('clients/search')
  async searchClients(@Query('q') query = '') {
    if (query.trim().length < 2) return [];
    const clients = await this.users.searchClients(query.slice(0, 80));
    return clients.map(({ id, name, ci, phone, email }) => ({ id, name, ci, phone, email }));
  }

  @Get('operational-board')
  async getOperationalBoard(@Query('date') date?: string) {
    return this.getDailyOperationalBoardUseCase.execute(date);
  }

  /**
   * @reference HU-SEC-03 Consultar reservas
   */
  @Get('reservations')
  async searchReservations(
    @Query('date') date?: string,
    @Query('courtId') courtId?: string,
    @Query('complexId') complexId?: string,
    @Query('status') status?: string,
    @Query('clientId') clientId?: string,
  ) {
    return this.searchReservationsUseCase.execute({
      date,
      courtId: courtId ? parseInt(courtId, 10) : undefined,
      complexId: complexId ? parseInt(complexId, 10) : undefined,
      status,
      clientId,
    });
  }

  /**
   * @reference HU-SEC-11 Visualizar reservas temporales
   */
  @Get('reservations/temporal')
  async getActiveTemporal() {
    return this.getActiveTemporalReservationsUseCase.execute();
  }

  /**
   * @reference HU-SEC-17 Identificar cliente que no se presentó
   */
  @Get('reservations/no-show-candidates')
  async getNoShowCandidates(@Query('date') date?: string) {
    return this.getNoShowCandidatesUseCase.execute(date);
  }

  /**
   * @reference HU-SEC-13 Verificar reserva al ingreso (Búsqueda rápida por CI / ID)
   */
  @Get('checkin/search')
  async quickSearch(@Query('q') q: string) {
    return this.quickSearchReservationUseCase.execute(q);
  }

  /**
   * @reference HU-SEC-04 Consultar detalle de una reserva
   * @reference HU-SEC-14 Consultar saldo pendiente
   * @reference HU-SEC-24 Consultar información de contacto del cliente
   */
  @Get('reservations/:id')
  async getReservationDetail(@Param('id') id: string) {
    return this.getReservationDetailUseCase.execute(id);
  }

  /**
   * @reference HU-SEC-05 Crear reserva manual
   * @reference HU-SEC-06 Registrar reserva proveniente de WhatsApp
   */
  @Post('reservations/manual')
  @HttpCode(HttpStatus.CREATED)
  async createManual(
    @Body() dto: ManualReservationDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.createManualReservationUseCase.execute({
      clientId: dto.clientId,
      courtId: dto.courtId,
      reservationDate: dto.reservationDate,
      startTime: dto.startTime,
      endTime: dto.endTime,
      origin: dto.origin,
      secretaryId: user.id || (user as any).userId,
    });
  }

  /**
   * @reference HU-SEC-12 Liberar horario por expiración
   */
  @Post('reservations/:id/release-expired')
  @HttpCode(HttpStatus.OK)
  async releaseExpired(@Param('id') id: string) {
    return this.releaseExpiredReservationUseCase.execute(id);
  }

  /**
   * @reference HU-SEC-16 Autorizar ingreso a la cancha
   */
  @Post('reservations/:id/authorize-entry')
  @HttpCode(HttpStatus.OK)
  async authorizeEntry(@Param('id') id: string) {
    return this.authorizeEntryUseCase.execute(id);
  }

  /**
   * @reference HU-SEC-18 Liberar horario por inasistencia (No-Show)
   */
  @Post('reservations/:id/no-show')
  @HttpCode(HttpStatus.OK)
  async markNoShow(
    @Param('id') id: string,
    @Body('reason') reason: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.markNoShowAndReleaseUseCase.execute({
      reservationId: id,
      reason,
      secretaryId: user.id || (user as any).userId,
    });
  }

  /**
   * @reference HU-SEC-19 Gestionar cancelación de reserva
   */
  @Post('reservations/:id/cancel')
  @HttpCode(HttpStatus.OK)
  async cancelReservation(
    @Param('id') id: string,
    @Body('reason') reason: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.cancelReservationUseCase.execute({
      reservationId: id,
      cancelledByUserId: user.id || (user as any).userId,
      isStaff: true,
      reason: reason || 'Cancelado por secretaria',
    });
  }

  /**
   * @reference HU-SEC-20 Gestionar reprogramación
   */
  @Post('reservations/:id/reschedule')
  @HttpCode(HttpStatus.OK)
  async reschedule(
    @Param('id') id: string,
    @Body() dto: RescheduleReservationDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.rescheduleReservationUseCase.execute({
      reservationId: id,
      newDate: dto.newDate,
      newStartTime: dto.newStartTime,
      newEndTime: dto.newEndTime,
      newCourtId: dto.newCourtId,
      reason: dto.reason,
      handledBy: user.id || (user as any).userId,
    });
  }
}
