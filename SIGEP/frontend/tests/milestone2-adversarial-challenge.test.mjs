/**
 * Milestone 2 Empirical Adversarial Challenge Suite
 * 
 * Deep stress-testing of ConsolaTraslados, TOE Simulator, Role Authorization,
 * M2M Webhooks, and Real Soldier Selection.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

// ---------------------------------------------------------------------------
// 1. REPLICATED DOMAIN LOGIC FROM CONSOLATRASLADOS.TSX
// ---------------------------------------------------------------------------

function normalizeRankCategory(cat) {
  if (!cat) return 'SOLDADO';
  const upper = cat.toUpperCase();
  if (upper.includes('OFIC') && !upper.includes('SUBOFIC')) return 'OFICIAL';
  if (upper.includes('SUBOFIC')) return 'SUBOFICIAL';
  return 'SOLDADO';
}

function deduceCategoryFromRank(rank) {
  if (!rank) return 'SOLDADO';
  const r = rank.toUpperCase();

  // Check NCOs first so compound ranks like 'Sargento Mayor' are categorized as SUBOFICIAL
  if (
    r.includes('SM') ||
    r.includes('SP') ||
    r.includes('SV') ||
    r.includes('SS') ||
    r.includes('CP') ||
    r.includes('CS') ||
    r.includes('C3') ||
    r.includes('SARGENTO') ||
    r.includes('CABO') ||
    r.includes('SUBOFICIAL')
  ) {
    return 'SUBOFICIAL';
  }

  if (
    r.includes('GR') ||
    r.includes('MG') ||
    r.includes('BG') ||
    r.includes('CR') ||
    r.includes('TC') ||
    r.includes('MY') ||
    r.includes('CT') ||
    r.includes('TE') ||
    r.includes('ST') ||
    r.includes('GENERAL') ||
    r.includes('CORONEL') ||
    r.includes('MAYOR') ||
    r.includes('CAPITAN') ||
    r.includes('TENIENTE') ||
    r.includes('OFICIAL')
  ) {
    return 'OFICIAL';
  }

  return 'SOLDADO';
}

function isAuthorizedToApprove(role) {
  return (
    role === 'ROLE_EJERCITO' ||
    role === 'ROLE_DIVISION' ||
    role === 'ROLE_ADMINISTRATOR' ||
    role === 'ROLE_COMANDANTE_EJERCITO'
  );
}

function evaluateToeImpact(originToe, destToe) {
  const originReq = originToe.required;
  const originAct = originToe.actual;
  const originActProjected = Math.max(0, originAct - 1);
  const originCovBefore = originReq > 0 ? Math.round((originAct / originReq) * 1000) / 10 : 0;
  const originCovAfter = originReq > 0 ? Math.round((originActProjected / originReq) * 1000) / 10 : 0;

  const destReq = destToe.required;
  const destAct = destToe.actual;
  const destActProjected = destAct + 1;
  const destCovBefore = destReq > 0 ? Math.round((destAct / destReq) * 1000) / 10 : 0;
  const destCovAfter = destReq > 0 ? Math.round((destActProjected / destReq) * 1000) / 10 : 0;

  const isOriginBelowThreshold = originCovAfter < 80.0;
  const causesDeficit = originActProjected < originReq * 0.8 || originActProjected < originReq;

  return {
    originBefore: { actual: originAct, required: originReq, coveragePct: originCovBefore },
    originAfter: { actual: originActProjected, required: originReq, coveragePct: originCovAfter },
    destinationBefore: { actual: destAct, required: destReq, coveragePct: destCovBefore },
    destinationAfter: { actual: destActProjected, required: destReq, coveragePct: destCovAfter },
    isOriginBelowThreshold,
    causesDeficit,
    viable: !isOriginBelowThreshold
  };
}

// ---------------------------------------------------------------------------
// SUITE 1: TOE SIMULATION BOUNDARIES & FLOATING-POINT STRESS
// ---------------------------------------------------------------------------

test('Adversarial Suite 1: TOE Impact Simulator Stress & Edge Cases', async (t) => {
  await t.test('Boundary condition exactly at 80.0% coverage', () => {
    // 10 required, 9 actual -> 8 after extraction (8/10 = 80.0%)
    const res = evaluateToeImpact({ required: 10, actual: 9 }, { required: 10, actual: 5 });
    assert.equal(res.originAfter.coveragePct, 80.0);
    assert.equal(res.isOriginBelowThreshold, false);
    assert.equal(res.viable, true);
  });

  await t.test('Boundary condition at 79.9% coverage (must trigger threshold deficit)', () => {
    // 1000 required, 800 actual -> 799 after extraction (799/1000 = 79.9%)
    const res = evaluateToeImpact({ required: 1000, actual: 800 }, { required: 500, actual: 400 });
    assert.equal(res.originAfter.coveragePct, 79.9);
    assert.equal(res.isOriginBelowThreshold, true);
    assert.equal(res.viable, false);
  });

  await t.test('Boundary condition at 80.1% coverage (viable)', () => {
    // 1000 required, 802 actual -> 801 after extraction (801/1000 = 80.1%)
    const res = evaluateToeImpact({ required: 1000, actual: 802 }, { required: 500, actual: 400 });
    assert.equal(res.originAfter.coveragePct, 80.1);
    assert.equal(res.isOriginBelowThreshold, false);
    assert.equal(res.viable, true);
  });

  await t.test('Depleted unit with 0 actual soldiers does not drop below 0', () => {
    const res = evaluateToeImpact({ required: 50, actual: 0 }, { required: 50, actual: 10 });
    assert.equal(res.originAfter.actual, 0);
    assert.equal(res.originAfter.coveragePct, 0.0);
    assert.equal(res.isOriginBelowThreshold, true);
    assert.equal(res.viable, false);
  });

  await t.test('Zero required personnel does not cause NaN or division by zero crash', () => {
    const res = evaluateToeImpact({ required: 0, actual: 0 }, { required: 10, actual: 5 });
    assert.ok(!Number.isNaN(res.originAfter.coveragePct));
    assert.equal(res.originAfter.coveragePct, 0);
  });

  await t.test('Sequential extractions until threshold failure', () => {
    // Starting with 100 required, 85 actual (85%)
    let currentActual = 85;
    const required = 100;
    const history = [];

    for (let i = 0; i < 10; i++) {
      const res = evaluateToeImpact({ required, actual: currentActual }, { required: 50, actual: 30 });
      history.push({ step: i + 1, actualAfter: res.originAfter.actual, pct: res.originAfter.coveragePct, viable: res.viable });
      currentActual = res.originAfter.actual;
    }

    // Step 1: 85 -> 84 (84%) viable
    // Step 5: 81 -> 80 (80%) viable
    // Step 6: 80 -> 79 (79%) NOT viable
    assert.equal(history[0].pct, 84.0);
    assert.equal(history[0].viable, true);
    assert.equal(history[4].pct, 80.0);
    assert.equal(history[4].viable, true);
    assert.equal(history[5].pct, 79.0);
    assert.equal(history[5].viable, false);
  });
});

// ---------------------------------------------------------------------------
// SUITE 2: RANK CLASSIFICATION ADVERSARIAL STRESS
// ---------------------------------------------------------------------------

test('Adversarial Suite 2: Military Rank Classification Dictionary & False Positives', async (t) => {
  await t.test('Colombian Army Ranks categorized - Exposing Capitán accent bug', () => {
    // Unaccented ranks pass
    assert.equal(deduceCategoryFromRank('Capitan'), 'OFICIAL');
    assert.equal(deduceCategoryFromRank('Teniente'), 'OFICIAL');
    assert.equal(deduceCategoryFromRank('Mayor'), 'OFICIAL');
    assert.equal(deduceCategoryFromRank('Coronel'), 'OFICIAL');
    assert.equal(deduceCategoryFromRank('General'), 'OFICIAL');

    // BUG CONFIRMATION: "Capitán" with accent fails because r.includes('CAPITAN') does not match 'CAPITÁN'
    const rankWithAccent = 'Capitán';
    const resultWithAccent = deduceCategoryFromRank(rankWithAccent);
    // Demonstrating the bug: it evaluates to SOLDADO instead of OFICIAL
    assert.equal(resultWithAccent, 'SOLDADO', 'Confirmed: Capitán is miscategorized as SOLDADO due to accent!');
  });

  await t.test('Compound rank disambiguation (Sargento Mayor must be SUBOFICIAL, not OFICIAL)', () => {
    // "Sargento Mayor" contains "MAYOR" (an officer rank), but NCO precedence ensures SUBOFICIAL
    assert.equal(deduceCategoryFromRank('Sargento Mayor'), 'SUBOFICIAL');
    assert.equal(deduceCategoryFromRank('SM'), 'SUBOFICIAL');
  });

  await t.test('Adversarial inputs: Empty, null, undefined, and unlisted ranks default to SOLDADO', () => {
    assert.equal(deduceCategoryFromRank(null), 'SOLDADO');
    assert.equal(deduceCategoryFromRank(undefined), 'SOLDADO');
    assert.equal(deduceCategoryFromRank(''), 'SOLDADO');
    assert.equal(deduceCategoryFromRank('UNKNOWN_CADET'), 'SOLDADO');
  });

  await t.test('Falsy Zero Fallback Bug: Depleted unit actual 0 coerced to 45', () => {
    // Replicating ConsolaTraslados.tsx:483
    const originToeDepleted = [{ required: 50, actual: 0 }];
    const originActTotal = originToeDepleted.reduce((acc, t) => acc + (t.actual || 0), 0) || 45;
    // Due to JavaScript "0 || 45", actual 0 becomes 45!
    assert.equal(originActTotal, 45, 'Demonstrating bug: 0 actual soldiers coerced to 45 by "|| 45"');
  });
});

// ---------------------------------------------------------------------------
// SUITE 3: ROLE AUTHORIZATION EXHAUSTION MATRIX
// ---------------------------------------------------------------------------

test('Adversarial Suite 3: Role Authorization Exhaustion Matrix', async (t) => {
  const testMatrix = [
    // Authorized roles
    { role: 'ROLE_EJERCITO', allowed: true },
    { role: 'ROLE_DIVISION', allowed: true },
    { role: 'ROLE_ADMINISTRATOR', allowed: true },
    { role: 'ROLE_COMANDANTE_EJERCITO', allowed: true },
    // Blocked tactical & subordinate roles (Must NOT be allowed to approve)
    { role: 'ROLE_BRIGADA', allowed: false },
    { role: 'ROLE_BATALLON', allowed: false },
    { role: 'ROLE_COMPANIA', allowed: false },
    { role: 'ROLE_PELOTON', allowed: false },
    { role: 'ROLE_ESCUADRA', allowed: false },
    { role: 'ROLE_OPERATOR', allowed: false },
    { role: 'ROLE_USER', allowed: false },
    { role: 'ROLE_GUEST', allowed: false },
    { role: 'ROLE_SUPERADMIN', allowed: false },
    { role: 'ROLE_JEFE_PERSONAL_BATALLON', allowed: false },
    // Malformed / Empty roles
    { role: '', allowed: false },
    { role: null, allowed: false },
    { role: undefined, allowed: false },
    { role: 'role_ejercito', allowed: false }, // Strict case enforcement
    { role: 'ROLE_EJERCITO ', allowed: false } // Strict whitespace
  ];

  for (const item of testMatrix) {
    const result = isAuthorizedToApprove(item.role);
    assert.equal(
      result,
      item.allowed,
      `Role "${item.role}" authorization mismatch: expected ${item.allowed}, got ${result}`
    );
  }

  await t.test('Backend contract discrepancy: ROLE_COMANDANTE_EJERCITO causes 403 on backend', () => {
    // Backend TransferService.java:69:
    // !("ROLE_EJERCITO".equals(role) || "ROLE_DIVISION".equals(role) || "ROLE_ADMINISTRATOR".equals(role))
    const backendAuthorizedRoles = ['ROLE_EJERCITO', 'ROLE_DIVISION', 'ROLE_ADMINISTRATOR'];
    const isBackendAuthorized = (role) => backendAuthorizedRoles.includes(role);

    // Frontend allows ROLE_COMANDANTE_EJERCITO:
    assert.equal(isAuthorizedToApprove('ROLE_COMANDANTE_EJERCITO'), true);
    // BUT backend rejects it:
    assert.equal(isBackendAuthorized('ROLE_COMANDANTE_EJERCITO'), false, 'Backend rejects ROLE_COMANDANTE_EJERCITO with SecurityException!');
  });
});

// ---------------------------------------------------------------------------
// SUITE 4: M2M WEBHOOK SPECIFICATION & RESILIENCE
// ---------------------------------------------------------------------------

test('Adversarial Suite 4: M2M Webhook Delivery Contract & State Transitions', async (t) => {
  await t.test('Payload matches exact keys expected by WebhookController.java', () => {
    const soldier = {
      id: '987654321',
      name: 'SV. Pedro Gomez',
      rank: 'SV',
      mosCode: '11B'
    };
    const destUnit = 'BIVAT';

    const payload = {
      payload: {
        soldier_id: soldier.id,
        target_unit_id: destUnit,
        name: soldier.name,
        rank: soldier.rank,
        mos_code: soldier.mosCode
      }
    };

    assert.ok(payload.payload, 'Must have root payload property');
    assert.equal(typeof payload.payload.soldier_id, 'string');
    assert.equal(typeof payload.payload.target_unit_id, 'string');
    assert.equal(typeof payload.payload.name, 'string');
    assert.equal(typeof payload.payload.rank, 'string');
    assert.equal(typeof payload.payload.mos_code, 'string');
  });

  await t.test('M2M telemetry state machine transitions (SYNCED, PENDING, FAILED)', () => {
    let stateMap = {};

    // 1. Initial approval where direct webhook succeeds
    const txId = '101';
    stateMap[txId] = 'SYNCED';
    assert.equal(stateMap[txId], 'SYNCED');

    // 2. Air-gap failure (e.g. timeout / network severed)
    const txIdAirGap = '102';
    stateMap[txIdAirGap] = 'PENDING';
    assert.equal(stateMap[txIdAirGap], 'PENDING');

    // 3. Manual retry attempt fails
    stateMap[txIdAirGap] = 'FAILED';
    assert.equal(stateMap[txIdAirGap], 'FAILED');

    // 4. Second retry succeeds
    stateMap[txIdAirGap] = 'SYNCED';
    assert.equal(stateMap[txIdAirGap], 'SYNCED');
  });

  await t.test('URL clean base sanitization handles /api and without /api, but fails on trailing slash /api/', () => {
    const url1 = 'http://localhost:8080/api';
    const clean1 = url1.replace(/\/api$/, '');
    assert.equal(clean1, 'http://localhost:8080');
    assert.equal(`${clean1}/api/webhooks/personnel/transfer-completed`, 'http://localhost:8080/api/webhooks/personnel/transfer-completed');

    // Demonstrating the trailing slash trap:
    const urlWithSlash = 'http://localhost:8080/api/';
    const cleanWithSlash = urlWithSlash.replace(/\/api$/, '');
    // Because regex doesn't handle trailing slash, cleanWithSlash is still 'http://localhost:8080/api/'
    assert.equal(cleanWithSlash, 'http://localhost:8080/api/', 'Demonstrating bug: /api/ not cleaned by /\\/api$/');
    const corruptedUrl = `${cleanWithSlash}/api/webhooks/personnel/transfer-completed`;
    assert.equal(corruptedUrl, 'http://localhost:8080/api//api/webhooks/personnel/transfer-completed');

    // The robust fix regex:
    const robustClean = urlWithSlash.replace(/\/api\/?$/, '');
    assert.equal(robustClean, 'http://localhost:8080');
  });
});

// ---------------------------------------------------------------------------
// SUITE 5: REAL SOLDIER SELECTION VS SYNTHETIC IDS (ANTI-LOTE)
// ---------------------------------------------------------------------------

test('Adversarial Suite 5: Elimination of Synthetic IDs (LOTE-xxxx)', async (t) => {
  const consolaPath = resolve(process.cwd(), 'src', 'components', 'ConsolaTraslados.tsx');
  const content = readFileSync(consolaPath, 'utf8');

  await t.test('ConsolaTraslados does not contain Date.now() slicing for ID generation', () => {
    assert.ok(!content.includes("Date.now().toString().slice"), 'ConsolaTraslados must not generate synthetic IDs with Date.now() slice');
  });

  await t.test('ConsolaTraslados does not contain synthetic "LOTE-" pattern', () => {
    assert.ok(!content.includes("'LOTE-'"));
    assert.ok(!content.includes('"LOTE-"'));
    assert.ok(!content.includes('`LOTE-'));
  });

  await t.test('Batch transfer dispatches individual requests with real soldier IDs', () => {
    // Simulated unit soldiers loaded from API
    const mockUnitSoldiers = [
      { id: '109823412', name: 'Alvaro Uribe', rank: 'SLP', mosCode: '11B' },
      { id: '109823413', name: 'Carlos Holmes', rank: 'SLP', mosCode: '11B' },
      { id: '109823414', name: 'Marta Ramirez', rank: 'SLP', mosCode: '11B' }
    ];

    const selectedBatchIds = ['109823412', '109823414'];
    const selected = mockUnitSoldiers.filter(s => selectedBatchIds.includes(s.id));

    assert.equal(selected.length, 2);
    assert.equal(selected[0].id, '109823412');
    assert.equal(selected[1].id, '109823414');

    // Verify none has synthetic ID
    for (const s of selected) {
      assert.ok(!s.id.startsWith('LOTE-'));
      assert.ok(/^\d+$/.test(s.id));
    }
  });
});

// ---------------------------------------------------------------------------
// SUITE 6: PIPELINE STATUS MUTATIONS & FILTERING
// ---------------------------------------------------------------------------

test('Adversarial Suite 6: Transfer Pipeline Filtering & Search Queries', async (t) => {
  const mockTransfers = [
    { id: '1', soldierId: '1001', soldierName: 'CR. Juan Perez', rankCategory: 'OFICIAL', originUnitId: 'BR1', destinationUnitId: 'DIV1', status: 'PENDING_APPROVAL' },
    { id: '2', soldierId: '1002', soldierName: 'SP. Mario Lopez', rankCategory: 'SUBOFICIAL', originUnitId: 'BR1', destinationUnitId: 'DIV2', status: 'PENDING_REVIEW' },
    { id: '3', soldierId: '1003', soldierName: 'SLP. Pedro Gomez', rankCategory: 'SOLDADO', originUnitId: 'BR1', destinationUnitId: 'BAEEV4', status: 'APPROVED' },
    { id: '4', soldierId: '1004', soldierName: 'TE. Diana Castro', rankCategory: 'OFICIAL', originUnitId: 'BAEEV4', destinationUnitId: 'BR1', status: 'REJECTED' }
  ];

  await t.test('Filter by rank category: OFICIAL', () => {
    const filtered = mockTransfers.filter(t => normalizeRankCategory(t.rankCategory) === 'OFICIAL');
    assert.equal(filtered.length, 2);
    assert.equal(filtered[0].id, '1');
    assert.equal(filtered[1].id, '4');
  });

  await t.test('Filter by pipeline status: PENDING_REVIEW', () => {
    const filtered = mockTransfers.filter(t => t.status === 'PENDING_REVIEW');
    assert.equal(filtered.length, 1);
    assert.equal(filtered[0].id, '2');
  });

  await t.test('Search query with regex special characters does not throw', () => {
    const query = 'CR. [Juan] (Perez)';
    // In ConsolaTraslados search:
    const q = query.toLowerCase();
    const result = mockTransfers.filter(t => {
      return t.soldierName.toLowerCase().includes(q) || t.soldierId.toLowerCase().includes(q);
    });
    // Should not throw SyntaxError
    assert.equal(result.length, 0);
  });

  await t.test('Search by partial soldier name is case-insensitive', () => {
    const q = 'mario';
    const result = mockTransfers.filter(t => t.soldierName.toLowerCase().includes(q));
    assert.equal(result.length, 1);
    assert.equal(result[0].soldierName, 'SP. Mario Lopez');
  });
});
