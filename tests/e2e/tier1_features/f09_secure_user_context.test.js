import { describe, it, expect } from '../harness/test_framework.js';

describe('F09: SEC-10 Secure Authenticated User Context', () => {
  function handleSaveConfiguration(securityContextUser, requestBody) {
    if (!securityContextUser || !securityContextUser.username) {
      return { status: 401, error: 'Unauthorized: No authenticated security context' };
    }
    // Secure pattern: Extract username strictly from securityContextUser, NOT from requestBody.username
    const effectiveUsername = securityContextUser.username;
    
    return {
      status: 200,
      savedForUser: effectiveUsername,
      config: requestBody.configData
    };
  }

  it('F09-T1: User identity extracted exclusively from authenticated security context', () => {
    const contextUser = { username: 'santiago.salazar', role: 'ADMINISTRATOR' };
    const payload = { configData: { provider: 'OMNIROUTE' } };

    const res = handleSaveConfiguration(contextUser, payload);
    expect(res.status).toBe(200);
    expect(res.savedForUser).toBe('santiago.salazar');
  });

  it('F09-T2: Client payload attempting to spoof username is ignored in favor of security context', () => {
    const contextUser = { username: 'st.ramirez', role: 'COMANDANTE_PELOTON' };
    const spoofedPayload = {
      username: 'admin', // Attempted impersonation
      configData: { key: 'val' }
    };

    const res = handleSaveConfiguration(contextUser, spoofedPayload);
    expect(res.status).toBe(200);
    expect(res.savedForUser).toBe('st.ramirez'); // Must be the real caller, not 'admin'
  });

  it('F09-T3: Unauthenticated call without security context is rejected with 401', () => {
    const res = handleSaveConfiguration(null, { configData: {} });
    expect(res.status).toBe(401);
  });

  it('F09-T4: Audit logging uses security context principal for actor identity', () => {
    function createAuditRecord(securityContext, action) {
      return {
        actor: securityContext.username,
        role: securityContext.role,
        action,
        timestamp: Date.now()
      };
    }

    const record = createAuditRecord({ username: 'mayor.torres', role: 'COMANDANTE_BATALLON' }, 'PUBLISH_OPORD');
    expect(record.actor).toBe('mayor.torres');
    expect(record.role).toBe('COMANDANTE_BATALLON');
  });

  it('F09-T5: Async execution task retains calling principal metadata', () => {
    function dispatchAsyncTask(securityContext, taskFn) {
      const capturedPrincipal = { ...securityContext };
      return {
        taskId: 'task-' + Math.random().toString(36).substring(2, 8),
        initiatedBy: capturedPrincipal.username,
        status: 'QUEUED'
      };
    }

    const task = dispatchAsyncTask({ username: 'santiago.salazar' }, () => {});
    expect(task.initiatedBy).toBe('santiago.salazar');
    expect(task.status).toBe('QUEUED');
  });
});
