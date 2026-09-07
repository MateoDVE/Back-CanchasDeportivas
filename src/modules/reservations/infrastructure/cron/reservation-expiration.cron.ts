import { Injectable, Inject, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import {
  IReservationRepository,
  RESERVATION_REPOSITORY,
} from '../../domain/repositories/reservation.repository.interface';

@Injectable()
export class ReservationExpirationCron {
  private readonly logger = new Logger(ReservationExpirationCron.name);

  constructor(
    @Inject(RESERVATION_REPOSITORY)
    private readonly reservationRepository: IReservationRepository,
  ) {}

  @Cron(CronExpression.EVERY_30_SECONDS)
  async releaseExpired(): Promise<void> {
    try {
      const releasedCount = await this.reservationRepository.releaseExpiredReservations();
      if (releasedCount > 0) {
        this.logger.log(`Liberadas ${releasedCount} reservas temporales expiradas (bloqueo de 5 min).`);
      }
    } catch (error) {
      this.logger.error(`Error al ejecutar cron de expiración de reservas: ${error}`);
    }
  }
}
