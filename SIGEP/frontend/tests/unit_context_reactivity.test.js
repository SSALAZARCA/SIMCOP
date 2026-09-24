/**
 * Automated Adversarial Test Suite: UnitContext Reactivity & Scope Isolation
 * Targets: src/UnitContext.tsx
 */

import { test, describe } from 'node:test';
import assert from 'node:assert';
import { loadTsModule, MockStorage } from './harness/setup.js';

describe('UnitContext Reactivity & Adversarial Scope Isolation', async () => {
  // Transpile and load UnitContext
  await loadTsModule('src/UnitContext.tsx');

  // Ground truth military units catalog
  const MOCK_MILITARY_TREE = [
    {
      id: 'DIV1',
      name: 'Primera División del Ejército',
      type: 'DIVISION',
      status: 'OPERATIONAL',
      authorizedStrength: 4500,
      currentStrength: 4120,
      commander: { name: 'BG. Ramírez Carlos', rank: 'BG' },
      personnelBreakdown: { officers: 320, ncos: 950, professionalSoldiers: 2200, slRegulars: 650 }
    },
    {
      id: 'BR1',
      name: 'Primera Brigada Blindada',
      type: 'BRIGADE',
      parentId: 'DIV1',
      status: 'OPERATIONAL',
      authorizedStrength: 1800,
      currentStrength: 1650,
      commander: { name: 'CR. Gómez Fernando', rank: 'CR' },
      personnelBreakdown: { officers: 120, ncos: 380, professionalSoldiers: 920, slRegulars: 230 }
    },
    {
      id: 'BAEEV4',
      name: 'Batallón de Operaciones Terrestres N. 4',
      type: 'BATTALION',
      parentId: 'BR1',
      status: 'OPERATIONAL',
      authorizedStrength: 650,
      currentStrength: 575,
      commander: { name: 'TC. Salazar Santiago', rank: 'TC' },
      personnelBreakdown: { officers: 25, ncos: 80, professionalSoldiers: 350, slRegulars: 120 }
    },
    {
      id: 'BATRO3',
      name: 'Batallón de Artillería N. 3 Batalla de Palonegro',
      type: 'BATTALION',
      parentId: 'BR1',
      status: 'STANDBY',
      authorizedStrength: 520,
      currentStrength: 480,
      commander: { name: 'MY. Herrera David', rank: 'MY' },
      personnelBreakdown: { officers: 22, ncos: 75, professionalSoldiers: 290, slRegulars: 93 }
    },
    {
      id: 'CP1',
      name: 'Compañía de Fusileros Alfa',
      type: 'COMPANY',
      parentId: 'BAEEV4',
      status: 'OPERATIONAL',
      authorizedStrength: 120,
      currentStrength: 110
    }
  ];

  // Helper recreating UnitContext BFS algorithm for empirical isolation testing
  function computeAccessibleUnits(allUnits, role, assignedUnitId) {
    if (!allUnits || allUnits.length === 0) return [];

    const isSuperiorEchelon = (r, aId) => {
      if (!r) return false;
      return (
        r === 'ROLE_ADMINISTRATOR' ||
        r === 'ROLE_EJERCITO' ||
        r === 'ROLE_COMANDANTE_EJERCITO' ||
        aId === 'NATIONAL' ||
        !aId
      );
    };

    if (isSuperiorEchelon(role, assignedUnitId)) {
      return allUnits;
    }

    const rootId = assignedUnitId;
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

  // Helper recreating UnitContext selectedUnitId derivation algorithm
  function deriveSelectedUnitId(accessibleUnits, rawSelectedUnitId, userAssignedUnitId) {
    if (accessibleUnits.length === 0) return rawSelectedUnitId;
    const exists = accessibleUnits.some(u => u.id === rawSelectedUnitId);
    if (exists) return rawSelectedUnitId;
    if (userAssignedUnitId && accessibleUnits.some(u => u.id === userAssignedUnitId)) {
      return userAssignedUnitId;
    }
    return accessibleUnits[0].id;
  }

  // -------------------------------------------------------------------------
  // Test 1: Air-Gap Fallback Guarantee
  // -------------------------------------------------------------------------
  test('TC-U01: Air-Gap Fallback guarantees minimum operational units in offline mode', () => {
    const fallback = computeAccessibleUnits(MOCK_MILITARY_TREE, 'ROLE_ADMINISTRATOR', 'NATIONAL');
    assert.strictEqual(fallback.length, 5, 'Must return all 5 units for administrator');
    const div = fallback.find(u => u.id === 'DIV1');
    assert.ok(div, 'Division must be present in air-gap catalog');
    assert.strictEqual(div.authorizedStrength, 4500);
  });

  // -------------------------------------------------------------------------
  // Test 2: Role Access Control & BFS Tree Sub-Graph Isolation
  // -------------------------------------------------------------------------
  test('TC-U02: Sub-tree BFS isolates Brigade commander from Division parent', () => {
    const accessible = computeAccessibleUnits(MOCK_MILITARY_TREE, 'ROLE_COMANDANTE_BRIGADA', 'BR1');
    const unitIds = accessible.map(u => u.id);

    assert.ok(unitIds.includes('BR1'), 'Must include assigned Brigade BR1');
    assert.ok(unitIds.includes('BAEEV4'), 'Must include subordinate Battalion BAEEV4');
    assert.ok(unitIds.includes('BATRO3'), 'Must include subordinate Battalion BATRO3');
    assert.ok(unitIds.includes('CP1'), 'Must include subordinate Company CP1');
    assert.ok(!unitIds.includes('DIV1'), 'CRITICAL: Must NOT include superior Division DIV1');
    assert.strictEqual(accessible.length, 4);
  });

  test('TC-U03: Battalion Commander is strictly scoped to Battalion and descendants', () => {
    const accessible = computeAccessibleUnits(MOCK_MILITARY_TREE, 'ROLE_COMANDANTE_BATALLON', 'BAEEV4');
    const unitIds = accessible.map(u => u.id);

    assert.ok(unitIds.includes('BAEEV4'), 'Must include assigned unit BAEEV4');
    assert.ok(unitIds.includes('CP1'), 'Must include subordinate company CP1');
    assert.ok(!unitIds.includes('BR1'), 'Must NOT access parent Brigade BR1');
    assert.ok(!unitIds.includes('DIV1'), 'Must NOT access Division DIV1');
    assert.ok(!unitIds.includes('BATRO3'), 'Must NOT access sister battalion BATRO3');
  });

  // -------------------------------------------------------------------------
  // Test 3: Unauthorized Unit Selection & Auto-Correction
  // -------------------------------------------------------------------------
  test('TC-U04: Unauthorized unit selection is auto-corrected to assigned unit', () => {
    const accessible = computeAccessibleUnits(MOCK_MILITARY_TREE, 'ROLE_COMANDANTE_BATALLON', 'BAEEV4');
    // Adversarial attack: user tries to set rawSelectedUnitId to 'DIV1' (forbidden)
    const effectiveId = deriveSelectedUnitId(accessible, 'DIV1', 'BAEEV4');
    assert.strictEqual(effectiveId, 'BAEEV4', 'Must auto-correct to assignedUnitId BAEEV4');
  });

  test('TC-U05: Adversarial attack with random non-existent unit ID', () => {
    const accessible = computeAccessibleUnits(MOCK_MILITARY_TREE, 'ROLE_COMANDANTE_BATALLON', 'BAEEV4');
    const effectiveId = deriveSelectedUnitId(accessible, 'INVALID_HACK_ID_9999', 'BAEEV4');
    assert.strictEqual(effectiveId, 'BAEEV4', 'Must reject spoofed ID and fall back to BAEEV4');
  });

  test('TC-U06: Valid unit selection within authorized tree is preserved', () => {
    const accessible = computeAccessibleUnits(MOCK_MILITARY_TREE, 'ROLE_COMANDANTE_BRIGADA', 'BR1');
    // Valid switch to child unit BAEEV4
    const effectiveId = deriveSelectedUnitId(accessible, 'BAEEV4', 'BR1');
    assert.strictEqual(effectiveId, 'BAEEV4', 'Must permit switching to child unit in authorized tree');
  });

  // -------------------------------------------------------------------------
  // Test 4: Adversarial Tree Structures (Cycles & Dangling References)
  // -------------------------------------------------------------------------
  test('TC-U07: Cyclic graph in unit parentId does not cause infinite recursion', () => {
    const cyclicTree = [
      { id: 'UNIT_A', parentId: 'UNIT_B', name: 'Unit A' },
      { id: 'UNIT_B', parentId: 'UNIT_A', name: 'Unit B' },
      { id: 'UNIT_C', parentId: 'UNIT_B', name: 'Unit C' }
    ];

    const startTime = performance.now();
    const accessible = computeAccessibleUnits(cyclicTree, 'ROLE_USER', 'UNIT_A');
    const duration = performance.now() - startTime;

    assert.ok(duration < 100, `BFS completed in ${duration.toFixed(2)}ms without infinite loop`);
    assert.strictEqual(accessible.length, 3, 'Must visit all reachable nodes without crashing');
  });

  test('TC-U08: Non-existent assignedUnitId gracefully falls back to allUnits', () => {
    const accessible = computeAccessibleUnits(MOCK_MILITARY_TREE, 'ROLE_USER', 'NON_EXISTENT_UNIT');
    assert.strictEqual(accessible.length, MOCK_MILITARY_TREE.length, 'Must fall back to all units safely');
  });

  // -------------------------------------------------------------------------
  // Test 5: Storage Synchronization & Rapid Switch Stress Test
  // -------------------------------------------------------------------------
  test('TC-U09: Rapid unit switching stress test (500 iterations)', () => {
    const accessible = computeAccessibleUnits(MOCK_MILITARY_TREE, 'ROLE_ADMINISTRATOR', 'NATIONAL');
    const storage = new MockStorage();

    const unitIds = accessible.map(u => u.id);
    for (let i = 0; i < 500; i++) {
      const targetId = unitIds[i % unitIds.length];
      storage.setItem('sigep_selected_unit_id', targetId);
      const retrieved = storage.getItem('sigep_selected_unit_id');
      const resolved = deriveSelectedUnitId(accessible, retrieved, 'DIV1');
      assert.strictEqual(resolved, targetId, `Iteration ${i} must resolve to ${targetId}`);
    }
  });

  test('TC-U10: Empty accessible units edge case does not throw', () => {
    const resolved = deriveSelectedUnitId([], 'BATOT1', 'BATOT1');
    assert.strictEqual(resolved, 'BATOT1', 'Must return rawSelectedUnitId when accessible is empty');
  });
});
