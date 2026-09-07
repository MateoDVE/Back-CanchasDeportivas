import { Injectable, Inject } from '@nestjs/common';
import {
  IReservationRepository,
  RESERVATION_REPOSITORY,
} from '../../domain/repositories/reservation.repository.interface';
import {
  IComplexRepository,
  COMPLEX_REPOSITORY,
} from '../../../complexes/domain/repositories/complex.repository.interface';
import {
  ICourtRepository,
  COURT_REPOSITORY,
} from '../../../courts/domain/repositories/court.repository.interface';

export interface CourtCalendarGridDto {
  courtId: number;
  courtName: string;
  courtType: string;
  pricePerHour: number;
  isActive: boolean;
  reservations: {
    id: string;
    startTime: string;
    endTime: string;
    status: string;
    clientId: string;
    isEntryAuthorized: boolean;
    pendingBalance: number;
  }[];
}

export interface ComplexCalendarGridDto {
  complexId: number;
  complexName: string;
  courts: CourtCalendarGridDto[];
}

export interface MasterCalendarGridResponse {
  date: string;
  complexes: ComplexCalendarGridDto[];
}

/**
 * @reference HU-ADM-16 Consultar calendario general (Master Grid)
 */
@Injectable()
export class GetMasterCalendarGridUseCase {
  constructor(
    @Inject(RESERVATION_REPOSITORY)
    private readonly reservationRepository: IReservationRepository,
    @Inject(COMPLEX_REPOSITORY)
    private readonly complexRepository: IComplexRepository,
    @Inject(COURT_REPOSITORY)
    private readonly courtRepository: ICourtRepository,
  ) {}

  async execute(date?: string): Promise<MasterCalendarGridResponse> {
    const targetDate = date || new Date().toISOString().split('T')[0];

    const complexes = await this.complexRepository.findAll(false);
    const dayReservations = await this.reservationRepository.findByDateRange(
      targetDate,
      targetDate,
    );

    const resultComplexes: ComplexCalendarGridDto[] = [];

    for (const complex of complexes) {
      const courts = await this.courtRepository.findByComplex(complex.id, false);
      const courtDtos: CourtCalendarGridDto[] = courts.map((court) => {
        const reservations = dayReservations
          .filter((r) => r.courtId === court.id)
          .map((r) => ({
            id: r.id,
            startTime: r.startTime,
            endTime: r.endTime,
            status: r.status,
            clientId: r.clientId,
            isEntryAuthorized: r.isEntryAuthorized,
            pendingBalance: r.pendingBalance,
          }));

        return {
          courtId: court.id,
          courtName: court.name,
          courtType: court.courtType,
          pricePerHour: court.pricePerHour,
          isActive: court.isActive,
          reservations,
        };
      });

      resultComplexes.push({
        complexId: complex.id,
        complexName: complex.name,
        courts: courtDtos,
      });
    }

    return {
      date: targetDate,
      complexes: resultComplexes,
    };
  }
}
