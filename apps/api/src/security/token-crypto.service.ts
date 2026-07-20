import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Environment } from '../config/environment';

@Injectable()
export class TokenCryptoService {
  constructor(private readonly config: ConfigService<Environment, true>) {}

  generateOpaqueToken(): string {
    return randomBytes(32).toString('base64url');
  }

  hash(token: string): string {
    return createHash('sha256').update(token, 'utf8').digest('hex');
  }

  encrypt(token: string): string {
    const key = Buffer.from(this.config.get('TOKEN_ENCRYPTION_KEY', { infer: true }), 'base64');
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', key, iv);
    const encrypted = Buffer.concat([cipher.update(token, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return Buffer.concat([iv, tag, encrypted]).toString('base64url');
  }

  decrypt(payload: string): string {
    const key = Buffer.from(this.config.get('TOKEN_ENCRYPTION_KEY', { infer: true }), 'base64');
    const data = Buffer.from(payload, 'base64url');
    const iv = data.subarray(0, 12);
    const tag = data.subarray(12, 28);
    const encrypted = data.subarray(28);
    const decipher = createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
  }

  signCsrf(nonce: string): string {
    const signature = createHmac('sha256', this.config.get('CSRF_SECRET', { infer: true }))
      .update(nonce)
      .digest('base64url');
    return `${nonce}.${signature}`;
  }

  verifyCsrf(value: string): boolean {
    const [nonce, signature] = value.split('.');
    if (!nonce || !signature) return false;
    const expected = this.signCsrf(nonce).split('.')[1];
    if (expected?.length !== signature.length) return false;
    return timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  }
}
