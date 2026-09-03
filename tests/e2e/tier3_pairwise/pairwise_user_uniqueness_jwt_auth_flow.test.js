import { describe, it, expect } from '../harness/test_framework.js';
import { createTestJWT, verifyTestJWT } from '../harness/crypto_helpers.js';
import crypto from 'crypto';

describe('Pairwise 10: User Uniqueness Pre-validation + Password Hashing + JWT Token Issuance', () => {
  const jwtSecret = crypto.randomBytes(32).toString('hex');

  class AuthLifecycleManager {
    constructor() {
      this.users = new Map();
      this.sessions = new Map();
    }

    register(username, password, role) {
      const cleanUser = String(username).toLowerCase().trim();
      if (this.users.has(cleanUser)) {
        return { status: 409, error: 'User already exists' };
      }

      // Simulate BCrypt hashing with salt
      const salt = crypto.randomBytes(16).toString('hex');
      const hash = crypto.pbkdf2Sync(password, salt, 1000, 32, 'sha256').toString('hex');

      const userRecord = {
        id: 'usr-' + (this.users.size + 1),
        username: cleanUser,
        role: role || 'COMANDANTE_PELOTON',
        salt,
        hash
      };
      this.users.set(cleanUser, userRecord);
      return { status: 201, user: { id: userRecord.id, username: cleanUser, role: userRecord.role } };
    }

    login(username, password) {
      const cleanUser = String(username).toLowerCase().trim();
      const userRecord = this.users.get(cleanUser);
      if (!userRecord) {
        return { status: 401, error: 'Bad credentials' };
      }

      const testHash = crypto.pbkdf2Sync(password, userRecord.salt, 1000, 32, 'sha256').toString('hex');
      if (testHash !== userRecord.hash) {
        return { status: 401, error: 'Bad credentials' };
      }

      const token = createTestJWT({ sub: cleanUser, role: userRecord.role, uid: userRecord.id }, jwtSecret, { expiresIn: 3600 });
      return { status: 200, token, user: { username: cleanUser, role: userRecord.role } };
    }

    authenticateRequest(bearerHeader) {
      if (!bearerHeader || !bearerHeader.startsWith('Bearer ')) {
        return { status: 401, error: 'Missing token' };
      }
      const token = bearerHeader.slice(7).trim();
      try {
        const decoded = verifyTestJWT(token, jwtSecret);
        return { status: 200, principal: decoded.payload };
      } catch (err) {
        return { status: 401, error: err.message };
      }
    }
  }

  it('Pairwise-10.1: Full registration, login, and authenticated request lifecycle succeeds', () => {
    const manager = new AuthLifecycleManager();

    // 1. Register
    const regRes = manager.register('capitan.suarez', 'MilitaryPass2026!', 'COMANDANTE_COMPANIA');
    expect(regRes.status).toBe(201);

    // 2. Login
    const loginRes = manager.login('capitan.suarez', 'MilitaryPass2026!');
    expect(loginRes.status).toBe(200);
    expect(loginRes.token).toBeDefined();

    // 3. Authenticate request
    const authRes = manager.authenticateRequest(`Bearer ${loginRes.token}`);
    expect(authRes.status).toBe(200);
    expect(authRes.principal.sub).toBe('capitan.suarez');
    expect(authRes.principal.role).toBe('COMANDANTE_COMPANIA');
  });

  it('Pairwise-10.2: Attempt to register identical username is blocked by pre-validation', () => {
    const manager = new AuthLifecycleManager();
    manager.register('teniente.castro', 'Pass123456!', 'COMANDANTE_PELOTON');

    const dupeRes = manager.register('teniente.castro', 'OtherPass999!', 'COMANDANTE_PELOTON');
    expect(dupeRes.status).toBe(409);
  });

  it('Pairwise-10.3: Bad password during login returns 401 Bad Credentials without leaking hash', () => {
    const manager = new AuthLifecycleManager();
    manager.register('soldier_x', 'Pass123456!', 'COMANDANTE_PELOTON');

    const loginRes = manager.login('soldier_x', 'WRONG_PASSWORD');
    expect(loginRes.status).toBe(401);
    expect(loginRes.token).toBeUndefined();
  });
});
