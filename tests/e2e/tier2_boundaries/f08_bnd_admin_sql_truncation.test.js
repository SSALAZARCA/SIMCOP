import { describe, it, expect } from '../harness/test_framework.js';
import { generateTOTP } from '../harness/crypto_helpers.js';

describe('F08-BND: Admin SQL Injection & Truncation Boundaries', () => {
  const allowedTables = new Set(['users', 'military_units', 'alerts', 'logistics_requests']);
  const blockedTruncateTables = new Set(['users', 'user_roles', 'admin_audit_log']);
  const admin2FASecret = 'JBSWY3DPEHPK3PXP';

  function executeAdminTableOperation(tableName, operation, totpCode, pagination = { limit: 50, offset: 0 }) {
    // Sanitize table name against injection characters
    if (!/^[a-zA-Z0-9_]+$/.test(tableName)) {
      return { status: 400, error: 'Bad Request: Table name contains invalid characters/SQL injection' };
    }

    const cleanTable = tableName.toLowerCase();
    if (!allowedTables.has(cleanTable)) {
      return { status: 400, error: `Table '${tableName}' not allowed` };
    }

    // Pagination safety
    const safeLimit = Math.max(1, Math.min(pagination.limit || 50, 500));
    const safeOffset = Math.max(0, pagination.offset || 0);

    if (operation === 'TRUNCATE') {
      if (blockedTruncateTables.has(cleanTable)) {
        return { status: 403, error: `Forbidden: Critical table '${cleanTable}' cannot be truncated` };
      }
      const validCode = generateTOTP(admin2FASecret);
      if (totpCode !== validCode) {
        return { status: 401, error: 'Unauthorized: Invalid 2FA TOTP code' };
      }
      return { status: 200, message: `Table ${cleanTable} truncated` };
    }

    return { status: 200, table: cleanTable, limit: safeLimit, offset: safeOffset };
  }

  it('F08-BND-T1: SQL injection payloads in table parameter are blocked by strict regex whitelist', () => {
    expect(executeAdminTableOperation('users; DROP TABLE alerts;--', 'SELECT').status).toBe(400);
    expect(executeAdminTableOperation('users UNION SELECT * FROM passwords', 'SELECT').status).toBe(400);
    expect(executeAdminTableOperation("users' OR '1'='1", 'SELECT').status).toBe(400);
  });

  it('F08-BND-T2: Wildcard * and special characters are rejected', () => {
    expect(executeAdminTableOperation('*', 'SELECT').status).toBe(400);
    expect(executeAdminTableOperation('users/*', 'SELECT').status).toBe(400);
  });

  it('F08-BND-T3: Truncating users table is blocked even with valid 2FA TOTP code', () => {
    const validTOTP = generateTOTP(admin2FASecret);
    const res = executeAdminTableOperation('users', 'TRUNCATE', validTOTP);
    expect(res.status).toBe(403);
  });

  it('F08-BND-T4: Non-critical table truncate requires valid 2FA and rejects bad TOTP', () => {
    const resBad2FA = executeAdminTableOperation('alerts', 'TRUNCATE', '000000');
    expect(resBad2FA.status).toBe(401);

    const validTOTP = generateTOTP(admin2FASecret);
    const resGood2FA = executeAdminTableOperation('alerts', 'TRUNCATE', validTOTP);
    expect(resGood2FA.status).toBe(200);
  });

  it('F08-BND-T5: Pagination limit is clamped to safe boundary (max 500)', () => {
    const res = executeAdminTableOperation('military_units', 'SELECT', null, { limit: 1000000, offset: -50 });
    expect(res.status).toBe(200);
    expect(res.limit).toBe(500);
    expect(res.offset).toBe(0);
  });
});
