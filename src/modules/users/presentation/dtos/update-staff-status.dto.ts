import { IsIn } from 'class-validator';
import { UserStatus } from '../../domain/entities/user.entity';

export class UpdateStaffStatusDto {
  @IsIn(['ACTIVE', 'INACTIVE'], { message: 'El estado debe ser ACTIVE o INACTIVE' })
  status: UserStatus;
}
