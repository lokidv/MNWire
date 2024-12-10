import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { Axios } from 'axios';
import { wrapper as axiosCookieJarSupport } from 'axios-cookiejar-support';
import os from 'os';
import { CookieJar } from 'tough-cookie';

@Injectable()
export class ApiService {
  public http: Axios;

  constructor(private readonly configService: ConfigService) {
    console.log('HERE 4');
    this.http = this.getAxiosInstance();
  }

  public getPublicIp() {
    console.log('HERE 3');
    const interfaces = os.networkInterfaces();
    return Object.values(interfaces)
      .flat()
      .find(
        (details) => details && details.family === 'IPv4' && !details.internal,
      )?.address;
  }

  private getAxiosInstance() {
    console.log('HERE 1');
    const useSSL = this.configService.get('XUI_USE_SSL');
    const XUI_PORT = this.configService.getOrThrow<number>('XUI_PORT');
    const XUI_WEB_BASE_PATH =
      this.configService.getOrThrow<string>('XUI_WEB_BASE_PATH');

    const publicIp = this.getPublicIp();
    if (!publicIp) throw new Error('Public IP not found');

    const protocol = useSSL == true ? 'https' : 'http';

    const cookieJar = new CookieJar();
    console.log('HERE 2');
    const instance = axios.create({
      withCredentials: true,
      jar: cookieJar,
      baseURL: `${protocol}://${publicIp}:${XUI_PORT}/${XUI_WEB_BASE_PATH.replaceAll('/', '')}`,
    });

    return axiosCookieJarSupport(instance);
  }
}
