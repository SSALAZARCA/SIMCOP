import { describe, it, expect } from '../harness/test_framework.js';
import { createTestJWT } from '../harness/crypto_helpers.js';
import crypto from 'crypto';

describe('Pairwise 3: Auth Bypass Elimination + BOLA Protection + Security Context', () => {
  const jwtSecret = crypto.randomBytes(32).toString('hex');

  class TacticalDataStore {
    constructor() {
      this.units = new Map();
      this.units.set('BAT_01', { id: 'BAT_01', name: 'Batallón Infantería 1', commander: 'coronel.lopez', division: 'DIV01' });
      this.units.set('BAT_02', { id: 'BAT_02', name: 'Batallón Infantería 2', commander: 'teniente.vargas', division: 'DIV02' });
    }

    getUnit(userPrincipal, unitId) {
      if (!userPrincipal) {
        return { status: 401, error: 'Unauthorized: Authentication required' };
      }

      const unit = this.units.get(unitId);
      if (!unit) return { status: 404, error: 'Unit not found' };

      // BOLA check: Commander can only update/view detailed subordinate telemetry of own unit, unless Division / Army command
      const isCommander = unit.commander === userPrincipal.username;
      const isHighCommand = ['ADMINISTRATOR', 'COMANDANTE_EJERCITO', 'COMANDANTE_DIVISION'].includes(userPrincipal.role);

      if (!isCommander && !isHighCommand) {
        return { status: 403, error: 'Forbidden: Access restricted by operational boundary' };
      }

      return { status: 200, unit };
    }
  }

  it('Pairwise-3.1: Unauthenticated request is rejected immediately with 401 (no SIGEP bypass)', () => {
    const store = new TacticalDataStore();
    const res = store.getUnit(null, 'BAT_01');
    expect(res.status).toBe(401);
  });

  it('Pairwise-3.2: Commander of BAT_01 can access own unit data', () => {
    const store = new TacticalDataStore();
    const commanderUser = { username: 'coronel.lopez', role: 'COMANDANTE_BATALLON' };
    const res = store.getUnit(commanderUser, 'BAT_01');

    expect(res.status).toBe(200);
    expect(res.unit.name).toBe('Batallón Infantería 1');
  });

  it('Pairwise-3.3: Commander of BAT_01 is blocked with 403 when attempting to access BAT_02 (BOLA prevention)', () => {
    const store = new TacticalDataStore();
    const commanderUser = { username: 'coronel.lopez', role: 'COMANDANTE_BATALLON' };
    const res = store.getUnit(commanderUser, 'BAT_02');

    expect(res.status).toBe(403);
    expect(res.error).toContain('Forbidden');
  });

  it('Pairwise-3.4: Division Commander and Administrator can access all units in theater', () => {
    const store = new TacticalDataStore();
    const divCmd = { username: 'general.rojas', role: 'COMANDANTE_DIVISION' };
    const admin = { username: 'santiago.salazar', role: 'ADMINISTRATOR' };

    expect(store.getUnit(divCmd, 'BAT_01').status).toBe(200);
    expect(store.getUnit(divCmd, 'BAT_02').status).toBe(200);
    expect(store.getUnit(admin, 'BAT_01').status).toBe(200);
    expect(store.getUnit(admin, 'BAT_02').status).toBe(200);
  });
});
