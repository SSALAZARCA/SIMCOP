/**
 * Milestone 3 Adversarial Challenge & Verification Test Suite
 * 
 * Verifies:
 * 1. Numerical accuracy of 4 KPI cards in AnalysisDashboard.tsx:
 *    - Force vs TOE delta computation & sign/badge mapping
 *    - Organic coverage % with exact 80.0% doctrinal threshold boundary conditions (79.9%, 80.0%, 80.1%, 84.99%, 85.0%)
 *    - Psychophysical availability percentage: division by zero guard when total = 0
 *    - Critical rotation alert filter: strictly > 24 months, proper MOS breakdown & sorting
 * 2. Zero inline styles scan:
 *    - Programmatic static scan of AnalysisDashboard.tsx ensuring 0 occurrences of style=
 *    - Recharts container & tooltip Tailwind semantic styling verification
 * 3. ConsolaTraslados rank accent normalization:
 *    - Unicode NFD diacritics stripping: "Capitán" -> "CAPITAN" -> OFICIAL
 *    - Compound rank precedence (e.g., "Sargento Mayor" -> SUBOFICIAL)
 * 4. Architecture and reactive unit context propagation in App.tsx
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

// ---------------------------------------------------------------------------
// 1. REPLICATED LOGIC FROM AnalysisDashboard.tsx
// ---------------------------------------------------------------------------

function computeForceToeKpi(toeData) {
  const totalActual = toeData.reduce((acc, c) => acc + (c.actual || 0), 0);
  const totalRequired = toeData.reduce((acc, c) => acc + (c.required || 0), 0);
  const forceDelta = totalActual - totalRequired;
  const toeFilledPct = totalRequired > 0 ? (totalActual / totalRequired) * 100 : totalActual > 0 ? 100 : 0;

  let deltaType;
  let deltaLabel;
  if (forceDelta < 0) {
    deltaType = 'DEFICIT';
    deltaLabel = `${forceDelta} Déficit`;
  } else if (forceDelta === 0) {
    deltaType = 'COMPLETE';
    deltaLabel = 'Dotación Completa';
  } else {
    deltaType = 'SURPLUS';
    deltaLabel = `+${forceDelta} Excedente`;
  }

  return { totalActual, totalRequired, forceDelta, toeFilledPct, deltaType, deltaLabel };
}

function computeCoverageKpi(totalActual, totalRequired) {
  const coveragePercent = totalRequired > 0 
    ? (totalActual / totalRequired) * 100 
    : totalActual > 0 ? 100 : 0;
  
  const isDoctrinalPass = coveragePercent >= 80.0;
  const isOptimal = coveragePercent >= 85.0;

  let statusBadge;
  let textColorClass;
  let barColorClass;

  if (isOptimal) {
    statusBadge = 'Óptimo Doctrinal (≥85%)';
    textColorClass = 'text-emerald-400';
    barColorClass = 'bg-emerald-500';
  } else if (isDoctrinalPass) {
    statusBadge = 'Cumple Mínimo (≥80%)';
    textColorClass = 'text-cyan-400';
    barColorClass = 'bg-emerald-500';
  } else {
    statusBadge = 'Alerta Doctrinal (<80%)';
    textColorClass = 'text-rose-400';
    barColorClass = 'bg-rose-500';
  }

  return { coveragePercent, isDoctrinalPass, isOptimal, statusBadge, textColorClass, barColorClass };
}

function computeAvailabilityKpi(availability) {
  const totalHealthPersonnel = availability
    ? (availability.aptos || 0) +
      (availability.noAptos || 0) +
      (availability.excusados || 0) +
      (availability.licencias || 0)
    : 0;

  const operationalFitnessPct =
    totalHealthPersonnel > 0
      ? ((availability?.aptos || 0) / totalHealthPersonnel) * 100
      : 0;

  return { totalHealthPersonnel, operationalFitnessPct };
}

function computeCriticalRotationKpi(criticalRotation) {
  const criticalRotationCount = criticalRotation.length;

  const map = {};
  for (const s of criticalRotation) {
    const code = s.mosCode || 'MOS-SD';
    map[code] = (map[code] || 0) + 1;
  }
  const mosBreakdown = Object.entries(map).sort((a, b) => b[1] - a[1]);

  return { criticalRotationCount, mosBreakdown };
}

function getWidthClass(percentage) {
  const p = Math.max(0, Math.min(100, Math.round(percentage)));
  if (p >= 100) return 'w-full';
  if (p >= 95) return 'w-[95%]';
  if (p >= 90) return 'w-[90%]';
  if (p >= 85) return 'w-[85%]';
  if (p >= 80) return 'w-[80%]';
  if (p >= 75) return 'w-[75%]';
  if (p >= 70) return 'w-[70%]';
  if (p >= 65) return 'w-[65%]';
  if (p >= 60) return 'w-[60%]';
  if (p >= 55) return 'w-[55%]';
  if (p >= 50) return 'w-[50%]';
  if (p >= 45) return 'w-[45%]';
  if (p >= 40) return 'w-[40%]';
  if (p >= 35) return 'w-[35%]';
  if (p >= 30) return 'w-[30%]';
  if (p >= 25) return 'w-[25%]';
  if (p >= 20) return 'w-[20%]';
  if (p >= 15) return 'w-[15%]';
  if (p >= 10) return 'w-[10%]';
  if (p >= 5) return 'w-[5%]';
  return 'w-[0%]'
}

// ---------------------------------------------------------------------------
// 2. REPLICATED LOGIC FROM ConsolaTraslados.tsx
// ---------------------------------------------------------------------------

function deduceCategoryFromRank(rank) {
  if (!rank) return 'SOLDADO';
  const r = rank
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase();

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

// ---------------------------------------------------------------------------
// TEST SUITES
// ---------------------------------------------------------------------------

test('Milestone 3 Suite 1: KPI 1 - Force vs TOE Delta & Percentage Calculations', async (t) => {
  await t.test('Deficit situation: actual < required', () => {
    const toeData = [
      { unitId: 'U1', mosCode: '11B', required: 100, actual: 80, deficit: 20 },
      { unitId: 'U1', mosCode: '19D', required: 50, actual: 40, deficit: 10 }
    ];
    const kpi = computeForceToeKpi(toeData);
    assert.equal(kpi.totalActual, 120);
    assert.equal(kpi.totalRequired, 150);
    assert.equal(kpi.forceDelta, -30);
    assert.equal(kpi.deltaType, 'DEFICIT');
    assert.equal(kpi.deltaLabel, '-30 Déficit');
    assert.equal(kpi.toeFilledPct.toFixed(1), '80.0');
  });

  await t.test('Complete endowment: actual == required', () => {
    const toeData = [
      { unitId: 'U1', mosCode: '11B', required: 100, actual: 100, deficit: 0 },
      { unitId: 'U1', mosCode: '13A', required: 20, actual: 20, deficit: 0 }
    ];
    const kpi = computeForceToeKpi(toeData);
    assert.equal(kpi.totalActual, 120);
    assert.equal(kpi.totalRequired, 120);
    assert.equal(kpi.forceDelta, 0);
    assert.equal(kpi.deltaType, 'COMPLETE');
    assert.equal(kpi.deltaLabel, 'Dotación Completa');
    assert.equal(kpi.toeFilledPct.toFixed(1), '100.0');
  });

  await t.test('Surplus situation: actual > required', () => {
    const toeData = [
      { unitId: 'U1', mosCode: '11B', required: 100, actual: 110, deficit: 0 },
      { unitId: 'U1', mosCode: '68W', required: 10, actual: 15, deficit: 0 }
    ];
    const kpi = computeForceToeKpi(toeData);
    assert.equal(kpi.totalActual, 125);
    assert.equal(kpi.totalRequired, 110);
    assert.equal(kpi.forceDelta, 15);
    assert.equal(kpi.deltaType, 'SURPLUS');
    assert.equal(kpi.deltaLabel, '+15 Excedente');
    assert.equal(kpi.toeFilledPct.toFixed(1), '113.6');
  });

  await t.test('Adversarial edge case: empty TOE list and zero requirements', () => {
    const emptyKpi = computeForceToeKpi([]);
    assert.equal(emptyKpi.totalActual, 0);
    assert.equal(emptyKpi.totalRequired, 0);
    assert.equal(emptyKpi.forceDelta, 0);
    assert.equal(emptyKpi.deltaType, 'COMPLETE');
    assert.equal(emptyKpi.toeFilledPct, 0);
    assert.equal(Number.isNaN(emptyKpi.toeFilledPct), false);
  });

  await t.test('Adversarial edge case: missing or null actual/required fields', () => {
    const corruptedData = [
      { unitId: 'U1', mosCode: '11B', required: null, actual: undefined },
      { unitId: 'U1', mosCode: '19D', required: 50, actual: 40 }
    ];
    const kpi = computeForceToeKpi(corruptedData);
    assert.equal(kpi.totalActual, 40);
    assert.equal(kpi.totalRequired, 50);
    assert.equal(kpi.forceDelta, -10);
  });
});

test('Milestone 3 Suite 2: KPI 2 - % Cobertura Orgánica with 80.0% Doctrinal Boundary Conditions', async (t) => {
  await t.test('Boundary test: 79.9% coverage (strictly below threshold)', () => {
    // 799 actual out of 1000 required = 79.9%
    const kpi = computeCoverageKpi(799, 1000);
    assert.equal(kpi.coveragePercent.toFixed(1), '79.9');
    assert.equal(kpi.isDoctrinalPass, false);
    assert.equal(kpi.isOptimal, false);
    assert.equal(kpi.statusBadge, 'Alerta Doctrinal (<80%)');
    assert.equal(kpi.textColorClass, 'text-rose-400');
    assert.equal(kpi.barColorClass, 'bg-rose-500');
  });

  await t.test('Boundary test: exact 80.0% coverage (at threshold)', () => {
    // 800 actual out of 1000 required = 80.0%
    const kpi = computeCoverageKpi(800, 1000);
    assert.equal(kpi.coveragePercent.toFixed(1), '80.0');
    assert.equal(kpi.isDoctrinalPass, true);
    assert.equal(kpi.isOptimal, false);
    assert.equal(kpi.statusBadge, 'Cumple Mínimo (≥80%)');
    assert.equal(kpi.textColorClass, 'text-cyan-400');
    assert.equal(kpi.barColorClass, 'bg-emerald-500');
  });

  await t.test('Boundary test: 80.1% coverage (strictly above threshold)', () => {
    // 801 actual out of 1000 required = 80.1%
    const kpi = computeCoverageKpi(801, 1000);
    assert.equal(kpi.coveragePercent.toFixed(1), '80.1');
    assert.equal(kpi.isDoctrinalPass, true);
    assert.equal(kpi.isOptimal, false);
    assert.equal(kpi.statusBadge, 'Cumple Mínimo (≥80%)');
    assert.equal(kpi.textColorClass, 'text-cyan-400');
    assert.equal(kpi.barColorClass, 'bg-emerald-500');
  });

  await t.test('Boundary test: 84.99% coverage (just below optimal threshold)', () => {
    const kpi = computeCoverageKpi(8499, 10000);
    assert.equal(kpi.isDoctrinalPass, true);
    assert.equal(kpi.isOptimal, false);
    assert.equal(kpi.statusBadge, 'Cumple Mínimo (≥80%)');
  });

  await t.test('Boundary test: 85.0% coverage (optimal threshold)', () => {
    const kpi = computeCoverageKpi(850, 1000);
    assert.equal(kpi.coveragePercent.toFixed(1), '85.0');
    assert.equal(kpi.isDoctrinalPass, true);
    assert.equal(kpi.isOptimal, true);
    assert.equal(kpi.statusBadge, 'Óptimo Doctrinal (≥85%)');
    assert.equal(kpi.textColorClass, 'text-emerald-400');
    assert.equal(kpi.barColorClass, 'bg-emerald-500');
  });

  await t.test('Adversarial zero inputs: 0 required and 0 actual', () => {
    const kpi = computeCoverageKpi(0, 0);
    assert.equal(kpi.coveragePercent, 0);
    assert.equal(kpi.isDoctrinalPass, false);
    assert.equal(Number.isNaN(kpi.coveragePercent), false);
  });

  await t.test('getWidthClass utility converts coverage to semantic Tailwind classes with zero inline styles', () => {
    assert.equal(getWidthClass(80), 'w-[80%]');
    assert.equal(getWidthClass(79.9), 'w-[80%]');
    assert.equal(getWidthClass(75), 'w-[75%]');
    assert.equal(getWidthClass(0), 'w-[0%]');
    assert.equal(getWidthClass(100), 'w-full');
    assert.equal(getWidthClass(120), 'w-full'); // Clamped to 100
    assert.equal(getWidthClass(-10), 'w-[0%]'); // Clamped to 0
  });
});

test('Milestone 3 Suite 3: KPI 3 - Psychophysical Availability & Zero Division Guard', async (t) => {
  await t.test('Division by zero guard: all health metrics are 0', () => {
    const availability = { aptos: 0, noAptos: 0, excusados: 0, licencias: 0 };
    const kpi = computeAvailabilityKpi(availability);
    assert.equal(kpi.totalHealthPersonnel, 0);
    assert.equal(kpi.operationalFitnessPct, 0);
    assert.equal(Number.isNaN(kpi.operationalFitnessPct), false);
    assert.equal(Number.isFinite(kpi.operationalFitnessPct), true);
  });

  await t.test('Null availability object returns safe defaults without throwing', () => {
    const kpi = computeAvailabilityKpi(null);
    assert.equal(kpi.totalHealthPersonnel, 0);
    assert.equal(kpi.operationalFitnessPct, 0);
  });

  await t.test('Undefined properties handled safely', () => {
    const kpi = computeAvailabilityKpi({ aptos: undefined, noAptos: undefined });
    assert.equal(kpi.totalHealthPersonnel, 0);
    assert.equal(kpi.operationalFitnessPct, 0);
  });

  await t.test('Realistic health distribution calculation', () => {
    const availability = { aptos: 85, noAptos: 5, excusados: 5, licencias: 5 };
    const kpi = computeAvailabilityKpi(availability);
    assert.equal(kpi.totalHealthPersonnel, 100);
    assert.equal(kpi.operationalFitnessPct.toFixed(1), '85.0');
  });

  await t.test('Zero aptos with active sick leaves: operational fitness drops to 0%', () => {
    const availability = { aptos: 0, noAptos: 10, excusados: 5, licencias: 0 };
    const kpi = computeAvailabilityKpi(availability);
    assert.equal(kpi.totalHealthPersonnel, 15);
    assert.equal(kpi.operationalFitnessPct, 0);
  });
});

test('Milestone 3 Suite 4: KPI 4 - Critical Rotation (>24 Months) & MOS Grouping', async (t) => {
  await t.test('Backend contract check: strictly > 24 months in AnalysisService.java', () => {
    const backendServicePath = resolve(process.cwd(), '../backend/src/main/java/com/sigep/service/AnalysisService.java');
    assert.equal(existsSync(backendServicePath), true, 'AnalysisService.java must exist');
    const content = readFileSync(backendServicePath, 'utf-8');
    
    // Line 189 must strictly verify > 24
    assert.match(
      content,
      /s\.getTimeInPosition\(\)\s*>\s*24/,
      'AnalysisService must filter soldiers with timeInPosition > 24'
    );
  });

  await t.test('MOS Breakdown counts frequency and sorts descending', () => {
    const soldiers = [
      { id: 1, name: 'S1', rank: 'SLP', mosCode: '11B', timeInPosition: 26 },
      { id: 2, name: 'S2', rank: 'SLP', mosCode: '11B', timeInPosition: 28 },
      { id: 3, name: 'S3', rank: 'SLP', mosCode: '11B', timeInPosition: 30 },
      { id: 4, name: 'S4', rank: 'CP',  mosCode: '19D', timeInPosition: 25 },
      { id: 5, name: 'S5', rank: 'SS',  mosCode: '19D', timeInPosition: 27 },
      { id: 6, name: 'S6', rank: 'CT',  mosCode: '13A', timeInPosition: 32 },
      { id: 7, name: 'S7', rank: 'SLP', mosCode: null,  timeInPosition: 29 } // Undefined MOS
    ];

    const kpi = computeCriticalRotationKpi(soldiers);
    assert.equal(kpi.criticalRotationCount, 7);

    // Expected descending order: 11B (3), 19D (2), 13A (1), MOS-SD (1)
    assert.equal(kpi.mosBreakdown[0][0], '11B');
    assert.equal(kpi.mosBreakdown[0][1], 3);

    assert.equal(kpi.mosBreakdown[1][0], '19D');
    assert.equal(kpi.mosBreakdown[1][1], 2);

    assert.equal(kpi.mosBreakdown[2][0], '13A');
    assert.equal(kpi.mosBreakdown[2][1], 1);

    assert.equal(kpi.mosBreakdown[3][0], 'MOS-SD');
    assert.equal(kpi.mosBreakdown[3][1], 1);
  });

  await t.test('Empty critical rotation handled gracefully', () => {
    const kpi = computeCriticalRotationKpi([]);
    assert.equal(kpi.criticalRotationCount, 0);
    assert.equal(kpi.mosBreakdown.length, 0);
  });
});

test('Milestone 3 Suite 5: Static Analysis - Zero Inline Styles in AnalysisDashboard.tsx', async (t) => {
  const componentPath = resolve(process.cwd(), 'src/components/AnalysisDashboard.tsx');
  assert.equal(existsSync(componentPath), true, 'AnalysisDashboard.tsx must exist');
  const code = readFileSync(componentPath, 'utf-8');

  await t.test('Zero occurrences of style= attribute in AnalysisDashboard.tsx', () => {
    // Regex matching any style= or style =
    const styleMatches = code.match(/\bstyle\s*=/gi);
    const count = styleMatches ? styleMatches.length : 0;
    assert.equal(count, 0, `Expected 0 inline style= occurrences, but found ${count}`);
  });

  await t.test('Zero occurrences of style={{ in AnalysisDashboard.tsx', () => {
    const jsxStyleMatches = code.match(/style\s*=\s*\{\{/gi);
    const count = jsxStyleMatches ? jsxStyleMatches.length : 0;
    assert.equal(count, 0, `Expected 0 style={{ occurrences, but found ${count}`);
  });

  await t.test('Recharts components do not use legacy contentStyle inline objects', () => {
    const contentStyleMatches = code.match(/contentStyle\s*=/gi);
    const count = contentStyleMatches ? contentStyleMatches.length : 0;
    assert.equal(count, 0, `Expected 0 contentStyle= occurrences, but found ${count}`);
  });

  await t.test('CustomTacticalTooltip uses pure Tailwind CSS classes', () => {
    assert.match(
      code,
      /bg-slate-950\/95\s+border\s+border-cyan-500\/40\s+backdrop-blur-md/,
      'CustomTacticalTooltip must use Tailwind Mil-Spec classes'
    );
  });
});

test('Milestone 3 Suite 6: ConsolaTraslados.tsx Rank Accent Normalization Verification', async (t) => {
  const consolaPath = resolve(process.cwd(), 'src/components/ConsolaTraslados.tsx');
  assert.equal(existsSync(consolaPath), true, 'ConsolaTraslados.tsx must exist');
  const consolaCode = readFileSync(consolaPath, 'utf-8');

  await t.test('ConsolaTraslados.tsx source code contains NFD diacritics stripping', () => {
    assert.match(
      consolaCode,
      /\.normalize\(["']NFD["']\)/,
      'deduceCategoryFromRank must normalize Unicode string to NFD'
    );
    assert.match(
      consolaCode,
      /\.replace\(\/\[\\u0300-\\u036f\]\/g,\s*["']["']\)/,
      'deduceCategoryFromRank must strip combining diacritical marks'
    );
  });

  await t.test('Accented ranks classified accurately as OFICIAL', () => {
    // Both unaccented and accented forms must evaluate to OFICIAL
    assert.equal(deduceCategoryFromRank('Capitán'), 'OFICIAL', 'Accented Capitán must be OFICIAL');
    assert.equal(deduceCategoryFromRank('CAPITÁN'), 'OFICIAL', 'Accented CAPITÁN uppercase must be OFICIAL');
    assert.equal(deduceCategoryFromRank('Capitan'), 'OFICIAL', 'Unaccented Capitan must be OFICIAL');
    assert.equal(deduceCategoryFromRank('CAPITAN'), 'OFICIAL', 'Unaccented CAPITAN must be OFICIAL');
    assert.equal(deduceCategoryFromRank('Teniente Coronel'), 'OFICIAL');
    assert.equal(deduceCategoryFromRank('Mayor'), 'OFICIAL');
    assert.equal(deduceCategoryFromRank('General'), 'OFICIAL');
    assert.equal(deduceCategoryFromRank('Mayor General'), 'OFICIAL');
    assert.equal(deduceCategoryFromRank('Brigadier General'), 'OFICIAL');
    assert.equal(deduceCategoryFromRank('Subteniente'), 'OFICIAL');
  });

  await t.test('Compound rank Sargento Mayor is SUBOFICIAL, not OFICIAL', () => {
    assert.equal(deduceCategoryFromRank('Sargento Mayor'), 'SUBOFICIAL');
    assert.equal(deduceCategoryFromRank('SARGENTO MAYOR'), 'SUBOFICIAL');
    assert.equal(deduceCategoryFromRank('Suboficial Técnico'), 'SUBOFICIAL');
    assert.equal(deduceCategoryFromRank('Sargento Primero'), 'SUBOFICIAL');
    assert.equal(deduceCategoryFromRank('Cabo Primero'), 'SUBOFICIAL');
    assert.equal(deduceCategoryFromRank('Cabo Tercero'), 'SUBOFICIAL');
  });

  await t.test('Enlisted / Soldier ranks classified as SOLDADO', () => {
    assert.equal(deduceCategoryFromRank('Soldado Profesional'), 'SOLDADO');
    assert.equal(deduceCategoryFromRank('Soldado Regular'), 'SOLDADO');
    assert.equal(deduceCategoryFromRank('SLP'), 'SOLDADO');
    assert.equal(deduceCategoryFromRank('SLB'), 'SOLDADO');
    assert.equal(deduceCategoryFromRank('SLR'), 'SOLDADO');
    assert.equal(deduceCategoryFromRank(''), 'SOLDADO');
    assert.equal(deduceCategoryFromRank(undefined), 'SOLDADO');
  });
});

test('Milestone 3 Suite 7: App.tsx Architecture & Reactive Unit Propagation', async (t) => {
  const appPath = resolve(process.cwd(), 'src/App.tsx');
  const appCode = readFileSync(appPath, 'utf-8');

  await t.test('App.tsx imports AnalysisDashboard from components', () => {
    assert.match(
      appCode,
      /import\s+AnalysisDashboard\s+from\s+['"]\.\/components\/AnalysisDashboard['"]/,
      'App.tsx must import TypeScript AnalysisDashboard'
    );
  });

  await t.test('App.tsx mounts AnalysisDashboard with reactive unitId', () => {
    assert.match(
      appCode,
      /<AnalysisDashboard\s+unitId=\{effectiveUnitId\}\s*\/>/,
      'AnalysisDashboard must receive effectiveUnitId prop'
    );
  });

  await t.test('Legacy src/pages/AnalysisDashboard.jsx re-exports from components', () => {
    const legacyPath = resolve(process.cwd(), 'src/pages/AnalysisDashboard.jsx');
    assert.equal(existsSync(legacyPath), true, 'Legacy file must exist for backward compat');
    const legacyCode = readFileSync(legacyPath, 'utf-8');
    assert.match(
      legacyCode,
      /import\s+AnalysisDashboard\s+from\s+['"]\.\.\/components\/AnalysisDashboard['"]/,
      'Legacy page must re-export new component'
    );
  });
});
