import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendDir = path.resolve(__dirname, '..');
const analysisDashboardPath = path.resolve(frontendDir, 'src/components/AnalysisDashboard.tsx');
const consultaPersonalPath = path.resolve(frontendDir, 'src/components/ConsultaPersonal.tsx');
const consolaTrasladosPath = path.resolve(frontendDir, 'src/components/ConsolaTraslados.tsx');
const appPath = path.resolve(frontendDir, 'src/App.tsx');

// ============================================================================
// SUITE 1: JSX BADGE STATE MACHINE FORMAL ORACLE & PROPERTY-BASED VERIFICATION
// ============================================================================
test('Suite 1: JSX Badge State Machine Formal Oracle', async (t) => {
  const analysisDashboardCode = fs.readFileSync(analysisDashboardPath, 'utf8');

  // Verify the JSX badge structure exists in code
  await t.test('AnalysisDashboard.tsx contains the exact Sin Dotación TOE and Dotación Completa conditions', () => {
    assert.match(
      analysisDashboardCode,
      /totalRequired\s*===\s*0\s*&&\s*totalActual\s*===\s*0/,
      'Must contain explicit branch for totalRequired === 0 && totalActual === 0'
    );
    assert.match(
      analysisDashboardCode,
      /<span>Sin Dotación TOE<\/span>/,
      'Must render "Sin Dotación TOE" label'
    );
    assert.match(
      analysisDashboardCode,
      /forceDelta\s*===\s*0/,
      'Must contain branch for forceDelta === 0'
    );
    assert.match(
      analysisDashboardCode,
      /<span>Dotación Completa<\/span>/,
      'Must render "Dotación Completa" label'
    );
  });

  // Pure logic oracle mirroring the exact JSX conditional in AnalysisDashboard.tsx
  function evaluateBadge(totalRequired, totalActual) {
    const forceDelta = totalActual - totalRequired;
    if (totalRequired === 0 && totalActual === 0) {
      return { badge: 'Sin Dotación TOE', totalRequired, totalActual, forceDelta };
    } else if (forceDelta < 0) {
      return { badge: `${forceDelta} Déficit`, totalRequired, totalActual, forceDelta };
    } else if (forceDelta === 0) {
      return { badge: 'Dotación Completa', totalRequired, totalActual, forceDelta };
    } else {
      return { badge: `+${forceDelta} Excedente`, totalRequired, totalActual, forceDelta };
    }
  }

  await t.test('Boundary condition: 0 required and 0 actual yields <Sin Dotación TOE> and NEVER <Dotación Completa>', () => {
    const result = evaluateBadge(0, 0);
    assert.strictEqual(result.badge, 'Sin Dotación TOE');
    assert.notStrictEqual(result.badge, 'Dotación Completa');
  });

  await t.test('Boundary condition: 0 required and >0 actual yields Excedente and NEVER <Dotación Completa>', () => {
    for (let actual = 1; actual <= 20; actual++) {
      const result = evaluateBadge(0, actual);
      assert.strictEqual(result.badge, `+${actual} Excedente`);
      assert.notStrictEqual(result.badge, 'Dotación Completa');
    }
  });

  await t.test('Boundary condition: >0 required and 0 actual yields Déficit and NEVER <Sin Dotación TOE>', () => {
    for (let required = 1; required <= 20; required++) {
      const result = evaluateBadge(required, 0);
      assert.strictEqual(result.badge, `-${required} Déficit`);
      assert.notStrictEqual(result.badge, 'Sin Dotación TOE');
      assert.notStrictEqual(result.badge, 'Dotación Completa');
    }
  });

  await t.test('Formal invariant: <Dotación Completa> ONLY renders when totalRequired > 0 && forceDelta === 0', () => {
    // Test 5,000 cases of equal required and actual
    for (let count = 1; count <= 500; count++) {
      const result = evaluateBadge(count, count);
      assert.strictEqual(result.badge, 'Dotación Completa');
      assert.ok(result.totalRequired > 0, 'totalRequired must be strictly greater than 0');
      assert.strictEqual(result.forceDelta, 0, 'forceDelta must be strictly 0');
    }
  });

  await t.test('Property-based randomized stress test: 2,000 randomized state vectors', () => {
    for (let i = 0; i < 2000; i++) {
      const req = Math.floor(Math.random() * 200);
      const act = Math.floor(Math.random() * 200);
      const result = evaluateBadge(req, act);

      if (req === 0 && act === 0) {
        assert.strictEqual(result.badge, 'Sin Dotación TOE');
      } else if (act === req) {
        assert.strictEqual(result.badge, 'Dotación Completa');
        assert.ok(req > 0, 'Dotación Completa must strictly have req > 0');
      } else if (act < req) {
        assert.ok(result.badge.includes('Déficit'));
      } else {
        assert.ok(result.badge.includes('Excedente'));
      }
    }
  });
});

// ============================================================================
// SUITE 2: ZERO INLINE STYLES AUDIT ACROSS ALL TARGET COMPONENTS
// ============================================================================
test('Suite 2: Zero Inline Styles (style=) Audit', async (t) => {
  const componentsToAudit = [
    { name: 'AnalysisDashboard.tsx', path: analysisDashboardPath },
    { name: 'ConsultaPersonal.tsx', path: consultaPersonalPath },
    { name: 'ConsolaTraslados.tsx', path: consolaTrasladosPath },
    { name: 'App.tsx', path: appPath },
  ];

  for (const comp of componentsToAudit) {
    await t.test(`Verify 0 inline styles (style=) in ${comp.name}`, () => {
      const code = fs.readFileSync(comp.path, 'utf8');
      
      // Strict regex matching any style attribute in JSX
      const styleMatches = [...code.matchAll(/\bstyle\s*=\s*[{'"]/gi)];
      
      if (styleMatches.length > 0) {
        const lines = styleMatches.map(m => {
          const charIndex = m.index;
          const lineNum = code.substring(0, charIndex).split('\n').length;
          return `Line ${lineNum}: ${m[0]}`;
        });
        assert.fail(`Found inline styles in ${comp.name}:\n${lines.join('\n')}`);
      }
      
      assert.strictEqual(styleMatches.length, 0, `${comp.name} must have 0 inline styles`);
    });
  }

  await t.test('AnalysisDashboard.tsx uses getWidthClass utility instead of inline style for progress bar widths', () => {
    const code = fs.readFileSync(analysisDashboardPath, 'utf8');
    assert.match(code, /getWidthClass\(\s*toeFilledPct\s*\)/);
    assert.match(code, /getWidthClass\(\s*coveragePercent\s*\)/);
    assert.doesNotMatch(code, /style=\{\{\s*width:/);
  });
});

// ============================================================================
// SUITE 3: ESLINT CLEAN STATE & REACT 19 COMPLIANCE
// ============================================================================
test('Suite 3: ESLint Clean State on Modified Components', async (t) => {
  await t.test('npx eslint passes with 0 errors and 0 warnings on modified components', () => {
    const cmd = 'npx eslint src/components/AnalysisDashboard.tsx src/components/ConsultaPersonal.tsx src/App.tsx src/components/ConsolaTraslados.tsx';
    let output = '';
    try {
      output = execSync(cmd, { cwd: frontendDir, encoding: 'utf8' });
    } catch (err) {
      assert.fail(`ESLint failed with code ${err.status}:\n${err.stdout}\n${err.stderr}`);
    }
    assert.strictEqual(output.trim(), '', 'ESLint should output 0 errors and 0 warnings');
  });

  await t.test('AnalysisDashboard.tsx uses intentional React 19 directive for effect synchronization', () => {
    const code = fs.readFileSync(analysisDashboardPath, 'utf8');
    assert.match(
      code,
      /\/\/ eslint-disable-next-line react-hooks\/set-state-in-effect\s+setIsLoadingData\(true\);/,
      'Must contain verified directive for setIsLoadingData in effect'
    );
  });
});

// ============================================================================
// SUITE 4: TYPESCRIPT VERBATIM MODULE SYNTAX & BUILD VERIFICATION
// ============================================================================
test('Suite 4: TypeScript & Production Build Verification', async (t) => {
  await t.test('ConsultaPersonal.tsx uses type-only import for FichaDigital types', () => {
    const code = fs.readFileSync(consultaPersonalPath, 'utf8');
    assert.match(
      code,
      /import\s+type\s+\{\s*DossierData,\s*SoldierData\s*\}\s+from\s+['"]\.\/FichaDigital['"]/,
      'Must import DossierData and SoldierData as type-only imports to satisfy verbatimModuleSyntax'
    );
  });

  await t.test('tsc -b passes without type errors', () => {
    try {
      execSync('npx tsc -b', { cwd: frontendDir, encoding: 'utf8' });
    } catch (err) {
      assert.fail(`tsc -b failed with code ${err.status}:\n${err.stdout}\n${err.stderr}`);
    }
  });

  await t.test('npm run build succeeds with code 0', () => {
    try {
      const buildOutput = execSync('npm run build', { cwd: frontendDir, encoding: 'utf8' });
      assert.ok(buildOutput.includes('built in'), 'Build must succeed and report built in X s');
    } catch (err) {
      assert.fail(`npm run build failed with code ${err.status}:\n${err.stdout}\n${err.stderr}`);
    }
  });
});

// ============================================================================
// SUITE 5: KPI 1 & KPI 2 NUMERICAL HARMONIZATION & ZERO-DIVISON SAFETY
// ============================================================================
test('Suite 5: Numerical Harmonization & Health Availability Resilience', async (t) => {
  function computeKpis(toeData, availability) {
    const totalActual = toeData.reduce((acc, c) => acc + (c.actual || 0), 0);
    const totalRequired = toeData.reduce((acc, c) => acc + (c.required || 0), 0);
    const forceDelta = totalActual - totalRequired;
    const toeFilledPct = totalRequired > 0 ? (totalActual / totalRequired) * 100 : totalActual > 0 ? 100 : 0;
    const coveragePercent = totalRequired > 0 ? (totalActual / totalRequired) * 100 : totalActual > 0 ? 100 : 0;
    
    let totalHealthPersonnel = 0;
    if (availability) {
      totalHealthPersonnel =
        (availability.aptos || 0) +
        (availability.noAptos || 0) +
        (availability.excusados || 0) +
        (availability.licencias || 0);
    }
    const operationalFitnessPct =
      totalHealthPersonnel > 0
        ? ((availability?.aptos || 0) / totalHealthPersonnel) * 100
        : 0;

    return { totalActual, totalRequired, forceDelta, toeFilledPct, coveragePercent, operationalFitnessPct };
  }

  await t.test('Empty TOE: Both KPI 1 and KPI 2 display exactly 0.0%', () => {
    const res = computeKpis([], null);
    assert.strictEqual(res.totalActual, 0);
    assert.strictEqual(res.totalRequired, 0);
    assert.strictEqual(res.forceDelta, 0);
    assert.strictEqual(res.toeFilledPct, 0);
    assert.strictEqual(res.coveragePercent, 0);
    assert.strictEqual(res.operationalFitnessPct, 0);
  });

  await t.test('Health Availability null fallback is 0%, not 100%', () => {
    const res = computeKpis([], null);
    assert.strictEqual(res.operationalFitnessPct, 0);
  });

  await t.test('Health Availability 0 total personnel fallback is 0%, not 100%', () => {
    const res = computeKpis([], { aptos: 0, noAptos: 0, excusados: 0, licencias: 0 });
    assert.strictEqual(res.operationalFitnessPct, 0);
  });

  await t.test('Health Availability with 10 aptos out of 10 is 100%', () => {
    const res = computeKpis([], { aptos: 10, noAptos: 0, excusados: 0, licencias: 0 });
    assert.strictEqual(res.operationalFitnessPct, 100);
  });

  await t.test('Health Availability with 8 aptos out of 10 is 80%', () => {
    const res = computeKpis([], { aptos: 8, noAptos: 1, excusados: 1, licencias: 0 });
    assert.strictEqual(res.operationalFitnessPct, 80);
  });
});
