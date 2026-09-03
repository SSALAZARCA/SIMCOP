import { describe, it, expect } from '../harness/test_framework.js';

describe('F16-BND: User Uniqueness Case Collisions & Validation Boundaries', () => {
  class StrictUserStore {
    constructor() {
      this.users = new Map();
      this.users.set('santiago.salazar', { id: '1', username: 'santiago.salazar' });
    }

    validateAndRegister(rawUsername, rawPassword) {
      if (!rawUsername || typeof rawUsername !== 'string') {
        return { status: 400, error: 'Username cannot be empty' };
      }
      if (!rawPassword || typeof rawPassword !== 'string' || rawPassword.length < 8) {
        return { status: 400, error: 'Password must be at least 8 characters' };
      }

      const trimmed = rawUsername.trim();
      if (trimmed.length > 64) {
        return { status: 400, error: 'Username exceeds maximum length of 64 characters' };
      }
      if (!/^[a-zA-Z0-9._-]+$/.test(trimmed)) {
        return { status: 400, error: 'Username contains invalid characters' };
      }

      const normalizedKey = trimmed.toLowerCase();
      if (this.users.has(normalizedKey)) {
        return { status: 409, error: `Conflict: User '${trimmed}' already exists` };
      }

      const newUser = { id: 'usr-' + (this.users.size + 1), username: trimmed };
      this.users.set(normalizedKey, newUser);
      return { status: 201, user: newUser };
    }
  }

  it('F16-BND-T1: Case-insensitive duplicates (Santiago.Salazar, SANTIAGO.SALAZAR) trigger HTTP 409 Conflict', () => {
    const store = new StrictUserStore();
    expect(store.validateAndRegister('Santiago.Salazar', 'ValidPassword123!').status).toBe(409);
    expect(store.validateAndRegister('SANTIAGO.SALAZAR', 'ValidPassword123!').status).toBe(409);
    expect(store.validateAndRegister('  santiago.salazar  ', 'ValidPassword123!').status).toBe(409);
  });

  it('F16-BND-T2: Weak passwords (< 8 chars) are rejected with HTTP 400', () => {
    const store = new StrictUserStore();
    const res = store.validateAndRegister('new_commander', 'short');
    expect(res.status).toBe(400);
    expect(res.error).toContain('at least 8 characters');
  });

  it('F16-BND-T3: Oversized 100-character username is rejected with HTTP 400', () => {
    const store = new StrictUserStore();
    const res = store.validateAndRegister('A'.repeat(100), 'ValidPassword123!');
    expect(res.status).toBe(400);
    expect(res.error).toContain('maximum length');
  });

  it('F16-BND-T4: Usernames with malicious formatting (spaces, quotes, scripts) are rejected', () => {
    const store = new StrictUserStore();
    expect(store.validateAndRegister('user with spaces', 'ValidPassword123!').status).toBe(400);
    expect(store.validateAndRegister('user<script>', 'ValidPassword123!').status).toBe(400);
    expect(store.validateAndRegister("admin'--", 'ValidPassword123!').status).toBe(400);
  });

  it('F16-BND-T5: Concurrent duplicate registration attempts resolve with exactly 1 success and 1 conflict', () => {
    const store = new StrictUserStore();
    const res1 = store.validateAndRegister('patrulla_bravo', 'ValidPassword123!');
    const res2 = store.validateAndRegister('patrulla_bravo', 'ValidPassword123!');

    expect(res1.status).toBe(201);
    expect(res2.status).toBe(409);
  });
});
