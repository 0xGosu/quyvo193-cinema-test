import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Strips properties not in DTO
      transform: true, // Transforms payloads to DTO instances
      forbidNonWhitelisted: true, // Throws error on non-whitelisted properties
    }),
  );

  await app.listen(process.env.PORT || 3000);
}
bootstrap();
