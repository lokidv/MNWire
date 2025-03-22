import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DatabaseService } from 'src/database/database.service';
import { ApiService } from 'src/services/api.service';
import {
  getConfig,
  Wireguard,
  wireguardPublicKeyFromPrivateKey,
} from './utils/wireguard.utils';

@Injectable()
export class WireguardService {
  private logger = new Logger(WireguardService.name);

  constructor(
    private readonly apiService: ApiService,
    private readonly configService: ConfigService,
    private readonly database: DatabaseService,
  ) {
    console.log('HERE 5');
  }

  private getNextAllowedIP(peers: any[]) {
    console.log('HERE 6');
    let networkPrefix: string | null = null;
    let cidrMask: string | null = null;
    const usedOctets = new Set<number>();

    for (const peer of peers) {
      for (const ip of peer.allowedIPs) {
        // ip format: "X.X.X.X/Y"
        const [ipAddress, mask] = ip.split('/');
        const parts = ipAddress.split('.');

        const currentPrefix = parts.slice(0, 3).join('.');
        const lastOctet = parseInt(parts[3], 10);

        // If we haven't set a prefix yet, set it from the first encountered IP
        if (!networkPrefix) {
          networkPrefix = currentPrefix;
          cidrMask = mask; // Capture the mask from the first encountered IP
        }

        // If this IP shares the same prefix as our chosen network prefix
        if (currentPrefix === networkPrefix) {
          usedOctets.add(lastOctet);
          // If we haven't set a CIDR mask yet, set it from this IP
          if (!cidrMask) {
            cidrMask = mask;
          }
        }
      }
    }

    // If no peers or no prefix found, default to "10.0.0" and "/32"
    if (!networkPrefix) {
      networkPrefix = '10.0.0';
    }
    if (!cidrMask) {
      cidrMask = '32';
    }

    // Find the lowest available octet between 2 and 250
    let nextOctet = 2;
    while (nextOctet <= 250) {
      if (!usedOctets.has(nextOctet)) {
        break;
      }
      nextOctet++;
    }

    // If all octets between 2-250 are used (unlikely), reset to 2
    if (nextOctet > 250) {
      this.logger.warn('All octets between 2-250 are used, reusing octet 2');
      nextOctet = 2;
    }

    return `${networkPrefix}.${nextOctet}/${cidrMask}`;
  }

  async create(remark: string) {
    console.log('HERE 7');
    this.logger.debug(this.apiService.http.defaults.baseURL);
    const inbound = +this.configService.getOrThrow('WIREGUARD_INBOUND');
    const configExist = await this.database.config.findUnique({
      where: { remark },
    });

    if (configExist) {
      await this.remove(remark);
    }

    const username = this.configService.get('XUI_USERNAME');
    const password = this.configService.get('XUI_PASSWORD');
    const SERVER_DOMAIN = this.apiService.getPublicIp();

    await this.apiService.http.post('/login', {
      username,
      password,
    });

    const inboundSetting = await this.apiService.http.get(
      `/panel/api/inbounds/get/${inbound}`,
    );

    const peers: any[] = JSON.parse(inboundSetting.data.obj.settings).peers;

    const keys = Wireguard.generateKeypair();
    const allowedIP = this.getNextAllowedIP(peers);
    const newPeer = {
      privateKey: keys.privateKey,
      publicKey: keys.publicKey,
      allowedIPs: [allowedIP],
      keepAlive: 0,
    };

    peers.push(newPeer);
    inboundSetting.data.obj.settings = JSON.parse(
      inboundSetting.data.obj.settings,
    );

    inboundSetting.data.obj.settings.peers = peers;
    inboundSetting.data.obj.settings = JSON.stringify(
      inboundSetting.data.obj.settings,
    );

    await this.apiService.http.post(
      `/panel/api/inbounds/update/${inbound}`,
      inboundSetting.data.obj,
    );

    await this.database.config.create({
      data: {
        allowed_ip: allowedIP,
        public_key: keys.publicKey,
        private_key: keys.privateKey,
        remark,
        inbound,
      },
    });

    const setting = JSON.parse(inboundSetting.data.obj.settings);

    return getConfig({
      serverPublicKey: wireguardPublicKeyFromPrivateKey(setting.secretKey),
      privateKey: keys.privateKey,
      Address: allowedIP,
      endpoint: `${SERVER_DOMAIN}:${inboundSetting.data.obj.port}`,
      MTU: setting.mtu,
    });
  }

  findAll() {
    return this.database.config.findMany({
      select: {
        remark: true,
      },
    });
  }

  async findOne(remark: string) {
    const config = await this.database.config.findUnique({
      where: { remark },
    });

    return { exist: !!config };
  }

  async remove(remark: string) {
    try {
      const config = await this.database.config.findUniqueOrThrow({
        where: { remark },
      });
      const username = this.configService.get('XUI_USERNAME');
      const password = this.configService.get('XUI_PASSWORD');

      await this.apiService.http.post('/login', {
        username,
        password,
      });

      const inboundSetting = await this.apiService.http.get(
        `/panel/api/inbounds/get/${config.inbound}`,
      );
      let peers: any[] = JSON.parse(inboundSetting.data.obj.settings).peers;

      peers = peers.filter((peer) => peer.publicKey !== config.public_key);

      inboundSetting.data.obj.settings = JSON.parse(
        inboundSetting.data.obj.settings,
      );
      inboundSetting.data.obj.settings.peers = peers;
      inboundSetting.data.obj.settings = JSON.stringify(
        inboundSetting.data.obj.settings,
      );

      await this.apiService.http.post(
        `/panel/api/inbounds/update/${config.inbound}`,
        inboundSetting.data.obj,
      );

      await this.database.config.delete({ where: { remark } });

      return { deleted: true };
    } catch {
      return { deleted: false };
    }
  }
}
