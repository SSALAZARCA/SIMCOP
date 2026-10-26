// ============================================================================
// ESPECIFICACIÓN TÉCNICA SIGEP (SISTEMA DE GESTIÓN DE PERSONAL MILITAR SINCRONIZADO)
// Integración con SIMCOP (Dirección de Personal S1/G1 - Estado Mayor del Ejército)
// ============================================================================

export type SigepSyncStatus = 'ONLINE' | 'OFFLINE_RESILIENT' | 'SYNCING' | 'ERROR';

export type RotationStatus = 
  | 'VIGENTE' 
  | 'PRE_ELEGIBLE_21M' 
  | 'ELEGIBLE_ROTACION_24M' 
  | 'ELEGIBLE_ROTACION_36M' 
  | 'PRORROGA_ACTIVA';

export type RetentionVerdict = 
  | 'LIBRE_ROTACION' 
  | 'RETENER_TOE_CRITICO' 
  | 'PROGRAMADO_FIN_SITUACION' 
  | 'RETENER_MEMORIA_AAR';

export interface SigepSoldierItem {
  id: string;
  fullName: string;
  rank: string;
  mosCode: string; // Military Occupational Specialty (Arma / Especialidad)
  monthsInTheater: number; // Tiempo de permanencia en la unidad/teatro
  rotationStatus: RotationStatus;
  retentionVerdict: RetentionVerdict;
  hasActiveProrroga: boolean;
  healthAptitude: 'APTO_COMBATE' | 'RESTRICCION_MEDICA' | 'EVACUADO';
}

export interface PillarA_ToeBalance {
  status: 'OPTIMO' | 'ALERTA' | 'CRITICO';
  actualSoldiers: number;
  authorizedToe: number;
  coveragePct: number;
  threshold80Met: boolean;
  criticalMosDeficit: string[];
}

export interface PillarB_CombatStatus {
  inCombat: boolean;
  activeOpord: string | null;
  scheduledPostCombat: boolean;
  executionTiming: 'INMEDIATO' | 'AL_TERMINO_DE_LA_SITUACION';
  verdictMessage: string;
}

export interface PillarC_AarMemory {
  tacticalExperienceScore: number; // 0 a 100
  veteranSpecialistsCount: number;
  memoryRiskLevel: 'BAJO' | 'MEDIO' | 'ALTO';
  recommendation: string;
}

export interface SigepUnitPersonnelSummary {
  unitId: string;
  unitName: string;
  connectionMode: SigepSyncStatus;
  lastSyncTimestamp: string;
  totalActual: number;
  totalAuthorized: number;
  readinessPercentage: number;
  
  // Los 3 Pilares Doctrinales de Retención (Algoritmo SIMCOP-SIGEP)
  pillarA: PillarA_ToeBalance;
  pillarB: PillarB_CombatStatus;
  pillarC: PillarC_AarMemory;

  // Alertas de rotación
  rotationAlerts: {
    soldierId: string;
    fullName: string;
    rank: string;
    mosCode: string;
    months: number;
    status: RotationStatus;
    actionRequired: string;
  }[];

  prorrogasEnTramiteCount: number;
}
