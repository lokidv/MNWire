import { PartialType } from '@nestjs/mapped-types';
import { CreateWireguardDto } from './create-wireguard.dto';

export class UpdateWireguardDto extends PartialType(CreateWireguardDto) {}
