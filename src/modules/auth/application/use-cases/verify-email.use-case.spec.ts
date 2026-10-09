import { VerifyEmailUseCase } from './verify-email.use-case';

import {
  EntityNotFoundException,
  ValidationException,
} from '../../../../common/domain/exceptions/domain.exception';

describe('VerifyEmailUseCase', () => {
  let useCase: VerifyEmailUseCase;

  const userRepositoryMock = {
    findByEmail: jest.fn(),
    update: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();

    useCase = new VerifyEmailUseCase(
      userRepositoryMock as any,
      { verify: jest.fn().mockResolvedValue(true), send: jest.fn() },
    );
  });

  it('should throw ValidationException when token is empty', async () => {
    await expect(
      useCase.execute({
        email: 'juan@test.com',
        token: '',
      }),
    ).rejects.toBeInstanceOf(ValidationException);

    expect(userRepositoryMock.findByEmail)
      .not.toHaveBeenCalled();
  });

  it('should throw ValidationException when token contains only spaces', async () => {
    await expect(
      useCase.execute({
        email: 'juan@test.com',
        token: '   ',
      }),
    ).rejects.toBeInstanceOf(ValidationException);
  });

  it('should throw EntityNotFoundException when user does not exist', async () => {
    userRepositoryMock.findByEmail.mockResolvedValue(null);

    await expect(
      useCase.execute({
        email: 'noexiste@test.com',
        token: 'ABC123',
      }),
    ).rejects.toBeInstanceOf(EntityNotFoundException);
  });

  it('should return success when user is already active', async () => {
    const user = {
      status: 'ACTIVE',
      activate: jest.fn(),
    };

    userRepositoryMock.findByEmail.mockResolvedValue(user);

    const result = await useCase.execute({
      email: 'juan@test.com',
      token: 'ABC123',
    });

    expect(result).toEqual({
      success: true,
      message:
        'La cuenta de correo ya se encontraba validada y activa.',
    });

    expect(user.activate)
      .not.toHaveBeenCalled();

    expect(userRepositoryMock.update)
      .not.toHaveBeenCalled();
  });

  it('should activate pending user', async () => {
    const user = {
      status: 'PENDING_VERIFICATION',
      activate: jest.fn(),
    };

    userRepositoryMock.findByEmail.mockResolvedValue(user);

    userRepositoryMock.update.mockResolvedValue(undefined);

    const result = await useCase.execute({
      email: 'juan@test.com',
      token: 'ABC123',
    });

    expect(user.activate)
      .toHaveBeenCalledTimes(1);

    expect(userRepositoryMock.update)
      .toHaveBeenCalledWith(user);

    expect(result).toEqual({
      success: true,
      message:
        'Correo electrónico validado exitosamente. Ahora puede iniciar sesión y realizar reservas.',
    });
  });
});