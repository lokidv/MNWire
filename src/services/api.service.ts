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
    this.http = this.getAxiosInstance();
  }

  public getPublicIp() {
    const interfaces = os.networkInterfaces();
    return Object.values(interfaces)
      .flat()
      .find(
        (details) => details && details.family === 'IPv4' && !details.internal,
      )?.address;
  }

  private getAxiosInstance() {
    const useSSL = !!this.configService.get<boolean>('XUI_USE_SSL');

    const publicIp = this.getPublicIp();
    if (!publicIp) throw new Error('Public IP not found');

    const protocol = useSSL ? 'https' : 'http';

    const cookieJar = new CookieJar();
    const instance = axios.create({
      withCredentials: true,
      jar: cookieJar,
      baseURL: `${protocol}://${publicIp}:${process.env.XUI_PORT}/${process.env.XUI_WEB_BASE_PATH}`,
    });

    return axiosCookieJarSupport(instance);
  }
}
