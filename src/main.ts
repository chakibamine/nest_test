import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { CustomLoggerService } from './common/logger/custom-logger.service';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true, // Buffer logs until logger is ready
  });
  // Get the custom logger instance from the app
  const logger = app.get(CustomLoggerService);
  logger.setContext('Bootstrap');

  // Use the custom logger globally
  app.useLogger(logger);

  // Apply global interceptor for HTTP logging
  app.useGlobalInterceptors(new LoggingInterceptor(logger));

  // Apply global exception filter
  app.useGlobalFilters(new AllExceptionsFilter(logger));
  app.enableCors();
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
