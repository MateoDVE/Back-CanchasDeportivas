import { RegisterClientUseCase } from './register-client.use-case';
import {
  ConflictException,
} from '../../../../common/domain/exceptions/domain.exception';

describe('RegisterClientUseCase', () => {
  let useCase: RegisterClientUseCase;

  const userRepositoryMock = {
    findByEmail: jest.fn(),
    findByCi: jest.fn(),
    save: jest.fn(),
  };

  const passwordHasherMock = {
    hash: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();

    useCase = new RegisterClientUseCase(
      userRepositoryMock as any,
      passwordHasherMock as any,
    );
  });

  it('should register a new client successfully', async () => {
    userRepositoryMock.findByEmail.mockResolvedValue(null);
    userRepositoryMock.findByCi.mockResolvedValue(null);

    passwordHasherMock.hash.mockResolvedValue('hashed-password');

    userRepositoryMock.save.mockResolvedValue(undefined);

    const result = await useCase.execute({
      name: ' Juan Perez ',
      email: ' JUAN@TEST.COM ',
      phone: ' 70000000 ',
      ci: ' 1234567 ',
      password: '123456',
    });

    expect(userRepositoryMock.findByEmail)
      .toHaveBeenCalledWith(' JUAN@TEST.COM ');

    expect(userRepositoryMock.findByCi)
      .toHaveBeenCalledWith(' 1234567 ');

    expect(passwordHasherMock.hash)
      .toHaveBeenCalledWith('123456');

    expect(userRepositoryMock.save)
      .toHaveBeenCalledTimes(1);

    expect(result.name).toBe('Juan Perez');
    expect(result.email).toBe('juan@test.com');
    expect(result.phone).toBe('70000000');
    expect(result.ci).toBe('1234567');
    expect(result.role).toBe('CLIENTE');
    expect(result.status).toBe('ACTIVE');

    expect(result.id).toBeDefined();
    expect(result.createdAt).toBeInstanceOf(Date);
  });

  it('should throw ConflictException when email already exists', async () => {
    userRepositoryMock.findByEmail.mockResolvedValue({
      id: 'existing-user',
    });

    await expect(
      useCase.execute({
        name: 'Juan Perez',
        email: 'juan@test.com',
        phone: '70000000',
        ci: '1234567',
        password: '123456',
      }),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(userRepositoryMock.findByCi)
      .not.toHaveBeenCalled();

    expect(userRepositoryMock.save)
      .not.toHaveBeenCalled();
  });

  it('should throw ConflictException when CI already exists', async () => {
    userRepositoryMock.findByEmail.mockResolvedValue(null);

    userRepositoryMock.findByCi.mockResolvedValue({
      id: 'existing-user',
    });

    await expect(
      useCase.execute({
        name: 'Juan Perez',
        email: 'juan@test.com',
        phone: '70000000',
        ci: '1234567',
        password: '123456',
      }),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(passwordHasherMock.hash)
      .not.toHaveBeenCalled();

    expect(userRepositoryMock.save)
      .not.toHaveBeenCalled();
  });
});