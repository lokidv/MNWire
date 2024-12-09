import { NestFactory } from '@nestjs/core';
import { config } from 'dotenv';
import { AppModule } from './app.module';
import { GlobalPasswordGuard } from './guards/password.guard';

config();

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const PORT = process.env.PORT;

  app.useGlobalGuards(new GlobalPasswordGuard());

  await app.listen(PORT || 3000);
}
bootstrap();
