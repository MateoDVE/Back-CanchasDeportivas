import { JwtService } from '@nestjs/jwt';
import { LoginUseCase } from './login.use-case';
import {
  UnauthorizedException,
  ForbiddenException,
} from '../../../../common/domain/exceptions/domain.exception';

describe('LoginUseCase', () => {
  let useCase: LoginUseCase;

  const userRepositoryMock = {
    findByEmail: jest.fn(),
  };

  const passwordHasherMock = {
    compare: jest.fn(),
  };

  const jwtServiceMock = {
    sign: jest.fn(),
  };

  const mockUser = {
    id: 'user-1',
    name: 'Juan Perez',
    email: 'juan@test.com',
    phone: '70000000',
    ci: '1234567',
    passwordHash: 'hashed-password',
    role: 'CLIENTE',
    status: 'ACTIVE',
    createdAt: new Date('2026-01-01'),
    isActive: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();

    useCase = new LoginUseCase(
      userRepositoryMock as any,
      passwordHasherMock as any,
      jwtServiceMock as unknown as JwtService,
    );
  });

  it('should login successfully', async () => {
    mockUser.isActive.mockReturnValue(true);

    userRepositoryMock.findByEmail.mockResolvedValue(mockUser);

    passwordHasherMock.compare.mockResolvedValue(true);

    jwtServiceMock.sign.mockReturnValue('token-123');

    const result = await useCase.execute({
      email: ' JUAN@TEST.COM ',
      password: '123456',
    });

    expect(userRepositoryMock.findByEmail)
      .toHaveBeenCalledWith('juan@test.com');

    expect(passwordHasherMock.compare)
      .toHaveBeenCalledWith(
        '123456',
        'hashed-password',
      );

    expect(jwtServiceMock.sign)
      .toHaveBeenCalledWith({
        purpose: 'access',
        sub: 'user-1',
        id: 'user-1',
        email: 'juan@test.com',
        role: 'CLIENTE',
        name: 'Juan Perez',
      });

    expect(result.accessToken).toBe('token-123');

    expect(result.user).toEqual({
      id: 'user-1',
      name: 'Juan Perez',
      email: 'juan@test.com',
      phone: '70000000',
      role: 'CLIENTE',
      status: 'ACTIVE',
      createdAt: new Date('2026-01-01'),
    });
  });

  it('should throw UnauthorizedException when user does not exist', async () => {
    userRepositoryMock.findByEmail.mockResolvedValue(null);

    await expect(
      useCase.execute({
        email: 'noexiste@test.com',
        password: '123456',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('should throw UnauthorizedException when password is invalid', async () => {
    userRepositoryMock.findByEmail.mockResolvedValue(mockUser);

    passwordHasherMock.compare.mockResolvedValue(false);

    await expect(
      useCase.execute({
        email: 'juan@test.com',
        password: 'incorrecta',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('should throw ForbiddenException when user is inactive', async () => {
    mockUser.isActive.mockReturnValue(false);

    userRepositoryMock.findByEmail.mockResolvedValue(mockUser);

    passwordHasherMock.compare.mockResolvedValue(true);

    await expect(
      useCase.execute({
        email: 'juan@test.com',
        password: '123456',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
