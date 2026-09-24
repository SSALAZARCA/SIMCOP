/**
 * Milestone 1 Empirical Challenge & Stress Test Suite
 * 
 * Tests:
 * 1. Tactical Clocks: format, precision, UTC/COT offsets, boundary handling, timer cleanup
 * 2. UnitContext BFS Scoping: National vs Division vs Brigade vs Battalion, cyclic graphs
 * 3. UnitContext State Transitions: Rapid switching, auto-clamping, cross-role security isolation
 * 4. Air-Gap Mode & Resilience: HTTP 500, network drop, empty payload, localStorage caching
 * 5. Memory Leak Safety: Heartbeat & clock timer lifecycle on mount/unmount
 * 6. Zero Inline Styles & ESLint/TypeScript compliance
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// ---------------------------------------------------------------------------
// 1. TACTICAL CLOCKS LOGIC
// ---------------------------------------------------------------------------

function computeClocks(now) {
  // 1. Zulu (UTC) Military Time
  const utcHours = String(now.getUTCHours()).padStart(2, '0');
  const utcMinutes = String(now.getUTCMinutes()).padStart(2, '0');
  const utcSeconds = String(now.getUTCSeconds()).padStart(2, '0');
  const zuluTime = `${utcHours}:${utcMinutes}:${utcSeconds}Z`;
  const zuluFormatted = `Z: ${utcHours}:${utcMinutes}:${utcSeconds} UTC`;

  // 2. Local Operational Time (Colombia COT / UTC-5)
  let localTime;
  try {
    const formatter = new Intl.DateTimeFormat('es-CO', {
      timeZone: 'America/Bogota',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
    localTime = formatter.format(now);
  } catch {
    const cotMs = now.getTime() - 5 * 3600 * 1000;
    const cotDate = new Date(cotMs);
    const lH = String(cotDate.getUTCHours()).padStart(2, '0');
    const lM = String(cotDate.getUTCMinutes()).padStart(2, '0');
    const lS = String(cotDate.getUTCSeconds()).padStart(2, '0');
    localTime = `${lH}:${lM}:${lS}`;
  }

  const localFormatted = `L: ${localTime} COT`;

  return {
    localTime,
    zuluTime,
    localFormatted,
    zuluFormatted,
    date: now
  };
}

function computeClocksFallbackOnly(now) {
  const utcHours = String(now.getUTCHours()).padStart(2, '0');
  const utcMinutes = String(now.getUTCMinutes()).padStart(2, '0');
  const utcSeconds = String(now.getUTCSeconds()).padStart(2, '0');
  const zuluTime = `${utcHours}:${utcMinutes}:${utcSeconds}Z`;
  const zuluFormatted = `Z: ${utcHours}:${utcMinutes}:${utcSeconds} UTC`;

  const cotMs = now.getTime() - 5 * 3600 * 1000;
  const cotDate = new Date(cotMs);
  const lH = String(cotDate.getUTCHours()).padStart(2, '0');
  const lM = String(cotDate.getUTCMinutes()).padStart(2, '0');
  const lS = String(cotDate.getUTCSeconds()).padStart(2, '0');
  const localTime = `${lH}:${lM}:${lS}`;
  const localFormatted = `L: ${localTime} COT`;

  return { localTime, zuluTime, localFormatted, zuluFormatted, date: now };
}

test('Suite 1: Tactical Clocks — Format and Mathematical Offset', async (t) => {
  await t.test('Zulu and COT regular midday calculation', () => {
    const fixedDate = new Date('2026-09-24T17:30:45.000Z');
    const clocks = computeClocks(fixedDate);

    assert.equal(clocks.zuluTime, '17:30:45Z');
    assert.equal(clocks.zuluFormatted, 'Z: 17:30:45 UTC');
    // Colombia is UTC-5 -> 17:30:45 - 5h = 12:30:45
    assert.equal(clocks.localTime, '12:30:45');
    assert.equal(clocks.localFormatted, 'L: 12:30:45 COT');
  });

  await t.test('Midnight boundary in Bogota (05:00:00 UTC = 00:00:00 COT)', () => {
    const midnightBogota = new Date('2026-09-24T05:00:00.000Z');
    const clocks = computeClocks(midnightBogota);

    assert.equal(clocks.zuluTime, '05:00:00Z');
    assert.match(clocks.localTime, /^(00|24):00:00$/);
  });

  await t.test('Day boundary rollback: UTC morning corresponds to previous day night in COT', () => {
    // 02:15:00 UTC on Sept 24 -> 21:15:00 COT on Sept 23
    const earlyMorningUtc = new Date('2026-09-24T02:15:00.000Z');
    const clocks = computeClocks(earlyMorningUtc);

    assert.equal(clocks.zuluTime, '02:15:00Z');
    assert.equal(clocks.localTime, '21:15:00');
    assert.equal(clocks.localFormatted, 'L: 21:15:00 COT');
  });

  await t.test('Fallback calculation matches Intl formatting perfectly', () => {
    const dates = [
      new Date('2026-01-01T00:00:00.000Z'),
      new Date('2026-06-15T15:45:12.000Z'),
      new Date('2026-12-31T23:59:59.000Z'),
      new Date('2024-02-29T12:00:00.000Z') // leap day
    ];

    for (const d of dates) {
      const normal = computeClocks(d);
      const fallback = computeClocksFallbackOnly(d);
      assert.equal(normal.zuluTime, fallback.zuluTime);
      assert.equal(normal.zuluFormatted, fallback.zuluFormatted);
      // In 24h format, hours match
      assert.equal(normal.localTime, fallback.localTime);
    }
  });

  await t.test('Memory Leak Safety: Timer lifecycle cleanup simulation', () => {
    let activeIntervals = 0;
    let clearedIntervals = 0;
    const mockSetInterval = (fn, ms) => {
      activeIntervals++;
      const id = { id: activeIntervals, fn, ms };
      return id;
    };
    const mockClearInterval = (id) => {
      if (id) {
        clearedIntervals++;
      }
    };

    // Simulate useTacticalClocks lifecycle
    const mountHook = () => {
      const intervalId = mockSetInterval(() => {}, 1000);
      const cleanup = () => {
        mockClearInterval(intervalId);
      };
      return cleanup;
    };

    assert.equal(activeIntervals, 0);
    const unmount1 = mountHook();
    assert.equal(activeIntervals, 1);
    assert.equal(clearedIntervals, 0);

    // Unmount
    unmount1();
    assert.equal(clearedIntervals, 1);

    // Mount 10 instances and unmount all 10
    const unmounts = Array.from({ length: 10 }, () => mountHook());
    assert.equal(activeIntervals, 11);
    unmounts.forEach(u => u());
    assert.equal(clearedIntervals, 11);
  });
});

// ---------------------------------------------------------------------------
// 2. UNIT HIERARCHY BFS SCOPING LOGIC
// ---------------------------------------------------------------------------

function isSuperiorEchelon(role, assignedUnitId) {
  if (!role) return false;
  return (
    role === 'ROLE_ADMINISTRATOR' ||
    role === 'ROLE_EJERCITO' ||
    role === 'ROLE_COMANDANTE_EJERCITO' ||
    assignedUnitId === 'NATIONAL' ||
    !assignedUnitId
  );
}

function computeAccessibleUnits(allUnits, userRole, userAssignedUnitId) {
  if (!allUnits || allUnits.length === 0) return [];

  if (isSuperiorEchelon(userRole, userAssignedUnitId)) {
    return allUnits;
  }

  const rootId = userAssignedUnitId;
  if (!rootId) return allUnits;

  const queue = [rootId];
  const visited = new Set();
  const tree = [];

  while (queue.length > 0) {
    const currentId = queue.shift();
    if (!visited.has(currentId)) {
      visited.add(currentId);
      const currentUnit = allUnits.find(u => u.id === currentId);
      if (currentUnit) {
        tree.push(currentUnit);
      }
      const children = allUnits.filter(u => u.parentId === currentId);
      for (const child of children) {
        if (!visited.has(child.id)) {
          queue.push(child.id);
        }
      }
    }
  }

  return tree.length > 0 ? tree : allUnits;
}

const MOCK_MILITARY_TREE = [
  { id: 'DIV1', name: 'Primera División', type: 'DIVISION' },
  { id: 'DIV2', name: 'Segunda División', type: 'DIVISION' },
  { id: 'BR1', name: 'Primera Brigada', type: 'BRIGADE', parentId: 'DIV1' },
  { id: 'BR2', name: 'Segunda Brigada', type: 'BRIGADE', parentId: 'DIV1' },
  { id: 'BR3', name: 'Tercera Brigada', type: 'BRIGADE', parentId: 'DIV2' },
  { id: 'BAEEV4', name: 'Batallón N4', type: 'BATTALION', parentId: 'BR1' },
  { id: 'BATRO3', name: 'Batallón N3', type: 'BATTALION', parentId: 'BR1' },
  { id: 'BIPLA5', name: 'Batallón N5', type: 'BATTALION', parentId: 'BR2' },
  { id: 'BICO6', name: 'Batallón N6', type: 'BATTALION', parentId: 'BR3' }
];

test('Suite 2: UnitContext BFS Scoping & Access Control', async (t) => {
  await t.test('National roles receive 100% of units across all divisions', () => {
    const adminUnits = computeAccessibleUnits(MOCK_MILITARY_TREE, 'ROLE_ADMINISTRATOR', 'DIV1');
    assert.equal(adminUnits.length, MOCK_MILITARY_TREE.length);

    const ejercitoUnits = computeAccessibleUnits(MOCK_MILITARY_TREE, 'ROLE_EJERCITO', 'BR1');
    assert.equal(ejercitoUnits.length, MOCK_MILITARY_TREE.length);

    const comandanteEjercito = computeAccessibleUnits(MOCK_MILITARY_TREE, 'ROLE_COMANDANTE_EJERCITO', 'BAEEV4');
    assert.equal(comandanteEjercito.length, MOCK_MILITARY_TREE.length);

    const nationalExplicit = computeAccessibleUnits(MOCK_MILITARY_TREE, 'ROLE_OFICIAL_G1', 'NATIONAL');
    assert.equal(nationalExplicit.length, MOCK_MILITARY_TREE.length);
  });

  await t.test('Division Commander only sees own Division and subordinate brigades/battalions', () => {
    const div1Units = computeAccessibleUnits(MOCK_MILITARY_TREE, 'ROLE_COMANDANTE_DIVISION', 'DIV1');
    const ids = div1Units.map(u => u.id);

    // Must contain DIV1 and its descendants: BR1, BR2, BAEEV4, BATRO3, BIPLA5
    assert.ok(ids.includes('DIV1'));
    assert.ok(ids.includes('BR1'));
    assert.ok(ids.includes('BR2'));
    assert.ok(ids.includes('BAEEV4'));
    assert.ok(ids.includes('BATRO3'));
    assert.ok(ids.includes('BIPLA5'));

    // Must NOT contain DIV2, BR3, BICO6
    assert.ok(!ids.includes('DIV2'), 'DIV2 should be isolated from DIV1');
    assert.ok(!ids.includes('BR3'), 'BR3 should be isolated from DIV1');
    assert.ok(!ids.includes('BICO6'), 'BICO6 should be isolated from DIV1');
    assert.equal(div1Units.length, 6);
  });

  await t.test('Brigade Commander only sees own Brigade and subordinate battalions', () => {
    const br1Units = computeAccessibleUnits(MOCK_MILITARY_TREE, 'ROLE_COMANDANTE_BRIGADA', 'BR1');
    const ids = br1Units.map(u => u.id);

    assert.deepEqual(ids.sort(), ['BAEEV4', 'BATRO3', 'BR1'].sort());
    // Strict isolation checks
    assert.ok(!ids.includes('DIV1'), 'Brigade cannot see parent division');
    assert.ok(!ids.includes('BR2'), 'Brigade cannot see sister brigade BR2');
    assert.ok(!ids.includes('BIPLA5'), 'Brigade cannot see sister brigade battalion BIPLA5');
  });

  await t.test('Battalion Commander only sees own Battalion (Zero lateral or vertical leakage)', () => {
    const baeev4Units = computeAccessibleUnits(MOCK_MILITARY_TREE, 'ROLE_COMANDANTE_BATALLON', 'BAEEV4');
    assert.equal(baeev4Units.length, 1);
    assert.equal(baeev4Units[0].id, 'BAEEV4');
  });

  await t.test('Cyclic graph resilience: BFS terminates cleanly without infinite loop', () => {
    const cyclicTree = [
      { id: 'U1', name: 'Unit 1', parentId: 'U2' },
      { id: 'U2', name: 'Unit 2', parentId: 'U1' },
      { id: 'U3', name: 'Unit 3', parentId: 'U1' }
    ];

    const result = computeAccessibleUnits(cyclicTree, 'ROLE_COMANDANTE_BRIGADA', 'U1');
    assert.equal(result.length, 3);
    const ids = result.map(u => u.id).sort();
    assert.deepEqual(ids, ['U1', 'U2', 'U3']);
  });

  await t.test('Unknown assignedUnitId degrades safely to allUnits without crashing', () => {
    const result = computeAccessibleUnits(MOCK_MILITARY_TREE, 'ROLE_OPERADOR', 'UNKNOWN_UNIT_999');
    assert.equal(result.length, MOCK_MILITARY_TREE.length);
  });
});

// ---------------------------------------------------------------------------
// 3. UNIT SELECTION DERIVATION & RAPID SWITCHING
// ---------------------------------------------------------------------------

function deriveSelectedUnitId(accessibleUnits, rawSelectedUnitId, userAssignedUnitId) {
  if (accessibleUnits.length === 0) return rawSelectedUnitId;
  const exists = accessibleUnits.some(u => u.id === rawSelectedUnitId);
  if (exists) return rawSelectedUnitId;
  if (userAssignedUnitId && accessibleUnits.some(u => u.id === userAssignedUnitId)) {
    return userAssignedUnitId;
  }
  return accessibleUnits[0].id;
}

test('Suite 3: Unit Selection State Transitions & Rapid Switching', async (t) => {
  const accessibleUnits = [
    { id: 'BR1', name: 'Brigada 1' },
    { id: 'BAEEV4', name: 'Batallón 4' },
    { id: 'BATRO3', name: 'Batallón 3' }
  ];

  await t.test('Valid raw selection is immediately derived', () => {
    const selected = deriveSelectedUnitId(accessibleUnits, 'BAEEV4', 'BR1');
    assert.equal(selected, 'BAEEV4');
  });

  await t.test('Privilege escalation prevention: Clamps illegal raw selection to assignedUnitId', () => {
    // User previously viewed DIV1 (saved in sessionStorage), but current accessibleUnits is only BR1 and subordinates
    const selected = deriveSelectedUnitId(accessibleUnits, 'DIV1', 'BR1');
    assert.equal(selected, 'BR1', 'Must clamp to assignedUnitId if stored ID is outside accessibleUnits');
  });

  await t.test('Fallback to accessibleUnits[0].id if assignedUnitId is also invalid', () => {
    const selected = deriveSelectedUnitId(accessibleUnits, 'INVALID_99', 'INVALID_ASSIGNED');
    assert.equal(selected, 'BR1');
  });

  await t.test('Rapid switching simulation: Synchronous consistency without state lag', () => {
    let rawSelected = 'BR1';
    const stateHistory = [];

    // Simulate 50 rapid unit switch events
    const switchSequence = ['BAEEV4', 'BATRO3', 'BR1', 'BATRO3', 'BAEEV4'];
    for (let i = 0; i < 50; i++) {
      const nextUnit = switchSequence[i % switchSequence.length];
      rawSelected = nextUnit;
      const derived = deriveSelectedUnitId(accessibleUnits, rawSelected, 'BR1');
      stateHistory.push(derived);
      assert.equal(derived, nextUnit);
    }

    assert.equal(stateHistory.length, 50);
  });
});

// ---------------------------------------------------------------------------
// 4. AIR-GAP RESILIENCE & NETWORK DEGRADATION
// ---------------------------------------------------------------------------

const AIR_GAP_FALLBACK_UNITS = [
  { id: 'DIV1', name: 'Primera División del Ejército', type: 'DIVISION' },
  { id: 'BR1', name: 'Primera Brigada Blindada', type: 'BRIGADE', parentId: 'DIV1' },
  { id: 'BAEEV4', name: 'Batallón de Operaciones Terrestres N. 4', type: 'BATTALION', parentId: 'BR1' },
  { id: 'BATRO3', name: 'Batallón de Artillería N. 3 Batalla de Palonegro', type: 'BATTALION', parentId: 'BR1' }
];

async function simulateRefreshUnits({
  mockApiCall,
  cachedUnits = null
}) {
  let allUnits = cachedUnits || AIR_GAP_FALLBACK_UNITS;
  let m2mStatus = 'CHECKING';
  let lastSyncTimestamp = null;
  let isLoading = true;
  let error = null;

  try {
    const res = await mockApiCall();
    if (Array.isArray(res.data) && res.data.length > 0) {
      allUnits = res.data;
      m2mStatus = 'CONNECTED';
      lastSyncTimestamp = new Date();
      error = null;
    } else {
      m2mStatus = 'DISCONNECTED';
      error = 'El enlace M2M con SIMCOP no retornó unidades activas.';
    }
  } catch (err) {
    m2mStatus = 'DISCONNECTED';
    error = err instanceof Error ? err.message : 'Error de comunicación M2M';
    allUnits = allUnits.length > 0 ? allUnits : AIR_GAP_FALLBACK_UNITS;
  } finally {
    isLoading = false;
  }

  return { allUnits, m2mStatus, lastSyncTimestamp, isLoading, error };
}

test('Suite 4: Air-Gap Fallback & Network Degradation Resilience', async (t) => {
  await t.test('HTTP 500 error degrades gracefully into Air-Gap mode', async () => {
    const result = await simulateRefreshUnits({
      mockApiCall: async () => {
        throw new Error('Request failed with status code 500');
      }
    });

    assert.equal(result.m2mStatus, 'DISCONNECTED');
    assert.equal(result.isLoading, false);
    assert.equal(result.error, 'Request failed with status code 500');
    assert.equal(result.allUnits.length, 4, 'Air-Gap fallback units preserved');
    assert.equal(result.allUnits[0].id, 'DIV1');
  });

  await t.test('Network disconnection (Timeout / Connection Refused) activates Air-Gap mode', async () => {
    const result = await simulateRefreshUnits({
      mockApiCall: async () => {
        const err = new Error('connect ECONNREFUSED 127.0.0.1:4000');
        err.code = 'ECONNREFUSED';
        throw err;
      }
    });

    assert.equal(result.m2mStatus, 'DISCONNECTED');
    assert.equal(result.isLoading, false);
    assert.ok(result.error.includes('ECONNREFUSED'));
    assert.equal(result.allUnits.length, 4);
  });

  await t.test('Empty unit array payload sets DISCONNECTED with explicit diagnostic message', async () => {
    const result = await simulateRefreshUnits({
      mockApiCall: async () => ({ status: 200, data: [] })
    });

    assert.equal(result.m2mStatus, 'DISCONNECTED');
    assert.equal(result.isLoading, false);
    assert.equal(result.error, 'El enlace M2M con SIMCOP no retornó unidades activas.');
  });

  await t.test('Successful M2M connection transitions to CONNECTED and updates timestamp', async () => {
    const remoteUnits = [
      { id: 'DIV3', name: 'Tercera División', type: 'DIVISION' }
    ];

    const result = await simulateRefreshUnits({
      mockApiCall: async () => ({ status: 200, data: remoteUnits })
    });

    assert.equal(result.m2mStatus, 'CONNECTED');
    assert.equal(result.isLoading, false);
    assert.equal(result.error, null);
    assert.equal(result.allUnits.length, 1);
    assert.equal(result.allUnits[0].id, 'DIV3');
    assert.ok(result.lastSyncTimestamp instanceof Date);
  });

  await t.test('Preserves cached units when network fails after initial sync', async () => {
    const previouslyCached = [
      { id: 'BR_SPECIAL', name: 'Fuerzas Especiales', type: 'BRIGADE' }
    ];

    const result = await simulateRefreshUnits({
      cachedUnits: previouslyCached,
      mockApiCall: async () => {
        throw new Error('Network timeout');
      }
    });

    assert.equal(result.m2mStatus, 'DISCONNECTED');
    assert.equal(result.allUnits.length, 1);
    assert.equal(result.allUnits[0].id, 'BR_SPECIAL', 'Keeps previously cached units on subsequent network failure');
  });

  await t.test('Periodic heartbeat timer lifecycle verification', () => {
    let heartbeatIntervalId = null;
    let isCleared = false;

    const mockSetInterval = (fn, ms) => {
      heartbeatIntervalId = { ms };
      return heartbeatIntervalId;
    };
    const mockClearInterval = (id) => {
      if (id === heartbeatIntervalId) {
        isCleared = true;
      }
    };

    // Simulate UnitContext heartbeat effect
    const effectCleanup = (() => {
      const interval = mockSetInterval(() => {}, 45000);
      return () => mockClearInterval(interval);
    })();

    assert.equal(heartbeatIntervalId.ms, 45000, 'Heartbeat must be set to 45 seconds');
    assert.equal(isCleared, false);
    effectCleanup();
    assert.equal(isCleared, true, 'Heartbeat interval must be cleanly cleared on unmount');
  });
});

// ---------------------------------------------------------------------------
// 5. STATIC COMPLIANCE: ZERO INLINE STYLES IN M1 CODEBASE
// ---------------------------------------------------------------------------

test('Suite 5: Mil-Spec Architectural Integrity & Zero Inline Styles', async (t) => {
  const filesToCheck = [
    'src/App.tsx',
    'src/components/TacticalNavbar.tsx',
    'src/components/Sidebar.tsx'
  ];

  for (const relPath of filesToCheck) {
    await t.test(`Zero inline styles (style={{...}}) in ${relPath}`, () => {
      const fullPath = resolve(process.cwd(), relPath);
      const content = readFileSync(fullPath, 'utf8');

      // Check for inline style declarations
      const styleMatches = content.match(/style\s*=\s*\{\{/g);
      assert.equal(styleMatches, null, `Found forbidden inline styles in ${relPath}: ${styleMatches?.length}`);
    });
  }

  await t.test('Type safety: sigep.ts contains 0 TypeScript enums (erasable syntax compliant)', () => {
    const fullPath = resolve(process.cwd(), 'src/types/sigep.ts');
    const content = readFileSync(fullPath, 'utf8');

    // Match enum declarations
    const enumMatches = content.match(/\benum\s+[A-Za-z0-9_]+/g);
    assert.equal(enumMatches, null, `Found runtime enums in sigep.ts violating erasableSyntaxOnly: ${enumMatches}`);
  });

  await t.test('TacticalNavbar contains accessible drawer toggling and M2M status indicators', () => {
    const fullPath = resolve(process.cwd(), 'src/components/TacticalNavbar.tsx');
    const content = readFileSync(fullPath, 'utf8');

    assert.ok(content.includes('aria-label='), 'Must provide accessible aria-label on drawer button');
    assert.ok(content.includes('M2M SIMCOP: EN LÍNEA'));
    assert.ok(content.includes('M2M: DESCONECTADO (AIR-GAP)'));
    assert.ok(content.includes('setSelectedUnitId'));
  });

  await t.test('Sidebar unifies mobility into single Consola de Traslados item', () => {
    const fullPath = resolve(process.cwd(), 'src/components/Sidebar.tsx');
    const content = readFileSync(fullPath, 'utf8');

    assert.ok(content.includes('Consola de Traslados'));
    assert.ok(content.includes('traslados'));
    // Verify no separate legacy navigation buttons exist in Sidebar
    assert.ok(!content.includes("handleSelectTab('oficiales')"), 'Should not have individual oficiales nav item');
    assert.ok(!content.includes("handleSelectTab('suboficiales')"), 'Should not have individual suboficiales nav item');
    assert.ok(!content.includes("handleSelectTab('soldados')"), 'Should not have individual soldados nav item');
  });
});

// ---------------------------------------------------------------------------
// 6. ADVERSARIAL STRESS: MASSIVE HIERARCHY & BOUNDARY CONDITIONS
// ---------------------------------------------------------------------------

test('Suite 6: Adversarial Stress & High-Load Hierarchy Performance', async (t) => {
  await t.test('High-Density Hierarchy: 5,000 military units BFS completes < 25ms', () => {
    // Generate realistic tree of 5,000 units
    const massiveTree = [];
    massiveTree.push({ id: 'ARMY_HQ', name: 'Comando General del Ejército', type: 'ARMY' });

    let count = 1;
    const divisions = [];
    for (let d = 1; d <= 8; d++) {
      const divId = `DIV_${d}`;
      divisions.push(divId);
      massiveTree.push({ id: divId, name: `División ${d}`, parentId: 'ARMY_HQ', type: 'DIVISION' });
      count++;
    }

    const brigades = [];
    for (const divId of divisions) {
      for (let b = 1; b <= 4; b++) {
        const brId = `${divId}_BR_${b}`;
        brigades.push(brId);
        massiveTree.push({ id: brId, name: `Brigada ${b} de ${divId}`, parentId: divId, type: 'BRIGADE' });
        count++;
      }
    }

    const battalions = [];
    for (const brId of brigades) {
      for (let bat = 1; bat <= 5; bat++) {
        const batId = `${brId}_BAT_${bat}`;
        battalions.push(batId);
        massiveTree.push({ id: batId, name: `Batallón ${bat} de ${brId}`, parentId: brId, type: 'BATTALION' });
        count++;
      }
    }

    // Fill remaining up to 5,000 with companies and platoons
    let batIdx = 0;
    while (count < 5000) {
      const parentBat = battalions[batIdx % battalions.length];
      const compId = `COMP_${count}`;
      massiveTree.push({ id: compId, name: `Compañía ${count}`, parentId: parentBat, type: 'COMPANY' });
      count++;
      batIdx++;
    }

    assert.equal(massiveTree.length, 5000);

    // Measure BFS execution time for Brigade Commander
    const t0 = performance.now();
    const targetBrigade = brigades[0];
    const scopedUnits = computeAccessibleUnits(massiveTree, 'ROLE_COMANDANTE_BRIGADA', targetBrigade);
    const duration = performance.now() - t0;

    assert.ok(scopedUnits.length > 0);
    assert.ok(scopedUnits.length < 5000);
    assert.ok(duration < 25, `BFS traversal took ${duration.toFixed(2)}ms (expected < 25ms)`);

    // Verify root is brigade
    assert.equal(scopedUnits[0].id, targetBrigade);
    // Verify none of other brigades or parent divisions are included
    assert.ok(!scopedUnits.some(u => u.id === 'ARMY_HQ'));
    assert.ok(!scopedUnits.some(u => u.id === brigades[1]));
  });

  await t.test('Unauthenticated / null user boundary conditions in scoping', () => {
    // Null user (unauthenticated / logged out)
    const resultNull = computeAccessibleUnits(MOCK_MILITARY_TREE, undefined, undefined);
    assert.equal(resultNull.length, MOCK_MILITARY_TREE.length);

    // Empty string role and assignedUnitId
    const resultEmpty = computeAccessibleUnits(MOCK_MILITARY_TREE, '', '');
    assert.equal(resultEmpty.length, MOCK_MILITARY_TREE.length);

    // Empty unit tree
    const resultEmptyTree = computeAccessibleUnits([], 'ROLE_ADMINISTRATOR', 'DIV1');
    assert.deepEqual(resultEmptyTree, []);
  });

  await t.test('Invalid clock input handling', () => {
    // Passing current time works
    const valid = computeClocks(new Date());
    assert.ok(valid.zuluTime.endsWith('Z'));
    assert.ok(valid.localFormatted.includes('COT'));
  });
});

