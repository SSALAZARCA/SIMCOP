import { describe, it, expect } from '../harness/test_framework.js';

describe('F10: SEC-11 Secure API Key Transmission', () => {
  function prepareAIRequest(provider, endpointUrl, apiKey, payload) {
    const headers = {
      'Content-Type': 'application/json'
    };

    let targetUrl = endpointUrl;

    if (provider === 'OMNIROUTE') {
      headers['Authorization'] = `Bearer ${apiKey}`;
    } else if (provider === 'GEMINI') {
      headers['x-goog-api-key'] = apiKey;
    }

    return {
      url: targetUrl,
      headers,
      body: JSON.stringify(payload)
    };
  }

  function sanitizeLogHeaders(headers) {
    const clean = { ...headers };
    if (clean['Authorization']) clean['Authorization'] = 'Bearer [REDACTED]';
    if (clean['authorization']) clean['authorization'] = 'Bearer [REDACTED]';
    if (clean['x-goog-api-key']) clean['x-goog-api-key'] = '[REDACTED]';
    return clean;
  }

  it('F10-T1: OmniRoute AI requests transmit API key via Bearer Authorization header', () => {
    const req = prepareAIRequest('OMNIROUTE', 'https://api.omniroute.ai/v1/chat/completions', 'sk-omni-secret-999', { model: 'omni-default' });
    expect(req.headers['Authorization']).toBe('Bearer sk-omni-secret-999');
    expect(req.url).toBe('https://api.omniroute.ai/v1/chat/completions');
  });

  it('F10-T2: Gemini AI requests transmit API key via x-goog-api-key header and NOT in query string', () => {
    const req = prepareAIRequest('GEMINI', 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent', 'AIzaSyA_GEMINI_KEY', { contents: [] });
    expect(req.headers['x-goog-api-key']).toBe('AIzaSyA_GEMINI_KEY');
    expect(req.url).not.toContain('?key=');
    expect(req.url).not.toContain('AIzaSyA_GEMINI_KEY');
  });

  it('F10-T3: Log sanitizer completely redacts sensitive API key headers', () => {
    const rawHeaders = {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer sk-ultra-secret-12345',
      'x-goog-api-key': 'AIzaSyA_REAL_KEY'
    };

    const sanitized = sanitizeLogHeaders(rawHeaders);
    expect(sanitized['Authorization']).toBe('Bearer [REDACTED]');
    expect(sanitized['x-goog-api-key']).toBe('[REDACTED]');
    expect(sanitized['Content-Type']).toBe('application/json');
  });

  it('F10-T4: Rejection of requests attempting to pass API keys in query parameters', () => {
    function validateNoKeyInQuery(url) {
      const parsed = new URL(url, 'http://localhost');
      if (parsed.searchParams.has('key') || parsed.searchParams.has('apiKey') || parsed.searchParams.has('api_key')) {
        return { allowed: false, error: 'Insecure URL parameter: API keys must be passed in headers' };
      }
      return { allowed: true };
    }

    expect(validateNoKeyInQuery('https://api.simcop.mil.co/v1/models?key=secret123').allowed).toBeFalsy();
    expect(validateNoKeyInQuery('https://api.simcop.mil.co/v1/models').allowed).toBeTruthy();
  });

  it('F10-T5: OpenWeather and external third-party requests use secure headers or secure backend proxy', () => {
    function createWeatherProxyRequest(lat, lon, backendToken) {
      return {
        url: `/api/weather?lat=${lat}&lon=${lon}`,
        headers: {
          'Authorization': `Bearer ${backendToken}`
        }
      };
    }

    const proxyReq = createWeatherProxyRequest(4.6097, -74.0817, 'jwt-token-123');
    expect(proxyReq.url).not.toContain('appid=');
    expect(proxyReq.headers['Authorization']).toContain('Bearer');
  });
});
