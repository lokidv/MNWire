import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { GlobalPasswordGuard } from './guards/password.guard';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const configService = app.get<ConfigService>(ConfigService);

  const PORT = configService.getOrThrow<number>('PORT');

  app.useGlobalGuards(new GlobalPasswordGuard());

  await app.listen(PORT || 3000);
}
bootstrap();
