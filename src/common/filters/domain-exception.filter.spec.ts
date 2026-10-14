import { ArgumentsHost, HttpException, Logger } from '@nestjs/common';
import { GlobalDomainExceptionFilter } from './domain-exception.filter';
import {
  DomainException,
  EntityNotFoundException,
  ConflictException,
  ValidationException,
  UnauthorizedException,
  ForbiddenException,
  CourtSlotOccupiedException,
  InvalidReservationDurationException,
} from '../domain/exceptions/domain.exception';

describe('GlobalDomainExceptionFilter', () => {
  const json = jest.fn();
  const status = jest.fn(() => ({ json }));
  const host = {
    switchToHttp: () => ({ getResponse: () => ({ status }) }),
  } as ArgumentsHost;
  beforeEach(() => jest.clearAllMocks());
  afterEach(() => jest.restoreAllMocks());

  it.each([
    [new EntityNotFoundException('No existe'), 404, 'Not Found'],
    [new ConflictException('Duplicado'), 409, 'Conflict'],
    [new ValidationException('Inválido'), 400, 'Bad Request'],
    [new UnauthorizedException(), 401, 'Unauthorized'],
    [new ForbiddenException(), 403, 'Forbidden'],
    [new DomainException('Regla de negocio'), 400, 'Domain Error'],
    [new CourtSlotOccupiedException(), 409, 'Conflict'],
    [new InvalidReservationDurationException(), 400, 'Bad Request'],
  ])('traduce %p a HTTP %p', (exception, code, error) => {
    new GlobalDomainExceptionFilter().catch(exception, host);
    expect(exception).toBeInstanceOf(Error);
    expect(exception.name).toBe(exception.constructor.name);
    expect(status).toHaveBeenCalledWith(code);
    expect(json).toHaveBeenCalledWith({
      statusCode: code,
      error,
      message: exception.message,
    });
  });

  it.each([
    'Petición inválida',
    { message: ['campo requerido'], error: 'Bad Request', statusCode: 400 },
  ])('conserva la respuesta HTTP %p', (body) => {
    new GlobalDomainExceptionFilter().catch(new HttpException(body, 400), host);
    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith(
      typeof body === 'string' ? { statusCode: 400, message: body } : body,
    );
  });

  it.each([new Error('detalle privado'), 'fallo desconocido', null])(
    'oculta detalles internos de %p',
    (exception) => {
      const log = jest
        .spyOn(Logger.prototype, 'error')
        .mockImplementation(() => undefined);
      new GlobalDomainExceptionFilter().catch(exception, host);
      expect(status).toHaveBeenCalledWith(500);
      expect(json).toHaveBeenCalledWith({
        statusCode: 500,
        message: 'Error interno del servidor',
      });
      expect(log).toHaveBeenCalledWith(
        `Unhandled Exception: ${exception instanceof Error ? exception.message : 'Internal server error'}`,
        exception instanceof Error ? exception.stack : undefined,
      );
    },
  );
});
