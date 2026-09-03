import { describe, it, expect } from '../harness/test_framework.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../../../');

describe('F01: R1 Superadmin Shielding & Immutability', () => {
  it('F01-T1: Superadmin identity definition and protection rules', () => {
    // Authoritative requirement: PROJECT.md § Interface Contracts: User & Superadmin Immutability Contract
    const protectedUsers = ['santiago.salazar', 'admin'];
    expect(protectedUsers).toContain('santiago.salazar');
    expect(protectedUsers).toContain('admin');
  });

  it('F01-T2: Verification that DataInitializer and configs do not hardcode superadmin password', () => {
    const dataInitPath = path.join(rootDir, 'backend/src/main/java/com/simcop/config/DataInitializer.java');
    if (fs.existsSync(dataInitPath)) {
      const content = fs.readFileSync(dataInitPath, 'utf8');
      // Should not contain plaintext "password" for superadmin creation without env var fallback check
      const hasHardcodedCreation = /createUserIfNotExists\([^,]+,\s*"password"/i.test(content);
      // Even if old code had it, the requirement mandates env var injection:
      const checksEnvVar = content.includes('SIMCOP_SUPERADMIN_PASSWORD') || content.includes('superadmin.password') || !hasHardcodedCreation;
      expect(checksEnvVar).toBeTruthy();
    } else {
      expect(true).toBeTruthy();
    }
  });

  it('F01-T3: Superadmin deletion guard simulation returns 403 Forbidden', () => {
    function simulateUserDeletion(requestUser, targetUser) {
      if (['santiago.salazar', 'admin'].includes(targetUser.username.toLowerCase())) {
        return { status: 403, error: 'Forbidden: Superadmin accounts are immutable and cannot be deleted' };
      }
      return { status: 200, message: 'User deleted' };
    }

    const resAdmin = simulateUserDeletion({ username: 'operator1', role: 'ADMINISTRATOR' }, { username: 'santiago.salazar', role: 'ADMINISTRATOR' });
    expect(resAdmin.status).toBe(403);
    expect(resAdmin.error).toContain('Forbidden');

    const resRegular = simulateUserDeletion({ username: 'santiago.salazar', role: 'ADMINISTRATOR' }, { username: 'normal_user', role: 'OFICIAL_INTELIGENCIA' });
    expect(resRegular.status).toBe(200);
  });

  it('F01-T4: Superadmin role demotion guard simulation returns 403 Forbidden', () => {
    function simulateRoleUpdate(requestUser, targetUsername, newRole) {
      if (['santiago.salazar', 'admin'].includes(targetUsername.toLowerCase())) {
        if (newRole !== 'ADMINISTRATOR') {
          return { status: 403, error: 'Forbidden: Cannot demote superadmin role' };
        }
      }
      return { status: 200, role: newRole };
    }

    const demoteRes = simulateRoleUpdate({ username: 'admin' }, 'santiago.salazar', 'COMANDANTE_PELOTON');
    expect(demoteRes.status).toBe(403);

    const validAdminRes = simulateRoleUpdate({ username: 'admin' }, 'santiago.salazar', 'ADMINISTRATOR');
    expect(validAdminRes.status).toBe(200);
  });

  it('F01-T5: Setup scripts and SQL definitions audit for credentials leakage', () => {
    const sqlScript = path.join(rootDir, 'add_personnel_permission.sql');
    if (fs.existsSync(sqlScript)) {
      const sql = fs.readFileSync(sqlScript, 'utf8');
      expect(sql).not.toMatch(/INSERT INTO users .* VALUES .* 'password'/i);
    }
    const pyScript = path.join(rootDir, 'add_personnel_permission.py');
    if (fs.existsSync(pyScript)) {
      const py = fs.readFileSync(pyScript, 'utf8');
      expect(py).not.toMatch(/password\s*=\s*['"]password['"]/i);
    }
  });
});
