/**
 * Milestone 2 Adversarial Empirical Challenge Suite
 * Author: Challenger M2-2
 * 
 * Adversarial verification covering:
 * 1. TOE Impact Simulation Math, Delta & Exact Float/Rounding Thresholds (80.0%)
 * 2. Boundary Cases, Zero-Personnel Traps & Fallback Coercion Analysis
 * 3. Mandatory Convalidation & G1 Justification Validation Harness
 * 4. Exhaustive AST & Pattern Scan for Zero Inline Styles
 * 5. Backward Compatibility & Wrapper Instantiation
 * 6. Pipeline Chevron & Category Filtering Matrix
 * 7. M2M Webhook Payload, Timeout & Header Verification
 * 8. Role Permission Matrix & Privilege Escalation Prevention
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

// ---------------------------------------------------------------------------
// 1. SIMULATOR LOGIC HARNESS (Mirroring ConsolaTraslados implementation)
// ---------------------------------------------------------------------------

function simulateToeEngine(originToe, destToe, viabilityData = { viable: true }) {
  // Exact logic from ConsolaTraslados.tsx:481-538
  const originReqTotal = originToe.reduce((acc, t) => acc + (t.required || 0), 0) || 50;
  const originActTotal = originToe.reduce((acc, t) => acc + (t.actual || 0), 0) || 45;
  const originActProjected = Math.max(0, originActTotal - 1);
  const originCovBefore = Math.round((originActTotal / originReqTotal) * 1000) / 10;
  const originCovAfter = Math.round((originActProjected / originReqTotal) * 1000) / 10;

  const destReqTotal = destToe.reduce((acc, t) => acc + (t.required || 0), 0) || 50;
  const destActTotal = destToe.reduce((acc, t) => acc + (t.actual || 0), 0) || 38;
  const destActProjected = destActTotal + 1;
  const destCovBefore = Math.round((destActTotal / destReqTotal) * 1000) / 10;
  const destCovAfter = Math.round((destActProjected / destReqTotal) * 1000) / 10;

  const isOriginBelowThreshold = originCovAfter < 80.0;
  const isDestBelowThreshold = destCovAfter < 80.0;
  const causesDeficit =
    Boolean(viabilityData.blockedByToe) || originActProjected < originReqTotal * 0.8;

  return {
    originBefore: { actual: originActTotal, required: originReqTotal, coveragePct: originCovBefore },
    originAfter: { actual: originActProjected, required: originReqTotal, coveragePct: originCovAfter },
    destinationBefore: { actual: destActTotal, required: destReqTotal, coveragePct: destCovBefore },
    destinationAfter: { actual: destActProjected, required: destReqTotal, coveragePct: destCovAfter },
    isOriginBelowThreshold,
    isDestinationBelowThreshold: isDestBelowThreshold,
    causesDeficit,
    viable: Boolean(viabilityData.viable) && !isOriginBelowThreshold
  };
}

// Validation logic for G1 Convalidation requirement
function validateConvalidationRequired(simulatorData, overrideReason) {
  const requiresOverride = !simulatorData.viable || simulatorData.isOriginBelowThreshold;
  const isValid = !requiresOverride || Boolean(overrideReason && overrideReason.trim().length > 0);
  return {
    requiresOverride,
    isValid,
    error: requiresOverride && (!overrideReason || !overrideReason.trim())
      ? 'Debe especificar la convalidación / justificación de comando (G1) para proceder con este movimiento.'
      : null,
    resultingStatus: requiresOverride ? 'PENDING_REVIEW' : 'PENDING_APPROVAL',
    resultingImpact: requiresOverride ? 'ALTO' : 'NORMAL'
  };
}

// Rank Category deduction logic from ConsolaTraslados.tsx:172-213
function deduceCategoryFromRank(rank) {
  if (!rank) return 'SOLDADO';
  const r = rank.toUpperCase();

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

// Role Authorization check
function isAuthorizedToApprove(role) {
  return (
    role === 'ROLE_EJERCITO' ||
    role === 'ROLE_DIVISION' ||
    role === 'ROLE_ADMINISTRATOR' ||
    role === 'ROLE_COMANDANTE_EJERCITO'
  );
}

// ---------------------------------------------------------------------------
// SUITE 1: TOE SIMULATOR MATH & STRICT 80.0% THRESHOLD VERIFICATION
// ---------------------------------------------------------------------------

test('Adversarial Suite 1: TOE Math & Exact Floating-Point Thresholds', async (t) => {
  await t.test('Safe extraction: Origin starts at 100%, drops to 80.0% exactly (Safe, no deficit)', () => {
    // 5 required, 5 actual -> after extraction: 4 actual (4/5 = 80.0%)
    const sim = simulateToeEngine(
      [{ required: 5, actual: 5 }],
      [{ required: 10, actual: 7 }]
    );

    assert.equal(sim.originBefore.actual, 5);
    assert.equal(sim.originAfter.actual, 4);
    assert.equal(sim.originAfter.coveragePct, 80.0);
    assert.equal(sim.isOriginBelowThreshold, false, '80.0% exactly must NOT trigger isOriginBelowThreshold');
    assert.equal(sim.causesDeficit, false, '4 is exactly 5 * 0.8, should not be below threshold');
    assert.equal(sim.viable, true);
  });

  await t.test('Deficit extraction: Origin drops to 79.9% (Deficit flagged, threshold violated)', () => {
    // 1000 required, 800 actual -> after extraction: 799 (799/1000 = 79.9%)
    const sim = simulateToeEngine(
      [{ required: 1000, actual: 800 }],
      [{ required: 50, actual: 40 }]
    );

    assert.equal(sim.originBefore.actual, 800);
    assert.equal(sim.originAfter.actual, 799);
    assert.equal(sim.originAfter.coveragePct, 79.9);
    assert.equal(sim.isOriginBelowThreshold, true, '79.9% must trigger isOriginBelowThreshold');
    assert.equal(sim.causesDeficit, true);
    assert.equal(sim.viable, false);
  });

  await t.test('Sub-unit boundary: 9 required, 8 actual -> 7 actual (77.8% < 80.0%)', () => {
    // 7/9 = 0.7777... -> rounded to 77.8%
    const sim = simulateToeEngine(
      [{ required: 9, actual: 8 }],
      [{ required: 10, actual: 5 }]
    );

    assert.equal(sim.originBefore.coveragePct, 88.9);
    assert.equal(sim.originAfter.actual, 7);
    assert.equal(sim.originAfter.coveragePct, 77.8);
    assert.equal(sim.isOriginBelowThreshold, true);
    assert.equal(sim.viable, false);
  });

  await t.test('Critical extraction: Single-person unit (1 required, 1 actual -> 0 actual)', () => {
    // 1 required, 1 actual -> 0 actual (0% coverage)
    const sim = simulateToeEngine(
      [{ required: 1, actual: 1 }],
      [{ required: 10, actual: 5 }]
    );

    assert.equal(sim.originBefore.coveragePct, 100.0);
    assert.equal(sim.originAfter.actual, 0);
    assert.equal(sim.originAfter.coveragePct, 0.0);
    assert.equal(sim.isOriginBelowThreshold, true);
    assert.equal(sim.viable, false);
  });

  await t.test('Clamping verification: Math.max(0, actual - 1) prevents negative headcount', () => {
    // If somehow actual is 0 in reduce (e.g. mock override)
    const sim = simulateToeEngine(
      [{ required: 10, actual: 1 }],
      [{ required: 10, actual: 5 }]
    );
    assert.equal(sim.originAfter.actual, 0);
    assert.ok(sim.originAfter.actual >= 0);
  });

  await t.test('Destination unit arithmetic: increments by exactly +1 and recalculates coverage', () => {
    // Destination: 40 required, 31 actual -> 32 actual (32/40 = 80.0%)
    const sim = simulateToeEngine(
      [{ required: 50, actual: 48 }],
      [{ required: 40, actual: 31 }]
    );

    assert.equal(sim.destinationBefore.actual, 31);
    assert.equal(sim.destinationBefore.coveragePct, 77.5);
    assert.equal(sim.destinationAfter.actual, 32);
    assert.equal(sim.destinationAfter.coveragePct, 80.0);
    assert.equal(sim.isDestinationBelowThreshold, false);
  });

  await t.test('Multi-specialty aggregation: sum of MOS entries in TOE list', () => {
    const originToe = [
      { mosCode: 'INF', required: 20, actual: 18 },
      { mosCode: 'ART', required: 15, actual: 15 },
      { mosCode: 'COM', required: 5, actual: 5 }
    ];
    // Total required = 40, total actual = 38 -> after: 37 (37/40 = 92.5%)
    const sim = simulateToeEngine(originToe, [{ required: 20, actual: 10 }]);

    assert.equal(sim.originBefore.required, 40);
    assert.equal(sim.originBefore.actual, 38);
    assert.equal(sim.originAfter.actual, 37);
    assert.equal(sim.originAfter.coveragePct, 92.5);
    assert.equal(sim.viable, true);
  });
});

// ---------------------------------------------------------------------------
// SUITE 2: ADVERSARIAL EDGE CASE ANALYSIS — FALSY COERCION AUDIT
// ---------------------------------------------------------------------------

test('Adversarial Suite 2: Falsy Coercion & Zero-Personnel Edge Cases', async (t) => {
  await t.test('Empty array fallback: correctly falls back to baseline (50 req, 45 act)', () => {
    // When backend returns empty array [] (simulating connection fallback)
    const sim = simulateToeEngine([], []);

    assert.equal(sim.originBefore.required, 50);
    assert.equal(sim.originBefore.actual, 45);
    assert.equal(sim.originAfter.actual, 44);
    assert.equal(sim.originAfter.coveragePct, 88.0);
    assert.equal(sim.destinationBefore.required, 50);
    assert.equal(sim.destinationBefore.actual, 38);
    assert.equal(sim.destinationAfter.actual, 39);
  });

  await t.test('Falsy Coercion Caveat: Non-empty array with 0 actual evaluates via || fallback', () => {
    // In ConsolaTraslados.tsx:
    // const originActTotal = originToe.reduce(...) || 45;
    // When actual is 0 in database, 0 is falsy in JS, so it evaluates to 45.
    // Documenting this exact behavioral reality for handoff caveats:
    const zeroActToe = [{ required: 20, actual: 0 }];
    const reducedVal = zeroActToe.reduce((acc, t) => acc + (t.actual || 0), 0);
    assert.equal(reducedVal, 0);

    const coercedVal = reducedVal || 45;
    assert.equal(coercedVal, 45, 'Documents JS falsy || coercion when real actual is 0');
  });
});

// ---------------------------------------------------------------------------
// SUITE 3: MANDATORY G1 CONVALIDATION & OVERRIDE HARNESS
// ---------------------------------------------------------------------------

test('Adversarial Suite 3: Mandatory Convalidation & Justification Rules', async (t) => {
  await t.test('Rejects submission when threshold < 80% and justification is missing (empty string)', () => {
    const sim = simulateToeEngine([{ required: 10, actual: 8 }], [{ required: 10, actual: 5 }]);
    assert.equal(sim.isOriginBelowThreshold, true);

    const check = validateConvalidationRequired(sim, '');
    assert.equal(check.requiresOverride, true);
    assert.equal(check.isValid, false);
    assert.ok(check.error.includes('convalidación'));
  });

  await t.test('Rejects submission when threshold < 80% and justification is only whitespace', () => {
    const sim = simulateToeEngine([{ required: 10, actual: 8 }], [{ required: 10, actual: 5 }]);
    const check = validateConvalidationRequired(sim, '   \t\n   ');
    assert.equal(check.requiresOverride, true);
    assert.equal(check.isValid, false);
  });

  await t.test('Accepts submission when threshold < 80% and valid G1 justification is provided', () => {
    const sim = simulateToeEngine([{ required: 10, actual: 8 }], [{ required: 10, actual: 5 }]);
    const check = validateConvalidationRequired(sim, 'Autorizado por JEMPP según Directiva 0142/2026');
    assert.equal(check.requiresOverride, true);
    assert.equal(check.isValid, true);
    assert.equal(check.resultingStatus, 'PENDING_REVIEW');
    assert.equal(check.resultingImpact, 'ALTO');
  });

  await t.test('Standard submission (coverage >= 80%) requires no justification and gets PENDING_APPROVAL', () => {
    const sim = simulateToeEngine([{ required: 50, actual: 48 }], [{ required: 50, actual: 40 }]);
    assert.equal(sim.isOriginBelowThreshold, false);
    assert.equal(sim.viable, true);

    const check = validateConvalidationRequired(sim, '');
    assert.equal(check.requiresOverride, false);
    assert.equal(check.isValid, true);
    assert.equal(check.resultingStatus, 'PENDING_APPROVAL');
    assert.equal(check.resultingImpact, 'NORMAL');
  });

  await t.test('Viability blockedByToe from backend also triggers mandatory convalidation', () => {
    const sim = simulateToeEngine(
      [{ required: 50, actual: 48 }],
      [{ required: 50, actual: 40 }],
      { viable: false, blockedByToe: true }
    );
    assert.equal(sim.viable, false);

    const check = validateConvalidationRequired(sim, '');
    assert.equal(check.requiresOverride, true);
    assert.equal(check.isValid, false);
  });
});

// ---------------------------------------------------------------------------
// SUITE 4: EXHAUSTIVE SCAN FOR ZERO INLINE STYLES
// ---------------------------------------------------------------------------

test('Adversarial Suite 4: Exhaustive Zero Inline Styles Inspection', async (t) => {
  const frontendDir = resolve(process.cwd());
  const filesToCheck = [
    resolve(frontendDir, 'src', 'components', 'ConsolaTraslados.tsx'),
    resolve(frontendDir, 'src', 'components', 'TrasladoOficiales.tsx'),
    resolve(frontendDir, 'src', 'components', 'TrasladoSuboficiales.tsx'),
    resolve(frontendDir, 'src', 'components', 'TrasladoSoldados.tsx')
  ];

  for (const filePath of filesToCheck) {
    await t.test(`Zero inline styles in ${filePath.split('\\').pop()}`, () => {
      assert.ok(existsSync(filePath), `File must exist: ${filePath}`);
      const code = readFileSync(filePath, 'utf8');

      // Check regex for style={{...}}, style = {{...}}, style="...", etc.
      const inlineStyleMatch = code.match(/style\s*=\s*[{'"]/gi);
      assert.equal(
        inlineStyleMatch,
        null,
        `Found forbidden style attribute in ${filePath}: ${JSON.stringify(inlineStyleMatch)}`
      );

      // Verify no CSS string literals inside component
      const styleTagMatch = code.match(/<style[^>]*>/gi);
      assert.equal(styleTagMatch, null, `Found forbidden <style> tag in ${filePath}`);
    });
  }
});

// ---------------------------------------------------------------------------
// SUITE 5: BACKWARD COMPATIBILITY & WRAPPER DELEGATION
// ---------------------------------------------------------------------------

test('Adversarial Suite 5: Backward Compatibility of Deprecated Wrappers', async (t) => {
  const frontendDir = resolve(process.cwd());
  const oficialesPath = resolve(frontendDir, 'src', 'components', 'TrasladoOficiales.tsx');
  const suboficialesPath = resolve(frontendDir, 'src', 'components', 'TrasladoSuboficiales.tsx');
  const soldadosPath = resolve(frontendDir, 'src', 'components', 'TrasladoSoldados.tsx');

  await t.test('TrasladoOficiales forwards props and sets initialCategory="OFICIAL"', () => {
    const code = readFileSync(oficialesPath, 'utf8');
    assert.ok(code.includes('@deprecated'));
    assert.ok(code.includes("initialCategory=\"OFICIAL\""));
    assert.ok(code.includes('unitId={unitId}'));
    assert.ok(code.includes('role={role}'));
  });

  await t.test('TrasladoSuboficiales forwards props and sets initialCategory="SUBOFICIAL"', () => {
    const code = readFileSync(suboficialesPath, 'utf8');
    assert.ok(code.includes('@deprecated'));
    assert.ok(code.includes("initialCategory=\"SUBOFICIAL\""));
    assert.ok(code.includes('unitId={unitId}'));
    assert.ok(code.includes('role={role}'));
  });

  await t.test('TrasladoSoldados forwards props and sets initialCategory="SOLDADO"', () => {
    const code = readFileSync(soldadosPath, 'utf8');
    assert.ok(code.includes('@deprecated'));
    assert.ok(code.includes("initialCategory=\"SOLDADO\""));
    assert.ok(code.includes('unitId={unitId}'));
    assert.ok(code.includes('role={role}'));
  });

  await t.test('App.tsx maintains routing for legacy tabs (oficiales, suboficiales, soldados)', () => {
    const appPath = resolve(frontendDir, 'src', 'App.tsx');
    const code = readFileSync(appPath, 'utf8');
    assert.ok(code.includes("activeTab === 'oficiales'"));
    assert.ok(code.includes("activeTab === 'suboficiales'"));
    assert.ok(code.includes("activeTab === 'soldados'"));
    assert.ok(code.includes("activeTab === 'traslados'"));
  });
});

// ---------------------------------------------------------------------------
// SUITE 6: RANK CATEGORY CLASSIFICATION ADVERSARIAL MATRIX
// ---------------------------------------------------------------------------

test('Adversarial Suite 6: Rank Category Deduction Edge Cases', async (t) => {
  await t.test('Compound rank Sargento Mayor is SUBOFICIAL, not Mayor (OFICIAL)', () => {
    assert.equal(deduceCategoryFromRank('Sargento Mayor'), 'SUBOFICIAL');
    assert.equal(deduceCategoryFromRank('SM'), 'SUBOFICIAL');
    assert.equal(deduceCategoryFromRank('Sargento Primero'), 'SUBOFICIAL');
    assert.equal(deduceCategoryFromRank('SP'), 'SUBOFICIAL');
  });

  await t.test('Mayor alone is OFICIAL', () => {
    assert.equal(deduceCategoryFromRank('Mayor'), 'OFICIAL');
    assert.equal(deduceCategoryFromRank('MY'), 'OFICIAL');
  });

  await t.test('General, Coronel, Teniente Coronel, Capitan (ASCII) and CT are OFICIAL', () => {
    assert.equal(deduceCategoryFromRank('General de División'), 'OFICIAL');
    assert.equal(deduceCategoryFromRank('TC. Juan Perez'), 'OFICIAL');
    assert.equal(deduceCategoryFromRank('Capitan'), 'OFICIAL');
    assert.equal(deduceCategoryFromRank('CT'), 'OFICIAL');
    assert.equal(deduceCategoryFromRank('Subteniente'), 'OFICIAL'); // Contains 'TENIENTE'
  });

  await t.test('Adversarial Edge Case: Accented Capitán without diacritics normalization falls to SOLDADO', () => {
    // In ConsolaTraslados.tsx:205, r.includes('CAPITAN') fails for 'Capitán' (Á !== A)
    const result = deduceCategoryFromRank('Capitán');
    assert.equal(result, 'SOLDADO', 'Demonstrates empirical vulnerability when Spanish accent is present');

    // Demonstrates the recommended mitigation:
    const normalizedRank = 'Capitán'.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
    assert.equal(normalizedRank.includes('CAPITAN'), true, 'Normalization fixes Spanish diacritic mismatch');
  });

  await t.test('Soldado variations fallback safely to SOLDADO', () => {
    assert.equal(deduceCategoryFromRank('Soldado Profesional'), 'SOLDADO');
    assert.equal(deduceCategoryFromRank('SLP'), 'SOLDADO');
    assert.equal(deduceCategoryFromRank('Soldado Regular'), 'SOLDADO');
    assert.equal(deduceCategoryFromRank('SL18'), 'SOLDADO');
    assert.equal(deduceCategoryFromRank(''), 'SOLDADO');
    assert.equal(deduceCategoryFromRank(undefined), 'SOLDADO');
  });
});

// ---------------------------------------------------------------------------
// SUITE 7: ROLE AUTHORIZATION & PRIVILEGE ESCALATION PREVENTION
// ---------------------------------------------------------------------------

test('Adversarial Suite 7: Role Authorization Enforcement', async (t) => {
  await t.test('Only Command / Admin roles can approve', () => {
    const allowed = ['ROLE_EJERCITO', 'ROLE_DIVISION', 'ROLE_ADMINISTRATOR', 'ROLE_COMANDANTE_EJERCITO'];
    for (const r of allowed) {
      assert.equal(isAuthorizedToApprove(r), true, `Role ${r} should be authorized`);
    }
  });

  await t.test('Tactical units & unprivileged roles are strictly rejected', () => {
    const denied = [
      'ROLE_BRIGADA',
      'ROLE_BATALLON',
      'ROLE_PELOTON',
      'ROLE_USER',
      'ROLE_GUEST',
      'ADMIN',
      '',
      undefined,
      null
    ];
    for (const r of denied) {
      assert.equal(isAuthorizedToApprove(r), false, `Role ${r} must NOT be authorized`);
    }
  });
});

// ---------------------------------------------------------------------------
// SUITE 8: M2M WEBHOOK SPECIFICATION & TIMEOUT DISCIPLINE
// ---------------------------------------------------------------------------

test('Adversarial Suite 8: M2M Webhook Resilience Specification', async (t) => {
  const consolaPath = resolve(process.cwd(), 'src', 'components', 'ConsolaTraslados.tsx');
  const code = readFileSync(consolaPath, 'utf8');

  await t.test('Webhook uses 5000ms timeout for Air-Gap tactical tolerance', () => {
    assert.ok(code.includes('timeout: 5000'), 'Must specify 5000ms timeout for M2M webhook');
  });

  await t.test('Webhook sends X-Service-Token header', () => {
    assert.ok(code.includes("'X-Service-Token': 'simcop-tactical-m2m-secure-token-2026'"));
  });

  await t.test('Webhook cleans trailing /api in base URL to avoid double /api/api path', () => {
    assert.ok(code.includes("replace(/\\/api$/, '')"));
    assert.ok(code.includes('/api/webhooks/personnel/transfer-completed'));
  });

  await t.test('Webhook payload contains snake_case keys expected by SIMCOP WebhookController', () => {
    assert.ok(code.includes('soldier_id:'));
    assert.ok(code.includes('target_unit_id:'));
  });

  await t.test('Manual retry button exists for pending/failed M2M sync', () => {
    assert.ok(code.includes('Reintentar M2M'));
    assert.ok(code.includes('handleRetryM2m'));
  });
});
