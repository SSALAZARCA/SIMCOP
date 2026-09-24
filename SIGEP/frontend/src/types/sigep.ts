/**
 * SIGEP Tactical TypeScript Definitions
 * 
 * Strict type definitions for Military Units, M2M Interoperability,
 * Tactical Clocks, Dossier & Transfer Workflows.
 * 
 * COMPLIANCE NOTE:
 * Uses exclusively string union types and interfaces (NO enums)
 * to comply with "erasableSyntaxOnly": true in tsconfig.app.json.
 */

// ---------------------------------------------------------------------------
// 1. Military Unit & Hierarchy
// ---------------------------------------------------------------------------

export interface UnitCommander {
  name?: string;
  rank?: string;
}

export interface UnitPersonnelBreakdown {
  officers?: number;
  ncos?: number;
  professionalSoldiers?: number;
  slRegulars?: number;
}

export interface UnitCoordinates {
  lat?: number;
  lon?: number;
}

export interface MilitaryUnit {
  id: string;
  name: string;
  type?: string;
  code?: string;
  parentId?: string;
  commandingOfficer?: string;
  commander?: UnitCommander;
  location?: string | UnitCoordinates;
  status?: 'OPERATIONAL' | 'STANDBY' | 'ENGAGED' | 'RESTRICTED' | string;
  authorizedStrength?: number;
  currentStrength?: number;
  personnelBreakdown?: UnitPersonnelBreakdown;
  [key: string]: unknown;
}

// ---------------------------------------------------------------------------
// 2. M2M Connection Status & Unit Context
// ---------------------------------------------------------------------------

export type M2MConnectionStatus = 'CONNECTED' | 'DISCONNECTED' | 'CHECKING';

export interface UnitContextType {
  units: MilitaryUnit[];
  allUnits: MilitaryUnit[];
  accessibleUnits: MilitaryUnit[];
  selectedUnitId: string;
  selectedUnit: MilitaryUnit | null;
  setSelectedUnitId: (unitId: string) => void;
  m2mStatus: M2MConnectionStatus;
  lastSyncTimestamp: Date | null;
  isLoading: boolean;
  error: string | null;
  refreshUnits: () => Promise<void>;
}

// ---------------------------------------------------------------------------
// 3. User & Authentication
// ---------------------------------------------------------------------------

export interface UserProfile {
  username: string;
  role: string;
  token: string;
  simcopToken?: string;
  assignedUnitId?: string;
  unitId?: string;
}

// ---------------------------------------------------------------------------
// 4. Navigation & Layout
// ---------------------------------------------------------------------------

export type NavigationTab =
  | 'analisis'
  | 'recomendaciones'
  | 'informes'
  | 'consulta-personal'
  | 'carga-masiva'
  | 'traslados'
  | 'oficiales'
  | 'suboficiales'
  | 'soldados'
  | 'configuracion';

export type SigepTab = NavigationTab;

// ---------------------------------------------------------------------------
// 5. Tactical Clocks
// ---------------------------------------------------------------------------

export interface TacticalClocks {
  localTime: string;      // HH:mm:ss (COT / UTC-5)
  zuluTime: string;       // HH:mm:ssZ (UTC)
  localFormatted: string; // L: HH:mm:ss COT
  zuluFormatted: string;  // Z: HH:mm:ss UTC
  date: Date;
}

// ---------------------------------------------------------------------------
// 6. Personnel, Transfers & TOE
// ---------------------------------------------------------------------------

export type HealthStatus = 'APTO' | 'NO_APTO' | 'EXCUSADO' | 'LICENCIA' | string;

export interface Soldier {
  id?: string | number;
  cedula?: string;
  name?: string;
  rank?: string;
  branch?: string;
  mosCode?: string;
  unitId?: string;
  unitName?: string;
  healthStatus?: HealthStatus;
  physicalAptitude?: string;
  psychologicalAptitude?: string;
  cursosCombate?: string;
  timeInPositionMonths?: number;
  [key: string]: unknown;
}

export type TransferStatus =
  | 'PENDING_APPROVAL'
  | 'PENDING_REVIEW'
  | 'APPROVED'
  | 'REJECTED'
  | 'CANCELLED';

export type TransferCategory = 'OFICIAL' | 'SUBOFICIAL' | 'SOLDADO' | 'TODOS';

export interface Transfer {
  id?: string | number;
  soldierId?: string | number;
  soldierName?: string;
  soldierRank?: string;
  originUnitId?: string;
  originUnitName?: string;
  targetUnitId?: string;
  targetUnitName?: string;
  category?: TransferCategory;
  status?: TransferStatus;
  requestDate?: string;
  reviewDate?: string;
  approvalDate?: string;
  reason?: string;
  g1Observations?: string;
  m2mSyncStatus?: 'PENDING' | 'SYNCED' | 'FAILED';
  [key: string]: unknown;
}

export interface TransferWebhookPayload {
  payload: {
    soldier_id: string;
    target_unit_id: string;
    name?: string;
    rank?: string;
    mos_code?: string;
  };
}

export interface ToeBalanceDTO {
  unitId?: string;
  mosCode?: string;
  mosName?: string;
  required?: number;
  actual?: number;
  deficit?: number;
  coveragePercentage?: number;
}

export interface AvailabilityDTO {
  aptos?: number;
  noAptos?: number;
  excusados?: number;
  licencias?: number;
  total?: number;
}

export interface CriticalRotationDTO {
  soldierId?: string | number;
  name?: string;
  rank?: string;
  mosCode?: string;
  timeInPositionMonths?: number;
  unitId?: string;
  alertLevel?: 'CRITICAL' | 'WARNING' | 'NORMAL';
}
