import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';

@Injectable()
export class WhatsappCryptoService {
  constructor(private readonly config: ConfigService) {}

  private getKey(): Buffer {
    const encryptionKey = this.config.get<string>('whatsapp.credentialEncryptionKey');
    if (!encryptionKey) {
      throw new Error('WHATSAPP_CREDENTIAL_ENCRYPTION_KEY is not set.');
    }

    return createHash('sha256').update(encryptionKey).digest();
  }

  encrypt(value: string): string {
    const key = this.getKey();
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', key, iv);
    const encrypted = Buffer.concat([
      cipher.update(value, 'utf8'),
      cipher.final(),
    ]);
    const tag = cipher.getAuthTag();

    return [
      'v1',
      iv.toString('base64url'),
      tag.toString('base64url'),
      encrypted.toString('base64url'),
    ].join('.');
  }

  decrypt(payload: string): string {
    const key = this.getKey();
    const [version, iv, tag, encrypted] = payload.split('.');
    if (version !== 'v1' || !iv || !tag || !encrypted) {
      throw new InternalServerErrorException('Invalid encrypted WhatsApp credential payload');
    }

    const decipher = createDecipheriv(
      'aes-256-gcm',
      key,
      Buffer.from(iv, 'base64url'),
    );
    decipher.setAuthTag(Buffer.from(tag, 'base64url'));

    return Buffer.concat([
      decipher.update(Buffer.from(encrypted, 'base64url')),
      decipher.final(),
    ]).toString('utf8');
  }

  hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
