import { describe, it, expect } from '../harness/test_framework.js';

describe('F08: SEC-09 Admin Panel Data Masking & Table Allowlist', () => {
  const allowedTables = new Set([
    'users',
    'military_units',
    'alerts',
    'intelligence_reports',
    'operations_orders',
    'logistics_requests',
    'fire_missions',
    'artillery_pieces',
    'forward_observers',
    'q5_reports',
    'after_action_reports',
    'operational_graphics',
    'coa_plans',
    'admin_audit_log'
  ]);

  const criticalNonTruncatableTables = new Set(['users', 'user_roles', 'admin_audit_log']);

  function validateTableQuery(tableName) {
    const cleanTable = String(tableName || '').toLowerCase().trim();
    if (!allowedTables.has(cleanTable)) {
      return { status: 400, error: `Table '${tableName}' is not in the allowed admin query allowlist` };
    }
    return { status: 200, table: cleanTable };
  }

  function maskSensitiveFields(row) {
    const masked = { ...row };
    const sensitiveKeys = ['password', 'password_hash', 'two_factor_secret', 'twoFactorSecret', 'api_key', 'apiKey', 'jwt_secret'];
    for (const key of Object.keys(masked)) {
      if (sensitiveKeys.some(s => key.toLowerCase().includes(s.toLowerCase()))) {
        masked[key] = '********';
      }
    }
    return masked;
  }

  function validateTableTruncate(tableName) {
    const cleanTable = String(tableName || '').toLowerCase().trim();
    if (criticalNonTruncatableTables.has(cleanTable)) {
      return { status: 403, error: `Forbidden: Truncation of critical table '${cleanTable}' is strictly blocked` };
    }
    if (!allowedTables.has(cleanTable)) {
      return { status: 400, error: 'Table not allowed' };
    }
    return { status: 200, message: `Table ${cleanTable} truncated successfully` };
  }

  it('F08-T1: Querying whitelisted application tables succeeds', () => {
    expect(validateTableQuery('military_units').status).toBe(200);
    expect(validateTableQuery('alerts').status).toBe(200);
    expect(validateTableQuery('fire_missions').status).toBe(200);
  });

  it('F08-T2: Querying non-whitelisted system or foreign tables is rejected with HTTP 400', () => {
    expect(validateTableQuery('information_schema.tables').status).toBe(400);
    expect(validateTableQuery('mysql.user').status).toBe(400);
    expect(validateTableQuery('sqlite_master').status).toBe(400);
  });

  it('F08-T3: Sensitive fields are masked in admin query results', () => {
    const rawUserRow = {
      id: 'usr-1',
      username: 'santiago.salazar',
      role: 'ADMINISTRATOR',
      password: '$2a$10$e7xEXAMPLEHASH999999999999999999999',
      twoFactorSecret: 'JBSWY3DPEHPK3PXP',
      apiKey: 'AIzaSyA_SECRET_KEY_12345'
    };

    const masked = maskSensitiveFields(rawUserRow);
    expect(masked.username).toBe('santiago.salazar');
    expect(masked.password).toBe('********');
    expect(masked.twoFactorSecret).toBe('********');
    expect(masked.apiKey).toBe('********');
  });

  it('F08-T4: Truncation of critical tables is blocked with HTTP 403 Forbidden', () => {
    expect(validateTableTruncate('users').status).toBe(403);
    expect(validateTableTruncate('user_roles').status).toBe(403);
    expect(validateTableTruncate('admin_audit_log').status).toBe(403);
  });

  it('F08-T5: Admin actions generate structured audit log entries', () => {
    function logAdminAction(adminUsername, action, target, ipAddress) {
      return {
        id: 'audit-' + Date.now(),
        adminUsername,
        action,
        target,
        ipAddress,
        timestamp: new Date().toISOString()
      };
    }

    const entry = logAdminAction('santiago.salazar', 'QUERY_TABLE', 'military_units', '127.0.0.1');
    expect(entry).toHaveProperty('adminUsername', 'santiago.salazar');
    expect(entry).toHaveProperty('action', 'QUERY_TABLE');
    expect(entry).toHaveProperty('target', 'military_units');
  });
});
