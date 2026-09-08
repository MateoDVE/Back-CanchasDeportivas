import { validate } from 'class-validator';
import { CreateManualReservationUseCase, WALK_IN_CLIENT_ID } from './create-manual-reservation.use-case';
import { ManualReservationDto } from '../../presentation/dtos/manual-reservation.dto';
import { User } from '../../../users/domain/entities/user.entity';

describe('Manual reservations with optional client', () => {
  const input = { courtId: 1, reservationDate: '2026-09-10', startTime: '18:00', endTime: '19:00', secretaryId: 'staff' };
  let users: Map<string, User>;
  let repository: any;
  let reservations: any;
  let useCase: CreateManualReservationUseCase;

  beforeEach(() => {
    users = new Map();
    repository = {
      findById: jest.fn(async (id: string) => users.get(id) || null),
      save: jest.fn(async (user: User) => { users.set(user.id, user); }),
    };
    reservations = { findConflicting: jest.fn().mockResolvedValue([]), save: jest.fn() };
    useCase = new CreateManualReservationUseCase({ findByCourt: async () => [] } as any, reservations, {
      findById: jest.fn().mockResolvedValue({ isActive: true, pricePerHour: 100 }),
    } as any, repository);
  });

  it('accepts the manual reservation payload without clientId', async () => {
    expect(await validate(Object.assign(new ManualReservationDto(), input))).toHaveLength(0);
  });

  it('creates and reuses a disabled internal client for walk-ins', async () => {
    const first = await useCase.execute(input);
    const second = await useCase.execute(input);
    expect(first.clientId).toBe(WALK_IN_CLIENT_ID);
    expect(second.clientId).toBe(WALK_IN_CLIENT_ID);
    expect(repository.save).toHaveBeenCalledTimes(1);
    expect(users.get(WALK_IN_CLIENT_ID)?.isActive()).toBe(false);
  });

  it('associates the selected active customer without creating a generic one', async () => {
    users.set('client', new User('client', 'Ana', 'ana@example.com', '70000000', '123', 'hash', 'CLIENTE'));
    expect((await useCase.execute({ ...input, clientId: 'client' })).clientId).toBe('client');
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('rejects invalid or staff clients instead of silently using the generic client', async () => {
    await expect(useCase.execute({ ...input, clientId: 'missing' })).rejects.toThrow('cliente activo');
    users.set('staff', new User('staff', 'Admin', 'admin@example.com', '', '', '', 'ADMIN'));
    await expect(useCase.execute({ ...input, clientId: 'staff' })).rejects.toThrow('cliente activo');
    expect(reservations.save).not.toHaveBeenCalled();
  });

  it('keeps rejecting occupied slots without creating a generic client', async () => {
    reservations.findConflicting.mockResolvedValue([{}]);
    await expect(useCase.execute(input)).rejects.toThrow('ocupado');
    expect(repository.save).not.toHaveBeenCalled();
    expect(reservations.save).not.toHaveBeenCalled();
  });
});
