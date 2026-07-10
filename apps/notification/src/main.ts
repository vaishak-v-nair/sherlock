import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // Allow all origins for the internship challenge prototype
  app.enableCors();
  await app.listen(3002);
  console.log(`Notification Engine is running on: http://localhost:3002`);
}
bootstrap();
