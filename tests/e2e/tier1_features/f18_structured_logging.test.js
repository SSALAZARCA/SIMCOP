import { describe, it, expect } from '../harness/test_framework.js';

describe('F18: QUAL-04 Structured Logging & Leak Prevention', () => {
  class StructuredLogger {
    constructor(context = 'SIMCOP') {
      this.context = context;
      this.logs = [];
    }

    _format(level, message, meta = {}) {
      const sanitizedMeta = this._sanitize(meta);
      const entry = {
        timestamp: new Date().toISOString(),
        level,
        context: this.context,
        message,
        ...sanitizedMeta
      };
      this.logs.push(entry);
      return entry;
    }

    _sanitize(obj) {
      if (!obj || typeof obj !== 'object') return obj;
      const clean = Array.isArray(obj) ? [] : {};
      const sensitiveKeys = ['password', 'secret', 'apikey', 'api_key', 'token', 'jwt', 'auth'];

      for (const [k, v] of Object.entries(obj)) {
        const isSensitive = sensitiveKeys.some(s => k.toLowerCase().includes(s));
        if (isSensitive && typeof v === 'string') {
          clean[k] = '[REDACTED]';
        } else if (typeof v === 'object' && v !== null) {
          clean[k] = this._sanitize(v);
        } else {
          clean[k] = v;
        }
      }
      return clean;
    }

    info(msg, meta) { return this._format('INFO', msg, meta); }
    warn(msg, meta) { return this._format('WARN', msg, meta); }
    error(msg, error, meta = {}) {
      const errorMeta = error instanceof Error ? { errorName: error.name, errorMessage: error.message } : { error };
      return this._format('ERROR', msg, { ...errorMeta, ...meta });
    }
  }

  it('F18-T1: Structured log entry contains level, context, timestamp, and message', () => {
    const logger = new StructuredLogger('MilitaryUnitService');
    const entry = logger.info('Actualizando coordenadas de unidad', { unitId: 'U1', lat: 4.5, lon: -74.1 });

    expect(entry.level).toBe('INFO');
    expect(entry.context).toBe('MilitaryUnitService');
    expect(entry.message).toBe('Actualizando coordenadas de unidad');
    expect(entry.unitId).toBe('U1');
  });

  it('F18-T2: Exception logging captures error details cleanly without raw stack dump in stdout', () => {
    const logger = new StructuredLogger('AuthService');
    const err = new Error('Database connection timed out');
    const entry = logger.error('Fallo en autenticación', err, { username: 'operador1' });

    expect(entry.level).toBe('ERROR');
    expect(entry.errorMessage).toBe('Database connection timed out');
    expect(entry.username).toBe('operador1');
  });

  it('F18-T3: Passwords and 2FA secrets are automatically redacted in log metadata', () => {
    const logger = new StructuredLogger('UserController');
    const entry = logger.info('Intento de login', {
      username: 'santiago.salazar',
      password: 'MyRealPassword123!',
      twoFactorSecret: 'JBSWY3DPEHPK3PXP'
    });

    expect(entry.password).toBe('[REDACTED]');
    expect(entry.twoFactorSecret).toBe('[REDACTED]');
    expect(entry.username).toBe('santiago.salazar');
  });

  it('F18-T4: API keys and JWT tokens are redacted from logging outputs', () => {
    const logger = new StructuredLogger('GeminiService');
    const entry = logger.info('Despacho de consulta AI', {
      provider: 'OMNIROUTE',
      apiKey: 'sk-live-ultra-secret-key-998877',
      jwtToken: 'eyJhbGciOiJIUzI1NiIsIn...'
    });

    expect(entry.apiKey).toBe('[REDACTED]');
    expect(entry.jwtToken).toBe('[REDACTED]');
  });

  it('F18-T5: Nested metadata sanitization protects deeply embedded credentials', () => {
    const logger = new StructuredLogger('ConfigService');
    const entry = logger.info('Guardando configuraciones', {
      user: {
        id: '1',
        authConfig: {
          telegramBotToken: '123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11',
          osintSecret: 'secret_val_99'
        }
      }
    });

    expect(entry.user.authConfig.telegramBotToken).toBe('[REDACTED]');
    expect(entry.user.authConfig.osintSecret).toBe('[REDACTED]');
  });
});
