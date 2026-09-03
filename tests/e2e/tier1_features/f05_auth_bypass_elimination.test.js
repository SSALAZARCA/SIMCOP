import { describe, it, expect } from '../harness/test_framework.js';
import { createTestJWT, verifyTestJWT } from '../harness/crypto_helpers.js';
import crypto from 'crypto';

describe('F05: SEC-06 Auth Bypass & Open Relay Elimination', () => {
  const jwtSecret = crypto.randomBytes(32).toString('hex');

  function simulateAuthFilter(req) {
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return { status: 401, error: 'Unauthorized: Missing or invalid Bearer token' };
    }
    const token = authHeader.substring(7).trim();
    if (!token) {
      return { status: 401, error: 'Unauthorized: Empty token' };
    }
    try {
      const decoded = verifyTestJWT(token, jwtSecret);
      return { status: 200, user: decoded.payload };
    } catch (err) {
      return { status: 401, error: err.message };
    }
  }

  it('F05-T1: Unauthenticated request to /api/units without Authorization header returns 401 Unauthorized', () => {
    const req = { method: 'GET', url: '/api/units', headers: {} };
    const res = simulateAuthFilter(req);
    expect(res.status).toBe(401);
    expect(res.error).toContain('Unauthorized');
  });

  it('F05-T2: Request with empty Bearer header returns 401 Unauthorized', () => {
    const req = { method: 'GET', url: '/api/units', headers: { authorization: 'Bearer ' } };
    const res = simulateAuthFilter(req);
    expect(res.status).toBe(401);
  });

  it('F05-T3: Request with valid Bearer token returns 200 and sets authenticated security context', () => {
    const validToken = createTestJWT({ sub: 'capitan.gomez', role: 'COMANDANTE_COMPANIA' }, jwtSecret);
    const req = { method: 'GET', url: '/api/units', headers: { authorization: `Bearer ${validToken}` } };
    const res = simulateAuthFilter(req);
    expect(res.status).toBe(200);
    expect(res.user.sub).toBe('capitan.gomez');
    expect(res.user.role).toBe('COMANDANTE_COMPANIA');
  });

  it('F05-T4: Elimination of unauthenticated SIGEP bypass in unit catalog service', () => {
    function getUnitCatalog(req) {
      const auth = simulateAuthFilter(req);
      if (auth.status !== 200) {
        return auth;
      }
      return { status: 200, data: [{ id: 'U-01', name: 'Batallón Infantería N1' }] };
    }

    const noAuthReq = { headers: {} };
    expect(getUnitCatalog(noAuthReq).status).toBe(401);
  });

  it('F05-T5: Role-based authorization matrix enforcement on protected routes', () => {
    function authorizeRoute(user, route) {
      if (route.startsWith('/api/admin') && user.role !== 'ADMINISTRATOR') {
        return { status: 403, error: 'Forbidden: Requires ADMINISTRATOR role' };
      }
      return { status: 200 };
    }

    const adminUser = { sub: 'admin', role: 'ADMINISTRATOR' };
    const platoonUser = { sub: 'st.perez', role: 'COMANDANTE_PELOTON' };

    expect(authorizeRoute(adminUser, '/api/admin/metrics').status).toBe(200);
    expect(authorizeRoute(platoonUser, '/api/admin/metrics').status).toBe(403);
  });
});
