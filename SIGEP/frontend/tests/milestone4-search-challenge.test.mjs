/**
 * Milestone 4 Empirical Challenge & Stress Test Suite
 * 
 * Verifies:
 * 1. Search accuracy in ConsultaPersonal.tsx across name, cédula, MOS, rank, branch, case-insensitivity, whitespace
 * 2. Rank category partition (TODOS, OFICIAL, SUBOFICIAL, SOLDADO) ensuring officer ranks (CT, TE, ST, MY, TC, CR, BG, MG, GR) are NEVER misclassified as soldiers
 * 3. Robustness against malformed or sparse personnel records
 * 4. Combined query + category tab filtering
 * 5. High-density in-memory roster search performance (10,000 records < 50ms)
 * 6. Forensic zero-inline-style and TypeScript erasable syntax verification
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  getRankCategory,
  getRankSubcategory,
  getRankBadgeClasses
} from '../src/services/militaryRankService.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const frontendDir = resolve(__dirname, '..');

// ---------------------------------------------------------------------------
// 1. REPLICATE EXACT IN-MEMORY SEARCH LOGIC FROM ConsultaPersonal.tsx:155-177
// ---------------------------------------------------------------------------
function filterSoldiers(soldiers, searchQuery, selectedCategory) {
  const query = (searchQuery || '').trim().toLowerCase();

  return soldiers.filter(s => {
    // 1. In-memory Search Bar matching: Name, Cédula / ID, MOS code, Rank, Branch
    if (query) {
      const nameMatch = (s.name || '').toLowerCase().includes(query);
      const idMatch = (s.id || '').toLowerCase().includes(query);
      const cedulaMatch = s.cedula ? String(s.cedula).toLowerCase().includes(query) : false;
      const mosMatch = (s.mosCode || '').toLowerCase().includes(query);
      const rankMatch = (s.rank || '').toLowerCase().includes(query);
      const branchMatch = (s.branch || '').toLowerCase().includes(query);

      if (!nameMatch && !idMatch && !cedulaMatch && !mosMatch && !rankMatch && !branchMatch) {
        return false;
      }
    }

    // 2. Exact Rank Category filter
    if (selectedCategory === 'TODOS') return true;
    return getRankCategory(s.rank) === selectedCategory;
  });
}

// ---------------------------------------------------------------------------
// REALISTIC COLOMBIAN ARMY ROSTER DATASET
// ---------------------------------------------------------------------------
const SAMPLE_ROSTER = [
  // Generales
  { id: 'SOL-001', cedula: '19482711', name: 'Alfonso Sanchez', rank: 'GR', mosCode: '11A', branch: 'INFANTERIA', healthStatus: 'APTO' },
  { id: 'SOL-002', cedula: '79345123', name: 'Bernardo Ospina', rank: 'MG', mosCode: '12A', branch: 'CABALLERIA', healthStatus: 'APTO' },
  { id: 'SOL-003', cedula: 79124567, name: 'Camilo Rojas', rank: 'BG', mosCode: '13A', branch: 'ARTILLERIA', healthStatus: 'APTO' },

  // Oficiales Superiores
  { id: 'SOL-004', cedula: '80123456', name: 'Diego Jimenez', rank: 'CR', mosCode: '14A', branch: 'INGENIEROS', healthStatus: 'APTO' },
  { id: 'SOL-005', cedula: '80987654', name: 'Esteban Gomez', rank: 'TC', mosCode: '25A', branch: 'COMUNICACIONES', healthStatus: 'APTO' },
  { id: 'SOL-006', cedula: 80456789, name: 'Fabian Rodriguez', rank: 'MY', mosCode: '35A', branch: 'INTELIGENCIA', healthStatus: 'APTO' },

  // Oficiales Subalternos
  { id: 'SOL-007', cedula: '1018456789', name: 'Gabriel Ramirez', rank: 'CT', mosCode: '91A', branch: 'LOGISTICA', healthStatus: 'APTO' },
  { id: 'SOL-008', cedula: '1020456123', name: 'Hector Martinez', rank: 'TE', mosCode: '70A', branch: 'SANIDAD', healthStatus: 'APTO' },
  { id: 'SOL-009', cedula: '1032456789', name: 'Ivan Diaz', rank: 'ST', mosCode: '15A', branch: 'AVIACION', healthStatus: 'APTO' },

  // Suboficiales
  { id: 'SOL-010', cedula: '79456123', name: 'Jorge Perez', rank: 'SMCC', mosCode: '11B', branch: 'INFANTERIA', healthStatus: 'APTO' },
  { id: 'SOL-011', cedula: '79567234', name: 'Kevin Torres', rank: 'SMC', mosCode: '11B', branch: 'INFANTERIA', healthStatus: 'APTO' },
  { id: 'SOL-012', cedula: '79678345', name: 'Luis Castro', rank: 'SM', mosCode: '12B', branch: 'CABALLERIA', healthStatus: 'APTO' },
  { id: 'SOL-013', cedula: '79789456', name: 'Mauricio Morales', rank: 'SP', mosCode: '13B', branch: 'ARTILLERIA', healthStatus: 'APTO' },
  { id: 'SOL-014', cedula: '80234567', name: 'Nestor Ruiz', rank: 'SV', mosCode: '14B', branch: 'INGENIEROS', healthStatus: 'APTO' },
  { id: 'SOL-015', cedula: '80345678', name: 'Oscar Herrera', rank: 'SS', mosCode: '25B', branch: 'COMUNICACIONES', healthStatus: 'APTO' },
  { id: 'SOL-016', cedula: '1015678901', name: 'Pablo Vargas', rank: 'CP', mosCode: '35B', branch: 'INTELIGENCIA', healthStatus: 'APTO' },
  { id: 'SOL-017', cedula: '1022345678', name: 'Quirino Gutierrez', rank: 'CS', mosCode: '91B', branch: 'LOGISTICA', healthStatus: 'APTO' },
  { id: 'SOL-018', cedula: '1033456789', name: 'Raul Mendoza', rank: 'C3', mosCode: '15B', branch: 'AVIACION', healthStatus: 'APTO' },

  // Soldados
  { id: 'SOL-019', cedula: '1045678901', name: 'Sergio Rios', rank: 'SLP', mosCode: '11B', branch: 'INFANTERIA', healthStatus: 'APTO' },
  { id: 'SOL-020', cedula: '1056789012', name: 'Tomas Silva', rank: 'SL18', mosCode: '11B', branch: 'INFANTERIA', healthStatus: 'APTO' },
  { id: 'SOL-021', cedula: '1067890123', name: 'Ulises Acosta', rank: 'SLR', mosCode: '11B', branch: 'INFANTERIA', healthStatus: 'APTO' },
  { id: 'SOL-022', cedula: '1078901234', name: 'Victor Romero', rank: 'SOLDADO PROFESIONAL', mosCode: '11B', branch: 'INFANTERIA', healthStatus: 'APTO' }
];

// ---------------------------------------------------------------------------
// TEST SUITE 1: Search Accuracy across Name, Cédula, MOS, Rank, Branch
// ---------------------------------------------------------------------------
test('Suite 1: In-Memory Search Precision & Multi-Field Matching', async (t) => {
  await t.test('Matches by Name: Exact, case-insensitive, and substring', () => {
    // Exact lower
    const r1 = filterSoldiers(SAMPLE_ROSTER, 'gabriel ramirez', 'TODOS');
    assert.strictEqual(r1.length, 1);
    assert.strictEqual(r1[0].name, 'Gabriel Ramirez');

    // Uppercase
    const r2 = filterSoldiers(SAMPLE_ROSTER, 'GABRIEL', 'TODOS');
    assert.strictEqual(r2.length, 1);
    assert.strictEqual(r2[0].id, 'SOL-007');

    // Substring in last name
    const r3 = filterSoldiers(SAMPLE_ROSTER, 'perez', 'TODOS');
    assert.strictEqual(r3.length, 1);
    assert.strictEqual(r3[0].id, 'SOL-010');

    // Partial substring across multiple
    const r4 = filterSoldiers(SAMPLE_ROSTER, 'an', 'TODOS'); // Sanchez, Esteban, Fabian, Ivan, etc.
    assert.ok(r4.length >= 3);
  });

  await t.test('Matches by Cédula: String, Number type, and partial prefix', () => {
    // String cédula
    const r1 = filterSoldiers(SAMPLE_ROSTER, '1018456789', 'TODOS');
    assert.strictEqual(r1.length, 1);
    assert.strictEqual(r1[0].name, 'Gabriel Ramirez');

    // Numeric type in data (SOL-003 has numeric cédula 79124567)
    const r2 = filterSoldiers(SAMPLE_ROSTER, '79124567', 'TODOS');
    assert.strictEqual(r2.length, 1);
    assert.strictEqual(r2[0].id, 'SOL-003');

    // Partial cédula prefix
    const r3 = filterSoldiers(SAMPLE_ROSTER, '10184', 'TODOS');
    assert.strictEqual(r3.length, 1);
    assert.strictEqual(r3[0].id, 'SOL-007');
  });

  await t.test('Matches by ID: Full ID and partial ID', () => {
    const r1 = filterSoldiers(SAMPLE_ROSTER, 'SOL-007', 'TODOS');
    assert.strictEqual(r1.length, 1);
    assert.strictEqual(r1[0].id, 'SOL-007');

    // Lowercase ID
    const r2 = filterSoldiers(SAMPLE_ROSTER, 'sol-015', 'TODOS');
    assert.strictEqual(r2.length, 1);
    assert.strictEqual(r2[0].id, 'SOL-015');
  });

  await t.test('Matches by MOS Code: Exact, lowercase, and cross-category', () => {
    // Upper
    const r1 = filterSoldiers(SAMPLE_ROSTER, '91A', 'TODOS');
    assert.strictEqual(r1.length, 1);
    assert.strictEqual(r1[0].id, 'SOL-007');

    // Lowercase
    const r2 = filterSoldiers(SAMPLE_ROSTER, '91a', 'TODOS');
    assert.strictEqual(r2.length, 1);
    assert.strictEqual(r2[0].id, 'SOL-007');

    // MOS 11B shared by subofficers and soldiers
    const r3 = filterSoldiers(SAMPLE_ROSTER, '11B', 'TODOS');
    assert.ok(r3.length >= 5);
    const ranks = r3.map(s => s.rank);
    assert.ok(ranks.includes('SMCC'));
    assert.ok(ranks.includes('SLP'));
  });

  await t.test('Matches by Rank abbreviation and full rank', () => {
    // Unique rank abbreviation BG (Brigadier General)
    const r1 = filterSoldiers(SAMPLE_ROSTER, 'BG', 'TODOS');
    assert.strictEqual(r1.length, 1);
    assert.strictEqual(r1[0].id, 'SOL-003');
    assert.strictEqual(r1[0].rank, 'BG');

    // Unique rank abbreviation MY (Mayor)
    const r2 = filterSoldiers(SAMPLE_ROSTER, 'MY', 'TODOS');
    assert.strictEqual(r2.length, 1);
    assert.strictEqual(r2[0].id, 'SOL-006');
    assert.strictEqual(r2[0].rank, 'MY');

    // Unique rank abbreviation SMCC (Sargento Mayor de Comando Conjunto)
    const r3 = filterSoldiers(SAMPLE_ROSTER, 'SMCC', 'TODOS');
    assert.strictEqual(r3.length, 1);
    assert.strictEqual(r3[0].id, 'SOL-010');
    assert.strictEqual(r3[0].rank, 'SMCC');

    // Soldado Profesional (SLP)
    const r4 = filterSoldiers(SAMPLE_ROSTER, 'SLP', 'TODOS');
    assert.strictEqual(r4.length, 1);
    assert.strictEqual(r4[0].id, 'SOL-019');
    assert.strictEqual(r4[0].rank, 'SLP');

    // Substring multi-field match (CT matches rank CT in SOL-007, and name substring in Hector & Victor)
    const r5 = filterSoldiers(SAMPLE_ROSTER, 'CT', 'TODOS');
    assert.strictEqual(r5.length, 3);
    assert.ok(r5.some(s => s.id === 'SOL-007' && s.rank === 'CT'));
  });

  await t.test('Matches by Branch: Full name, lowercase, and partial', () => {
    const r1 = filterSoldiers(SAMPLE_ROSTER, 'INGENIEROS', 'TODOS');
    assert.strictEqual(r1.length, 2); // SOL-004 (CR) & SOL-014 (SV)

    const r2 = filterSoldiers(SAMPLE_ROSTER, 'sanidad', 'TODOS');
    assert.strictEqual(r2.length, 1);
    assert.strictEqual(r2[0].id, 'SOL-008');

    const r3 = filterSoldiers(SAMPLE_ROSTER, 'cabal', 'TODOS');
    assert.strictEqual(r3.length, 2); // SOL-002 (MG) & SOL-012 (SM)
  });

  await t.test('Whitespace trimming and empty queries', () => {
    // Leading and trailing whitespace matches identical result as trimmed
    const rTrimmed = filterSoldiers(SAMPLE_ROSTER, 'Gabriel Ramirez', 'TODOS');
    const rSpaced = filterSoldiers(SAMPLE_ROSTER, '   Gabriel Ramirez   ', 'TODOS');
    assert.strictEqual(rSpaced.length, 1);
    assert.strictEqual(rSpaced[0].id, 'SOL-007');
    assert.deepStrictEqual(rSpaced, rTrimmed);

    const rBgSpaced = filterSoldiers(SAMPLE_ROSTER, '   BG   ', 'TODOS');
    assert.strictEqual(rBgSpaced.length, 1);
    assert.strictEqual(rBgSpaced[0].id, 'SOL-003');

    // Empty query returns all
    const rEmpty = filterSoldiers(SAMPLE_ROSTER, '', 'TODOS');
    assert.strictEqual(rEmpty.length, SAMPLE_ROSTER.length);

    // Whitespace-only query returns all
    const rSpacesOnly = filterSoldiers(SAMPLE_ROSTER, '    ', 'TODOS');
    assert.strictEqual(rSpacesOnly.length, SAMPLE_ROSTER.length);
  });

  await t.test('Nonexistent query returns empty array gracefully', () => {
    const r = filterSoldiers(SAMPLE_ROSTER, 'XYZ_NON_EXISTENT_QUERY_9999', 'TODOS');
    assert.deepStrictEqual(r, []);
  });
});

// ---------------------------------------------------------------------------
// TEST SUITE 2: Defensive Robustness on Sparse / Malformed Personnel Records
// ---------------------------------------------------------------------------
test('Suite 2: Defensive Handling of Null, Undefined, and Sparse Soldier Objects', async (t) => {
  const sparseRoster = [
    { id: 'SPARSE-1' }, // Missing everything except ID
    { id: 'SPARSE-2', name: 'Solo Nombre' },
    { id: 'SPARSE-3', rank: 'CT' },
    { id: 'SPARSE-4', cedula: undefined, mosCode: null, branch: undefined },
    {} // Completely empty object
  ];

  await t.test('Filtering does not throw when properties are undefined or null', () => {
    assert.doesNotThrow(() => {
      const res = filterSoldiers(sparseRoster, 'test', 'TODOS');
      assert.strictEqual(res.length, 0);
    });

    assert.doesNotThrow(() => {
      const res = filterSoldiers(sparseRoster, '', 'TODOS');
      assert.strictEqual(res.length, 5);
    });

    assert.doesNotThrow(() => {
      const res = filterSoldiers(sparseRoster, 'CT', 'TODOS');
      assert.strictEqual(res.length, 1);
      assert.strictEqual(res[0].id, 'SPARSE-3');
    });
  });
});

// ---------------------------------------------------------------------------
// TEST SUITE 3: Rank Category Partition Integrity & Strict Officer Protection
// ---------------------------------------------------------------------------
test('Suite 3: Rank Category Partition & Zero Officer Misclassification', async (t) => {
  const officerRanks = ['GR', 'MG', 'BG', 'CR', 'TC', 'MY', 'CT', 'TE', 'ST'];
  const officerFullNames = [
    'GENERAL',
    'MAYOR GENERAL',
    'BRIGADIER GENERAL',
    'CORONEL',
    'TENIENTE CORONEL',
    'MAYOR',
    'CAPITAN',
    'CAPITÁN',
    'TENIENTE',
    'SUBTENIENTE'
  ];

  const subofficerRanks = ['SMCC', 'SMC', 'SM', 'SP', 'SV', 'SS', 'CP', 'CS', 'C3'];
  const subofficerFullNames = [
    'SARGENTO MAYOR DE COMANDO CONJUNTO',
    'SARGENTO MAYOR DE COMANDO',
    'SARGENTO MAYOR',
    'SARGENTO PRIMERO',
    'SARGENTO VICEPRIMERO',
    'SARGENTO SEGUNDO',
    'CABO PRIMERO',
    'CABO SEGUNDO',
    'CABO TERCERO'
  ];

  const soldierRanks = ['SLP', 'SL18', 'SLR', 'SLB'];
  const soldierFullNames = [
    'SOLDADO',
    'SOLDADO PROFESIONAL',
    'SOLDADO REGULAR',
    'SOLDADO BACHILLER',
    'DRAGONEANTE'
  ];

  await t.test('Officers are ALWAYS classified as OFICIAL and NEVER as SOLDADO or SUBOFICIAL', () => {
    for (const rank of [...officerRanks, ...officerFullNames]) {
      const cat = getRankCategory(rank);
      assert.strictEqual(
        cat,
        'OFICIAL',
        `Rank "${rank}" must be classified as OFICIAL, but got "${cat}"`
      );

      // Explicit negative assertion against SOLDADO
      assert.notStrictEqual(
        cat,
        'SOLDADO',
        `CRITICAL VIOLATION: Officer rank "${rank}" was misclassified as SOLDADO!`
      );

      // Explicit negative assertion against SUBOFICIAL
      assert.notStrictEqual(
        cat,
        'SUBOFICIAL',
        `Violation: Officer rank "${rank}" was misclassified as SUBOFICIAL!`
      );
    }
  });

  await t.test('Officer subcategories are properly resolved', () => {
    // Generales
    for (const r of ['GR', 'MG', 'BG', 'GENERAL', 'MAYOR GENERAL', 'BRIGADIER GENERAL']) {
      assert.strictEqual(getRankSubcategory(r), 'OFICIAL GENERAL', `${r} must be OFICIAL GENERAL`);
    }

    // Superiores
    for (const r of ['CR', 'TC', 'MY', 'CORONEL', 'TENIENTE CORONEL', 'MAYOR']) {
      assert.strictEqual(getRankSubcategory(r), 'OFICIAL SUPERIOR', `${r} must be OFICIAL SUPERIOR`);
    }

    // Subalternos
    for (const r of ['CT', 'TE', 'ST', 'CAPITAN', 'CAPITÁN', 'TENIENTE', 'SUBTENIENTE']) {
      assert.strictEqual(getRankSubcategory(r), 'OFICIAL SUBALTERNO', `${r} must be OFICIAL SUBALTERNO`);
    }
  });

  await t.test('Subofficers are ALWAYS classified as SUBOFICIAL', () => {
    for (const rank of [...subofficerRanks, ...subofficerFullNames]) {
      const cat = getRankCategory(rank);
      assert.strictEqual(
        cat,
        'SUBOFICIAL',
        `Rank "${rank}" must be classified as SUBOFICIAL, but got "${cat}"`
      );
      assert.notStrictEqual(cat, 'SOLDADO');
      assert.notStrictEqual(cat, 'OFICIAL');
    }
  });

  await t.test('Soldiers are ALWAYS classified as SOLDADO', () => {
    for (const rank of [...soldierRanks, ...soldierFullNames]) {
      const cat = getRankCategory(rank);
      assert.strictEqual(
        cat,
        'SOLDADO',
        `Rank "${rank}" must be classified as SOLDADO, but got "${cat}"`
      );
      assert.notStrictEqual(cat, 'OFICIAL');
      assert.notStrictEqual(cat, 'SUBOFICIAL');
    }
  });

  await t.test('Classification is insensitive to case and surrounding whitespace', () => {
    assert.strictEqual(getRankCategory('  ct  '), 'OFICIAL');
    assert.strictEqual(getRankCategory('  My  '), 'OFICIAL');
    assert.strictEqual(getRankCategory('  sv  '), 'SUBOFICIAL');
    assert.strictEqual(getRankCategory('  slp  '), 'SOLDADO');
    assert.strictEqual(getRankCategory('  capitán  '), 'OFICIAL');
  });

  await t.test('Disjoint partition on sample roster: TODOS === OFICIAL + SUBOFICIAL + SOLDADO', () => {
    const todos = filterSoldiers(SAMPLE_ROSTER, '', 'TODOS');
    const oficiales = filterSoldiers(SAMPLE_ROSTER, '', 'OFICIAL');
    const suboficiales = filterSoldiers(SAMPLE_ROSTER, '', 'SUBOFICIAL');
    const soldados = filterSoldiers(SAMPLE_ROSTER, '', 'SOLDADO');

    assert.strictEqual(todos.length, SAMPLE_ROSTER.length, 'TODOS must equal total sample size');
    assert.strictEqual(oficiales.length, 9, 'Exactly 9 officers in SAMPLE_ROSTER');
    assert.strictEqual(suboficiales.length, 9, 'Exactly 9 subofficers in SAMPLE_ROSTER');
    assert.strictEqual(soldados.length, 4, 'Exactly 4 soldiers in SAMPLE_ROSTER');

    // Strict partition summation
    assert.strictEqual(
      todos.length,
      oficiales.length + suboficiales.length + soldados.length,
      'Partition must be strictly disjoint and complete'
    );

    // Mutual exclusivity
    const oficialIds = new Set(oficiales.map(s => s.id));
    const suboficialIds = new Set(suboficiales.map(s => s.id));
    const soldadoIds = new Set(soldados.map(s => s.id));

    for (const id of oficialIds) {
      assert.ok(!suboficialIds.has(id), `Officer ${id} cannot be in suboficiales`);
      assert.ok(!soldadoIds.has(id), `Officer ${id} cannot be in soldados`);
    }

    for (const id of suboficialIds) {
      assert.ok(!oficialIds.has(id), `Subofficer ${id} cannot be in oficiales`);
      assert.ok(!soldadoIds.has(id), `Subofficer ${id} cannot be in soldados`);
    }

    for (const id of soldadoIds) {
      assert.ok(!oficialIds.has(id), `Soldier ${id} cannot be in oficiales`);
      assert.ok(!suboficialIds.has(id), `Soldier ${id} cannot be in suboficiales`);
    }
  });
});

// ---------------------------------------------------------------------------
// TEST SUITE 4: Combined Filter Interactions (Search Query + Category Tabs)
// ---------------------------------------------------------------------------
test('Suite 4: Intersection of Search Query and Category Tabs', async (t) => {
  await t.test('Filtering Infantry across tabs isolates appropriate echelons', () => {
    const infantryAll = filterSoldiers(SAMPLE_ROSTER, 'INFANTERIA', 'TODOS');
    assert.strictEqual(infantryAll.length, 7); // GR, SMCC, SMC, SLP, SL18, SLR, SOLDADO PROFESIONAL

    const infantryOfic = filterSoldiers(SAMPLE_ROSTER, 'INFANTERIA', 'OFICIAL');
    assert.strictEqual(infantryOfic.length, 1);
    assert.strictEqual(infantryOfic[0].id, 'SOL-001'); // GR

    const infantrySubof = filterSoldiers(SAMPLE_ROSTER, 'INFANTERIA', 'SUBOFICIAL');
    assert.strictEqual(infantrySubof.length, 2); // SMCC, SMC

    const infantrySold = filterSoldiers(SAMPLE_ROSTER, 'INFANTERIA', 'SOLDADO');
    assert.strictEqual(infantrySold.length, 4); // SLP, SL18, SLR, SOLDADO PROFESIONAL

    assert.strictEqual(infantryAll.length, infantryOfic.length + infantrySubof.length + infantrySold.length);
  });

  await t.test('Filtering by MOS 11B respects category tab', () => {
    const mos11bSoldados = filterSoldiers(SAMPLE_ROSTER, '11B', 'SOLDADO');
    assert.strictEqual(mos11bSoldados.length, 4);
    assert.ok(mos11bSoldados.every(s => getRankCategory(s.rank) === 'SOLDADO'));

    const mos11bOficiales = filterSoldiers(SAMPLE_ROSTER, '11B', 'OFICIAL');
    assert.strictEqual(mos11bOficiales.length, 0); // No officer has 11B
  });

  await t.test('Searching an officer by name while in SOLDADO tab yields empty result', () => {
    const res = filterSoldiers(SAMPLE_ROSTER, 'Gabriel Ramirez', 'SOLDADO');
    assert.strictEqual(res.length, 0, 'Officer must not appear under SOLDADO tab');

    const resOfic = filterSoldiers(SAMPLE_ROSTER, 'Gabriel Ramirez', 'OFICIAL');
    assert.strictEqual(resOfic.length, 1);
    assert.strictEqual(resOfic[0].id, 'SOL-007');
  });
});

// ---------------------------------------------------------------------------
// TEST SUITE 5: High-Density In-Memory Roster Stress Test (10,000 Records)
// ---------------------------------------------------------------------------
test('Suite 5: High-Density Roster Performance (10,000 soldiers < 50ms)', async (t) => {
  await t.test('10,000 personnel filter executes under 50ms budget', () => {
    const ranks = ['GR', 'CR', 'MY', 'CT', 'TE', 'ST', 'SMCC', 'SV', 'SS', 'CP', 'SLP', 'SL18', 'SLR'];
    const branches = ['INFANTERIA', 'CABALLERIA', 'ARTILLERIA', 'INGENIEROS', 'COMUNICACIONES', 'INTELIGENCIA', 'LOGISTICA', 'SANIDAD', 'AVIACION'];
    const mosCodes = ['11A', '11B', '12A', '13A', '14A', '25A', '35A', '91A', '70A', '15A'];

    const largeRoster = [];
    for (let i = 0; i < 10000; i++) {
      largeRoster.push({
        id: `SOL-${String(i).padStart(6, '0')}`,
        cedula: String(1000000000 + i),
        name: `Soldado Prueba ${i}`,
        rank: ranks[i % ranks.length],
        branch: branches[i % branches.length],
        mosCode: mosCodes[i % mosCodes.length],
        healthStatus: i % 10 === 0 ? 'NO APTO' : 'APTO'
      });
    }

    const tStart = performance.now();
    const result1 = filterSoldiers(largeRoster, 'Prueba 99', 'TODOS');
    const result2 = filterSoldiers(largeRoster, '11A', 'OFICIAL');
    const result3 = filterSoldiers(largeRoster, 'INFANTERIA', 'SOLDADO');
    const durationMs = performance.now() - tStart;

    assert.ok(result1.length > 0);
    assert.ok(result2.length > 0);
    assert.ok(result3.length > 0);
    assert.ok(durationMs < 50, `10k filter took ${durationMs.toFixed(2)}ms (must be < 50ms)`);
  });
});

// ---------------------------------------------------------------------------
// TEST SUITE 6: Forensic Zero-Inline-Styles & Code Integrity Verification
// ---------------------------------------------------------------------------
test('Suite 6: Static Forensic Integrity & Zero Inline Styles', async (t) => {
  const consultaPersonalPath = resolve(frontendDir, 'src', 'components', 'ConsultaPersonal.tsx');
  const fichaDigitalPath = resolve(frontendDir, 'src', 'components', 'FichaDigital.tsx');
  const militaryRankServicePath = resolve(frontendDir, 'src', 'services', 'militaryRankService.ts');

  assert.ok(existsSync(consultaPersonalPath), 'ConsultaPersonal.tsx must exist');
  assert.ok(existsSync(fichaDigitalPath), 'FichaDigital.tsx must exist');
  assert.ok(existsSync(militaryRankServicePath), 'militaryRankService.ts must exist');

  const consultaCode = readFileSync(consultaPersonalPath, 'utf8');
  const fichaCode = readFileSync(fichaDigitalPath, 'utf8');
  const rankServiceCode = readFileSync(militaryRankServicePath, 'utf8');

  await t.test('ConsultaPersonal.tsx has ZERO inline styles (style= occurrences)', () => {
    const matches = consultaCode.match(/style\s*=\s*\{/g);
    assert.strictEqual(matches, null, `Found style={ in ConsultaPersonal.tsx: ${matches?.length}`);
  });

  await t.test('FichaDigital.tsx has ZERO inline styles (style= occurrences)', () => {
    const matches = fichaCode.match(/style\s*=\s*\{/g);
    assert.strictEqual(matches, null, `Found style={ in FichaDigital.tsx: ${matches?.length}`);
  });

  await t.test('militaryRankService.ts has ZERO runtime enums (erasableSyntaxOnly compliant)', () => {
    const enumMatches = rankServiceCode.match(/\benum\s+[A-Za-z0-9_]+/g);
    assert.strictEqual(enumMatches, null, `Found runtime enums in militaryRankService.ts: ${enumMatches?.length}`);
  });

  await t.test('Tactical Tailwind classes and UI tokens are present', () => {
    assert.ok(consultaCode.includes('bg-slate-900/90'), 'Contains Mil-Spec slate glass card background');
    assert.ok(consultaCode.includes('border-slate-800'), 'Contains tactical dark border');
    assert.ok(consultaCode.includes('getRankCategory(s.rank)'), 'ConsultaPersonal utilizes militaryRankService for categorization');
    assert.ok(fichaCode.includes('backdrop-blur'), 'FichaDigital contains glassmorphism backdrop blur');
  });
});
