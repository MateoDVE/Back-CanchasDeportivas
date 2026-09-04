import { Injectable, Inject } from '@nestjs/common';
import { IScheduleRepository, SCHEDULE_REPOSITORY } from '../../domain/repositories/schedule.repository.interface';
import { ICourtRepository, COURT_REPOSITORY } from '../../../courts/domain/repositories/court.repository.interface';
import { EntityNotFoundException } from '../../../../common/domain/exceptions/domain.exception';
import { CourtScheduleOutputDto } from './set-weekly-schedule.use-case';

@Injectable()
export class GetCourtSchedulesUseCase {
  constructor(
    @Inject(SCHEDULE_REPOSITORY)
    private readonly scheduleRepository: IScheduleRepository,
    @Inject(COURT_REPOSITORY)
    private readonly courtRepository: ICourtRepository,
  ) {}

  async execute(courtId: number): Promise<CourtScheduleOutputDto[]> {
    const court = await this.courtRepository.findById(courtId);
    if (!court) {
      throw new EntityNotFoundException(`La cancha con ID ${courtId} no existe.`);
    }

    const schedules = await this.scheduleRepository.getWeeklySchedules(courtId);
    return schedules.map((s) => ({
      id: s.id,
      courtId: s.courtId,
      dayOfWeek: s.dayOfWeek,
      specificDate: s.specificDate,
      openTime: s.openTime,
      closeTime: s.closeTime,
    }));
  }
}
