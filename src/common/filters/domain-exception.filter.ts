import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpStatus,
  HttpException,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import {
  DomainException,
  EntityNotFoundException,
  ConflictException,
  ValidationException,
  UnauthorizedException,
  ForbiddenException,
} from '../domain/exceptions/domain.exception';

@Catch()
export class GlobalDomainExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalDomainExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const res = exception.getResponse();
      return response.status(status).json(
        typeof res === 'object'
          ? res
          : {
              statusCode: status,
              message: exception.message,
            },
      );
    }

    if (exception instanceof EntityNotFoundException) {
      return response.status(HttpStatus.NOT_FOUND).json({
        statusCode: HttpStatus.NOT_FOUND,
        error: 'Not Found',
        message: exception.message,
      });
    }

    if (exception instanceof ConflictException) {
      return response.status(HttpStatus.CONFLICT).json({
        statusCode: HttpStatus.CONFLICT,
        error: 'Conflict',
        message: exception.message,
      });
    }

    if (exception instanceof ValidationException) {
      return response.status(HttpStatus.BAD_REQUEST).json({
        statusCode: HttpStatus.BAD_REQUEST,
        error: 'Bad Request',
        message: exception.message,
      });
    }

    if (exception instanceof UnauthorizedException) {
      return response.status(HttpStatus.UNAUTHORIZED).json({
        statusCode: HttpStatus.UNAUTHORIZED,
        error: 'Unauthorized',
        message: exception.message,
      });
    }

    if (exception instanceof ForbiddenException) {
      return response.status(HttpStatus.FORBIDDEN).json({
        statusCode: HttpStatus.FORBIDDEN,
        error: 'Forbidden',
        message: exception.message,
      });
    }

    if (exception instanceof DomainException) {
      return response.status(HttpStatus.BAD_REQUEST).json({
        statusCode: HttpStatus.BAD_REQUEST,
        error: 'Domain Error',
        message: exception.message,
      });
    }

    const message =
      exception instanceof Error ? exception.message : 'Internal server error';
    const stack = exception instanceof Error ? exception.stack : undefined;
    this.logger.error(`Unhandled Exception: ${message}`, stack);

    return response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Error interno del servidor',
    });
  }
}
