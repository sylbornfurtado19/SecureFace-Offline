import CryptoJS from 'crypto-js';
import * as Keychain from 'react-native-keychain';
import { CONSTANTS } from '../utils/constants';
import { generateUUID } from '../utils/helpers';

class EncryptionService {
  private encryptionKey: string | null = null;
  private readonly KEYCHAIN_SERVICE = 'com.secureface.offline.encryption';

  async initialize(): Promise<void> {
    try {
      const storedKey = await Keychain.getGenericPassword({
        service: this.KEYCHAIN_SERVICE,
      });

      if (storedKey) {
        this.encryptionKey = storedKey.password;
      } else {
        this.encryptionKey = this.generateEncryptionKey();
        await Keychain.setGenericPassword(
          'encryptionKey',
          this.encryptionKey,
          { service: this.KEYCHAIN_SERVICE }
        );
      }
    } catch (error) {
      console.error('Failed to initialize encryption:', error);
      this.encryptionKey = this.generateEncryptionKey();
      await Keychain.setGenericPassword(
        'encryptionKey',
        this.encryptionKey,
        { service: this.KEYCHAIN_SERVICE }
      );
    }
  }

  private generateEncryptionKey(): string {
    const randomBytes = CryptoJS.lib.WordArray.random(32);
    return randomBytes.toString(CryptoJS.enc.Hex);
  }

  encryptString(plaintext: string): string {
    if (!this.encryptionKey) {
      throw new Error('Encryption key not initialized');
    }

    try {
      const encrypted = CryptoJS.AES.encrypt(plaintext, this.encryptionKey);
      return encrypted.toString();
    } catch (error) {
      throw new Error(`Failed to encrypt string: ${error}`);
    }
  }

  decryptString(ciphertext: string): string {
    if (!this.encryptionKey) {
      throw new Error('Encryption key not initialized');
    }

    try {
      const decrypted = CryptoJS.AES.decrypt(ciphertext, this.encryptionKey);
      return decrypted.toString(CryptoJS.enc.Utf8);
    } catch (error) {
      throw new Error(`Failed to decrypt string: ${error}`);
    }
  }

  encryptObject(obj: any): string {
    const jsonString = JSON.stringify(obj);
    return this.encryptString(jsonString);
  }

  decryptObject(ciphertext: string): any {
    const jsonString = this.decryptString(ciphertext);
    return JSON.parse(jsonString);
  }

  encryptEmbedding(embedding: number[]): string {
    const embeddingString = JSON.stringify(embedding);
    return this.encryptString(embeddingString);
  }

  decryptEmbedding(ciphertext: string): number[] {
    const embeddingString = this.decryptString(ciphertext);
    return JSON.parse(embeddingString);
  }

  hashPassword(password: string): string {
    return CryptoJS.SHA256(password).toString();
  }

  verifyPassword(password: string, hash: string): boolean {
    return this.hashPassword(password) === hash;
  }

  generateHash(data: string): string {
    return CryptoJS.SHA256(data).toString();
  }

  generateRandomToken(length: number = 32): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let token = '';
    for (let i = 0; i < length; i++) {
      token += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return token;
  }

  async rotateEncryptionKey(): Promise<void> {
    const oldKey = this.encryptionKey;
    this.encryptionKey = this.generateEncryptionKey();

    try {
      await Keychain.setGenericPassword(
        'encryptionKey',
        this.encryptionKey,
        { service: this.KEYCHAIN_SERVICE }
      );
    } catch (error) {
      this.encryptionKey = oldKey;
      throw new Error(`Failed to rotate encryption key: ${error}`);
    }
  }

  async clearEncryptionKey(): Promise<void> {
    try {
      await Keychain.resetGenericPassword({
        service: this.KEYCHAIN_SERVICE,
      });
      this.encryptionKey = null;
    } catch (error) {
      console.error('Failed to clear encryption key:', error);
    }
  }

  getKeyStatus(): {
    initialized: boolean;
    keyId: string;
  } {
    return {
      initialized: this.encryptionKey !== null,
      keyId: this.encryptionKey ? this.generateHash(this.encryptionKey).substring(0, 8) : '',
    };
  }
}

export default new EncryptionService();
