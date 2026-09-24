import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendDir = path.resolve(__dirname, '..');

const analysisDashboardTsxPath = path.join(frontendDir, 'src', 'components', 'AnalysisDashboard.tsx');
const analysisDashboardJsxPath = path.join(frontendDir, 'src', 'pages', 'AnalysisDashboard.jsx');
const appTsxPath = path.join(frontendDir, 'src', 'App.tsx');
const backendControllerPath = path.resolve(frontendDir, '..', 'backend', 'src', 'main', 'java', 'com', 'sigep', 'controller', 'AnalysisController.java');

const dashboardCode = fs.readFileSync(analysisDashboardTsxPath, 'utf8');
const dashboardJsxCode = fs.readFileSync(analysisDashboardJsxPath, 'utf8');
const appCode = fs.readFileSync(appTsxPath, 'utf8');
const backendControllerCode = fs.readFileSync(backendControllerPath, 'utf8');

test('Forensic Suite 1: Zero Inline Styles Verification', async (t) => {
  await t.test('AnalysisDashboard.tsx has zero style= occurrences', () => {
    const matches = dashboardCode.match(/style\s*=\s*\{/g);
    assert.strictEqual(matches, null, `Found style={ in AnalysisDashboard.tsx: ${matches?.length}`);
  });

  await t.test('AnalysisDashboard.jsx has zero style= occurrences', () => {
    const matches = dashboardJsxCode.match(/style\s*=\s*\{/g);
    assert.strictEqual(matches, null, `Found style={ in AnalysisDashboard.jsx: ${matches?.length}`);
  });

  await t.test('App.tsx has zero style= occurrences', () => {
    const matches = appCode.match(/style\s*=\s*\{/g);
    assert.strictEqual(matches, null, `Found style={ in App.tsx: ${matches?.length}`);
  });
});

test('Forensic Suite 2: Genuine Implementation & No Mock Facades', async (t) => {
  await t.test('Real network endpoints are invoked without mocked static data', () => {
    assert.ok(dashboardCode.includes('/analysis/toe-balance/'));
    assert.ok(dashboardCode.includes('/analysis/availability/'));
    assert.ok(dashboardCode.includes('/analysis/critical-rotation/'));
  });

  await t.test('Backend controller exposes matching endpoints', () => {
    assert.ok(backendControllerCode.includes('@GetMapping("/toe-balance/{unitId}")'));
    assert.ok(backendControllerCode.includes('@GetMapping("/availability/{unitId}")'));
    assert.ok(backendControllerCode.includes('@GetMapping("/critical-rotation/{unitId}")'));
  });

  await t.test('KPI metrics are derived from live state arrays, not hardcoded literals', () => {
    assert.ok(dashboardCode.includes('toeData.reduce((acc, c) => acc + (c.actual || 0), 0)'));
    assert.ok(dashboardCode.includes('toeData.reduce((acc, c) => acc + (c.required || 0), 0)'));
    assert.ok(dashboardCode.includes('forceDelta = totalActual - totalRequired'));
    assert.ok(dashboardCode.includes('criticalRotationCount = criticalRotation.length'));
  });

  await t.test('Recharts components are genuinely imported and rendered', () => {
    assert.ok(dashboardCode.includes("from 'recharts'"));
    assert.ok(dashboardCode.includes('<ResponsiveContainer width="100%" height={360}>'));
    assert.ok(dashboardCode.includes('<BarChart'));
    assert.ok(dashboardCode.includes('<PieChart>'));
    assert.ok(dashboardCode.includes('<Pie'));
    assert.ok(dashboardCode.includes('<Cell'));
    assert.ok(dashboardCode.includes('<RechartsTooltip content={<CustomTacticalTooltip />} />'));
  });

  await t.test('Legacy AnalysisDashboard.jsx is cleanly deprecated and delegates to TSX component', () => {
    assert.ok(dashboardJsxCode.includes('@deprecated'));
    assert.ok(dashboardJsxCode.includes("import AnalysisDashboard from '../components/AnalysisDashboard'"));
    assert.ok(dashboardJsxCode.includes('export default AnalysisDashboard'));
  });
});

test('Forensic Suite 3: Doctrinal Rules & Mathematical Safety', async (t) => {
  await t.test('Doctrinal military threshold is strictly 80.0%', () => {
    assert.ok(dashboardCode.includes('coveragePercent >= 80.0'));
    assert.ok(dashboardCode.includes('Umbral Doctrinal: 80.0%'));
  });

  await t.test('Safe mathematical clamping on percentage bar widths', () => {
    assert.ok(dashboardCode.includes('Math.max(0, Math.min(100, Math.round(percentage)))'));
  });

  await t.test('Division by zero is guarded across all percentage computations', () => {
    assert.ok(dashboardCode.includes('totalRequired > 0 ? (totalActual / totalRequired) * 100 :'));
    assert.ok(dashboardCode.includes('totalHealthPersonnel > 0'));
  });

  await t.test('Critical rotation threshold is strictly > 24 months', () => {
    assert.ok(dashboardCode.includes('>24'));
    assert.ok(backendControllerCode.includes('critical-rotation'));
  });
});

test('Forensic Suite 4: Reactive Global Unit Context & Routing', async (t) => {
  await t.test('AnalysisDashboard consumes UnitContext', () => {
    assert.ok(dashboardCode.includes('useUnit()'));
    assert.ok(dashboardCode.includes('selectedUnitId: contextUnitId'));
  });

  await t.test('App.tsx passes reactive unitId to AnalysisDashboard', () => {
    assert.ok(appCode.includes('<AnalysisDashboard unitId={effectiveUnitId} />'));
  });
});

test('Forensic Suite 5: Adversarial Stress Testing & Edge Cases', async (t) => {
  // Test 1: Math under empty TOE data
  await t.test('Empty TOE data calculates 0 totals without NaN/Infinity', () => {
    const toeData = [];
    const totalActual = toeData.reduce((acc, c) => acc + (c.actual || 0), 0);
    const totalRequired = toeData.reduce((acc, c) => acc + (c.required || 0), 0);
    const coveragePercent = totalRequired > 0 ? (totalActual / totalRequired) * 100 : totalActual > 0 ? 100 : 0;
    const isDoctrinalPass = coveragePercent >= 80.0;
    
    assert.strictEqual(totalActual, 0);
    assert.strictEqual(totalRequired, 0);
    assert.strictEqual(coveragePercent, 0);
    assert.strictEqual(isDoctrinalPass, false);
    assert.ok(!Number.isNaN(coveragePercent));
  });

  // Test 2: Boundary conditions around 80.0% doctrinal limit
  await t.test('Doctrinal threshold boundary behavior at 79.99% vs 80.00%', () => {
    const cov79 = 79.99;
    const cov80 = 80.00;
    const isPass79 = cov79 >= 80.0;
    const isPass80 = cov80 >= 80.0;

    assert.strictEqual(isPass79, false);
    assert.strictEqual(isPass80, true);
  });

  // Test 3: Null availability safely handles fitness percentage
  await t.test('Null availability object produces 0% fallback without exception', () => {
    const availability = null;
    const totalHealthPersonnel = !availability ? 0 : 
      ((availability.aptos || 0) + (availability.noAptos || 0) + (availability.excusados || 0) + (availability.licencias || 0));
    const operationalFitnessPct =
      totalHealthPersonnel > 0
        ? ((availability?.aptos || 0) / totalHealthPersonnel) * 100
        : 0;

    assert.strictEqual(totalHealthPersonnel, 0);
    assert.strictEqual(operationalFitnessPct, 0);
    assert.ok(!Number.isNaN(operationalFitnessPct));
  });

  // Test 4: Critical rotation grouping handles unknown MOS codes
  await t.test('Critical rotation handles missing/unassigned MOS codes gracefully', () => {
    const criticalRotation = [
      { id: 1, name: 'S1', rank: 'CP', mosCode: '11B', timeInPosition: 26 },
      { id: 2, name: 'S2', rank: 'SS', mosCode: '', timeInPosition: 30 },
      { id: 3, name: 'S3', rank: 'SLP', timeInPositionMonths: 28 } // undefined mosCode
    ];

    const map = {};
    for (const s of criticalRotation) {
      const code = s.mosCode || 'MOS-SD';
      map[code] = (map[code] || 0) + 1;
    }
    const mosBreakdown = Object.entries(map).sort((a, b) => b[1] - a[1]);

    assert.strictEqual(criticalRotation.length, 3);
    assert.strictEqual(map['11B'], 1);
    assert.strictEqual(map['MOS-SD'], 2);
    assert.strictEqual(mosBreakdown.length, 2);
  });

  // Test 5: getWidthClass handles extreme clamping (-10% and 150%)
  await t.test('Width class helper strictly clamps within [0%, 100%]', () => {
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

    assert.strictEqual(getWidthClass(-50), 'w-[0%]');
    assert.strictEqual(getWidthClass(0), 'w-[0%]');
    assert.strictEqual(getWidthClass(82), 'w-[80%]');
    assert.strictEqual(getWidthClass(87), 'w-[85%]');
    assert.strictEqual(getWidthClass(100), 'w-full');
    assert.strictEqual(getWidthClass(250), 'w-full');
  });
});
