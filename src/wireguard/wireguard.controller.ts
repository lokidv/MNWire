import { Controller, Get, Param, Query, Res } from '@nestjs/common';
import { Response } from 'express';
import { WireguardService } from './wireguard.service';

@Controller()
export class WireguardController {
  constructor(private readonly wireguardService: WireguardService) {}

  @Get('create')
  async create(@Query('publicKey') remark: string, @Res() res: Response) {
    const result = await this.wireguardService.create(remark);
    res.setHeader('Content-Type', 'text/plain');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${remark}_wg0.conf"`,
    );
    res.send(result);
  }

  @Get('list')
  findAll() {
    return this.wireguardService.findAll();
  }

  @Get('list/:publicKey')
  async findOne(@Param('publicKey') remark: string) {
    return await this.wireguardService.findOne(remark);
  }

  @Get('remove')
  remove(@Query('publicKey') remark: string) {
    return this.wireguardService.remove(remark);
  }
}
