import { Module } from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';
import { ApiService } from 'src/services/api.service';
import { WireguardController } from './wireguard.controller';
import { WireguardService } from './wireguard.service';

@Module({
  controllers: [WireguardController],
  providers: [WireguardService, ApiService, DatabaseService],
})
export class WireguardModule {}
