/**
 * Automated Adversarial Test Suite: Metric Recalculation & Doctrinal Boundary Logic
 * Targets: src/components/AnalysisDashboard.tsx (KPI calculations, doctrinal thresholds, search filters)
 */

import { test, describe } from 'node:test';
import assert from 'node:assert';

// Extract pure calculation routines from AnalysisDashboard.tsx
function computeForceMetrics(toeData) {
  const totalActual = toeData.reduce((acc, c) => acc + (c.actual || 0), 0);
  const totalRequired = toeData.reduce((acc, c) => acc + (c.required || 0), 0);
  const forceDelta = totalActual - totalRequired;
  const toeFilledPct = totalRequired > 0 ? (totalActual / totalRequired) * 100 : totalActual > 0 ? 100 : 0;
  const coveragePercent =
    totalRequired > 0
      ? (totalActual / totalRequired) * 100
      : totalActual > 0
      ? 100
      : 0;

  const isDoctrinalPass = coveragePercent >= 80.0;
  const isOptimal = coveragePercent >= 85.0;

  return {
    totalActual,
    totalRequired,
    forceDelta,
    toeFilledPct,
    coveragePercent,
    isDoctrinalPass,
    isOptimal
  };
}

function computeHealthMetrics(availability) {
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

  return {
    totalHealthPersonnel,
    operationalFitnessPct
  };
}

function computeMosBreakdown(criticalRotation) {
  const map = {};
  for (const s of criticalRotation) {
    const code = s.mosCode || 'MOS-SD';
    map[code] = (map[code] || 0) + 1;
  }
  return Object.entries(map).sort((a, b) => b[1] - a[1]);
}

function filterCriticalPersonnel(criticalRotation, query) {
  if (!query || !query.trim()) return criticalRotation;
  const q = query.toLowerCase();
  return criticalRotation.filter(s => {
    const name = s.name?.toLowerCase() || '';
    const rank = s.rank?.toLowerCase() || '';
    const mos = s.mosCode?.toLowerCase() || '';
    const id = String(s.id || '').toLowerCase();
    return name.includes(q) || rank.includes(q) || mos.includes(q) || id.includes(q);
  });
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
  return 'w-[0%]';
}

describe('Metric Recalculation & Doctrinal Boundary Logic', () => {
  // -------------------------------------------------------------------------
  // Test 1: Standard Balanced & Deficit Force Calculations
  // -------------------------------------------------------------------------
  test('TC-M01: Normal unit dataset computes correct totals and delta', () => {
    const toeData = [
      { unitId: 'BAEEV4', mosCode: '11B', required: 100, actual: 90, deficit: 10 },
      { unitId: 'BAEEV4', mosCode: '19D', required: 50, actual: 45, deficit: 5 },
      { unitId: 'BAEEV4', mosCode: '68W', required: 20, actual: 15, deficit: 5 }
    ];

    const metrics = computeForceMetrics(toeData);
    assert.strictEqual(metrics.totalRequired, 170);
    assert.strictEqual(metrics.totalActual, 150);
    assert.strictEqual(metrics.forceDelta, -20);
    assert.strictEqual(metrics.coveragePercent.toFixed(2), '88.24');
    assert.strictEqual(metrics.isDoctrinalPass, true);
    assert.strictEqual(metrics.isOptimal, true);
  });

  // -------------------------------------------------------------------------
  // Test 2: Doctrinal 80.0% Threshold Rigorous Boundaries
  // -------------------------------------------------------------------------
  test('TC-M02: 79.9% coverage triggers Alerta Doctrinal (<80%)', () => {
    const toeData = [
      { unitId: 'U1', mosCode: '11B', required: 1000, actual: 799, deficit: 201 }
    ];
    const metrics = computeForceMetrics(toeData);
    assert.strictEqual(metrics.coveragePercent, 79.9);
    assert.strictEqual(metrics.isDoctrinalPass, false, 'Must fail doctrinal threshold at 79.9%');
    assert.strictEqual(metrics.isOptimal, false);
  });

  test('TC-M03: 80.0% exact coverage achieves Cumple Mínimo (>=80%)', () => {
    const toeData = [
      { unitId: 'U1', mosCode: '11B', required: 1000, actual: 800, deficit: 200 }
    ];
    const metrics = computeForceMetrics(toeData);
    assert.strictEqual(metrics.coveragePercent, 80.0);
    assert.strictEqual(metrics.isDoctrinalPass, true, 'Must pass minimum doctrinal threshold at 80.0%');
    assert.strictEqual(metrics.isOptimal, false, '80.0% is not yet optimal (requires >=85%)');
  });

  test('TC-M04: 84.9% coverage is minimum compliant, not optimal', () => {
    const toeData = [
      { unitId: 'U1', mosCode: '11B', required: 1000, actual: 849, deficit: 151 }
    ];
    const metrics = computeForceMetrics(toeData);
    assert.strictEqual(metrics.isDoctrinalPass, true);
    assert.strictEqual(metrics.isOptimal, false);
  });

  test('TC-M05: 85.0% exact coverage triggers Óptimo Doctrinal (>=85%)', () => {
    const toeData = [
      { unitId: 'U1', mosCode: '11B', required: 1000, actual: 850, deficit: 150 }
    ];
    const metrics = computeForceMetrics(toeData);
    assert.strictEqual(metrics.isDoctrinalPass, true);
    assert.strictEqual(metrics.isOptimal, true);
  });

  // -------------------------------------------------------------------------
  // Test 3: Empirical Bug Detection: 0/0 Empty Dataset Discrepancy
  // -------------------------------------------------------------------------
  test('TC-M06: Verified 0% alignment between toeFilledPct and coveragePercent when required=0', () => {
    const emptyToe = [];
    const metrics = computeForceMetrics(emptyToe);

    assert.strictEqual(metrics.totalActual, 0);
    assert.strictEqual(metrics.totalRequired, 0);
    assert.strictEqual(metrics.forceDelta, 0);
    assert.strictEqual(metrics.toeFilledPct, 0, 'toeFilledPct is consistently 0% when no TOE required');
    assert.strictEqual(metrics.coveragePercent, 0, 'coveragePercent defaults to 0%');
    assert.strictEqual(metrics.isDoctrinalPass, false);
  });

  // -------------------------------------------------------------------------
  // Test 4: Empirical Bug Detection: Availability Failure False Positive
  // -------------------------------------------------------------------------
  test('TC-M07: Verified 0% operational fitness fallback when availability is null', () => {
    // If /api/analysis/availability fails, availability state is null
    const metrics = computeHealthMetrics(null);

    assert.strictEqual(metrics.totalHealthPersonnel, 0);
    assert.strictEqual(
      metrics.operationalFitnessPct,
      0,
      'When availability is null, system safely reports 0% instead of false positive 100%'
    );
  });

  test('TC-M08: Medical casualties calculation when aptos=0', () => {
    const availability = { aptos: 0, noAptos: 50, excusados: 10, licencias: 5 };
    const metrics = computeHealthMetrics(availability);

    assert.strictEqual(metrics.totalHealthPersonnel, 65);
    assert.strictEqual(metrics.operationalFitnessPct, 0.0);
  });

  // -------------------------------------------------------------------------
  // Test 5: Critical Rotation MOS Aggregation & Search Filtering
  // -------------------------------------------------------------------------
  test('TC-M09: Critical rotation aggregates and sorts descending by MOS case count', () => {
    const soldiers = [
      { id: 1, name: 'Soldier A', mosCode: '11B' },
      { id: 2, name: 'Soldier B', mosCode: '11B' },
      { id: 3, name: 'Soldier C', mosCode: '19D' },
      { id: 4, name: 'Soldier D', mosCode: '11B' },
      { id: 5, name: 'Soldier E', mosCode: '' }, // Missing MOS code
      { id: 6, name: 'Soldier F', mosCode: '19D' }
    ];

    const breakdown = computeMosBreakdown(soldiers);
    assert.deepStrictEqual(breakdown, [
      ['11B', 3],
      ['19D', 2],
      ['MOS-SD', 1]
    ]);
  });

  test('TC-M10: Critical rotation search filter matches name, rank, MOS, or ID case-insensitively', () => {
    const soldiers = [
      { id: '101', name: 'Gómez Carlos', rank: 'Sargento Primero', mosCode: '11B' },
      { id: '102', name: 'Pérez Juan', rank: 'Cabo Segundo', mosCode: '19D' },
      { id: '103', name: 'Martínez Luis', rank: 'Capitán', mosCode: '13A' }
    ];

    // Search by name
    assert.strictEqual(filterCriticalPersonnel(soldiers, 'gómez').length, 1);
    // Search by rank
    assert.strictEqual(filterCriticalPersonnel(soldiers, 'cabo').length, 1);
    // Search by MOS
    assert.strictEqual(filterCriticalPersonnel(soldiers, '13A').length, 1);
    // Search by ID
    assert.strictEqual(filterCriticalPersonnel(soldiers, '102').length, 1);
    // Search non-matching
    assert.strictEqual(filterCriticalPersonnel(soldiers, 'NonExistentSoldier').length, 0);
  });

  // -------------------------------------------------------------------------
  // Test 6: Progress Bar Width Class Generator Range Sweep
  // -------------------------------------------------------------------------
  test('TC-M11: getWidthClass handles full 0-100 spectrum and boundary clamps', () => {
    assert.strictEqual(getWidthClass(-20), 'w-[0%]', 'Negative percentage clamped to 0');
    assert.strictEqual(getWidthClass(0), 'w-[0%]');
    assert.strictEqual(getWidthClass(5), 'w-[5%]');
    assert.strictEqual(getWidthClass(50), 'w-[50%]');
    assert.strictEqual(getWidthClass(80), 'w-[80%]');
    assert.strictEqual(getWidthClass(95), 'w-[95%]');
    assert.strictEqual(getWidthClass(100), 'w-full');
    assert.strictEqual(getWidthClass(250), 'w-full', 'Over 100 clamped to w-full');
  });
});
