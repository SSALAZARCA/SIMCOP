import { describe, it, expect } from '../harness/test_framework.js';
import { encryptAES256GCM, decryptAES256GCM, createTestJWT } from '../harness/crypto_helpers.js';
import crypto from 'crypto';

describe('Pairwise 1: Superadmin + AES-256-GCM Config + Auth Context', () => {
  const masterKey = crypto.randomBytes(32).toString('hex');
  const jwtSecret = crypto.randomBytes(32).toString('hex');

  class ConfigStorageService {
    constructor() {
      this.db = new Map();
    }

    saveConfig(securityContext, configKey, configValue) {
      if (securityContext.role !== 'ADMINISTRATOR') {
        return { status: 403, error: 'Forbidden: Only administrators can configure global settings' };
      }
      const encryptedValue = encryptAES256GCM(configValue, masterKey);
      this.db.set(configKey, {
        encryptedValue,
        lastModifiedBy: securityContext.username,
        updatedAt: Date.now()
      });
      return { status: 200, message: 'Configuration saved encrypted' };
    }

    getConfig(securityContext, configKey) {
      if (securityContext.role !== 'ADMINISTRATOR') {
        return { status: 403, error: 'Forbidden' };
      }
      const item = this.db.get(configKey);
      if (!item) return { status: 404 };
      const decrypted = decryptAES256GCM(item.encryptedValue, masterKey);
      return { status: 200, key: configKey, value: decrypted, modifiedBy: item.lastModifiedBy };
    }
  }

  it('Pairwise-1.1: Superadmin configures OmniRoute API key, stored encrypted with AES-256-GCM', () => {
    const service = new ConfigStorageService();
    const superadmin = { username: 'santiago.salazar', role: 'ADMINISTRATOR' };

    const saveRes = service.saveConfig(superadmin, 'OMNIROUTE_API_KEY', 'sk-omni-live-super-secret-999');
    expect(saveRes.status).toBe(200);

    const rawInDb = service.db.get('OMNIROUTE_API_KEY');
    expect(rawInDb.encryptedValue).not.toContain('sk-omni-live');
    expect(rawInDb.encryptedValue.split(':')).toHaveLength(3); // iv:tag:data
    expect(rawInDb.lastModifiedBy).toBe('santiago.salazar');
  });

  it('Pairwise-1.2: Superadmin retrieves and decrypts stored configuration securely', () => {
    const service = new ConfigStorageService();
    const superadmin = { username: 'santiago.salazar', role: 'ADMINISTRATOR' };

    service.saveConfig(superadmin, 'TELEGRAM_BOT_TOKEN', '123456:ABC-DEF-BOT-TOKEN');
    const getRes = service.getConfig(superadmin, 'TELEGRAM_BOT_TOKEN');

    expect(getRes.status).toBe(200);
    expect(getRes.value).toBe('123456:ABC-DEF-BOT-TOKEN');
    expect(getRes.modifiedBy).toBe('santiago.salazar');
  });

  it('Pairwise-1.3: Non-administrator user attempting to save or read configuration is blocked with 403', () => {
    const service = new ConfigStorageService();
    const superadmin = { username: 'santiago.salazar', role: 'ADMINISTRATOR' };
    const operator = { username: 'carlos.platoon', role: 'COMANDANTE_PELOTON' };

    service.saveConfig(superadmin, 'JWT_SECRET_CONFIG', 'high-entropy-jwt-key');

    expect(service.saveConfig(operator, 'ATTACK', 'val').status).toBe(403);
    expect(service.getConfig(operator, 'JWT_SECRET_CONFIG').status).toBe(403);
  });
});
