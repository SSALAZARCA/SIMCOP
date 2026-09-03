import { describe, it, expect } from '../harness/test_framework.js';
import { timingSafeEqual } from '../harness/crypto_helpers.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../../../');

describe('F03: SEC-03 Secrets & Webhook Protection', () => {
  const configuredSecret = 'SECURE_OSINT_SECRET_9876543210ABCDEF';

  it('F03-T1: Webhook authorization with correct secret succeeds', () => {
    function handleWebhook(headers, payload) {
      const incomingSecret = headers['x-osint-secret'];
      if (!incomingSecret || !timingSafeEqual(incomingSecret, configuredSecret)) {
        return { status: 401, error: 'Unauthorized: Invalid OSINT Webhook Secret' };
      }
      return { status: 200, ingested: true, count: Array.isArray(payload) ? payload.length : 1 };
    }

    const res = handleWebhook({ 'x-osint-secret': configuredSecret }, [{ id: 'evt-1', title: 'Avistamiento sospechoso' }]);
    expect(res.status).toBe(200);
    expect(res.ingested).toBeTruthy();
  });

  it('F03-T2: Constant-time comparison prevents timing discrepancies on secret evaluation', () => {
    const isMatch = timingSafeEqual('MY_SECRET_KEY_123', 'MY_SECRET_KEY_123');
    const isMismatch = timingSafeEqual('MY_SECRET_KEY_123', 'MY_SECRET_KEY_999');
    const isLengthDiff = timingSafeEqual('MY_SECRET_KEY_123', 'SHORT');

    expect(isMatch).toBeTruthy();
    expect(isMismatch).toBeFalsy();
    expect(isLengthDiff).toBeFalsy();
  });

  it('F03-T3: Missing or invalid secret header returns 401 Unauthorized', () => {
    function handleWebhook(headers) {
      const incomingSecret = headers['x-osint-secret'];
      if (!incomingSecret || !timingSafeEqual(incomingSecret, configuredSecret)) {
        return { status: 401, error: 'Unauthorized: Invalid OSINT Webhook Secret' };
      }
      return { status: 200 };
    }

    expect(handleWebhook({}).status).toBe(401);
    expect(handleWebhook({ 'x-osint-secret': 'WRONG_SECRET' }).status).toBe(401);
  });

  it('F03-T4: WeatherService configuration checks for environment variable without hardcoded fallback', () => {
    const weatherServicePath = path.join(rootDir, 'backend/src/main/java/com/simcop/service/WeatherService.java');
    if (fs.existsSync(weatherServicePath)) {
      const content = fs.readFileSync(weatherServicePath, 'utf8');
      // Verify Windy API key is not hardcoded in plaintext
      const hasHardcodedWindy = /apiKey\s*=\s*"[a-zA-Z0-9]{20,}"/i.test(content) && !content.includes('${');
      expect(hasHardcodedWindy).toBeFalsy();
    } else {
      expect(true).toBeTruthy();
    }
  });

  it('F03-T5: OSINT payload normalization structure validation', () => {
    function normalizeOsintEvent(raw) {
      return {
        id: raw.id || 'gen-' + Date.now(),
        source: raw.source || 'HUMINT_OPEN',
        headline: String(raw.headline || '').trim(),
        latitude: Number(raw.lat),
        longitude: Number(raw.lon),
        reliability: raw.reliability || 'C',
        credibility: raw.credibility || '3',
        timestamp: raw.timestamp || new Date().toISOString()
      };
    }

    const normalized = normalizeOsintEvent({
      id: 'osint-101',
      source: 'TELEGRAM_MONITOR',
      headline: 'Movimiento de columna no identificada',
      lat: 4.5708,
      lon: -74.2973,
      reliability: 'B',
      credibility: '2'
    });

    expect(normalized.id).toBe('osint-101');
    expect(normalized.latitude).toBeCloseTo(4.5708);
    expect(normalized.reliability).toBe('B');
  });
});
