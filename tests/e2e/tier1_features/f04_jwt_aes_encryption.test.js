import { describe, it, expect } from '../harness/test_framework.js';
import { encryptAES256GCM, decryptAES256GCM, createTestJWT, verifyTestJWT } from '../harness/crypto_helpers.js';
import crypto from 'crypto';

describe('F04: SEC-04 JWT Secret & AES-256-GCM Storage Encryption', () => {
  const masterKey = crypto.randomBytes(32).toString('hex');

  it('F04-T1: AES-256-GCM encryption and decryption roundtrip preserves exact plaintext', () => {
    const sensitiveApiKey = 'AIzaSyA_SIMCOP_SECRET_API_KEY_998877665544';
    const encrypted = encryptAES256GCM(sensitiveApiKey, masterKey);
    
    expect(encrypted).not.toBe(sensitiveApiKey);
    expect(encrypted.split(':')).toHaveLength(3); // iv:authTag:ciphertext

    const decrypted = decryptAES256GCM(encrypted, masterKey);
    expect(decrypted).toBe(sensitiveApiKey);
  });

  it('F04-T2: AES-256-GCM generates distinct ciphertexts for identical plaintext due to random IVs', () => {
    const plaintext = 'SAME_SECRET_PAYLOAD';
    const enc1 = encryptAES256GCM(plaintext, masterKey);
    const enc2 = encryptAES256GCM(plaintext, masterKey);

    expect(enc1).not.toBe(enc2);
    expect(decryptAES256GCM(enc1, masterKey)).toBe(plaintext);
    expect(decryptAES256GCM(enc2, masterKey)).toBe(plaintext);
  });

  it('F04-T3: JWT Secret entropy enforcement (minimum 256-bit / 32 bytes)', () => {
    function validateJWTSecretEntropy(secret) {
      if (!secret || typeof secret !== 'string') return false;
      const buf = Buffer.from(secret, secret.length === 64 ? 'hex' : 'utf8');
      return buf.length >= 32;
    }

    expect(validateJWTSecretEntropy('short-key')).toBeFalsy();
    expect(validateJWTSecretEntropy('404E635266556A586E3272357538782F413F4428472B4B6250645367566B5970')).toBeTruthy();
    expect(validateJWTSecretEntropy(crypto.randomBytes(32).toString('hex'))).toBeTruthy();
  });

  it('F04-T4: JWT token creation and claim integrity verification', () => {
    const jwtSecret = crypto.randomBytes(32).toString('hex');
    const token = createTestJWT({
      sub: 'santiago.salazar',
      role: 'ADMINISTRATOR',
      unitId: 'DIV01'
    }, jwtSecret);

    const verified = verifyTestJWT(token, jwtSecret);
    expect(verified.payload.sub).toBe('santiago.salazar');
    expect(verified.payload.role).toBe('ADMINISTRATOR');
    expect(verified.payload.unitId).toBe('DIV01');
  });

  it('F04-T5: Base64 pseudo-encryption rejection in favor of authenticated encryption', () => {
    function isSecureStorageFormat(ciphertext) {
      // Base64 without IV/Tag is insecure
      if (/^[A-Za-z0-9+/=]+$/.test(ciphertext) && !ciphertext.includes(':')) {
        return false;
      }
      // GCM format: iv:tag:data
      const parts = ciphertext.split(':');
      return parts.length === 3 && parts[0].length === 24 && parts[1].length === 32;
    }

    const insecureBase64 = Buffer.from('my_api_key').toString('base64');
    const secureGCM = encryptAES256GCM('my_api_key', masterKey);

    expect(isSecureStorageFormat(insecureBase64)).toBeFalsy();
    expect(isSecureStorageFormat(secureGCM)).toBeTruthy();
  });
});
