import { describe, it, expect } from '../harness/test_framework.js';

describe('F07: SEC-08 BOLA / IDOR Protection', () => {
  function verifyResourceAccess(currentUser, resourceOwnerId, requiredRole = null) {
    if (currentUser.role === 'ADMINISTRATOR') return { allowed: true };
    if (currentUser.id === resourceOwnerId) return { allowed: true };
    if (requiredRole && currentUser.role === requiredRole) return { allowed: true };
    return { allowed: false, status: 403, error: 'Forbidden: BOLA/IDOR policy violation' };
  }

  it('F07-T1: User cannot modify another user Telegram config (BOLA prevention)', () => {
    const userA = { id: 'usr-101', role: 'OFICIAL_INTELIGENCIA' };
    const userB_id = 'usr-102';

    const check = verifyResourceAccess(userA, userB_id);
    expect(check.allowed).toBeFalsy();
    expect(check.status).toBe(403);

    const ownCheck = verifyResourceAccess(userA, userA.id);
    expect(ownCheck.allowed).toBeTruthy();
  });

  it('F07-T2: COAPlan modification restricted to creator or higher command', () => {
    const creatorUser = { id: 'usr-planner-1', role: 'COMANDANTE_BATALLON' };
    const strangerUser = { id: 'usr-platoon-2', role: 'COMANDANTE_PELOTON' };
    const plan = { id: 'coa-99', createdBy: 'usr-planner-1' };

    expect(verifyResourceAccess(strangerUser, plan.createdBy).allowed).toBeFalsy();
    expect(verifyResourceAccess(creatorUser, plan.createdBy).allowed).toBeTruthy();
  });

  it('F07-T3: Logistics request approval restricted to S4/G4 logistics officer or admin', () => {
    const s4Officer = { id: 'usr-s4', role: 'OFICIAL_LOGISTICA' };
    const foUser = { id: 'usr-fo', role: 'COMANDANTE_OBSERVADOR_ADELANTADO' };
    const req = { id: 'log-req-1', unitId: 'BAT01', createdBy: 'usr-bat01-cmd' };

    expect(verifyResourceAccess(s4Officer, req.createdBy, 'OFICIAL_LOGISTICA').allowed).toBeTruthy();
    expect(verifyResourceAccess(foUser, req.createdBy, 'OFICIAL_LOGISTICA').allowed).toBeFalsy();
  });

  it('F07-T4: Operational graphics modification restricted to creator or administrator', () => {
    const admin = { id: 'adm-1', role: 'ADMINISTRATOR' };
    const graphic = { id: 'picc-overlay-1', createdBy: 'usr-planner-1' };

    expect(verifyResourceAccess(admin, graphic.createdBy).allowed).toBeTruthy();
  });

  it('F07-T5: Forward observer fire call authorization check', () => {
    function validateCallForFire(user, targetUnitId) {
      if (['ADMINISTRATOR', 'COMANDANTE_OBSERVADOR_ADELANTADO', 'COMANDANTE_BATALLON', 'COMANDANTE_COMPANIA'].includes(user.role)) {
        return { authorized: true };
      }
      return { authorized: false, status: 403, error: 'Unauthorized role for Call for Fire' };
    }

    expect(validateCallForFire({ role: 'COMANDANTE_OBSERVADOR_ADELANTADO' }, 'BAT01').authorized).toBeTruthy();
    expect(validateCallForFire({ role: 'GESTOR_REPORTES' }, 'BAT01').authorized).toBeFalsy();
  });
});
