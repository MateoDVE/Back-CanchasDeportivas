import { Injectable, Inject } from '@nestjs/common';
import {
  ICourtRepository,
  COURT_REPOSITORY,
} from '../../domain/repositories/court.repository.interface';
export interface CourtTypeDescription {
  type: string;
  description: string;
}
/** @reference HU-CLI-06 Catálogo extensible sin cambiar el esquema de canchas. */
@Injectable()
export class GetCourtTypesUseCase {
  constructor(
    @Inject(COURT_REPOSITORY) private readonly courts: ICourtRepository,
  ) {}
  execute(): Promise<CourtTypeDescription[]> {
    return this.courts.findTypes();
  }
}
