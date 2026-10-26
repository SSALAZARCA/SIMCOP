// ============================================================================
// SISTEMA INTEGRADO DE LOGÍSTICA MILITAR Y ALMACENES (SILOG)
// Dirección de Logística (S-4 / G-4 / JELOG) - Ejército Nacional de Colombia
// ============================================================================

export type WarehouseType = 'BASPC_CENTRAL' | 'BATALLON_DEPOSITO' | 'BASE_PATRULLA';

export interface MilitaryWarehouse {
  id: string;
  name: string;
  type: WarehouseType;
  unitId: string;
  unitName: string;
  department: string;
  municipality: string;
  location: { lat: number; lon: number };
  commanderInCharge: string;
  storekeeperName: string;
  securityLevel: 'ALTA_SEGURIDAD' | 'POLVORIN_BLINDADO' | 'CAMPAMENTO_AVANZADO';
  capacityStatus: 'DISPONIBLE' | 'OPTIMO' | 'CRITICO';
}

// -------------------------------------------------------------
// CLASE I: ALIMENTACIÓN Y SUBSISTENCIAS (Raciones y Agua)
// -------------------------------------------------------------
export interface RationBatchItem {
  id: string;
  warehouseId: string;
  rationType: 'RACION_CAMPANA_MRE' | 'VIVERES_SECOS' | 'AGUA_POTABLE' | 'PASTILLAS_PURIFICADORAS';
  menuNumber: string; // Ej. "Menú 04: Carne con Arroz y Vegetales"
  lotNumber: string;
  expirationDate: string; // ISO date
  quantityOnHand: number;
  caloriesPerUnit: number;
  daysOfAutonomyEquivalent: number;
}

// -------------------------------------------------------------
// CLASE II: INTENDENCIA Y PROTECCIÓN BALÍSTICA
// -------------------------------------------------------------
export interface BallisticArmorItem {
  id: string;
  warehouseId: string;
  serialNumber: string;
  armorType: 'CHALECO_BALISTICO_IV' | 'CHALECO_PORTAPLACAS_IIIA' | 'CASCO_KEVLAR_MICH';
  size: 'S' | 'M' | 'L' | 'XL';
  frontPlateSerial?: string;
  rearPlateSerial?: string;
  manufacturingDate: string;
  expirationDate: string; // Caducidad balística (5 a 7 años)
  status: 'OPERATIVO' | 'ASIGNADO' | 'EXPIRADO_REEMPLAZO' | 'DETERIORADO';
  assignedSoldierId?: string;
}

// -------------------------------------------------------------
// CLASE V: ARMAMENTO Y MUNICIONES
// -------------------------------------------------------------
export interface WeaponItem {
  id: string;
  warehouseId: string;
  serialNumber: string;
  model: 'GALIL_ACE_23_556' | 'GALIL_SAR_556' | 'AMETRALLADORA_M60E4_762' | 'LANZAGRANADAS_MGL_40MM' | 'MORTERO_COMMANDO_60MM' | 'PISTOLA_CORDOBA_9MM';
  caliber: '5.56x45mm' | '7.62x51mm' | '40mm' | '60mm' | '9x19mm';
  status: 'OPERATIVO' | 'ASIGNADO' | 'EN_TALLER_BASPC' | 'BAJA_TECNICA';
  roundsFiredEstimate: number;
  lastMaintenanceDate: string;
  assignedSoldierId?: string;
}

export interface AmmunitionLotItem {
  id: string;
  warehouseId: string;
  caliber: '5.56x45mm' | '7.62x51mm' | '40mm_HE' | '60mm_MORTERO_HE' | '9x19mm' | 'GRANADA_MANO_IM26';
  lotNumber: string;
  quantityRounds: number;
  packagingType: 'CANANA_METALICA' | 'CAJA_MADERA' | 'PROVEEDORES_DOTACION';
  manufacturingYear: number;
  securityClassification: 'DOTACION_COMBATE' | 'RESERVA_ESTRATEGICA' | 'INSTRUCCION';
}

// -------------------------------------------------------------
// COMUNICACIONES TÁCTICAS (S-6 / CLASE VII)
// -------------------------------------------------------------
export interface CommEquipmentItem {
  id: string;
  warehouseId: string;
  serialNumber: string;
  model: 'HARRIS_FALCON_III_PRC152' | 'HARRIS_MANPACK_PRC117G' | 'MOTOROLA_APX8000' | 'IRIDIUM_EXTREME_SATELITAL' | 'REPETIDORA_TACTICA_VHF';
  frequencyBand: 'VHF_UHF_SATCOM' | 'HF_TACTICO' | 'SATELITAL_ENCRIPTADO';
  status: 'OPERATIVO' | 'ASIGNADO' | 'EN_REPARACION_S6' | 'CALIBRACION';
  batteryType: 'BB_2590_LITIO' | 'LI_ION_RECARGABLE' | 'PANEL_SOLAR_CAMPANA';
  assignedSoldierId?: string;
  cryptoKeyLoaded: boolean;
}

// -------------------------------------------------------------
// MATERIAL ESPECIAL Y OPTOELECTRÓNICA (CLASE VII)
// -------------------------------------------------------------
export interface SpecialOptronicsItem {
  id: string;
  warehouseId: string;
  serialNumber: string;
  deviceType: 'VISOR_NOCTURNO_PVS14' | 'MIRA_TERMICA_PAS13' | 'DRON_TACTICO_MAVIC3T' | 'DETECTOR_METALES_VALLON_EOD';
  generation: 'GEN_3_FOM_1800' | 'TERMICO_640x512' | 'INDUCCION_PULSOS';
  status: 'OPERATIVO' | 'ASIGNADO' | 'EN_MANTENIMIENTO' | 'BAJA_TECNICA';
  batteryLevelPct: number;
  assignedSoldierId?: string;
}

// -------------------------------------------------------------
// CLASE VIII: SANIDAD Y TRAUMA EN COMBATE
// -------------------------------------------------------------
export interface CombatSanityItem {
  id: string;
  warehouseId: string;
  kitType: 'IFAK_INDIVIDUAL_TRAUMA' | 'MOCHILA_ENFERMERO_COMBATE' | 'CAMILLA_TACTICA_SKEDCO';
  serialOrLotNumber: string;
  tourniquetCatLot: string;
  tourniquetExpiration: string;
  hemostaticGauzeUnits: number;
  status: 'OPERATIVO' | 'ASIGNADO' | 'VENCIMIENTO_PROXIMO';
  assignedSoldierId?: string;
}

// -------------------------------------------------------------
// KÁRDEX / ASIGNACIÓN INDIVIDUAL POR HOMBRE (Cruce con SIGEP)
// -------------------------------------------------------------
export interface SoldierLogisticsProfile {
  soldierId: string; // Cédula Militar sincronizada de SIGEP
  fullName: string;
  rank: string;
  mosCode: string;
  unitId: string;
  unitName: string;
  assignedWeapon?: WeaponItem;
  magazinesCount: number;
  ammunitionRounds: number;
  assignedArmor?: BallisticArmorItem;
  helmetAssigned?: BallisticArmorItem;
  assignedCommRadio?: CommEquipmentItem;
  assignedNightVision?: SpecialOptronicsItem;
  assignedIfak?: CombatSanityItem;
  rationsOnHand: number;
  waterPurificationTablets: number;
  assignmentDate: string;
  pazYSalvoStatus: 'PAZ_Y_SALVO' | 'PENDIENTE_DEVOLUCION_MATERIAL';
}

// -------------------------------------------------------------
// CAPACIDAD REAL DE FUEGO Y PODER DE COMBATE (Cruce con SIMCOP)
// -------------------------------------------------------------
export interface PlatoonCombatCapability {
  platoonId: string;
  platoonName: string;
  totalSoldiers: number;
  operationalWeapons: {
    rifles556: number;
    machineGuns762: number;
    grenadeLaunchers40mm: number;
    mortars60mm: number;
  };
  totalRounds556: number;
  totalRounds762: number;
  totalMortarBombs60mm: number;
  nightVisionAvailabilityPct: number; // % soldados con PVS-14
  commCoverageScore: number; // 0 - 100
  rationsAutonomyDays: number; // Días de autonomía Clase I
  sustainedFireMinutes: number; // Minutos de fuego continuo a cadencia doctrinal
  overallFirepowerIndex: number; // 0 - 100%
  daytimeReadinessPct: number;
  nightReadinessPct: number;
  tacticalAdvisoryForSimcop: string;
}

// -------------------------------------------------------------
// CONTROL DE ACCESO Y AUTENTICACIÓN LOGÍSTICA (SILOG RBAC)
// -------------------------------------------------------------
export type SilogUserRole = 
  | 'OFICIAL_S4' 
  | 'COMANDANTE_BASPC' 
  | 'ALMACENISTA_CLASE_V' 
  | 'ALMACENISTA_CLASE_II_I' 
  | 'OFICIAL_COMUNICACIONES_S6' 
  | 'OFICIAL_SANIDAD_S8';

export interface SilogUser {
  id: string;
  username: string;
  fullName: string;
  rank: string;
  role: SilogUserRole;
  roleTitle: string;
  unit: string;
  unitName: string;
  assignedUnitId: string; // ID exacto en la Estructura de Fuerza de SIMCOP
  assignedEchelon: 'DIVISION' | 'BRIGADA' | 'BATALLON' | 'COMPANIA' | 'PELOTON';
  warehouseId?: string; // Almacén primario asignado
  allowedWarehouseIds: string[]; // Almacenes autorizados según posición en la Estructura de Fuerza
  securityClearance: 'SECRETO' | 'ULTRASECRETO' | 'RESERVADO';
  militaryId: string;
}
