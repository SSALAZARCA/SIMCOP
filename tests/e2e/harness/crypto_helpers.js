/**
 * SIMCOP Cryptographic & Security Test Helpers
 * Implements AES-256-GCM, JWT generation/validation, timing-safe checks, and TOTP algorithms.
 */

import crypto from 'crypto';

/**
 * AES-256-GCM Encryption (matches ConfigurationService.java AES-256-GCM spec)
 */
export function encryptAES256GCM(plaintext, keyHex) {
  const key = Buffer.from(keyHex, 'hex');
  if (key.length !== 32) {
    throw new Error(`AES-256 requires exactly 32 bytes (64 hex characters), got ${key.length} bytes`);
  }
  const iv = crypto.randomBytes(12); // Standard 96-bit IV for GCM
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  
  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  
  // Format: iv:authTag:ciphertext
  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

/**
 * AES-256-GCM Decryption
 */
export function decryptAES256GCM(payload, keyHex) {
  const key = Buffer.from(keyHex, 'hex');
  if (key.length !== 32) {
    throw new Error(`AES-256 requires exactly 32 bytes key`);
  }
  const parts = payload.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted payload format. Expected iv:authTag:ciphertext');
  }
  const iv = Buffer.from(parts[0], 'hex');
  const authTag = Buffer.from(parts[1], 'hex');
  const ciphertext = parts[2];
  
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);
  
  let decrypted = decipher.update(ciphertext, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

/**
 * Constant-time string equality check (prevents timing attacks on secrets)
 */
export function timingSafeEqual(strA, strB) {
  if (typeof strA !== 'string' || typeof strB !== 'string') return false;
  const bufA = Buffer.from(strA, 'utf8');
  const bufB = Buffer.from(strB, 'utf8');
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * Create HMAC-SHA256 JWT Token
 */
export function createTestJWT(payload, secretHex, options = {}) {
  const header = {
    alg: options.alg || 'HS256',
    typ: 'JWT'
  };
  const now = Math.floor(Date.now() / 1000);
  const jwtPayload = {
    sub: payload.sub || 'santiago.salazar',
    role: payload.role || 'ADMINISTRATOR',
    iat: options.iat !== undefined ? options.iat : now,
    exp: options.exp !== undefined ? options.exp : (now + (options.expiresIn || 86400)),
    ...payload
  };

  const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64url');
  const encodedPayload = Buffer.from(JSON.stringify(jwtPayload)).toString('base64url');
  const data = `${encodedHeader}.${encodedPayload}`;
  
  const key = Buffer.from(secretHex, secretHex.length === 64 ? 'hex' : 'utf8');
  const signature = crypto.createHmac('sha256', key).update(data).digest('base64url');
  
  return `${data}.${signature}`;
}

/**
 * Verify and decode test JWT Token
 */
export function verifyTestJWT(token, secretHex) {
  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new Error('Invalid JWT format (must have 3 parts)');
  }
  const [encodedHeader, encodedPayload, signature] = parts;
  const header = JSON.parse(Buffer.from(encodedHeader, 'base64url').toString('utf8'));
  
  if (header.alg === 'none') {
    throw new Error('Algorithm "none" is rejected for security');
  }
  
  const data = `${encodedHeader}.${encodedPayload}`;
  const key = Buffer.from(secretHex, secretHex.length === 64 ? 'hex' : 'utf8');
  const expectedSig = crypto.createHmac('sha256', key).update(data).digest('base64url');
  
  if (!timingSafeEqual(signature, expectedSig)) {
    throw new Error('JWT Signature verification failed');
  }
  
  const payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8'));
  const now = Math.floor(Date.now() / 1000);
  if (payload.exp && payload.exp < now) {
    throw new Error(`JWT Token expired (exp: ${payload.exp}, now: ${now})`);
  }
  if (payload.nbf && payload.nbf > now) {
    throw new Error(`JWT Token not active yet (nbf: ${payload.nbf}, now: ${now})`);
  }
  
  return { header, payload };
}

/**
 * TOTP Generator (RFC 6238) for 2FA validation testing
 */
export function generateTOTP(secretBase32, timeStep = 30) {
  // Simple RFC 6238 TOTP calculation
  const epoch = Math.floor(Date.now() / 1000);
  const counter = Math.floor(epoch / timeStep);
  const buf = Buffer.alloc(8);
  buf.writeBigInt64BE(BigInt(counter));
  
  // Base32 decode
  const base32chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = '';
  for (let i = 0; i < secretBase32.length; i++) {
    const val = base32chars.indexOf(secretBase32.charAt(i).toUpperCase());
    if (val === -1) continue;
    bits += val.toString(2).padStart(5, '0');
  }
  const keyBytes = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    keyBytes.push(parseInt(bits.substr(i, 8), 2));
  }
  const key = Buffer.from(keyBytes);
  
  const hmac = crypto.createHmac('sha1', key).update(buf).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const code = (
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff)
  ) % 1000000;
  
  return code.toString().padStart(6, '0');
}
