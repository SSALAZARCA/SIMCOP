import { describe, it, expect } from '../harness/test_framework.js';
import { createTestJWT, verifyTestJWT } from '../harness/crypto_helpers.js';
import crypto from 'crypto';

describe('F05-BND: Authentication Token Boundaries & Attack Scenarios', () => {
  const secretKey = crypto.randomBytes(32).toString('hex');
  const wrongKey = crypto.randomBytes(32).toString('hex');

  it('F05-BND-T1: Expired JWT token is rejected with expiration error', () => {
    const expiredToken = createTestJWT({ sub: 'old_user' }, secretKey, { exp: Math.floor(Date.now() / 1000) - 3600 });
    expect(() => verifyTestJWT(expiredToken, secretKey)).toThrow('Token expired');
  });

  it('F05-BND-T2: Token with future Not-Before (nbf) claim is rejected', () => {
    const futureToken = createTestJWT({ sub: 'future_user', nbf: Math.floor(Date.now() / 1000) + 7200 }, secretKey);
    expect(() => verifyTestJWT(futureToken, secretKey)).toThrow('not active yet');
  });

  it('F05-BND-T3: Token signed with different key fails signature verification', () => {
    const token = createTestJWT({ sub: 'admin', role: 'ADMINISTRATOR' }, wrongKey);
    expect(() => verifyTestJWT(token, secretKey)).toThrow('Signature verification failed');
  });

  it('F05-BND-T4: Malformed JWT strings with invalid segment counts throw format errors', () => {
    expect(() => verifyTestJWT('single_string', secretKey)).toThrow('Invalid JWT format');
    expect(() => verifyTestJWT('header.payload', secretKey)).toThrow('Invalid JWT format');
    expect(() => verifyTestJWT('a.b.c.d', secretKey)).toThrow('Invalid JWT format');
  });

  it('F05-BND-T5: Empty authorization header values are cleanly rejected with 401', () => {
    function processAuth(header) {
      if (!header || !header.startsWith('Bearer ')) return { status: 401 };
      const token = header.slice(7).trim();
      if (!token) return { status: 401 };
      return { status: 200 };
    }

    expect(processAuth('Bearer').status).toBe(401);
    expect(processAuth('Bearer   ').status).toBe(401);
    expect(processAuth('Basic dXNlcjpwYXNz').status).toBe(401);
  });
});
