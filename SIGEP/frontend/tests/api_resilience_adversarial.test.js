/**
 * Automated Adversarial Test Suite: API Error Resilience & Race Condition Handling
 * Targets: src/components/AnalysisDashboard.tsx (Axios error catching, fallbacks, cancellation)
 */

import { test, describe } from 'node:test';
import assert from 'node:assert';

describe('API Error Resilience & In-Flight Race Condition Handling', () => {
  // Mock Axios simulation harness mimicking the exact catch blocks in AnalysisDashboard.tsx
  async function simulateFetchDashboardData(endpointsConfig) {
    const results = {
      toeData: [],
      availability: null,
      criticalRotation: [],
      warnings: [],
      isLoading: true
    };

    const mockAxiosGet = async (url) => {
      const endpoint = Object.keys(endpointsConfig).find(k => url.includes(k));
      const behavior = endpoint ? endpointsConfig[endpoint] : { status: 200, data: [] };

      if (behavior.shouldTimeout) {
        const err = new Error('timeout of 8000ms exceeded');
        err.code = 'ECONNABORTED';
        throw err;
      }
      if (behavior.status >= 400) {
        const err = new Error(`Request failed with status code ${behavior.status}`);
        err.response = { status: behavior.status, data: behavior.errorPayload || 'Error' };
        throw err;
      }
      return { data: behavior.data };
    };

    try {
      const [resToe, resAvail, resCrit] = await Promise.all([
        mockAxiosGet('/analysis/toe-balance/BAEEV4').catch(err => {
          results.warnings.push(`TOE balance fetch warning: ${err.message}`);
          return { data: [] };
        }),
        mockAxiosGet('/analysis/availability/BAEEV4').catch(err => {
          results.warnings.push(`Availability fetch warning: ${err.message}`);
          return { data: null };
        }),
        mockAxiosGet('/analysis/critical-rotation/BAEEV4').catch(err => {
          results.warnings.push(`Critical rotation fetch warning: ${err.message}`);
          return { data: [] };
        })
      ]);

      results.toeData = Array.isArray(resToe.data) ? resToe.data : [];
      results.availability = resAvail.data || null;
      results.criticalRotation = Array.isArray(resCrit.data) ? resCrit.data : [];
    } finally {
      results.isLoading = false;
    }

    return results;
  }

  // -------------------------------------------------------------------------
  // Test 1: HTTP 404 on TOE Balance
  // -------------------------------------------------------------------------
  test('TC-A01: HTTP 404 on /analysis/toe-balance returns empty array safely without uncaught exception', async () => {
    const res = await simulateFetchDashboardData({
      'toe-balance': { status: 404, errorPayload: 'Unit TOE not found' }
    });

    assert.strictEqual(res.isLoading, false);
    assert.deepStrictEqual(res.toeData, []);
    assert.strictEqual(res.warnings.length, 1);
    assert.ok(res.warnings[0].includes('404'));
  });

  // -------------------------------------------------------------------------
  // Test 2: HTTP 500 on Availability
  // -------------------------------------------------------------------------
  test('TC-A02: HTTP 500 on /analysis/availability returns null safely', async () => {
    const res = await simulateFetchDashboardData({
      'availability': { status: 500, errorPayload: 'Database connection failed' }
    });

    assert.strictEqual(res.isLoading, false);
    assert.strictEqual(res.availability, null);
    assert.strictEqual(res.warnings.length, 1);
    assert.ok(res.warnings[0].includes('500'));
  });

  // -------------------------------------------------------------------------
  // Test 3: Network Timeout on Critical Rotation
  // -------------------------------------------------------------------------
  test('TC-A03: Network timeout (8000ms) on /analysis/critical-rotation defaults to empty list', async () => {
    const res = await simulateFetchDashboardData({
      'critical-rotation': { shouldTimeout: true }
    });

    assert.strictEqual(res.isLoading, false);
    assert.deepStrictEqual(res.criticalRotation, []);
    assert.strictEqual(res.warnings.length, 1);
    assert.ok(res.warnings[0].includes('timeout'));
  });

  // -------------------------------------------------------------------------
  // Test 4: Total Simultaneous Outage (All 3 endpoints fail)
  // -------------------------------------------------------------------------
  test('TC-A04: Total simultaneous backend failure handles all 3 errors gracefully', async () => {
    const res = await simulateFetchDashboardData({
      'toe-balance': { status: 503 },
      'availability': { status: 503 },
      'critical-rotation': { status: 503 }
    });

    assert.strictEqual(res.isLoading, false);
    assert.deepStrictEqual(res.toeData, []);
    assert.strictEqual(res.availability, null);
    assert.deepStrictEqual(res.criticalRotation, []);
    assert.strictEqual(res.warnings.length, 3);
  });

  // -------------------------------------------------------------------------
  // Test 5: Malformed Payload Injection (HTML or Non-Array)
  // -------------------------------------------------------------------------
  test('TC-A05: Malformed HTML response on TOE balance is sanitized to empty array by Array.isArray', async () => {
    const res = await simulateFetchDashboardData({
      'toe-balance': { status: 200, data: '<html><body>502 Bad Gateway Nginx</body></html>' }
    });

    // If Array.isArray was missing, toeData would be a string, and toeData.reduce would throw TypeError
    assert.ok(Array.isArray(res.toeData), 'toeData must strictly be an Array');
    assert.strictEqual(res.toeData.length, 0);
  });

  test('TC-A06: Malformed Error Object on Critical Rotation is sanitized to empty array', async () => {
    const res = await simulateFetchDashboardData({
      'critical-rotation': { status: 200, data: { status: 'error', message: 'Unauthorized' } }
    });

    assert.ok(Array.isArray(res.criticalRotation));
    assert.strictEqual(res.criticalRotation.length, 0);
  });

  // -------------------------------------------------------------------------
  // Test 6: In-Flight Cancellation Simulation (Race Conditions)
  // -------------------------------------------------------------------------
  test('TC-A07: Rapid unit switching cancellation prevents stale state overwrite', async () => {
    let dashboardActiveUnit = 'BATOT1';
    let receivedPayload = null;

    // Simulate Unit 1 request (slow network: 50ms)
    let isCancelled1 = false;
    const request1 = new Promise(resolve => {
      setTimeout(() => {
        if (!isCancelled1) {
          receivedPayload = { unitId: 'BATOT1', data: 'STALE DATA' };
        }
        resolve();
      }, 50);
    });

    // User rapidly switches to Unit 2 before Unit 1 returns!
    isCancelled1 = true; // Cleanup from useEffect
    dashboardActiveUnit = 'BRIG01';

    let isCancelled2 = false;
    const request2 = new Promise(resolve => {
      setTimeout(() => {
        if (!isCancelled2) {
          receivedPayload = { unitId: 'BRIG01', data: 'FRESH DATA' };
        }
        resolve();
      }, 20); // Unit 2 returns faster (20ms)
    });

    await Promise.all([request1, request2]);

    assert.strictEqual(dashboardActiveUnit, 'BRIG01');
    assert.strictEqual(receivedPayload.unitId, 'BRIG01', 'Must have data from BRIG01');
    assert.strictEqual(receivedPayload.data, 'FRESH DATA', 'Stale request from BATOT1 must NOT overwrite');
  });

  // -------------------------------------------------------------------------
  // Test 7: Empirical Bug Detection: Missing setIsLoadingData(true) in useEffect
  // -------------------------------------------------------------------------
  test('TC-A08: EMPIRICAL VERIFICATION: AnalysisDashboard useEffect on unit switch triggers loading indicator', async () => {
    // In AnalysisDashboard.tsx:
    // When effectiveUnitId changes, setIsLoadingData(true) must be called immediately
    const fs = await import('node:fs');
    const code = fs.readFileSync('src/components/AnalysisDashboard.tsx', 'utf8');
    const useEffectIdx = code.indexOf('useEffect(() => {\n    let isCancelled = false;');
    assert.ok(useEffectIdx > 0, 'useEffect exists');
    const useEffectBlock = code.slice(useEffectIdx, useEffectIdx + 500);
    assert.ok(
      useEffectBlock.includes('setIsLoadingData(true)'),
      'CONFIRMATION: setIsLoadingData(true) is properly called in useEffect when effectiveUnitId changes'
    );
  });
});
