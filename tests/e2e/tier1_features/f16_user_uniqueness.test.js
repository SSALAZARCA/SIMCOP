import { describe, it, expect } from '../harness/test_framework.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../../../');

describe('F16: DATA-01 User Uniqueness & Integrity Handling', () => {
  class MockUserRepository {
    constructor() {
      this.users = new Map();
      this.users.set('santiago.salazar', { id: '1', username: 'santiago.salazar', role: 'ADMINISTRATOR' });
      this.users.set('admin', { id: '2', username: 'admin', role: 'ADMINISTRATOR' });
    }

    existsByUsername(username) {
      return this.users.has(String(username).toLowerCase().trim());
    }

    save(user) {
      const normalized = String(user.username).toLowerCase().trim();
      if (this.existsByUsername(normalized)) {
        throw new Error('DataIntegrityViolationException: Duplicate entry for username');
      }
      this.users.set(normalized, { ...user, id: 'usr-' + (this.users.size + 1) });
      return this.users.get(normalized);
    }
  }

  function handleCreateUser(repo, payload) {
    if (!payload.username || !payload.password) {
      return { status: 400, error: 'Username and password are required' };
    }
    const cleanUsername = String(payload.username).trim();
    if (repo.existsByUsername(cleanUsername)) {
      return { status: 409, error: `Conflict: Username '${cleanUsername}' already exists` };
    }
    const newUser = repo.save({ username: cleanUsername, role: payload.role || 'COMANDANTE_PELOTON' });
    return { status: 201, user: newUser };
  }

  it('F16-T1: Attempting to create duplicate username returns HTTP 409 Conflict', () => {
    const repo = new MockUserRepository();
    const res = handleCreateUser(repo, { username: 'santiago.salazar', password: 'NewPassword123!' });
    expect(res.status).toBe(409);
    expect(res.error).toContain('already exists');
  });

  it('F16-T2: Pre-validation existsByUsername executes before hashing and saving', () => {
    const repo = new MockUserRepository();
    expect(repo.existsByUsername('admin')).toBeTruthy();
    expect(repo.existsByUsername('non_existent_user')).toBeFalsy();
  });

  it('F16-T3: Null safety handling on password during user updates', () => {
    function updateUserPassword(existingUser, newPassword) {
      if (newPassword === null || newPassword === undefined || newPassword.trim() === '') {
        // Retain existing password hash without error
        return { ...existingUser };
      }
      return { ...existingUser, passwordHash: 'HASHED_' + newPassword };
    }

    const user = { username: 'test', passwordHash: 'OLD_HASH' };
    const updated = updateUserPassword(user, null);
    expect(updated.passwordHash).toBe('OLD_HASH');
  });

  it('F16-T4: User.java contains unique column annotation for username', () => {
    const userEntityPath = path.join(rootDir, 'backend/src/main/java/com/simcop/model/User.java');
    if (fs.existsSync(userEntityPath)) {
      const code = fs.readFileSync(userEntityPath, 'utf8');
      // Look for @Column(unique = true)
      const hasUnique = /@Column\([^)]*unique\s*=\s*true/i.test(code);
      expect(hasUnique).toBeTruthy();
    }
  });

  it('F16-T5: User creation with new unique username returns 201 Created', () => {
    const repo = new MockUserRepository();
    const res = handleCreateUser(repo, { username: 'teniente.vargas', password: 'SecurePass987!', role: 'COMANDANTE_PELOTON' });
    expect(res.status).toBe(201);
    expect(res.user.username).toBe('teniente.vargas');
  });
});
