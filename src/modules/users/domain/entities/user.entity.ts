import { UserRole } from '../../../../common/decorators/roles.decorator';

export type UserStatus = 'ACTIVE' | 'INACTIVE' | 'PENDING_VERIFICATION';

export class User {
  constructor(
    public readonly id: string,
    public name: string,
    public email: string,
    public phone: string,
    public ci: string,
    public passwordHash: string,
    public role: UserRole,
    public status: UserStatus = 'ACTIVE',
    public readonly createdAt: Date = new Date(),
  ) {}

  public isActive(): boolean {
    return this.status === 'ACTIVE';
  }

  public activate(): void {
    this.status = 'ACTIVE';
  }

  public deactivate(): void {
    this.status = 'INACTIVE';
  }
}
