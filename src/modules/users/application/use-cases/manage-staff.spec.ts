import { ManageStaffUseCase } from './manage-staff.use-case';
import { InMemoryUserRepository } from '../../infrastructure/repositories/in-memory-user.repository';
import {
  ConflictException,
  EntityNotFoundException,
  ValidationException,
} from '../../../../common/domain/exceptions/domain.exception';
import { User } from '../../domain/entities/user.entity';

describe('Gestión de personal y búsqueda de clientes', () => {
  let repo: InMemoryUserRepository;
  let useCase: ManageStaffUseCase;
  const hash = jest.fn<Promise<string>, [string]>();
  const input = {
    name: ' Secretaria nueva ',
    email: ' NUEVA@example.test ',
    phone: ' 70000009 ',
    password: 'test-password',
    role: 'SECRETARIA' as const,
  };
  beforeEach(() => {
    repo = new InMemoryUserRepository();
    hash.mockReset().mockResolvedValue('test-hash');
    useCase = new ManageStaffUseCase(repo, { hash, compare: jest.fn() });
  });
  it('normaliza datos, cifra contraseña y devuelve solo información pública', async () => {
    const result = await useCase.createStaff(input);
    expect(result).toMatchObject({
      name: 'Secretaria nueva',
      email: 'nueva@example.test',
      phone: '70000009',
      role: 'SECRETARIA',
      status: 'ACTIVE',
    });
    expect(hash).toHaveBeenCalledWith('test-password');
    expect(result).not.toHaveProperty('passwordHash');
    expect(result).not.toHaveProperty('ci');
    expect(await repo.findById(result.id)).toMatchObject({
      passwordHash: 'test-hash',
      ci: '',
    });
    await expect(useCase.createStaff(input)).rejects.toThrow(ConflictException);
    expect(hash).toHaveBeenCalledTimes(1);
  });
  it('lista solo personal y permite desactivar y reactivar', async () => {
    const result = await useCase.createStaff(input);
    const list = await useCase.listStaff();
    expect(list.map((u) => u.role).sort()).toEqual([
      'ADMIN',
      'SECRETARIA',
      'SECRETARIA',
    ]);
    expect(list.every((u) => !('passwordHash' in u) && !('ci' in u))).toBe(
      true,
    );
    expect(await useCase.updateStatus(result.id, 'INACTIVE')).toMatchObject({
      status: 'INACTIVE',
    });
    expect((await repo.findById(result.id))?.isActive()).toBe(false);
    expect(await useCase.updateStatus(result.id, 'ACTIVE')).toMatchObject({
      status: 'ACTIVE',
    });
  });
  it('rechaza identificador y estado inválidos sin alterar el usuario', async () => {
    await expect(useCase.updateStatus('missing', 'ACTIVE')).rejects.toThrow(
      EntityNotFoundException,
    );
    const created = await useCase.createStaff(input);
    await expect(
      useCase.updateStatus(created.id, 'PENDING_VERIFICATION'),
    ).rejects.toThrow(ValidationException);
    expect((await repo.findById(created.id))?.status).toBe('ACTIVE');
  });
  it('no persiste un usuario si falla el cifrado', async () => {
    hash.mockRejectedValue(new Error('Hasher no disponible'));
    await expect(useCase.createStaff(input)).rejects.toThrow(
      'Hasher no disponible',
    );
    expect(await repo.findByEmail(input.email)).toBeNull();
  });
  it('busca clientes por nombre, teléfono y correo, excluyendo inactivos y personal', async () => {
    const client = new User(
      'test-client',
      'Nombre singular',
      'singular@example.test',
      '79999999',
      'test-ci',
      '',
      'CLIENTE',
    );
    await repo.save(client);
    for (const query of [
      ' NOMBRE SINGULAR ',
      '79999999',
      'singular@example.test',
    ]) {
      expect(await repo.searchClients(query)).toEqual([client]);
    }
    expect(await repo.searchClients('Administrador')).toEqual([]);
    expect(await repo.searchClients('inexistente')).toEqual([]);
    client.deactivate();
    await repo.update(client);
    expect(await repo.searchClients('singular')).toEqual([]);
    expect(await repo.findByCi(' test-ci ')).toBe(client);
    expect(await repo.findByCi('missing')).toBeNull();
  });
});
