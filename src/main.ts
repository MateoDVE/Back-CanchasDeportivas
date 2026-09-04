import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { AppModule } from './app.module';
import { GlobalDomainExceptionFilter } from './common/filters/domain-exception.filter';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  // Habilitar CORS para conexión con Angular Frontend
  app.enableCors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  // Validaciones globales de DTOs con class-validator
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Filtro global para traducir DomainExceptions a respuestas HTTP
  app.useGlobalFilters(new GlobalDomainExceptionFilter());

  const port = process.env.PORT || 3000;
  await app.listen(port);
  logger.log(`🚀 Servidor backend ejecutándose en http://localhost:${port}`);
}
bootstrap();
