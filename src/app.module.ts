import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './database/database.module';
import { ApiService } from './services/api.service';
import { WireguardModule } from './wireguard/wireguard.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    WireguardModule,
  ],
  providers: [ApiService],
  exports: [ApiService],
})
export class AppModule {}
