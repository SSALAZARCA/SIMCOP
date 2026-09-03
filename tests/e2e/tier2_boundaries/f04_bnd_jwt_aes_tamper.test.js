import { describe, it, expect } from '../harness/test_framework.js';
import { encryptAES256GCM, decryptAES256GCM, createTestJWT, verifyTestJWT } from '../harness/crypto_helpers.js';
import crypto from 'crypto';

describe('F04-BND: AES-GCM Tampering & JWT Cryptographic Boundary', () => {
  const masterKey = crypto.randomBytes(32).toString('hex');
  const jwtSecret = crypto.randomBytes(32).toString('hex');

  it('F04-BND-T1: Corrupted authentication tag in AES-GCM payload throws error and blocks decryption', () => {
    const encrypted = encryptAES256GCM('TACTICAL_SECRET_COORDINATES', masterKey);
    const parts = encrypted.split(':');
    
    // Corrupt auth tag (parts[1])
    const corruptTag = parts[1].replace(/^[0-9a-f]/, 'z');
    const tamperedPayload = `${parts[0]}:${corruptTag}:${parts[2]}`;

    expect(() => decryptAES256GCM(tamperedPayload, masterKey)).toThrow();
  });

  it('F04-BND-T2: Modified ciphertext byte fails GCM integrity validation', () => {
    const encrypted = encryptAES256GCM('OPERATIONAL_ORDER_SECRET', masterKey);
    const parts = encrypted.split(':');
    
    // Flip a bit in the ciphertext
    const ctBytes = Buffer.from(parts[2], 'hex');
    ctBytes[0] ^= 0xff;
    const tamperedCiphertext = ctBytes.toString('hex');
    const tamperedPayload = `${parts[0]}:${parts[1]}:${tamperedCiphertext}`;

    expect(() => decryptAES256GCM(tamperedPayload, masterKey)).toThrow();
  });

  it('F04-BND-T3: Invalid key length (e.g. 16-byte DES/AES-128 key) is rejected by AES-256 validator', () => {
    const shortKey = crypto.randomBytes(16).toString('hex');
    expect(() => encryptAES256GCM('DATA', shortKey)).toThrow('AES-256 requires exactly 32 bytes');
  });

  it('F04-BND-T4: Tampered JWT claim payload fails signature verification', () => {
    const token = createTestJWT({ sub: 'user_regular', role: 'COMANDANTE_PELOTON' }, jwtSecret);
    const parts = token.split('.');
    
    // Forging role to ADMINISTRATOR without secret key
    const forgedPayload = Buffer.from(JSON.stringify({ sub: 'user_regular', role: 'ADMINISTRATOR' })).toString('base64url');
    const forgedToken = `${parts[0]}.${forgedPayload}.${parts[2]}`;

    expect(() => verifyTestJWT(forgedToken, jwtSecret)).toThrow('Signature verification failed');
  });

  it('F04-BND-T5: Algorithm "none" exploit token is rejected explicitly', () => {
    const noneHeader = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
    const payload = Buffer.from(JSON.stringify({ sub: 'admin', role: 'ADMINISTRATOR' })).toString('base64url');
    const noneToken = `${noneHeader}.${payload}.`;

    expect(() => verifyTestJWT(noneToken, jwtSecret)).toThrow('Algorithm "none" is rejected');
  });
});
