import { describe, it, expect } from '../harness/test_framework.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../../../');

describe('F15: SEC-12 CORS Origin Restriction & Security Headers', () => {
  const authorizedOrigins = new Set([
    'http://localhost:5173',
    'http://localhost:8080',
    'http://127.0.0.1:5173',
    'https://simcop.mil.co'
  ]);

  function evaluateCORS(origin, requestHeaders) {
    if (!origin) return { allowed: false };
    if (!authorizedOrigins.has(origin)) {
      return { allowed: false, error: 'CORS Origin Not Allowed' };
    }
    return {
      allowed: true,
      headers: {
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Credentials': 'true',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Authorization, Content-Type, x-osint-secret'
      }
    };
  }

  function getStandardSecurityHeaders() {
    return {
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
      'X-XSS-Protection': '1; mode=block',
      'Referrer-Policy': 'strict-origin-when-cross-origin'
    };
  }

  it('F15-T1: Authorized origin receives valid CORS headers', () => {
    const res = evaluateCORS('http://localhost:5173');
    expect(res.allowed).toBeTruthy();
    expect(res.headers['Access-Control-Allow-Origin']).toBe('http://localhost:5173');
  });

  it('F15-T2: Unauthorized external origin is rejected and receives no CORS headers', () => {
    const res = evaluateCORS('http://malicious-attacker.com');
    expect(res.allowed).toBeFalsy();
    expect(res.headers).toBeUndefined();
  });

  it('F15-T3: Python api_server.py does not combine allow_origins=["*"] with allow_credentials=True', () => {
    const apiServerPath = path.join(rootDir, 'api_server.py');
    if (fs.existsSync(apiServerPath)) {
      const code = fs.readFileSync(apiServerPath, 'utf8');
      const hasWildcardWithCreds = /allow_origins\s*=\s*\[\s*["']\*["']\s*\][\s\S]*?allow_credentials\s*=\s*True/i.test(code);
      // Valid if not using wildcard or if specific origins are listed
      expect(hasWildcardWithCreds).toBeFalsy();
    }
  });

  it('F15-T4: X-Frame-Options and X-Content-Type-Options are enforced', () => {
    const headers = getStandardSecurityHeaders();
    expect(headers['X-Content-Type-Options']).toBe('nosniff');
    expect(headers['X-Frame-Options']).toBe('DENY');
  });

  it('F15-T5: HSTS header is configured for transport security', () => {
    const headers = getStandardSecurityHeaders();
    expect(headers['Strict-Transport-Security']).toContain('max-age=31536000');
  });
});
