import { describe, it, expect } from '../harness/test_framework.js';
import { generateTOTP } from '../harness/crypto_helpers.js';

describe('Pairwise 8: Admin Table Allowlist + Field Masking + 2FA Guard + Superadmin Shield', () => {
  const totpSecret = 'JBSWY3DPEHPK3PXP';

  class AdminSecurityService {
    constructor() {
      this.tables = new Map();
      this.tables.set('users', [
        { id: '1', username: 'santiago.salazar', password_hash: '$2a$10$...hash...', two_factor_secret: totpSecret, role: 'ADMINISTRATOR' },
        { id: '2', username: 'soldier_2', password_hash: '$2a$10$...pass...', two_factor_secret: 'SECRET2', role: 'COMANDANTE_PELOTON' }
      ]);
      this.tables.set('alerts', [
        { id: 'alt-1', title: 'Unidad en silencio radial >4h', severity: 'HIGH' }
      ]);
    }

    queryTable(securityContext, tableName) {
      if (securityContext.role !== 'ADMINISTRATOR') {
        return { status: 403, error: 'Forbidden: Admin access only' };
      }
      if (!this.tables.has(tableName)) {
        return { status: 400, error: `Table '${tableName}' is not whitelisted` };
      }

      const rawRows = this.tables.get(tableName);
      // Apply automatic masking on sensitive columns
      const maskedRows = rawRows.map(row => {
        const copy = { ...row };
        if (copy.password_hash) copy.password_hash = '********';
        if (copy.two_factor_secret) copy.two_factor_secret = '********';
        return copy;
      });

      return { status: 200, rows: maskedRows };
    }

    truncateTable(securityContext, tableName, totpCode) {
      if (securityContext.role !== 'ADMINISTRATOR') {
        return { status: 403, error: 'Forbidden' };
      }
      if (tableName === 'users' || tableName === 'user_roles') {
        return { status: 403, error: 'Forbidden: Truncation of users table is immutable and strictly blocked' };
      }

      const validTotp = generateTOTP(totpSecret);
      if (totpCode !== validTotp) {
        return { status: 401, error: 'Unauthorized: Invalid 2FA TOTP code' };
      }

      this.tables.set(tableName, []);
      return { status: 200, message: `Table ${tableName} truncated` };
    }
  }

  it('Pairwise-8.1: Querying users table returns masked passwords and 2FA secrets', () => {
    const service = new AdminSecurityService();
    const adminUser = { username: 'santiago.salazar', role: 'ADMINISTRATOR' };
    const res = service.queryTable(adminUser, 'users');

    expect(res.status).toBe(200);
    expect(res.rows).toHaveLength(2);
    expect(res.rows[0].password_hash).toBe('********');
    expect(res.rows[0].two_factor_secret).toBe('********');
    expect(res.rows[0].username).toBe('santiago.salazar');
  });

  it('Pairwise-8.2: Truncation of users table is permanently blocked even with valid 2FA TOTP', () => {
    const service = new AdminSecurityService();
    const adminUser = { username: 'santiago.salazar', role: 'ADMINISTRATOR' };
    const validTotp = generateTOTP(totpSecret);

    const res = service.truncateTable(adminUser, 'users', validTotp);
    expect(res.status).toBe(403);
    expect(res.error).toContain('strictly blocked');
  });

  it('Pairwise-8.3: Truncating non-critical table requires valid 2FA TOTP authentication', () => {
    const service = new AdminSecurityService();
    const adminUser = { username: 'santiago.salazar', role: 'ADMINISTRATOR' };

    // Bad TOTP
    const badRes = service.truncateTable(adminUser, 'alerts', '000000');
    expect(badRes.status).toBe(401);

    // Good TOTP
    const validTotp = generateTOTP(totpSecret);
    const goodRes = service.truncateTable(adminUser, 'alerts', validTotp);
    expect(goodRes.status).toBe(200);
  });
});
