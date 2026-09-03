import { describe, it, expect } from '../harness/test_framework.js';

describe('F10-BND: API Key Transmission CRLF Injection & Leakage Boundaries', () => {
  function sanitizeApiKeyHeader(rawKey) {
    if (!rawKey || typeof rawKey !== 'string') return '';
    // Strip CRLF injection characters and trim
    return rawKey.replace(/[\r\n]/g, '').trim();
  }

  function maskKeyForDisplay(apiKey) {
    if (!apiKey) return '';
    if (apiKey.length <= 8) return '********';
    return `${apiKey.substring(0, 4)}...${apiKey.substring(apiKey.length - 4)}`;
  }

  it('F10-BND-T1: CRLF injection in API key is neutralized before header injection', () => {
    const maliciousKey = 'sk-omni-live-12345\r\nSet-Cookie: sessionId=attacker_cookie\r\nX-Evil: true';
    const sanitized = sanitizeApiKeyHeader(maliciousKey);

    expect(sanitized).not.toContain('\r');
    expect(sanitized).not.toContain('\n');
    expect(sanitized).toBe('sk-omni-live-12345Set-Cookie: sessionId=attacker_cookieX-Evil: true');
  });

  it('F10-BND-T2: Leading and trailing whitespace/newlines are trimmed', () => {
    const paddedKey = '  \n\t sk-valid-key-999 \r\n  ';
    expect(sanitizeApiKeyHeader(paddedKey)).toBe('sk-valid-key-999');
  });

  it('F10-BND-T3: Masking for display shows only prefix and suffix of sensitive keys', () => {
    expect(maskKeyForDisplay('sk-omni-1234567890abcdef')).toBe('sk-o...cdef');
    expect(maskKeyForDisplay('short')).toBe('********');
  });

  it('F10-BND-T4: Empty or null API key results in clean empty header value', () => {
    expect(sanitizeApiKeyHeader('')).toBe('');
    expect(sanitizeApiKeyHeader(null)).toBe('');
  });

  it('F10-BND-T5: Oversized 4KB API key payload sanitized without crash', () => {
    const hugeKey = 'sk-' + 'A'.repeat(4096);
    const sanitized = sanitizeApiKeyHeader(hugeKey);
    expect(sanitized.length).toBe(4099);
  });
});
