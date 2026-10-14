import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { GlobalDomainExceptionFilter } from './common/filters/domain-exception.filter';

jest.mock('./app.module', () => ({ AppModule: class AppModule {} }));

describe('Configuración de arranque HTTP', () => {
  const originalPort = process.env.PORT;
  afterEach(() => {
    if (originalPort === undefined) delete process.env.PORT;
    else process.env.PORT = originalPort;
    jest.restoreAllMocks();
  });

  it.each([undefined, '4100'])(
    'configura el servidor para PORT=%p',
    async (port) => {
      if (port === undefined) delete process.env.PORT;
      else process.env.PORT = port;
      const app = {
        use: jest.fn(),
        enableCors: jest.fn(),
        useGlobalPipes: jest.fn<void, [ValidationPipe]>(),
        useGlobalFilters: jest.fn(),
        listen: jest.fn().mockResolvedValue(undefined),
      };
      jest.spyOn(NestFactory, 'create').mockResolvedValue(app as never);
      jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
      // Aísla el punto de entrada sin abrir puertos ni inicializar servicios externos.
      await jest.isolateModulesAsync(async () => {
        jest.doMock('@nestjs/core', () => ({ NestFactory }));
        jest.doMock('@nestjs/common', () => ({
          ...jest.requireActual<object>('@nestjs/common'),
          Logger,
          ValidationPipe,
        }));
        jest.doMock('./common/filters/domain-exception.filter', () => ({
          GlobalDomainExceptionFilter,
        }));
        await import('./main');
      });
      expect(app.use).toHaveBeenCalledTimes(2);
      expect(app.enableCors).toHaveBeenCalledWith({
        origin: true,
        methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
        credentials: true,
      });
      expect(app.useGlobalPipes).toHaveBeenCalledWith(
        expect.any(ValidationPipe),
      );
      const pipe = app.useGlobalPipes.mock.calls[0][0];
      await expect(
        pipe.transform('42', { type: 'param', metatype: Number, data: 'id' }),
      ).resolves.toBe(42);
      expect(app.useGlobalFilters).toHaveBeenCalledWith(
        expect.any(GlobalDomainExceptionFilter),
      );
      expect(app.listen).toHaveBeenCalledWith(port ?? 3000);
    },
  );
});
