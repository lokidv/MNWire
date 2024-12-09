import { webcrypto } from 'crypto';
import nacl from 'tweetnacl';
type UInt8Array32 = Uint8Array & { length: 32 };

export class Wireguard {
  private static gf(init?: number[]): Float64Array {
    const arr = new Float64Array(16);
    if (init) {
      for (let i = 0; i < init.length; ++i) {
        arr[i] = init[i];
      }
    }
    return arr;
  }

  private static readonly _121665 = Wireguard.gf([0xdb41, 1]);
  private static readonly _9 = Wireguard.gf([9]);

  private static pack(o: Uint8Array, n: Float64Array): void {
    const m = Wireguard.gf();
    const t = Wireguard.gf();

    for (let i = 0; i < 16; ++i) t[i] = n[i];
    Wireguard.carry(t);
    Wireguard.carry(t);
    Wireguard.carry(t);

    for (let j = 0; j < 2; ++j) {
      m[0] = t[0] - 0xffed;
      for (let i = 1; i < 15; ++i) {
        m[i] = t[i] - 0xffff - ((m[i - 1] >> 16) & 1);
        m[i - 1] &= 0xffff;
      }
      m[15] = t[15] - 0x7fff - ((m[14] >> 16) & 1);
      const b = (m[15] >> 16) & 1;
      m[14] &= 0xffff;
      Wireguard.cswap(t, m, 1 - b);
    }

    for (let i = 0; i < 16; ++i) {
      o[2 * i] = t[i] & 0xff;
      o[2 * i + 1] = t[i] >> 8;
    }
  }

  private static carry(o: Float64Array): void {
    for (let i = 0; i < 16; ++i) {
      o[(i + 1) % 16] += Math.floor(o[i] / 65536) * (i < 15 ? 1 : 38);
      o[i] &= 0xffff;
    }
  }

  private static cswap(p: Float64Array, q: Float64Array, b: number): void {
    const c = ~(b - 1);
    for (let i = 0; i < 16; ++i) {
      const t = c & (p[i] ^ q[i]);
      p[i] ^= t;
      q[i] ^= t;
    }
  }

  private static add(o: Float64Array, a: Float64Array, b: Float64Array): void {
    for (let i = 0; i < 16; ++i) o[i] = (a[i] + b[i]) | 0;
  }

  private static subtract(
    o: Float64Array,
    a: Float64Array,
    b: Float64Array,
  ): void {
    for (let i = 0; i < 16; ++i) o[i] = (a[i] - b[i]) | 0;
  }

  private static multmod(
    o: Float64Array,
    a: Float64Array,
    b: Float64Array,
  ): void {
    const t = new Float64Array(31);
    for (let i = 0; i < 16; ++i) {
      for (let j = 0; j < 16; ++j) {
        t[i + j] += a[i] * b[j];
      }
    }
    for (let i = 0; i < 15; ++i) t[i] += 38 * t[i + 16];
    for (let i = 0; i < 16; ++i) o[i] = t[i];
    Wireguard.carry(o);
    Wireguard.carry(o);
  }

  private static invert(o: Float64Array, i: Float64Array): void {
    const c = Wireguard.gf();
    for (let a = 0; a < 16; ++a) c[a] = i[a];
    for (let a = 253; a >= 0; --a) {
      Wireguard.multmod(c, c, c);
      if (a !== 2 && a !== 4) Wireguard.multmod(c, c, i);
    }
    for (let a = 0; a < 16; ++a) o[a] = c[a];
  }

  private static clamp(z: Uint8Array): void {
    z[31] = (z[31] & 127) | 64;
    z[0] &= 248;
  }

  public static generatePublicKey(privateKey: UInt8Array32): Uint8Array {
    const z = new Uint8Array(32);
    const a = Wireguard.gf([1]);
    const b = Wireguard.gf([9]);
    const c = Wireguard.gf();
    const d = Wireguard.gf([1]);
    const e = Wireguard.gf();
    const f = Wireguard.gf();

    for (let i = 0; i < 32; ++i) z[i] = privateKey[i];
    Wireguard.clamp(z);

    for (let i = 254; i >= 0; i--) {
      const r = (z[i >>> 3] >>> (i & 7)) & 1;
      Wireguard.cswap(a, b, r);
      Wireguard.cswap(c, d, r);
      Wireguard.add(e, a, c);
      Wireguard.subtract(a, a, c);
      Wireguard.add(c, b, d);
      Wireguard.subtract(b, b, d);
      Wireguard.multmod(d, e, e);
      Wireguard.multmod(f, a, a);
      Wireguard.multmod(a, c, a);
      Wireguard.multmod(c, b, e);
      Wireguard.add(e, a, c);
      Wireguard.subtract(a, a, c);
      Wireguard.multmod(b, a, a);
      Wireguard.subtract(c, d, f);
      Wireguard.multmod(a, c, Wireguard._121665);
      Wireguard.add(a, a, d);
      Wireguard.multmod(c, c, a);
      Wireguard.multmod(a, d, f);
      Wireguard.multmod(d, b, Wireguard._9);
      Wireguard.multmod(b, e, e);
      Wireguard.cswap(a, b, r);
      Wireguard.cswap(c, d, r);
    }

    Wireguard.invert(c, c);
    Wireguard.multmod(a, a, c);
    const out = new Uint8Array(32);
    Wireguard.pack(out, a);
    return out;
  }

  public static generatePresharedKey(): UInt8Array32 {
    const privateKey = new Uint8Array(32) as UInt8Array32;
    webcrypto.getRandomValues(privateKey);
    return privateKey;
  }

  public static generatePrivateKey(): UInt8Array32 {
    const privateKey = this.generatePresharedKey();
    this.clamp(privateKey);
    return privateKey;
  }

  public static keyToBase64(key: Uint8Array): string {
    return Buffer.from(key).toString('base64');
  }

  public static keyFromBase64(encoded: string): Uint8Array {
    return new Uint8Array(Buffer.from(encoded, 'base64'));
  }

  public static generateKeypair(secretKey: string = ''): {
    publicKey: string;
    privateKey: string;
  } {
    const privateKey: UInt8Array32 =
      secretKey.length > 0
        ? (Wireguard.keyFromBase64(secretKey) as UInt8Array32)
        : Wireguard.generatePrivateKey();

    const publicKey = Wireguard.generatePublicKey(privateKey);
    return {
      publicKey: Wireguard.keyToBase64(publicKey),
      privateKey:
        secretKey.length > 0 ? secretKey : Wireguard.keyToBase64(privateKey),
    };
  }
}

interface IParams {
  privateKey: string;
  serverPublicKey: string;
  MTU: string;
  Address: string;
  endpoint: string;
}

export const getConfig = ({
  privateKey,
  serverPublicKey,
  Address,
  endpoint,
}: IParams) => `[Interface]
PrivateKey = ${privateKey}
Address = ${Address}
DNS = 1.1.1.1, 1.0.0.1

[Peer]
PublicKey = ${serverPublicKey}
AllowedIPs = 0.0.0.0/0, ::/0
Endpoint = ${endpoint}`;

export function wireguardPublicKeyFromPrivateKey(base64PrivateKey: string) {
  const privateKey = Buffer.from(base64PrivateKey, 'base64');
  const publicKey = nacl.scalarMult.base(privateKey);
  return Buffer.from(publicKey).toString('base64');
}
