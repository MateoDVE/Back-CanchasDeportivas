import { Injectable, Inject } from '@nestjs/common';
import { IScheduleRepository, SCHEDULE_REPOSITORY, ScheduleConfigItem } from '../../domain/repositories/schedule.repository.interface';
import { ICourtRepository, COURT_REPOSITORY } from '../../../courts/domain/repositories/court.repository.interface';
import { EntityNotFoundException, ValidationException } from '../../../../common/domain/exceptions/domain.exception';
import { CourtSchedule } from '../../domain/entities/court-schedule.entity';

export interface SetWeeklyScheduleInput {
  courtId: number;
  schedules: ScheduleConfigItem[];
}

export interface CourtScheduleOutputDto {
  id: number;
  courtId: number;
  dayOfWeek: number | null;
  specificDate: string | null;
  openTime: string;
  closeTime: string;
}

/**
 * @reference HU-ADM-13 Configurar horarios de atención
 */
@Injectable()
export class SetWeeklyScheduleUseCase {
  constructor(
    @Inject(SCHEDULE_REPOSITORY)
    private readonly scheduleRepository: IScheduleRepository,
    @Inject(COURT_REPOSITORY)
    private readonly courtRepository: ICourtRepository,
  ) {}

  async execute(input: SetWeeklyScheduleInput): Promise<CourtScheduleOutputDto[]> {
    const court = await this.courtRepository.findById(input.courtId);
    if (!court) {
      throw new EntityNotFoundException(`La cancha con ID ${input.courtId} no existe.`);
    }

    if (!Array.isArray(input.schedules)) {
      throw new ValidationException('Debe proporcionar una lista de horarios de atención.');
    }

    // Validar cada elemento
    for (const item of input.schedules) {
      if (item.dayOfWeek < 1 || item.dayOfWeek > 7) {
        throw new ValidationException(`Día de la semana inválido: ${item.dayOfWeek}. Debe estar entre 1 y 7.`);
      }
      if (item.openTime >= item.closeTime) {
        throw new ValidationException(
          `Para el día ${item.dayOfWeek}, la hora de apertura (${item.openTime}) debe ser anterior al cierre (${item.closeTime}).`,
        );
      }
    }

    const savedSchedules = await this.scheduleRepository.setWeeklySchedules(
      input.courtId,
      input.schedules,
    );

    return savedSchedules.map((s) => ({
      id: s.id,
      courtId: s.courtId,
      dayOfWeek: s.dayOfWeek,
      specificDate: s.specificDate,
      openTime: s.openTime,
      closeTime: s.closeTime,
    }));
  }
}
