/**
 * Verification Tests for Military Rank Service & Heraldry Classification
 * 
 * Pure TypeScript test suite compatible with browser Vite bundler
 * and node execution via tsx.
 */
import {
  getRankSubcategory,
  getRankCategory,
  getRankBadgeClasses
} from './militaryRankService';

function assertEqual<T>(actual: T, expected: T, msg?: string) {
  if (actual !== expected) {
    throw new Error(msg || `Expected ${String(expected)}, got ${String(actual)}`);
  }
}

function assertOk(val: unknown, msg?: string) {
  if (!val) {
    throw new Error(msg || `Expected value to be truthy`);
  }
}

export function runMilitaryRankTests(): boolean {
  // 1. Oficiales Generales
  assertEqual(getRankSubcategory('GR'), 'OFICIAL GENERAL');
  assertEqual(getRankSubcategory('MG'), 'OFICIAL GENERAL');
  assertEqual(getRankSubcategory('BG'), 'OFICIAL GENERAL');
  assertEqual(getRankSubcategory('GENERAL'), 'OFICIAL GENERAL');
  assertEqual(getRankSubcategory('MAYOR GENERAL'), 'OFICIAL GENERAL');
  assertEqual(getRankSubcategory('BRIGADIER GENERAL'), 'OFICIAL GENERAL');
  assertEqual(getRankCategory('GR'), 'OFICIAL');
  assertEqual(getRankCategory('MAYOR GENERAL'), 'OFICIAL');

  // 2. Oficiales Superiores
  assertEqual(getRankSubcategory('CR'), 'OFICIAL SUPERIOR');
  assertEqual(getRankSubcategory('TC'), 'OFICIAL SUPERIOR');
  assertEqual(getRankSubcategory('MY'), 'OFICIAL SUPERIOR');
  assertEqual(getRankSubcategory('CORONEL'), 'OFICIAL SUPERIOR');
  assertEqual(getRankSubcategory('TENIENTE CORONEL'), 'OFICIAL SUPERIOR');
  assertEqual(getRankSubcategory('MAYOR'), 'OFICIAL SUPERIOR');
  assertEqual(getRankCategory('CR'), 'OFICIAL');
  assertEqual(getRankCategory('TENIENTE CORONEL'), 'OFICIAL');

  // 3. Oficiales Subalternos
  assertEqual(getRankSubcategory('CT'), 'OFICIAL SUBALTERNO');
  assertEqual(getRankSubcategory('TE'), 'OFICIAL SUBALTERNO');
  assertEqual(getRankSubcategory('ST'), 'OFICIAL SUBALTERNO');
  assertEqual(getRankSubcategory('CAPITAN'), 'OFICIAL SUBALTERNO');
  assertEqual(getRankSubcategory('CAPITÁN'), 'OFICIAL SUBALTERNO');
  assertEqual(getRankSubcategory('TENIENTE'), 'OFICIAL SUBALTERNO');
  assertEqual(getRankSubcategory('SUBTENIENTE'), 'OFICIAL SUBALTERNO');
  assertEqual(getRankCategory('CT'), 'OFICIAL');
  assertEqual(getRankCategory('SUBTENIENTE'), 'OFICIAL');

  // 4. Suboficiales
  assertEqual(getRankSubcategory('SMCC'), 'SUBOFICIAL');
  assertEqual(getRankSubcategory('SMC'), 'SUBOFICIAL');
  assertEqual(getRankSubcategory('SM'), 'SUBOFICIAL');
  assertEqual(getRankSubcategory('SP'), 'SUBOFICIAL');
  assertEqual(getRankSubcategory('SV'), 'SUBOFICIAL');
  assertEqual(getRankSubcategory('SS'), 'SUBOFICIAL');
  assertEqual(getRankSubcategory('CP'), 'SUBOFICIAL');
  assertEqual(getRankSubcategory('CS'), 'SUBOFICIAL');
  assertEqual(getRankSubcategory('C3'), 'SUBOFICIAL');
  assertEqual(getRankSubcategory('SARGENTO MAYOR'), 'SUBOFICIAL');
  assertEqual(getRankSubcategory('SARGENTO PRIMERO'), 'SUBOFICIAL');
  assertEqual(getRankSubcategory('CABO PRIMERO'), 'SUBOFICIAL');
  assertEqual(getRankCategory('SMCC'), 'SUBOFICIAL');
  assertEqual(getRankCategory('SARGENTO MAYOR'), 'SUBOFICIAL');

  // 5. Soldados
  assertEqual(getRankSubcategory('SLP'), 'SOLDADO');
  assertEqual(getRankSubcategory('SL18'), 'SOLDADO');
  assertEqual(getRankSubcategory('SLR'), 'SOLDADO');
  assertEqual(getRankSubcategory('SOLDADO'), 'SOLDADO');
  assertEqual(getRankSubcategory('SOLDADO PROFESIONAL'), 'SOLDADO');
  assertEqual(getRankCategory('SLP'), 'SOLDADO');
  assertEqual(getRankCategory('SOLDADO'), 'SOLDADO');

  // 6. Tactical Tailwind Badge Classes
  assertOk(getRankBadgeClasses('GR').includes('amber'));
  assertOk(getRankBadgeClasses('CR').includes('slate'));
  assertOk(getRankBadgeClasses('CT').includes('cyan'));
  assertOk(getRankBadgeClasses('SMCC').includes('emerald'));
  assertOk(getRankBadgeClasses('SLP').includes('blue'));

  console.log('✅ All 32 rank categorization and badge tests passed successfully.');
  return true;
}

// Run when executed directly
runMilitaryRankTests();
