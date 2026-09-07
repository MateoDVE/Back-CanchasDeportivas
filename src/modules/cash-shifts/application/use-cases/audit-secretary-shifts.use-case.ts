import { Injectable, Inject } from '@nestjs/common';
import {
  ICashShiftRepository,
  CASH_SHIFT_REPOSITORY,
} from '../../domain/repositories/cash-shift.repository.interface';
import {
  IUserRepository,
  USER_REPOSITORY,
} from '../../../users/domain/repositories/user.repository.interface';
import { CashShift } from '../../domain/entities/cash-shift.entity';

export interface AuditShiftItemDto {
  shift: CashShift;
  secretaryName: string;
  secretaryEmail: string;
}

/**
 * @reference HU-ADM-19 Supervisar ingresos de secretaria
 */
@Injectable()
export class AuditSecretaryShiftsUseCase {
  constructor(
    @Inject(CASH_SHIFT_REPOSITORY)
    private readonly cashShiftRepository: ICashShiftRepository,
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
  ) {}

  async execute(filters: {
    startDate?: string;
    endDate?: string;
    secretaryId?: string;
  }): Promise<AuditShiftItemDto[]> {
    let shifts: CashShift[];
    if (filters.startDate && filters.endDate) {
      shifts = await this.cashShiftRepository.findByDateRange(
        filters.startDate,
        filters.endDate,
      );
    } else {
      shifts = await this.cashShiftRepository.findAll();
    }

    if (filters.secretaryId) {
      shifts = shifts.filter((s) => s.secretaryId === filters.secretaryId);
    }

    const allUsers = await this.userRepository.findAll();
    const userMap = new Map(allUsers.map((u) => [u.id, u]));

    return shifts.map((shift) => {
      const u = userMap.get(shift.secretaryId);
      return {
        shift,
        secretaryName: u ? u.name : shift.secretaryId,
        secretaryEmail: u ? u.email : '',
      };
    });
  }
}
