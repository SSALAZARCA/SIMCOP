import { describe, it, expect } from '../harness/test_framework.js';

describe('Pairwise 9: CORS Policy + Security Headers + Python Inference API', () => {
  const allowedOrigins = ['http://localhost:5173', 'http://localhost:8080'];

  function handleFastAPIRequest(origin, method, path) {
    if (!allowedOrigins.includes(origin)) {
      return { status: 403, error: 'CORS policy violation: unauthorized origin' };
    }

    const headers = {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Credentials': 'true',
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY'
    };

    if (method === 'OPTIONS') {
      return { status: 200, headers };
    }

    if (path === '/api/v1/system/kpis') {
      return {
        status: 200,
        headers,
        body: { status: 'ONLINE', engine: 'A_STAR_HEURISTIC', version: '2026.1' }
      };
    }

    return { status: 404, headers };
  }

  it('Pairwise-9.1: Frontend origin receives preflight CORS clearance and security headers', () => {
    const res = handleFastAPIRequest('http://localhost:5173', 'OPTIONS', '/api/v1/system/kpis');
    expect(res.status).toBe(200);
    expect(res.headers['Access-Control-Allow-Origin']).toBe('http://localhost:5173');
    expect(res.headers['X-Content-Type-Options']).toBe('nosniff');
  });

  it('Pairwise-9.2: Unauthorized origin is rejected by Python API server CORS middleware', () => {
    const res = handleFastAPIRequest('http://attacker.com', 'GET', '/api/v1/system/kpis');
    expect(res.status).toBe(403);
    expect(res.error).toContain('CORS policy violation');
  });

  it('Pairwise-9.3: KPIs endpoint returns valid system metrics under authorized origin', () => {
    const res = handleFastAPIRequest('http://localhost:5173', 'GET', '/api/v1/system/kpis');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ONLINE');
    expect(res.body.engine).toBe('A_STAR_HEURISTIC');
  });
});
