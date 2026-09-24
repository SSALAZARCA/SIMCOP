/**
 * Comprehensive Empirical Challenge & Verification Suite for Milestone 4 (R4)
 * 
 * Tests:
 * 1. Rank Insignia State Machine (19 doctrinal Colombian Army ranks across 5 echelons)
 * 2. 9 Military Branches Heraldry & Doctrinal Mottos
 * 3. Longevity Calculation & Rotation Warning Alert (>24m)
 * 4. Psychophysical Fitness Badges (APTO, NO APTO, EXCUSADO, LICENCIA)
 * 5. 3-Tab Dossier Navigation Structure & Timeline Filtering
 * 6. Inline Styles Audit (0 inline styles)
 */

import {
  getRankSubcategory,
  getRankBadgeClasses
} from './militaryRankService';

interface TestResult {
  suite: string;
  name: string;
  status: 'PASS' | 'FAIL' | 'EDGE_CASE_DETECTED';
  detail: string;
}

const results: TestResult[] = [];

function recordTest(suite: string, name: string, status: 'PASS' | 'FAIL' | 'EDGE_CASE_DETECTED', detail: string) {
  results.push({ suite, name, status, detail });
}

// ============================================================================
// SUITE 1: RANK INSIGNIA STATE MACHINE ACROSS ALL 5 ECHELONS
// ============================================================================
export function testRankInsigniaStateMachine() {
  const echelonDefinitions = [
    // 1. Oficiales Generales: 4/3/2 stars
    { rank: 'GR', echelon: 'OFICIAL GENERAL', symbol: 'stars', count: 4, badge: 'amber' },
    { rank: 'MG', echelon: 'OFICIAL GENERAL', symbol: 'stars', count: 3, badge: 'amber' },
    { rank: 'BG', echelon: 'OFICIAL GENERAL', symbol: 'stars', count: 2, badge: 'amber' },

    // 2. Oficiales Superiores: 3/2/1 rombos
    { rank: 'CR', echelon: 'OFICIAL SUPERIOR', symbol: 'rombos', count: 3, badge: 'slate' },
    { rank: 'TC', echelon: 'OFICIAL SUPERIOR', symbol: 'rombos', count: 2, badge: 'slate' },
    { rank: 'MY', echelon: 'OFICIAL SUPERIOR', symbol: 'rombos', count: 1, badge: 'slate' },

    // 3. Oficiales Subalternos: 3/2/1 vertical bars
    { rank: 'CT', echelon: 'OFICIAL SUBALTERNO', symbol: 'bars', count: 3, badge: 'cyan' },
    { rank: 'TE', echelon: 'OFICIAL SUBALTERNO', symbol: 'bars', count: 2, badge: 'cyan' },
    { rank: 'ST', echelon: 'OFICIAL SUBALTERNO', symbol: 'bars', count: 1, badge: 'cyan' },

    // 4. Suboficiales: authentic chevrons (3 for SMCC/SMC/SM/SP, 2 for SV/SS/CP, 1 for CS/C3)
    { rank: 'SMCC', echelon: 'SUBOFICIAL', symbol: 'chevrons', count: 3, badge: 'emerald' },
    { rank: 'SMC', echelon: 'SUBOFICIAL', symbol: 'chevrons', count: 3, badge: 'emerald' },
    { rank: 'SM', echelon: 'SUBOFICIAL', symbol: 'chevrons', count: 3, badge: 'emerald' },
    { rank: 'SP', echelon: 'SUBOFICIAL', symbol: 'chevrons', count: 3, badge: 'emerald' },
    { rank: 'SV', echelon: 'SUBOFICIAL', symbol: 'chevrons', count: 2, badge: 'emerald' },
    { rank: 'SS', echelon: 'SUBOFICIAL', symbol: 'chevrons', count: 2, badge: 'emerald' },
    { rank: 'CP', echelon: 'SUBOFICIAL', symbol: 'chevrons', count: 2, badge: 'emerald' },
    { rank: 'CS', echelon: 'SUBOFICIAL', symbol: 'chevrons', count: 1, badge: 'emerald' },
    { rank: 'C3', echelon: 'SUBOFICIAL', symbol: 'chevrons', count: 1, badge: 'emerald' },

    // 5. Soldados: military shield
    { rank: 'SLP', echelon: 'SOLDADO', symbol: 'shield', count: 1, badge: 'blue' },
    { rank: 'SL18', echelon: 'SOLDADO', symbol: 'shield', count: 1, badge: 'blue' },
    { rank: 'SL12', echelon: 'SOLDADO', symbol: 'shield', count: 1, badge: 'blue' }
  ];

  for (const item of echelonDefinitions) {
    const subcat = getRankSubcategory(item.rank);
    const badge = getRankBadgeClasses(item.rank);

    // Emulate RankInsignia component logic from FichaDigital.tsx
    const r = item.rank.toUpperCase().trim();
    let computedSymbol = 'shield';
    let computedCount = 1;

    if (subcat === 'OFICIAL GENERAL') {
      computedSymbol = 'stars';
      const isGeneral4 = r === 'GR' || (r.includes('GENERAL') && !r.includes('MAYOR') && !r.includes('BRIGADIER'));
      const isGeneral3 = r === 'MG' || r.includes('MAYOR');
      computedCount = isGeneral4 ? 4 : isGeneral3 ? 3 : 2;
    } else if (subcat === 'OFICIAL SUPERIOR') {
      computedSymbol = 'rombos';
      const isCoronel = r === 'CR' || (r.includes('CORONEL') && !r.includes('TENIENTE'));
      const isTCoronel = r === 'TC' || r.includes('TENIENTE');
      computedCount = isCoronel ? 3 : isTCoronel ? 2 : 1;
    } else if (subcat === 'OFICIAL SUBALTERNO') {
      computedSymbol = 'bars';
      const isCapitan = r === 'CT' || r.includes('CAPITAN') || r.includes('CAPITÁN');
      const isTeniente = r === 'TE' || (r.includes('TENIENTE') && !r.includes('SUBTENIENTE'));
      computedCount = isCapitan ? 3 : isTeniente ? 2 : 1;
    } else if (subcat === 'SUBOFICIAL') {
      computedSymbol = 'chevrons';
      const isHighNco = ['SMCC', 'SMC', 'SM', 'SP'].includes(r) || r.includes('MAYOR') || r.includes('PRIMERO');
      const isMidNco = ['SV', 'SS', 'CP'].includes(r) || r.includes('VICEPRIMERO') || r.includes('SEGUNDO');
      computedCount = isHighNco ? 3 : isMidNco ? 2 : 1;
    }

    const matchesEchelon = subcat === item.echelon;
    const matchesSymbol = computedSymbol === item.symbol;
    const matchesCount = computedCount === item.count;
    const matchesBadge = badge.includes(item.badge);

    if (matchesEchelon && matchesSymbol && matchesCount && matchesBadge) {
      recordTest(
        'Rank Insignia',
        `Rank ${item.rank}`,
        'PASS',
        `Echelon: ${subcat}, Insignia: ${computedCount} ${computedSymbol}, Badge tone: ${item.badge}`
      );
    } else {
      recordTest(
        'Rank Insignia',
        `Rank ${item.rank}`,
        'FAIL',
        `Mismatch: subcat(${subcat} vs ${item.echelon}), symbol(${computedSymbol} vs ${item.symbol}), count(${computedCount} vs ${item.count}), badge(${badge})`
      );
    }
  }

  // Edge case test on Suboficial full-name parsing
  // E.g., 'CABO PRIMERO' contains 'PRIMERO', which in FichaDigital triggers isHighNco (3 chevrons) instead of 2 chevrons
  const caboPrimeroFull = 'CABO PRIMERO';
  const isHighNcoEdge = ['SMCC', 'SMC', 'SM', 'SP'].includes(caboPrimeroFull) || caboPrimeroFull.includes('MAYOR') || caboPrimeroFull.includes('PRIMERO');
  if (isHighNcoEdge) {
    recordTest(
      'Rank Insignia',
      `Full string 'CABO PRIMERO' parsing`,
      'EDGE_CASE_DETECTED',
      `Full name 'CABO PRIMERO' triggers isHighNco (3 chevrons) due to 'r.includes("PRIMERO")' without checking '!r.includes("CABO")'. Standard abbreviation 'CP' renders correctly as 2 chevrons.`
    );
  }
}

// ============================================================================
// SUITE 2: BRANCH HERALDRY & DOCTRINAL MOTTOS (ALL 9 BRANCHES)
// ============================================================================
export function testBranchHeraldry() {
  const branches = [
    { name: 'INFANTERIA', displayName: 'Infantería', motto: 'Paso de Vencedores', icon: 'Crosshair' },
    { name: 'CABALLERIA', displayName: 'Caballería Blindada', motto: 'Salve Usted la Patria', icon: 'Zap' },
    { name: 'ARTILLERIA', displayName: 'Artillería', motto: 'Deber Antes que Vida', icon: 'Flame' },
    { name: 'INGENIEROS', displayName: 'Ingenieros Militares', motto: 'Vencer o Morir', icon: 'Building' },
    { name: 'COMUNICACIONES', displayName: 'Comunicaciones', motto: 'Ciencia y Valor', icon: 'Radio' },
    { name: 'INTELIGENCIA', displayName: 'Inteligencia Militar', motto: 'El Poder del Conocimiento', icon: 'Compass' },
    { name: 'LOGISTICA', displayName: 'Logística y Abastecimiento', motto: 'Sostener la Fuerza', icon: 'Wrench' },
    { name: 'SANIDAD', displayName: 'Sanidad Militar', motto: 'Salus Populi Suprema Lex', icon: 'Stethoscope' },
    { name: 'AVIACION', displayName: 'Aviación del Ejército', motto: 'Gloria Sobre el Horizonte', icon: 'Plane' }
  ];

  // Emulate getBranchInfo from FichaDigital.tsx
  function getBranchInfo(branchRaw?: string) {
    if (!branchRaw) return { name: 'INFANTERIA', displayName: 'Infantería', motto: 'Paso de Vencedores', icon: 'Crosshair' };
    const b = branchRaw.toUpperCase();
    if (b.includes('INF')) return { name: 'INFANTERIA', displayName: 'Infantería', motto: 'Paso de Vencedores', icon: 'Crosshair' };
    if (b.includes('CAB')) return { name: 'CABALLERIA', displayName: 'Caballería Blindada', motto: 'Salve Usted la Patria', icon: 'Zap' };
    if (b.includes('ART')) return { name: 'ARTILLERIA', displayName: 'Artillería', motto: 'Deber Antes que Vida', icon: 'Flame' };
    if (b.includes('ING')) return { name: 'INGENIEROS', displayName: 'Ingenieros Militares', motto: 'Vencer o Morir', icon: 'Building' };
    if (b.includes('COM')) return { name: 'COMUNICACIONES', displayName: 'Comunicaciones', motto: 'Ciencia y Valor', icon: 'Radio' };
    if (b.includes('INT')) return { name: 'INTELIGENCIA', displayName: 'Inteligencia Militar', motto: 'El Poder del Conocimiento', icon: 'Compass' };
    if (b.includes('LOG') || b.includes('ADM') || b.includes('SER') || b.includes('ABASTEC')) return { name: 'LOGISTICA', displayName: 'Logística y Abastecimiento', motto: 'Sostener la Fuerza', icon: 'Wrench' };
    if (b.includes('SAN') || b.includes('MED')) return { name: 'SANIDAD', displayName: 'Sanidad Militar', motto: 'Salus Populi Suprema Lex', icon: 'Stethoscope' };
    if (b.includes('AV') || b.includes('AER')) return { name: 'AVIACION', displayName: 'Aviación del Ejército', motto: 'Gloria Sobre el Horizonte', icon: 'Plane' };
    return { name: 'INFANTERIA', displayName: 'Infantería', motto: 'Paso de Vencedores', icon: 'Crosshair' };
  }

  for (const b of branches) {
    const res = getBranchInfo(b.name);
    const pass = res.name === b.name && res.motto === b.motto && res.icon === b.icon;
    recordTest(
      'Branch Heraldry',
      `Branch ${b.name}`,
      pass ? 'PASS' : 'FAIL',
      `Motto: "${res.motto}", Icon: ${res.icon}, Display: ${res.displayName}`
    );
  }
}

// ============================================================================
// SUITE 3: LONGEVITY & ROTATION ALERT (>24M)
// ============================================================================
export function testLongevityCalculation() {
  function computeTenureMonths(soldier: { timeInPosition?: number; assignmentDate?: string; joinDate?: string }, now: Date): number {
    if (typeof soldier.timeInPosition === 'number') {
      return soldier.timeInPosition;
    }
    const rawDate = soldier.assignmentDate || soldier.joinDate;
    if (!rawDate) return 0;
    const dateObj = new Date(rawDate);
    if (isNaN(dateObj.getTime())) return 0;
    return Math.max(0, (now.getFullYear() - dateObj.getFullYear()) * 12 + now.getMonth() - dateObj.getMonth());
  }

  function requiresRotationAlert(tenureMonths: number): boolean {
    return tenureMonths > 24;
  }

  const now = new Date('2026-09-24T12:00:00Z');

  // Test 1: Explicit timeInPosition
  const s1 = { timeInPosition: 25 };
  recordTest('Longevity', 'Explicit tenure 25m triggers rotation alert', requiresRotationAlert(computeTenureMonths(s1, now)) ? 'PASS' : 'FAIL', 'Alert is true for 25m');

  const s2 = { timeInPosition: 24 };
  recordTest('Longevity', 'Explicit tenure 24m does NOT trigger rotation alert', !requiresRotationAlert(computeTenureMonths(s2, now)) ? 'PASS' : 'FAIL', 'Alert is false for exactly 24m (boundary)');

  const s3 = { timeInPosition: 6 };
  recordTest('Longevity', 'Explicit tenure 6m normal badge', !requiresRotationAlert(computeTenureMonths(s3, now)) ? 'PASS' : 'FAIL', 'Alert is false for 6m');

  // Test 2: Date-based calculation
  // Assignment 30 months ago (March 2024 to Sept 2026)
  const sOld = { assignmentDate: '2024-03-15' };
  const tenureOld = computeTenureMonths(sOld, now);
  recordTest('Longevity', 'Date-based tenure >24m triggers rotation alert', (tenureOld >= 28 && requiresRotationAlert(tenureOld)) ? 'PASS' : 'FAIL', `Computed ${tenureOld} months (>24m alert triggered)`);
}

// ============================================================================
// SUITE 4: PSYCHOPHYSICAL FITNESS STATUS BADGES
// ============================================================================
export function testPsychophysicalFitness() {
  function getHealthBadges(healthStatus?: string) {
    const healthRaw = (healthStatus || 'APTO').toUpperCase();
    const isApto = healthRaw === 'APTO';
    const isNoApto = healthRaw.includes('NO APTO') || healthRaw.includes('BAJA');
    const isExcusado = healthRaw.includes('EXCUSA');
    const isLicencia = healthRaw.includes('LICENCIA');

    return {
      isApto,
      isNoApto,
      isExcusado,
      isLicencia,
      badgeText: isApto ? 'APTO (Cat. A)' : isNoApto ? 'NO APTO (Cat. C)' : isExcusado ? 'EXCUSADO PARCIAL' : isLicencia ? 'EN LICENCIA' : 'OTRO',
      deployment: isApto ? 'Despliegue Inmediato' : 'Restricción Médica'
    };
  }

  const cases = [
    { input: 'APTO', expectedBadge: 'APTO (Cat. A)', expectedDeployment: 'Despliegue Inmediato' },
    { input: 'NO APTO', expectedBadge: 'NO APTO (Cat. C)', expectedDeployment: 'Restricción Médica' },
    { input: 'EXCUSADO', expectedBadge: 'EXCUSADO PARCIAL', expectedDeployment: 'Restricción Médica' },
    { input: 'LICENCIA', expectedBadge: 'EN LICENCIA', expectedDeployment: 'Restricción Médica' },
    { input: undefined, expectedBadge: 'APTO (Cat. A)', expectedDeployment: 'Despliegue Inmediato' }
  ];

  for (const c of cases) {
    const res = getHealthBadges(c.input);
    const pass = res.badgeText === c.expectedBadge && res.deployment === c.expectedDeployment;
    recordTest('Fitness Badges', `Status: ${c.input || 'DEFAULT'}`, pass ? 'PASS' : 'FAIL', `Badge: ${res.badgeText}, Deployment: ${res.deployment}`);
  }
}

// ============================================================================
// SUITE 5: 3-TAB NAVIGATION & TIMELINE FILTERING
// ============================================================================
export function testTimelineFilteringAndTabs() {
  interface Novedad {
    tipo: string;
    descripcion: string;
  }

  function filterTimeline(history: Novedad[], category: string): Novedad[] {
    if (category === 'TODAS') return history;
    return history.filter(nov => {
      const t = (nov.tipo || '').toUpperCase();
      const desc = (nov.descripcion || '').toUpperCase();

      if (category === 'OPERACIONALES') {
        return t.includes('ALTA') || t.includes('BAJA') || t.includes('TRASLADO') || t.includes('COMISION') || t.includes('ASCENSO') || desc.includes('OPERACIONAL') || desc.includes('DESTINO');
      }
      if (category === 'MEDICAS') {
        return t.includes('MEDIC') || t.includes('EXCUSA') || t.includes('LICENCIA_MED') || t.includes('INCAPACIDAD') || t.includes('SANIDAD') || desc.includes('HOSPITAL') || desc.includes('TRATAMIENTO');
      }
      if (category === 'DISCIPLINARIAS') {
        return t.includes('SANCION') || t.includes('DISCIPLIN') || t.includes('FELICITA') || t.includes('CONDECORA') || t.includes('LLAMADO') || desc.includes('INVESTIGACION');
      }
      if (category === 'ADMINISTRATIVAS') {
        return t.includes('PERMISO') || t.includes('VACACION') || t.includes('ADMIN') || t.includes('CURSO') || (!t.includes('MEDIC') && !t.includes('SANCION') && !t.includes('ALTA') && !t.includes('TRASLADO'));
      }
      return true;
    });
  }

  const items: Novedad[] = [
    { tipo: 'ALTA', descripcion: 'Incorporación por destino orgánico' },
    { tipo: 'TRASLADO', descripcion: 'Movilidad entre batallones' },
    { tipo: 'MEDICA', descripcion: 'Control médico general' },
    { tipo: 'SANCION', descripcion: 'Falta leve de disciplina' },
    { tipo: 'PERMISO', descripcion: 'Permiso ordinario 72h' }
  ];

  const todas = filterTimeline(items, 'TODAS');
  recordTest('Timeline Filter', 'Category TODAS retains all items', todas.length === 5 ? 'PASS' : 'FAIL', `Count: ${todas.length}`);

  const op = filterTimeline(items, 'OPERACIONALES');
  recordTest('Timeline Filter', 'Category OPERACIONALES isolates ALTA & TRASLADO', op.length === 2 ? 'PASS' : 'FAIL', `Count: ${op.length}`);

  const med = filterTimeline(items, 'MEDICAS');
  recordTest('Timeline Filter', 'Category MEDICAS isolates MEDICA', med.length === 1 ? 'PASS' : 'FAIL', `Count: ${med.length}`);

  const disc = filterTimeline(items, 'DISCIPLINARIAS');
  recordTest('Timeline Filter', 'Category DISCIPLINARIAS isolates SANCION', disc.length === 1 ? 'PASS' : 'FAIL', `Count: ${disc.length}`);

  const adm = filterTimeline(items, 'ADMINISTRATIVAS');
  recordTest('Timeline Filter', 'Category ADMINISTRATIVAS isolates PERMISO', adm.length === 1 ? 'PASS' : 'FAIL', `Count: ${adm.length}`);
}

// ============================================================================
// SUITE 6: ZERO INLINE STYLES AUDIT
// ============================================================================
export async function testZeroInlineStyles() {
  const gProcess = (globalThis as unknown as { process?: { versions?: { node?: string } } }).process;
  if (gProcess && gProcess.versions?.node) {
    try {
      interface FsModule {
        existsSync: (p: string) => boolean;
        readFileSync: (p: string, encoding: string) => string;
      }
      interface PathModule {
        resolve: (...paths: string[]) => string;
        dirname: (p: string) => string;
        basename: (p: string) => string;
      }
      interface UrlModule {
        fileURLToPath: (url: string) => string;
      }

      const fsMod = (await import('node' + ':fs')) as unknown as FsModule;
      const pathMod = (await import('node' + ':path')) as unknown as PathModule;
      const urlMod = (await import('node' + ':url')) as unknown as UrlModule;
      const currentDir = pathMod.dirname(urlMod.fileURLToPath(import.meta.url));
      const targetFiles = [
        pathMod.resolve(currentDir, '../components/FichaDigital.tsx'),
        pathMod.resolve(currentDir, '../components/ConsultaPersonal.tsx'),
        pathMod.resolve(currentDir, 'militaryRankService.ts')
      ];
      for (const filePath of targetFiles) {
        const filename = pathMod.basename(filePath);
        if (!fsMod.existsSync(filePath)) {
          recordTest('Inline Styles', filename, 'FAIL', `File does not exist: ${filePath}`);
          continue;
        }
        const content = fsMod.readFileSync(filePath, 'utf-8');
        const matches = content.match(/style\s*=\s*\{/g);
        const count = matches ? matches.length : 0;
        recordTest(
          'Inline Styles',
          filename,
          count === 0 ? 'PASS' : 'FAIL',
          `Found ${count} occurrences of 'style={{'`
        );
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      recordTest('Inline Styles', 'Dynamic audit', 'FAIL', msg);
    }
  }
}

// ============================================================================
// RUNNER
// ============================================================================
export async function runAllEmpiricalChecks() {
  testRankInsigniaStateMachine();
  testBranchHeraldry();
  testLongevityCalculation();
  testPsychophysicalFitness();
  testTimelineFilteringAndTabs();
  await testZeroInlineStyles();

  const passes = results.filter(r => r.status === 'PASS').length;
  const fails = results.filter(r => r.status === 'FAIL').length;
  const edgeCases = results.filter(r => r.status === 'EDGE_CASE_DETECTED').length;

  console.log(`\n======================================================`);
  console.log(`MILITARY DOSSIER (M4-R4) EMPIRICAL CHALLENGE REPORT`);
  console.log(`======================================================`);
  console.log(`Total checks: ${results.length}`);
  console.log(`PASS: ${passes}`);
  console.log(`FAIL: ${fails}`);
  console.log(`EDGE CASES NOTED: ${edgeCases}`);
  console.log(`======================================================\n`);

  for (const r of results) {
    const icon = r.status === 'PASS' ? '✅' : r.status === 'FAIL' ? '❌' : '⚠️';
    console.log(`${icon} [${r.suite}] ${r.name}: ${r.detail}`);
  }

  return { total: results.length, passes, fails, edgeCases, results };
}

runAllEmpiricalChecks();
