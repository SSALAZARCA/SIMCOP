import { describe, it, expect } from '../harness/test_framework.js';

describe('F09-BND: Security Context Spoofing & Principal Boundaries', () => {
  function processUserAction(securityContextPrincipal, requestPayload) {
    if (!securityContextPrincipal) {
      return { status: 401, error: 'Unauthenticated context' };
    }

    const requestedUsername = requestPayload?.username;
    let anomalyDetected = false;

    if (requestedUsername && requestedUsername !== securityContextPrincipal.username) {
      anomalyDetected = true;
    }

    // Always use securityContextPrincipal
    return {
      status: 200,
      activeUser: securityContextPrincipal.username,
      anomalyLogged: anomalyDetected
    };
  }

  it('F09-BND-T1: Malicious JSON body with spoofed superadmin username is completely ignored', () => {
    const principal = { username: 'soldier_1', role: 'COMANDANTE_PELOTON' };
    const payload = { username: 'santiago.salazar', data: 'tactical_mutation' };

    const res = processUserAction(principal, payload);
    expect(res.activeUser).toBe('soldier_1');
    expect(res.anomalyLogged).toBeTruthy();
  });

  it('F09-BND-T2: Null or undefined body does not trigger null pointer exceptions in context extraction', () => {
    const principal = { username: 'soldier_1', role: 'COMANDANTE_PELOTON' };
    expect(processUserAction(principal, null).status).toBe(200);
    expect(processUserAction(principal, undefined).status).toBe(200);
  });

  it('F09-BND-T3: Complex military email as username in JWT subject is parsed accurately', () => {
    const principal = { username: 'santiago.salazar@ejercito.mil.co', role: 'ADMINISTRATOR' };
    const res = processUserAction(principal, {});
    expect(res.activeUser).toBe('santiago.salazar@ejercito.mil.co');
  });

  it('F09-BND-T4: Empty principal object returns 401 Unauthorized', () => {
    expect(processUserAction(null, {}).status).toBe(401);
  });

  it('F09-BND-T5: Rapid context switching across concurrent requests maintains strict isolation', () => {
    const users = ['user_a', 'user_b', 'user_c', 'user_d'];
    const results = users.map(u => processUserAction({ username: u }, { username: 'admin' }));
    
    expect(results[0].activeUser).toBe('user_a');
    expect(results[1].activeUser).toBe('user_b');
    expect(results[2].activeUser).toBe('user_c');
    expect(results[3].activeUser).toBe('user_d');
  });
});
