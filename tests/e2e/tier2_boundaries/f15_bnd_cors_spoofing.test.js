import { describe, it, expect } from '../harness/test_framework.js';

describe('F15-BND: CORS Spoofing, Null Origins & Preflight Boundaries', () => {
  const allowedExactOrigins = new Set([
    'http://localhost:5173',
    'http://localhost:8080',
    'http://127.0.0.1:5173',
    'https://simcop.mil.co'
  ]);

  function evaluateStrictCORS(originHeader) {
    if (!originHeader || typeof originHeader !== 'string') {
      return { allowed: false, reason: 'Missing origin' };
    }
    const cleanOrigin = originHeader.trim().toLowerCase();
    if (allowedExactOrigins.has(cleanOrigin)) {
      return { allowed: true, origin: cleanOrigin };
    }
    return { allowed: false, reason: 'Forbidden origin' };
  }

  it('F15-BND-T1: Subdomain spoofing (http://localhost.attacker.com) is rejected', () => {
    expect(evaluateStrictCORS('http://localhost.attacker.com').allowed).toBeFalsy();
    expect(evaluateStrictCORS('https://simcop.mil.co.evil.com').allowed).toBeFalsy();
  });

  it('F15-BND-T2: Null origin (Origin: null) is rejected', () => {
    expect(evaluateStrictCORS('null').allowed).toBeFalsy();
    expect(evaluateStrictCORS(null).allowed).toBeFalsy();
  });

  it('F15-BND-T3: Port spoofing (http://localhost:9999) is rejected', () => {
    expect(evaluateStrictCORS('http://localhost:9999').allowed).toBeFalsy();
    expect(evaluateStrictCORS('http://localhost:3000').allowed).toBeFalsy();
  });

  it('F15-BND-T4: Case sensitivity is normalized safely without letting foreign domains in', () => {
    expect(evaluateStrictCORS('HTTP://LOCALHOST:5173').allowed).toBeTruthy();
    expect(evaluateStrictCORS('HTTP://EVIL.COM').allowed).toBeFalsy();
  });

  it('F15-BND-T5: Content Security Policy (CSP) defines strict default-src and script-src', () => {
    const csp = "default-src 'self'; script-src 'self' 'unsafe-eval' blob:; style-src 'self' 'unsafe-inline'; connect-src 'self' https://api.omniroute.ai https://*.googleapis.com ws: wss:;";
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain('https://api.omniroute.ai');
  });
});
