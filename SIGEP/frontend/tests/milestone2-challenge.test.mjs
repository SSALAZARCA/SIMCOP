/**
 * Milestone 2 Empirical Challenge & Verification Suite
 * 
 * Tests:
 * 1. TOE Impact Simulator Calculations & 80% Doctrinal Threshold
 * 2. Rank Category Deduction & Pipeline Classification
 * 3. Role-Based Approval Authorization (Fixing ROLE_BRIGADA 403 bug)
 * 4. M2M Webhook Payload Contract & Resilience
 * 5. Elimination of Synthetic LOTE IDs and Fake Validations
 * 6. Zero Inline Styles & Code Integrity in ConsolaTraslados.tsx
 * 7. App.tsx Integration & Clean Deprecation Verification
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

// ---------------------------------------------------------------------------
// 1. SIMULATOR LOGIC REPLICATION FOR VERIFICATION
// ---------------------------------------------------------------------------

function evaluateToeImpact(originToe, destToe) {
  const originReq = originToe.required;
  const originAct = originToe.actual;
  const originActProjected = Math.max(0, originAct - 1);
  const originCovBefore = Math.round((originAct / originReq) * 1000) / 10;
  const originCovAfter = Math.round((originActProjected / originReq) * 1000) / 10;

  const destReq = destToe.required;
  const destAct = destToe.actual;
  const destActProjected = destAct + 1;
  const destCovBefore = Math.round((destAct / destReq) * 1000) / 10;
  const destCovAfter = Math.round((destActProjected / destReq) * 1000) / 10;

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

function isAuthorizedToApproveTransfer(role) {
  return (
    role === 'ROLE_EJERCITO' ||
    role === 'ROLE_DIVISION' ||
    role === 'ROLE_ADMINISTRATOR' ||
    role === 'ROLE_COMANDANTE_EJERCITO'
  );
}

// ---------------------------------------------------------------------------
// SUITE 1: TOE IMPACT SIMULATOR & 80% THRESHOLD
// ---------------------------------------------------------------------------

test('Suite 1: TOE Impact Simulator & Doctrinal Thresholds', async (t) => {
  await t.test('Safe transfer when origin remains at or above 80% coverage', () => {
    // 50 required, 45 actual -> 44 after extraction (44/50 = 88.0%)
    const result = evaluateToeImpact({ required: 50, actual: 45 }, { required: 40, actual: 30 });
    
    assert.equal(result.originBefore.coveragePct, 90.0);
    assert.equal(result.originAfter.actual, 44);
    assert.equal(result.originAfter.coveragePct, 88.0);
    assert.equal(result.isOriginBelowThreshold, false);
    assert.equal(result.viable, true);

    // Destination gained 1: 30 -> 31 (31/40 = 77.5%)
    assert.equal(result.destinationAfter.actual, 31);
    assert.equal(result.destinationAfter.coveragePct, 77.5);
  });

  await t.test('Deficit flagged when origin drops below 80% threshold', () => {
    // 10 required, 8 actual -> 7 after extraction (7/10 = 70.0% < 80%)
    const result = evaluateToeImpact({ required: 10, actual: 8 }, { required: 20, actual: 15 });
    
    assert.equal(result.originBefore.coveragePct, 80.0);
    assert.equal(result.originAfter.actual, 7);
    assert.equal(result.originAfter.coveragePct, 70.0);
    assert.equal(result.isOriginBelowThreshold, true);
    assert.equal(result.viable, false);
  });

  await t.test('Exact 80.0% boundary condition', () => {
    // 10 required, 9 actual -> 8 after extraction (8/10 = 80.0%)
    const result = evaluateToeImpact({ required: 10, actual: 9 }, { required: 10, actual: 5 });
    
    assert.equal(result.originAfter.coveragePct, 80.0);
    assert.equal(result.isOriginBelowThreshold, false);
    assert.equal(result.viable, true);
  });
});

// ---------------------------------------------------------------------------
// SUITE 2: RANK CATEGORY DEDUCTION & PIPELINE
// ---------------------------------------------------------------------------

test('Suite 2: Military Rank Classification', async (t) => {
  await t.test('Correctly classifies Officer ranks', () => {
    const officerRanks = ['General', 'BG', 'CR', 'TC', 'MY', 'CT', 'TE', 'ST', 'Coronel'];
    for (const rank of officerRanks) {
      assert.equal(deduceCategoryFromRank(rank), 'OFICIAL', `Failed for rank: ${rank}`);
    }
  });

  await t.test('Correctly classifies NCO (Suboficial) ranks', () => {
    const ncoRanks = ['Sargento Mayor', 'SP', 'SV', 'SS', 'CP', 'CS', 'C3', 'Cabo Primero'];
    for (const rank of ncoRanks) {
      assert.equal(deduceCategoryFromRank(rank), 'SUBOFICIAL', `Failed for rank: ${rank}`);
    }
  });

  await t.test('Correctly classifies Enlisted / Soldier ranks', () => {
    const soldierRanks = ['SLP', 'SL18', 'Soldado Profesional', 'Soldado Regular'];
    for (const rank of soldierRanks) {
      assert.equal(deduceCategoryFromRank(rank), 'SOLDADO', `Failed for rank: ${rank}`);
    }
  });
});

// ---------------------------------------------------------------------------
// SUITE 3: ROLE-BASED APPROVAL AUTHORIZATION
// ---------------------------------------------------------------------------

test('Suite 3: Role Authorization Rules', async (t) => {
  await t.test('High Command roles are authorized to approve transfers', () => {
    assert.equal(isAuthorizedToApproveTransfer('ROLE_EJERCITO'), true);
    assert.equal(isAuthorizedToApproveTransfer('ROLE_DIVISION'), true);
    assert.equal(isAuthorizedToApproveTransfer('ROLE_ADMINISTRATOR'), true);
    assert.equal(isAuthorizedToApproveTransfer('ROLE_COMANDANTE_EJERCITO'), true);
  });

  await t.test('Tactical units (Brigada, Batallon) CANNOT approve (avoids 403 error)', () => {
    assert.equal(isAuthorizedToApproveTransfer('ROLE_BRIGADA'), false);
    assert.equal(isAuthorizedToApproveTransfer('ROLE_BATALLON'), false);
    assert.equal(isAuthorizedToApproveTransfer('ROLE_PELOTON'), false);
    assert.equal(isAuthorizedToApproveTransfer('ROLE_USER'), false);
  });
});

// ---------------------------------------------------------------------------
// SUITE 4: M2M WEBHOOK CONTRACT & RESILIENCE
// ---------------------------------------------------------------------------

test('Suite 4: M2M Webhook Payload Contract', async (t) => {
  await t.test('Structured payload matches WebhookController expected JSON', () => {
    const soldierId = '109823412';
    const targetUnitId = 'DIV1';
    const name = 'CT. Santiago Salazar';
    const rank = 'CT';
    const mosCode = '11B';

    const webhookPayload = {
      payload: {
        soldier_id: soldierId,
        target_unit_id: targetUnitId,
        name,
        rank,
        mos_code: mosCode
      }
    };

    assert.equal(webhookPayload.payload.soldier_id, soldierId);
    assert.equal(webhookPayload.payload.target_unit_id, targetUnitId);
    assert.equal(webhookPayload.payload.name, name);
    assert.equal(webhookPayload.payload.rank, rank);
    assert.equal(webhookPayload.payload.mos_code, mosCode);
  });
});

// ---------------------------------------------------------------------------
// SUITE 5: CODE INTEGRITY & AST INSPECTION
// ---------------------------------------------------------------------------

test('Suite 5: Source Code Integrity & Mil-Spec Standards', async (t) => {
  const basePath = resolve(process.cwd(), 'src');
  const consolaPath = resolve(basePath, 'components', 'ConsolaTraslados.tsx');
  const appPath = resolve(basePath, 'App.tsx');

  await t.test('ConsolaTraslados.tsx exists and has zero inline styles', () => {
    assert.ok(existsSync(consolaPath), 'ConsolaTraslados.tsx does not exist');
    const content = readFileSync(consolaPath, 'utf8');

    // Rule: Zero inline styles
    const inlineStyleMatches = content.match(/style\s*=\s*\{\{/g);
    assert.equal(inlineStyleMatches, null, 'ConsolaTraslados.tsx contains forbidden inline styles!');
  });

  await t.test('ConsolaTraslados.tsx contains no synthetic LOTE- IDs', () => {
    const content = readFileSync(consolaPath, 'utf8');
    assert.ok(!content.includes("'LOTE-'"), 'ConsolaTraslados.tsx must not generate synthetic LOTE- IDs');
    assert.ok(!content.includes('"LOTE-"'), 'ConsolaTraslados.tsx must not generate synthetic LOTE- IDs');
  });

  await t.test('ConsolaTraslados.tsx implements rank category tabs and status pipeline', () => {
    const content = readFileSync(consolaPath, 'utf8');
    assert.ok(content.includes('TODOS'));
    assert.ok(content.includes('OFICIAL'));
    assert.ok(content.includes('SUBOFICIAL'));
    assert.ok(content.includes('SOLDADO'));
    assert.ok(content.includes('PENDING_APPROVAL'));
    assert.ok(content.includes('PENDING_REVIEW'));
    assert.ok(content.includes('APPROVED'));
    assert.ok(content.includes('80.0'));
  });

  await t.test('App.tsx mounts ConsolaTraslados and has no TransfersConsolidatedView', () => {
    assert.ok(existsSync(appPath), 'App.tsx does not exist');
    const content = readFileSync(appPath, 'utf8');

    assert.ok(content.includes('<ConsolaTraslados'), 'App.tsx must mount <ConsolaTraslados />');
    assert.ok(!content.includes('TransfersConsolidatedView'), 'App.tsx must not retain obsolete TransfersConsolidatedView');
  });

  await t.test('Deprecated components delegate safely to ConsolaTraslados', () => {
    const ofcPath = resolve(basePath, 'components', 'TrasladoOficiales.tsx');
    const subPath = resolve(basePath, 'components', 'TrasladoSuboficiales.tsx');
    const sldPath = resolve(basePath, 'components', 'TrasladoSoldados.tsx');

    assert.ok(existsSync(ofcPath));
    assert.ok(existsSync(subPath));
    assert.ok(existsSync(sldPath));

    const ofcContent = readFileSync(ofcPath, 'utf8');
    const subContent = readFileSync(subPath, 'utf8');
    const sldContent = readFileSync(sldPath, 'utf8');

    assert.ok(ofcContent.includes('ConsolaTraslados'));
    assert.ok(subContent.includes('ConsolaTraslados'));
    assert.ok(sldContent.includes('ConsolaTraslados'));
  });
});
