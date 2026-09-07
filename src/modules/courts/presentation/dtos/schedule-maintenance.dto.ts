import { IsDateString, IsNotEmpty, IsString } from 'class-validator';

export class ScheduleMaintenanceDto {
  @IsDateString({}, { message: 'La fecha de inicio debe ser un ISO string válido' })
  @IsNotEmpty()
  startDatetime: string;

  @IsDateString({}, { message: 'La fecha de fin debe ser un ISO string válido' })
  @IsNotEmpty()
  endDatetime: string;

  @IsString()
  @IsNotEmpty({ message: 'El motivo es obligatorio' })
  reason: string;
}
