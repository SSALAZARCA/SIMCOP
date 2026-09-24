/**
 * Colombian Army Tactical Rank Service
 * 
 * Provides pure utility functions for classifying military ranks,
 * subcategories (Generales, Superiores, Subalternos, Suboficiales, Soldados),
 * and applying semantic tactical Tailwind badge styles.
 * 
 * Compliant with "erasableSyntaxOnly": true (0 runtime enums).
 */

export type RankSubcategory =
  | 'OFICIAL GENERAL'
  | 'OFICIAL SUPERIOR'
  | 'OFICIAL SUBALTERNO'
  | 'SUBOFICIAL'
  | 'SOLDADO';

export type RankCategory = 'OFICIAL' | 'SUBOFICIAL' | 'SOLDADO';

export function getRankSubcategory(rank?: string): RankSubcategory {
  if (!rank) return 'SOLDADO';
  const r = rank.toUpperCase().trim();

  // 1. Generales
  if (['GR', 'MG', 'BG'].includes(r) || (r.includes('GENERAL') && !r.includes('SARGENTO'))) {
    return 'OFICIAL GENERAL';
  }
  // 2. Superiores
  if (['CR', 'TC', 'MY'].includes(r) || ((r.includes('CORONEL') || r.includes('MAYOR')) && !r.includes('SARGENTO') && !r.includes('GENERAL'))) {
    return 'OFICIAL SUPERIOR';
  }
  // 3. Subalternos
  if (['CT', 'TE', 'ST'].includes(r) || ((r.includes('CAPITAN') || r.includes('CAPITÁN') || r.includes('TENIENTE') || r.includes('SUBTENIENTE')) && !r.includes('CORONEL') && !r.includes('GENERAL'))) {
    return 'OFICIAL SUBALTERNO';
  }
  // 4. Suboficiales
  if (['SMCC', 'SMC', 'SM', 'SP', 'SV', 'SS', 'CP', 'CS', 'C3'].includes(r) || r.includes('SARGENTO') || r.includes('CABO')) {
    return 'SUBOFICIAL';
  }
  // 5. Soldados
  return 'SOLDADO';
}

export function getRankCategory(rank?: string): RankCategory {
  const sub = getRankSubcategory(rank);
  if (sub === 'OFICIAL GENERAL' || sub === 'OFICIAL SUPERIOR' || sub === 'OFICIAL SUBALTERNO') {
    return 'OFICIAL';
  }
  if (sub === 'SUBOFICIAL') {
    return 'SUBOFICIAL';
  }
  return 'SOLDADO';
}

export function getRankBadgeClasses(rankStr?: string): string {
  const sub = getRankSubcategory(rankStr);
  switch (sub) {
    case 'OFICIAL GENERAL':
      return 'bg-amber-950/80 text-amber-300 border-amber-500/50';
    case 'OFICIAL SUPERIOR':
      return 'bg-slate-800 text-slate-200 border-slate-600/50';
    case 'OFICIAL SUBALTERNO':
      return 'bg-cyan-950/80 text-cyan-300 border-cyan-500/50';
    case 'SUBOFICIAL':
      return 'bg-emerald-950/80 text-emerald-300 border-emerald-500/50';
    case 'SOLDADO':
    default:
      return 'bg-blue-950/80 text-blue-300 border-blue-500/50';
  }
}
