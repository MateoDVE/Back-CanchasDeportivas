import { Injectable, Inject } from '@nestjs/common';
import { IScheduleRepository, SCHEDULE_REPOSITORY } from '../../domain/repositories/schedule.repository.interface';
import { ICourtRepository, COURT_REPOSITORY } from '../../../courts/domain/repositories/court.repository.interface';
import { EntityNotFoundException, ValidationException } from '../../../../common/domain/exceptions/domain.exception';
import { CourtScheduleOutputDto } from './set-weekly-schedule.use-case';

export interface SetSpecificDateScheduleInput {
  courtId: number;
  specificDate: string; // YYYY-MM-DD
  openTime: string;     // HH:mm
  closeTime: string;    // HH:mm
}

/**
 * @reference HU-ADM-14 Configurar disponibilidad especial
 */
@Injectable()
export class SetSpecificDateScheduleUseCase {
  constructor(
    @Inject(SCHEDULE_REPOSITORY)
    private readonly scheduleRepository: IScheduleRepository,
    @Inject(COURT_REPOSITORY)
    private readonly courtRepository: ICourtRepository,
  ) {}

  async execute(input: SetSpecificDateScheduleInput): Promise<CourtScheduleOutputDto> {
    const court = await this.courtRepository.findById(input.courtId);
    if (!court) {
      throw new EntityNotFoundException(`La cancha con ID ${input.courtId} no existe.`);
    }

    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(input.specificDate)) {
      throw new ValidationException('El formato de fecha específica debe ser YYYY-MM-DD.');
    }

    if (input.openTime >= input.closeTime) {
      throw new ValidationException(
        `La hora de apertura (${input.openTime}) debe ser anterior al cierre (${input.closeTime}).`,
      );
    }

    const saved = await this.scheduleRepository.setSpecificDateSchedule(
      input.courtId,
      input.specificDate,
      input.openTime,
      input.closeTime,
    );

    return {
      id: saved.id,
      courtId: saved.courtId,
      dayOfWeek: saved.dayOfWeek,
      specificDate: saved.specificDate,
      openTime: saved.openTime,
      closeTime: saved.closeTime,
    };
  }
}
