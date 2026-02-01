import type { LeafletMouseEvent } from 'leaflet';
import type { FC } from 'react';

export enum UnitType {
  DIVISION = 'DIVISION',
  BRIGADE = 'BRIGADE',
  BATTALION = 'BATTALION',
  COMPANY = 'COMPANY',
  PLATOON = 'PLATOON',
  TEAM = 'TEAM',
  SQUAD = 'SQUAD',
  COMMAND_POST = 'COMMAND_POST',
  UAV_ATTACK_TEAM = 'UAV_ATTACK_TEAM',
  UAV_INTEL_TEAM = 'UAV_INTEL_TEAM',
}

export enum UnitStatus {
  OPERATIONAL = 'OPERATIONAL',
  MOVING = 'MOVING',
  STATIC = 'STATIC',
  ENGAGED = 'ENGAGED',
  LOW_SUPPLIES = 'LOW_SUPPLIES',
  NO_COMMUNICATION = 'NO_COMMUNICATION',
  MAINTENANCE = 'MAINTENANCE',
  AAR_PENDING = 'AAR_PENDING',
  ON_LEAVE_RETRAINING = 'ON_LEAVE_RETRAINING',
}

export interface GeoLocation {
  lat: number;
  lon: number;
}

export interface RoutePoint extends GeoLocation {
  timestamp: number;
}

export interface PersonnelBreakdown {
  officers: number;
  ncos: number; // Non-Commissioned Officers (Suboficiales)
  professionalSoldiers: number;
  slRegulars: number; // Soldados SL18/SL12 (Regulares)
}

export interface CommanderInfo {
  rank: string; // e.g., "MY.", "CP.", "SGTO."
  name: string;
}

export enum UnitSituationINSITOP {
  ORGANICA = 'ORGANICA',
  AGREGADA = 'AGRE',
  SEGREGADA = 'SGRE',
}

export interface UAVAsset {
  id: string;
  type: 'ATTACK' | 'INTEL' | 'SPECIALIZED';
  batteryStatus: number; // 0-100
  currentPayload: number; // For attack drones
  streamUrl?: string; // For specialized intel drones
  location?: GeoLocation; // If deployed
  operationalRadius: number; // In km
}

export interface UAVTelemetryDTO {
  uavId: string;
  batteryLevel: number;
  location: GeoLocation;
  status: string;
  streamUrl?: string;
}

export interface MilitaryUnit {
  id: string;
  name: string;
  type: UnitType;
  commander: CommanderInfo;
  personnelBreakdown: PersonnelBreakdown;
  equipment: string[];
  capabilities: string[];
  location: GeoLocation;
  status: UnitStatus;
  lastMovementTimestamp: number;
  lastCommunicationTimestamp: number;
  lastHourlyReportTimestamp?: number;
  routeHistory: RoutePoint[];
  destination?: GeoLocation;
  eta?: number; // minutes
  fuelLevel?: number; // percentage
  ammoLevel?: number; // percentage
  daysOfSupply?: number;
  lastResupplyDate?: number;
  combatEndTimestamp?: number;
  combatEndLocation?: GeoLocation;
  leaveStartDate?: number;
  leaveDurationDays?: number;
  retrainingStartDate?: number;
  retrainingFocus?: string;
  retrainingDurationDays?: number;
  currentMission?: string; // e.g., "OPOF", "OPSDH"
  unitSituationType: UnitSituationINSITOP;
  parentId: string | null;
  // SIOCH Fields
  publicOrderIndex?: number;
  criticalityLevel?: number;
  personnelList?: Soldier[];
  uavAssets?: UAVAsset[];
  toe?: TOEInformation;
}

export interface Soldier {
  id: string;
  fullName: string;
  rank: string;
  moceCode: string;
  status: string;
  healthStatus: string;
  legalStatus: string;
  timeInPosition?: number;
  estimatedRetirementDate?: string;
  unitId?: string;
}

export enum IntelligenceSourceType {
  HUMINT = 'HUMINT',
  SIGINT = 'SIGINT',
  IMINT = 'IMINT',
  OSINT = 'OSINT',
  GEOINT = 'GEOINT',
}

export enum IntelligenceReliability {
  A = 'A',
  B = 'B',
  C = 'C',
  D = 'D',
  E = 'E',
  F = 'F',
}

export enum IntelligenceCredibility {
  ONE = 'ONE',
  TWO = 'TWO',
  THREE = 'THREE',
  FOUR = 'FOUR',
  FIVE = 'FIVE',
  SIX = 'SIX',
}

export interface IntelligenceReport {
  id: string;
  title: string;
  type: IntelligenceSourceType;
  sourceDetails: string;
  reliability: IntelligenceReliability;
  credibility: IntelligenceCredibility;
  keywords: string[];
  location: GeoLocation;
  eventTimestamp: number;
  reportTimestamp: number;
  details: string;
  attachments?: { name: string; type: string; url?: string }[];
}

export enum AlertType {
  NO_MOVEMENT = 'Sin Movimiento',
  DANGEROUS_ROUTINE = 'Rutina Peligrosa',
  HIGH_PRIORITY_INTEL = 'Inteligencia Alta Prioridad',
  LOW_LOGISTICS = 'Logística Baja',
  UNIT_IN_FORBIDDEN_ZONE = 'Unidad en Zona Prohibida',
  COMMUNICATION_LOST = 'Pérdida Comunicación General',
  HOURLY_REPORT_MISSED = 'Reporte Horario Omitido',
  UNIT_ENGAGED = 'Unidad en Combate',
  INFO = 'Información',
  Q5_GENERATED = 'Reporte Q5 Generado',
  Q5_GENERATION_FAILED = 'Fallo Generación Reporte Q5',
  Q5_TELEGRAM_SENT = 'Reporte Q5 Enviado a Telegram',
  Q5_TELEGRAM_FAILED = 'Fallo Envío Q5 a Telegram',
  UNIT_TO_RETRAINING = 'Unidad a Permiso/Reentrenamiento',
  UNIT_RETURNED_FROM_RETRAINING = 'Unidad Reintegrada de Permiso/Reentrenamiento',
  UNIT_LEAVE_STARTED = 'Permiso Iniciado para Unidad',
  UNIT_RETRAINING_STARTED = 'Reentrenamiento Iniciado para Unidad',
  SPOT_REPORT_RECEIVED = 'Reporte SPOT Recibido',
  ORDOP_CREATED = 'Orden de Operaciones Creada',
  ORDOP_PUBLISHED = 'Orden de Operaciones Publicada',
  ORDOP_UPDATED = 'Orden de Operaciones Actualizada',
  ORDOP_ACKNOWLEDGED = 'Orden de Operaciones Recibida',
  AMMO_REPORT_PENDING = 'Reporte de Munición Pendiente Aprobación',
  AMMO_REPORT_APPROVED = 'Reporte de Munición Aprobado',
  AMMO_REPORT_REJECTED = 'Reporte de Munición Rechazado',
  USER_LOGIN_SUCCESS = 'Inicio de Sesión Exitoso',
  USER_LOGIN_FAILED = 'Inicio de Sesión Fallido',
  USER_LOGOUT = 'Cierre de Sesión',
  USER_CREATED = 'Usuario Creado',
  USER_UPDATED = 'Usuario Actualizado',
  USER_DELETED = 'Usuario Eliminado',
  USER_ACTION_FAILED = 'Acción de Usuario Fallida',
  ORGANIZATION_UNIT_CREATED = 'Unidad Organizacional Creada',
  ORGANIZATION_UNIT_UPDATED = 'Unidad Organizacional Actualizada',
  ORGANIZATION_UNIT_DELETED = 'Unidad Organizacional Eliminada',
  COMMANDER_ASSIGNED = 'Comandante Asignado a Unidad Org.',
  FIRE_MISSION_REQUESTED = 'Solicitud de Misión de Fuego Recibida',
  FIRE_MISSION_START = 'Misión de Fuego Iniciada',
  FIRE_MISSION_COMPLETE = 'Misión de Fuego Completada',
  ARTILLERY_PIECE_CREATED = 'Pieza de Artillería Creada',
  FORWARD_OBSERVER_CREATED = 'Observador Adelantado Creado',
  PLATOON_NOVELTY_PENDING = 'Novedad de Pelotón Pendiente Aprobación',
  PLATOON_NOVELTY_REJECTED = 'Novedad de Pelotón Rechazada',
  LOGISTICS_REQUEST_PENDING = 'Requerimiento Logístico Pendiente',
  LOGISTICS_REQUEST_FULFILLED = 'Requerimiento Logístico Satisfecho',
}

export enum AlertSeverity {
  CRITICAL = 'Crítica',
  HIGH = 'Alta',
  MEDIUM = 'Media',
  LOW = 'Baja',
  INFO = 'Informativa',
}

export interface Alert {
  id: string;
  type: AlertType;
  unitId?: string;
  intelId?: string;
  q5Id?: string;
  ordopId?: string;
  userId?: string;
  message: string;
  timestamp: number;
  severity: AlertSeverity;
  acknowledged: boolean;
  location?: GeoLocation;
  data?: any; // To hold novelty payload or ammo report payload
}

export enum ViewType {
  DASHBOARD = 'Panel Principal',
  UNITS = 'Unidades',
  INTEL = 'Inteligencia',
  ALERTS = 'Alertas',
  ANALYSIS = 'Análisis',
  COMMUNICATIONS = 'Comunicaciones',
  ARTILLERY_OBSERVATION = 'Artillería y Observación',
  UAV_MANAGEMENT = 'Gestión UAV / Aéreo',
  HISTORICAL = 'Histórico AAR',
  Q5_REPORT = 'Reportes Q5',
  RETRAINING_AREA = 'Permiso/Reentrenamiento',
  UNIT_HISTORY = 'Histórico Eventos', // Changed from Histórico Unidades for clarity
  INSITOP = 'INSITOP',
  SPOT = 'SPOT Seguimiento',
  ORDOP = 'Órdenes de Operaciones',
  ORGANIZATION_STRUCTURE = 'Estructura de Fuerza',
  LOGISTICS = 'Logística',
  MAP = 'Mapa',
  PERSONNEL = 'Personal',  // Módulo de gestión de personal y especialidades
  BMA = 'Algoritmo de Gestión de Batalla (BMA)',
  USER_MANAGEMENT = 'Gestión de Usuarios',
  SETTINGS = 'Configuración',
}

export enum PlatoonViewType {
  DASHBOARD = 'Panel de Pelotón',
  ORDOP = 'Órdenes de Operaciones',
  LOGISTICS = 'Logística y Suministros',
  ARTILLERY = 'Apoyo de Fuego',
  NOVELTIES = 'Registro de Novedades',
}

export enum CompanyViewType {
  DASHBOARD = 'Panel de Compañía',
  PLATOONS = 'Pelotones Subordinados',
  APPROVALS = 'Aprobaciones Pendientes',
  ORDOP = 'Órdenes de Operaciones',
  HISTORY = 'Histórico de Compañía',
}

export enum MapEntityType {
  UNIT = 'Unidad',
  INTEL = 'Intel',
  AAR = 'AAR',
  ORDOP = 'ORDOP',
  USER = 'Usuario',
  ORGANIZATION_UNIT = 'Unidad Organizacional',
  ARTILLERY = 'Pieza de Artillería',
  FORWARD_OBSERVER = 'Observador Adelantado',
  FIRE_MISSION_TARGET = 'Blanco de Misión de Fuego',
}

export interface SelectedEntity {
  type: MapEntityType;
  id: string;
  data?: any;
}

export interface GroundingSource {
  uri: string;
  title?: string;
}
export interface GeminiAnalysisResult {
  text: string;
  sources?: GroundingSource[];
}

export enum MoraleLevel {
  HIGH = 'Alta',
  MEDIUM = 'Media',
  LOW = 'Baja',
  VERY_LOW = 'Muy Baja',
}

export interface AfterActionReport {
  id: string;
  unitId: string;
  unitName: string;
  combatEndTimestamp: number;
  reportTimestamp: number;
  location: GeoLocation;
  casualtiesKia: number;
  casualtiesWia: number;
  casualtiesMia: number;
  equipmentLosses: string;
  ammunitionExpendedPercent: number;
  morale: MoraleLevel;
  summary: string;
  enemyCasualtiesKia?: number;
  enemyCasualtiesWia?: number;
  enemyEquipmentDestroyedOrCaptured?: string;
  objectivesAchieved?: string;
  positiveObservations?: string;
  originalCombatAlertId?: string;
}

export interface AARCombatEvent {
  timestamp: number;
  type: 'Inicio de Combate' | 'Fin de Combate' | 'Evento de Historial';
  description: string;
}

export interface NewUnitData {
  name: string;
  type: UnitType;
  commander: CommanderInfo;
  personnelBreakdown: PersonnelBreakdown;
  location: GeoLocation;
  equipment: string[];
  capabilities: string[];
  fuelLevel?: number;
  ammoLevel: number;
  daysOfSupply: number;
  parentId: string;
  currentMission: string;
  unitSituationType: UnitSituationINSITOP;
}

// ============================================
// TOE (Table of Organization and Equipment)
// ============================================

// Especialidad militar (MOS del Ejército Colombiano)
export interface MilitarySpecialty {
  code: string;          // Código MOS (ej: "11B", "31B")
  name: string;          // Nombre de la especialidad
  quantity: number;      // Cantidad requerida
}

// Catálogo de especialidades (gestionable desde módulo Personal)
export interface SpecialtyCatalogEntry {
  id: string;
  code: string;          // Código MOS único
  name: string;          // Nombre de la especialidad
  category: 'officers' | 'ncos' | 'professionalSoldiers' | 'regularSoldiers' | 'civilians';
  description?: string;  // Descripción opcional
}

// Personal autorizado por categoría (lo que la unidad DEBERÍA tener)
export interface AuthorizedPersonnel {
  officers: number;
  ncos: number;
  professionalSoldiers: number;
  regularSoldiers: number;
  civilians: number;
}

// Especialidades por categoría
export interface PersonnelSpecialties {
  officers: MilitarySpecialty[];
  ncos: MilitarySpecialty[];
  professionalSoldiers: MilitarySpecialty[];
  regularSoldiers: MilitarySpecialty[];
  civilians: MilitarySpecialty[];
}

// TOE completo (OBLIGATORIO para unidades organizacionales)
export interface TOEInformation {
  authorizedPersonnel: AuthorizedPersonnel;
  specialties: PersonnelSpecialties;
}

export interface NewHierarchyUnitData {
  name: string;
  type: UnitType;
  parentId: string | null;
  toe: TOEInformation;
  currentMission: string;
  unitSituationType: UnitSituationINSITOP;
}

export interface UpdateHierarchyUnitData {
  name?: string;
  type?: UnitType;
  toe?: TOEInformation;
  currentMission?: string;
  unitSituationType?: UnitSituationINSITOP;
}


export interface Q5Report {
  id: string;
  aarId: string;
  unitId: string;
  unitName: string;
  reportTimestamp: number;
  que: string;
  quien: string;
  cuando: string;
  donde: string;
  hechos: string;
  accionesSubsiguientes: string;
}

export interface Q5ContentPayload {
  que?: string;
  quien?: string;
  cuando?: string;
  donde?: string;
  hechos?: string | { [key: string]: any };
  accionesSubsiguientes?: string;
}

export type UnitHistoryEventType =
  | "Unidad Creada"
  | "Cambio de Estado"
  | "Actualización Logística"
  | "Atributos Actualizados"
  | "Punto de Ruta Manual"
  | "Reporte Horario Marcado"
  | "Entró en Combate"
  | "Cese de Combate"
  | "AAR Registrado"
  | "Reporte Q5 Generado"
  | "Enviada a Permiso/Reentrenamiento"
  | "Reintegrada de Permiso/Reentrenamiento"
  | "Inicio de Permiso"
  | "Inicio de Reentrenamiento"
  | "Movimiento Simulado"
  | "Reporte SPOT Recibido"
  | "Información"
  | "Novedad de Pelotón"
  | "Novedad de Pelotón Aprobada"
  | "Novedad de Pelotón Aprobada (Req. Log.)"
  | "Novedad de Pelotón Rechazada"
  | "Cambio de Misión"
  | "Cambio de Situación de Unidad"
  | "Reporte INSITOP Generado"
  | "Orden de Operaciones Creada"
  | "Orden de Operaciones Publicada"
  | "Orden de Operaciones Actualizada"
  | "Orden de Operaciones Recibida"
  | "Reporte de Munición Enviado"
  | "Reporte de Munición Aprobado"
  | "Reporte de Munición Rechazado"
  | "Usuario Creado"
  | "Usuario Actualizado"
  | "Usuario Eliminado"
  | "Intento de Inicio de Sesión Fallido"
  | "Inicio de Sesión Exitoso"
  | "Cierre de Sesión"
  | "Unidad Organizacional Creada"
  | "Unidad Organizacional Actualizada"
  | "Unidad Organizacional Eliminada"
  | "Asignación de Comandante"
  | "Pieza de Artillería Creada"
  | "Observador Adelantado Creado"
  | "Solicitud de Misión de Fuego Recibida"
  | "Misión de Fuego Iniciada"
  | "Misión de Fuego Completada"
  | "Misión de Fuego Rechazada"
  | "Requerimiento Logístico Creado"
  | "Requerimiento Logístico Satisfecho";


export interface UnitHistoryEvent {
  id: string;
  unitId?: string;
  unitName?: string;
  userId?: string;
  username?: string;
  timestamp: number;
  eventType: UnitHistoryEventType;
  details: string;
  oldValue?: string;
  newValue?: string;
  relatedEntityId?: string;
  relatedEntityType?: MapEntityType | 'INSITOP' | 'ORDOP' | 'USER' | 'ORGANIZATION_UNIT' | 'ARTILLERY' | 'FORWARD_OBSERVER' | 'LOGISTICS_REQUEST';
  location?: GeoLocation;
}

export interface UnitIdentificationINSITOP {
  originalUnitId: string;
  originalUnitName: string;
  originalUnitType: UnitType;
  companyCode?: string;
  platoonCode?: string;
  sectionCode?: string;
  squadCode?: string;
  crewCode?: string;
}

export interface LocationDetailsINSITOP {
  latitudeDMS: string;
  longitudeDMS: string;
  siteName?: string;
  municipalityDANE: string;
  departmentDANE: string;
}

export interface PersonnelStrengthINSITOP {
  officers: number;
  NCOs: number;
  professionalSoldiers: number;
  regularSoldiers: number;
  peasantSoldiers: number;
  baccalaureateSoldiers: number;
}

export interface CommanderDetailsINSITOP {
  rankAbbreviation: string;
  fullName: string;
}

export interface VehiclesAndMotorcyclesINSITOP {
  vehicleCount?: number;
  vehicleTypes?: string;
  motorcycleCount?: number;
  motorcycleTypes?: string;
}


export interface UnitINSITOPDetail {
  unitIdentification: UnitIdentificationINSITOP;
  locationDetails: LocationDetailsINSITOP;
  personnelStrength: PersonnelStrengthINSITOP;
  unitSituation: UnitSituationINSITOP;
  commanderDetails: CommanderDetailsINSITOP;
  missionType: string;
  vehiclesAndMotorcycles?: VehiclesAndMotorcyclesINSITOP;
  exdeGroupInfo?: boolean;
  additionalRemarks?: string;
}

export interface INSITOPReport {
  id: string;
  reportTimestamp: number;
  effectiveReportDate: string;
  unitEntries: UnitINSITOPDetail[];
  generatedBy?: string;
}

export interface SpotReportPayload {
  unitId: string;
  location: GeoLocation;
  timestamp: number;
}

// --- ORDOP Specific Types ---
export enum OperationsOrderStatus {
  BORRADOR = 'Borrador',
  PUBLICADA = 'Publicada',
  ARCHIVADA = 'Archivada',
}

export enum OperationsOrderClassification {
  SECRETO = 'SECRETO',
  RESERVADO = 'RESERVADO',
  CONFIDENCIAL = 'CONFIDENCIAL',
  NO_CLASIFICADO = 'NO CLASIFICADO',
}

export interface OperationsOrder {
  id: string;
  title: string;
  status: OperationsOrderStatus;
  classification: OperationsOrderClassification;
  issuedTimestamp: number;
  effectiveTimestamp?: number; // This can remain optional
  issuingAuthority: string;
  recipientUserIds: string[];
  acknowledgements: { userId: string, timestamp: number }[];

  // I. SITUACIÓN
  situation_enemyForces: string;
  situation_friendlyForces: string;
  situation_aggregationsAndSegregations: string;
  situation_operationalEnvironment: string;
  situation_civilPopulation: string;

  // II. MISIÓN
  mission: string;

  // III. EJECUCIÓN
  execution_conceptOfOperations: string;
  execution_tasksManeuverUnits: string;
  execution_tasksCombatSupportUnits: string;
  execution_coordinationInstructions: string;

  // IV. ADMINISTRACIÓN Y LOGÍSTICA (Apoyo de Servicio en Combate)
  sustainment_supplies: string;
  sustainment_transportation: string;
  sustainment_medical: string;
  sustainment_personnel: string;
  sustainment_others: string;

  // V. COMANDO Y COMUNICACIONES (Mando y Transmisiones)
  commandAndSignal_command_commanderLocation: string;
  commandAndSignal_command_commandPosts: string;
  commandAndSignal_command_chainOfCommand: string;
  commandAndSignal_communications_frequenciesAndCallsigns: string;
  commandAndSignal_communications_radioProcedures: string;
  commandAndSignal_communications_pyrotechnicsAndSignals: string;
  commandAndSignal_communications_challengeAndResponse: string;
}

// For creation, status and issuedTimestamp are handled by the system
export interface NewOperationsOrderData extends Omit<OperationsOrder, 'id' | 'issuedTimestamp' | 'status' | 'recipientUserIds' | 'acknowledgements'> { }

// For updates, most fields should be updatable. Could be Partial<NewOperationsOrderData>
// or more explicitly, the same as NewOperationsOrderData if all are editable in draft.
export interface UpdateOperationsOrderData extends NewOperationsOrderData { }


// --- User Management Types ---
export enum UserRole {
  ADMINISTRATOR = 'ADMINISTRATOR',
  COMANDANTE_EJERCITO = 'COMANDANTE_EJERCITO',
  COMANDANTE_DIVISION = 'COMANDANTE_DIVISION',
  COMANDANTE_BRIGADA = 'COMANDANTE_BRIGADA',
  COMANDANTE_BATALLON = 'COMANDANTE_BATALLON',
  COMANDANTE_COMPANIA = 'COMANDANTE_COMPANIA',
  COMANDANTE_PELOTON = 'COMANDANTE_PELOTON',
  OFICIAL_INTELIGENCIA = 'OFICIAL_INTELIGENCIA',
  OFICIAL_LOGISTICA = 'OFICIAL_LOGISTICA',
  GESTOR_REPORTES = 'GESTOR_REPORTES',
  COMANDANTE_PIEZA_ARTILLERIA = 'COMANDANTE_PIEZA_ARTILLERIA',
  COMANDANTE_OBSERVADOR_ADELANTADO = 'COMANDANTE_OBSERVADOR_ADELANTADO',
  DIRECTOR_TIRO_155 = 'DIRECTOR_TIRO_155',
  DIRECTOR_TIRO_M101A1 = 'DIRECTOR_TIRO_M101A1',
  DIRECTOR_TIRO_LG1 = 'DIRECTOR_TIRO_LG1',
  DIRECTOR_TIRO_L119 = 'DIRECTOR_TIRO_L119',
  DIRECTOR_TIRO_M120 = 'DIRECTOR_TIRO_M120',
  DIRECTOR_TIRO_HY112 = 'DIRECTOR_TIRO_HY112',
  DIRECTOR_TIRO_MLRS = 'DIRECTOR_TIRO_MLRS',
}

export const UserRoleLabels: Record<UserRole, string> = {
  [UserRole.ADMINISTRATOR]: 'Administrador del Sistema',
  [UserRole.COMANDANTE_EJERCITO]: 'Comandante del Ejército',
  [UserRole.COMANDANTE_DIVISION]: 'Comandante de División',
  [UserRole.COMANDANTE_BRIGADA]: 'Comandante de Brigada',
  [UserRole.COMANDANTE_BATALLON]: 'Comandante de Batallón',
  [UserRole.COMANDANTE_COMPANIA]: 'Comandante de Compañía',
  [UserRole.COMANDANTE_PELOTON]: 'Comandante de Pelotón',
  [UserRole.OFICIAL_INTELIGENCIA]: 'Oficial de Inteligencia (B2/G2)',
  [UserRole.OFICIAL_LOGISTICA]: 'Oficial de Logística',
  [UserRole.GESTOR_REPORTES]: 'Gestor de Reportes y Novedades',
  [UserRole.COMANDANTE_PIEZA_ARTILLERIA]: 'Comandante de Pieza de Artillería',
  [UserRole.COMANDANTE_OBSERVADOR_ADELANTADO]: 'Comandante de Equipo de Observador Adelantado',
  [UserRole.DIRECTOR_TIRO_155]: 'Director de Tiro - 155mm',
  [UserRole.DIRECTOR_TIRO_M101A1]: 'Director de Tiro - M101A1',
  [UserRole.DIRECTOR_TIRO_LG1]: 'Director de Tiro - LG-1 Mk III',
  [UserRole.DIRECTOR_TIRO_L119]: 'Director de Tiro - L119',
  [UserRole.DIRECTOR_TIRO_M120]: 'Director de Tiro - M120',
  [UserRole.DIRECTOR_TIRO_HY112]: 'Director de Tiro - HY1-12',
  [UserRole.DIRECTOR_TIRO_MLRS]: 'Director de Tiro - MLRS',
};

export interface User {
  id: string;
  username: string;
  displayName: string;
  hashedPassword?: string;
  role: UserRole;
  permissions: ViewType[];
  assignedUnitId: string | null;
  telegramChatId?: string;
  token?: string;
}

export interface NewUserData {
  username: string;
  displayName: string;
  password?: string;
  role: UserRole;
  permissions: ViewType[];
  assignedUnitId?: string | null;
}

export interface UpdateUserData {
  displayName?: string;
  role?: UserRole;
  permissions?: ViewType[];
  assignedUnitId?: string | null;
}

export interface UserTelegramConfig {
  userId: string;
  telegramChatId: string;
}

// --- Artillery & Observer Types ---
export enum ArtilleryType {
  HOWITZER_155 = 'HOWITZER_155',
  MLRS = 'MLRS',
  HOWITZER_105 = 'HOWITZER_105',
  HOWITZER_105_LG1 = 'HOWITZER_105_LG1',
  HOWITZER_105_L119 = 'HOWITZER_105_L119',
  MORTAR_120_M120 = 'MORTAR_120_M120',
  MORTAR_120_HY112 = 'MORTAR_120_HY112',
}

export enum ArtilleryStatus {
  READY = 'READY',
  FIRING = 'FIRING',
  MOVING = 'MOVING',
  MAINTENANCE = 'MAINTENANCE',
  OUT_OF_AMMO = 'OUT_OF_AMMO',
}

export enum ForwardObserverStatus {
  OPERATIONAL = 'OPERATIONAL',
  OBSERVING = 'OBSERVING',
  MOVING = 'MOVING',
  NO_COMMS = 'NO_COMMS',
}

export type AmmoType = 'HE' | 'SMOKE' | 'ILLUM';
export interface AmmoStock {
  type: AmmoType;
  quantity: number;
}

export interface ArtilleryPiece {
  id: string;
  name: string;
  type: ArtilleryType;
  location: GeoLocation;
  status: ArtilleryStatus;
  ammunition: AmmoStock[];
  minRange: number; // meters
  maxRange: number; // meters
  assignedUnitId: string; // The Battalion/Brigade it belongs to
  commanderId: string;
  directorTiroId: string;
}

export interface NewArtilleryPieceData {
  name: string;
  type: ArtilleryType;
  location: GeoLocation;
  assignedUnitId: string;
  commanderId: string;
  directorTiroId: string;
  initialAmmunition: {
    he: number;
    smoke: number;
    illum: number;
  };
}


export interface ForwardObserver {
  id: string;
  callsign: string;
  location: GeoLocation;
  status: ForwardObserverStatus;
  assignedUnitId: string; // The Platoon/Company they are with
  commanderId: string;
}

export interface NewForwardObserverData {
  callsign: string;
  location: GeoLocation;
  assignedUnitId: string;
  commanderId: string;
}

export interface ActiveFireMission {
  id: string;
  artilleryId: string;
  requesterId: string;
  target: GeoLocation;
  status: 'active' | 'complete';
  fireTimestamp: number;
  completedTimestamp?: number;
  projectileType: ProjectileType;
  charge: number;
  isMrsi: boolean;
}

export type FireMission = ActiveFireMission;

export interface PendingFireMission {
  id: string;
  requesterId: string;
  target: GeoLocation;
  requestTimestamp: number;
  assignedArtilleryId: string | null;
  status: 'pending' | 'no_assets' | 'rejected';
  rejectionReason?: string;
}

export interface TargetSelectionRequest {
  requester: ForwardObserver | MilitaryUnit;
}

export interface AmmoExpenditureReport {
  id: string;
  unitId: string;
  unitName: string;
  submittedByUserId: string;
  reportTimestamp: number;
  amountExpendedPercent: number;
  justification: string;
  status: 'pending' | 'approved' | 'rejected';
  processedByUserId?: string;
  processedTimestamp?: number;
  rejectionReason?: string;
}

// --- Logistics Types ---
export enum LogisticsRequestStatus {
  PENDING = 'Pendiente',
  FULFILLED = 'Satisfecho',
}

export interface LogisticsRequest {
  id: string;
  originatingUnitId: string;
  originatingUnitName: string;
  details: string;
  requestTimestamp: number;
  status: LogisticsRequestStatus;
  fulfilledTimestamp?: number;
  fulfilledByUserId?: string;
  relatedAlertId?: string;
}

export interface PredictedLogisticsNeed {
  unitName: string;
  unitId: string;
  item: 'Clase I (Raciones)' | 'Clase III (Combustible)' | 'Clase V (Munición)';
  urgency: 'ALTA' | 'MEDIA' | 'BAJA';
  justification: string;
  predictedTimeframe: string;
}

// --- Fire Control System Types ---
export type ProjectileType =
  // 155mm
  | "HE"
  | "ERFB-BB"
  | "V-LAP"
  | "EXCALIBUR"
  // 105mm M101A1
  | "HE M1"
  | "HEAT M67"
  | "SMOKE M84"
  // 105mm LG-1
  | "ERATO HE"
  | "V-LAP 105"
  | "Illum M485"
  // 105mm L119
  | "L31 HE"
  | "L47 Smoke"
  | "L48 Illum"
  // 120mm M120
  | "M931 HE"
  | "XM1113 RAP"
  | "M821 Illum"
  | "M722 Smoke"
  | "M993 Penetrator"
  // 120mm HY1-12
  | "HE Y12-HE"
  | "RAP Y12-RAP"
  | "Illum Y12-ILL"
  | "Smoke Y12-SMK"
  | "Pen Y12-PEN";

export interface BallisticDataEntry {
  elev_base: number;
  vo: number;
  alcance: number; // in km for howitzers, meters for mortars
  guidance?: boolean;
}

export interface FiringSolution {
  distance: number; // meters
  azimuth: number; // degrees
  elevation: number; // degrees
  flightTime: number; // seconds
  isMrsi: boolean;
  mrsiData?: { angle: number; time: number }[];
  elevationStatus?: string; // For M101A1 validation
  // For LG-1 & L119
  correction_alt?: number;
  correction_viento?: number;
  correction_temp?: number;
  correction_pres?: number;
}

export interface TrajectoryPoint {
  x: number; // distance meters
  y: number; // altitude meters
}


export interface UseSimulatedDataReturn {
  isInitialized: boolean;
  users: User[];
  login: (username: string, passwordAttempt: string) => Promise<User | null>;
  addUser: (userData: NewUserData) => Promise<{ success: boolean, message?: string }>;
  updateUser: (userId: string, userData: UpdateUserData) => Promise<{ success: boolean, message?: string }>;
  deleteUser: (userId: string, currentAdminUserId: string) => Promise<{ success: boolean, message?: string }>;
  units: MilitaryUnit[];
  intelligenceReports: IntelligenceReport[];
  alerts: Alert[];
  afterActionReports: AfterActionReport[];
  q5Reports: Q5Report[];
  operationsOrders: OperationsOrder[];
  artilleryPieces: ArtilleryPiece[];
  forwardObservers: ForwardObserver[];
  activeFireMissions: ActiveFireMission[];
  pendingFireMissions: PendingFireMission[];
  logisticsRequests: LogisticsRequest[];
  userTelegramConfigs: UserTelegramConfig[];
  q5GeneratingStatus: { [aarId: string]: boolean };
  q5SendingStatus: { [q5Id: string]: boolean };
  unitHistoryLog: UnitHistoryEvent[];
  acknowledgeAlert: (alertId: string) => Promise<void>;
  addIntelReport: (reportData: Omit<IntelligenceReport, 'id' | 'reportTimestamp'>) => Promise<void>;
  addManualRoutePoint: (unitId: string, location: GeoLocation, timestamp: number) => Promise<void>;
  updateUnitLogistics: (unitId: string, logisticsData: { fuelLevel?: number | string; ammoLevel?: number | string; daysOfSupply?: number | string; }) => Promise<void>;
  updateUnitAttributes: (unitId: string, attributes: Partial<MilitaryUnit>) => Promise<void>;
  markUnitHourlyReport: (unitId: string) => Promise<void>;
  reportUnitEngaged: (unitId: string) => Promise<void>;
  reportUnitCeasefire: (unitId: string) => Promise<void>;
  addAfterActionReport: (aarData: Omit<AfterActionReport, 'id' | 'reportTimestamp' | 'unitName'>) => Promise<void>;
  sendTestTelegramAlert: (chatId?: string) => Promise<boolean>;
  addUnit: (unitData: NewUnitData) => Promise<void>;
  generateAndAddQ5Report: (aarId: string) => Promise<void>;
  sendQ5ReportViaTelegram: (q5Id: string) => Promise<void>;
  sendUnitToRetraining: (unitId: string, focus?: string, duration?: number) => Promise<void>;
  returnUnitFromRetraining: (unitId: string) => Promise<void>;
  startUnitLeave: (unitId: string, duration: number) => Promise<void>;
  startUnitRetraining: (unitId: string, focus: string, duration: number) => Promise<void>;
  updateUnitMission: (unitId: string, missionSigla: string) => Promise<void>;
  updateUnitSituation: (unitId: string, newSituation: UnitSituationINSITOP) => Promise<void>;
  processSpotReport: (spotData: SpotReportPayload) => Promise<void>;
  addOperationsOrder: (orderData: NewOperationsOrderData) => Promise<OperationsOrder | null>;
  updateOperationsOrder: (orderId: string, orderData: UpdateOperationsOrderData) => Promise<{ success: boolean, message?: string }>;
  publishOperationsOrder: (orderId: string, selectedUserIds: string[]) => Promise<{ success: boolean, message?: string }>;
  acknowledgeOperationsOrder: (orderId: string, userId: string) => Promise<void>;
  submitAmmoExpenditureReport: (report: any) => Promise<void>;
  logPlatoonNovelty: (novelty: any) => Promise<void>;
  approvePlatoonNovelty: (noveltyId: string) => Promise<void>;
  rejectPlatoonNovelty: (noveltyId: string) => Promise<void>;
  approveAmmoReport: (reportId: string) => Promise<void>;
  rejectAmmoReport: (reportId: string, reason: string) => Promise<void>;
  addUnitHierarchy: (unitData: NewHierarchyUnitData) => Promise<{ success: boolean, message?: string, newUnit?: MilitaryUnit }>;
  updateUnitHierarchyDetails: (unitId: string, updateData: UpdateHierarchyUnitData) => Promise<{ success: boolean, message?: string }>;
  deleteUnitHierarchy: (unitId: string) => Promise<{ success: boolean, message?: string }>;
  assignCommanderToOrganizationalUnit: (unitId: string, userId: string) => Promise<{ success: boolean, message?: string }>;
  addArtilleryPiece: (pieceData: NewArtilleryPieceData) => Promise<{ success: boolean }>;
  addForwardObserver: (observerData: NewForwardObserverData) => Promise<{ success: boolean }>;
  fulfillLogisticsRequest: (requestId: string, userId: string) => Promise<void>;
  addLogisticsRequest: (unitId: string, details: string) => Promise<void>;
  confirmShotFired: (missionId: string) => Promise<void>;
  requestFireMission: (requesterId: string, target: GeoLocation, artilleryId?: string) => Promise<{ success: boolean }>;
  acceptFireMission: (missionId: string) => Promise<{ success: boolean }>;
  updateUserTelegramConfig: (userId: string, chatId: string) => Promise<{ success: boolean; message?: string }>;
  rejectFireMission: (missionId: string) => Promise<{ success: boolean }>;
  assignUAVAsset: (unitId: string, asset: UAVAsset) => Promise<{ success: boolean; message?: string }>;
  removeUAVAsset: (unitId: string, assetId: string) => Promise<{ success: boolean; message?: string }>;
  dismissPendingMission: (missionId: string) => Promise<void>;
  refreshData: () => Promise<void>;
}

// For Nominatim Search
export interface NominatimResult {
  place_id: number;
  licence: string;
  osm_type: string;
  osm_id: number;
  lat: string;
  lon: string;
  category: string;
  type: string;
  place_rank: number;
  importance: number;
  addresstype: string;
  name: string;
  display_name: string;
  boundingbox: [string, string, string, string];
}

export type AssessedThreatLevel = 'Alto' | 'Medio' | 'Bajo' | 'Ninguno';

// --- PICC (Plantillas de Información de Combate) Types ---

export enum PlantillaType {
  SITUACION_ACTUAL = "Plantilla de Situación Actual",
  MANIOBRA_PROPUESTA = "Plantilla de Maniobra Propuesta",
  OBSTACULOS = "Plantilla de Obstáculos",
  APOYO_FUEGOS = "Plantilla de Apoyo de Fuegos",
  INTELIGENCIA_ENEMIGA = "Plantilla de Inteligencia Enemiga",
}

export enum PICCElementType {
  FRIENDLY_UNIT_POINT_SIT = 'FRIENDLY_UNIT_POINT_SIT',
  ENEMY_UNIT_POINT_SIT = 'ENEMY_UNIT_POINT_SIT',
  NEUTRAL_POINT_SIT = 'NEUTRAL_POINT_SIT',
  CIVILIAN_POINT_SIT = 'CIVILIAN_POINT_SIT',
  LINE_OF_CONTACT = 'LINE_OF_CONTACT',
  FRIENDLY_MAIN_ATTACK_AXIS = 'FRIENDLY_MAIN_ATTACK_AXIS',
  FRIENDLY_SUPPORTING_ATTACK_AXIS = 'FRIENDLY_SUPPORTING_ATTACK_AXIS',
  FRIENDLY_ASSEMBLY_AREA = 'FRIENDLY_ASSEMBLY_AREA',
  FRIENDLY_OBJECTIVE = 'FRIENDLY_OBJECTIVE',
  FRIENDLY_TASK_MANEUVER = 'FRIENDLY_TASK_MANEUVER',
  OBSTACLE_MINEFIELD_PLANNED = 'OBSTACLE_MINEFIELD_PLANNED',
  OBSTACLE_MINEFIELD_DETECTED = 'OBSTACLE_MINEFIELD_DETECTED',
  OBSTACLE_BARRIER_GENERIC = 'OBSTACLE_BARRIER_GENERIC',
  OBSTACLE_DEMOLITION_PLANNED = 'OBSTACLE_DEMOLITION_PLANNED',
  TARGET_REFERENCE_POINT = 'TARGET_REFERENCE_POINT',
  FSCL_LINE = 'FSCL_LINE',
  CFL_LINE = 'CFL_LINE',
  NFA_AREA = 'NFA_AREA',
  RFA_AREA = 'RFA_AREA',
  NAI_POINT = 'NAI_POINT',
  TPL_LINE = 'TPL_LINE',
  ENEMY_DEFENSIVE_LINE = 'ENEMY_DEFENSIVE_LINE',
  ENEMY_COA_AXIS = 'ENEMY_COA_AXIS',
  CONTROL_PHASE_LINE = 'CONTROL_PHASE_LINE',
  CONTROL_CHECKPOINT = 'CONTROL_CHECKPOINT',
  CONTROL_AREA_GENERIC = 'CONTROL_AREA_GENERIC',
}


export interface SIDCGenerationOptions {
  affiliation?: 'F' | 'H' | 'N' | 'U';
  battleDimension?: 'G' | 'A' | 'S' | 'P' | 'X';
  status?: 'P' | 'A' | 'C';
  functionId?: string;
  echelon?: string;
  sidc?: string;
}

export interface PICCDrawOptions {
  labelPrompt?: string;
  sidcOptions?: SIDCGenerationOptions;
  pathOptions?: import('leaflet').PathOptions;
  isSIDCInputRequired?: boolean;
  defaultSymbolSize?: number;
}

export interface PICCDrawConfig {
  type: PICCElementType;
  options?: PICCDrawOptions;
}

export interface PICCToolDefinition {
  type: PICCElementType;
  label: string;
  icon: FC<{ className?: string }>;
  colorClass: string;
  defaultOptions?: PICCDrawOptions;
}

export interface PlantillaPICCConfigSet {
  label: string;
  elements: PICCToolDefinition[];
}

export type PlantillaToolsMapping = Record<PlantillaType, PlantillaPICCConfigSet>;

export type LeafletDrawEvent = LeafletMouseEvent & {
  layer: any;
  layerType: string;
};

export interface LoggedSpotReport extends SpotReportPayload {
  receivedTimestamp: number;
  unitName?: string;
}

// --- COA (Course of Action) Types ---
export enum COAGraphicType {
  PHASE_LINE = 'PHASE_LINE',
  AXIS_OF_ADVANCE = 'AXIS_OF_ADVANCE',
  OBJECTIVE = 'OBJECTIVE',
  ASSEMBLY_AREA = 'ASSEMBLY_AREA',
}

export interface COAGraphicElement {
  type: COAGraphicType;
  label: string;
  locations: GeoLocation[];
}

export interface COAPhase {
  phaseName: string;
  description: string;
  graphics: COAGraphicElement[];
}

export interface COAPlan {
  id?: string;
  planName: string;
  conceptOfOperations: string;
  phases: COAPhase[];
  createdByUserId?: string;
  createdTimestamp?: string;
  hiddenTimestamp?: string;
}
export interface UserTelegramConfig { userId: string; telegramChatId: string; }

// --- Map Display Types ---



export interface PICCDrawingConfig {
  toolType?: PICCDrawingToolType;
  color?: string;
  type?: PICCElementType;
  options?: any;
}

export interface PICCElement {
  id: string;
  type: PICCElementType;
  geometry: any; // GeoJSON or similar
  properties: any;
}

export interface PICCDrawingOptions {
  color?: string;
  weight?: number;
  // ...
}

export type PICCDrawingToolType = string; // Or specific enum

export interface OperationalGraphic {
  id?: string;
  plantillaType: string;
  graphicType: string;
  geoJson: string; // Serialized GeoJSON
  label?: string;
  createdByUserId?: string;
  createdTimestamp?: string;
  hiddenTimestamp?: string;
}

export interface MapDisplayProps {
  units: MilitaryUnit[];
  intelligenceReports: IntelligenceReport[];
  artilleryPieces: ArtilleryPiece[];
  forwardObservers: ForwardObserver[];
  activeFireMissions: FireMission[];
  afterActionReports?: AfterActionReport[];
  selectedEntity: SelectedEntity | null;
  onSelectEntityOnMap?: (entity: SelectedEntity) => void;
  distanceToolActive?: boolean;
  aoiDrawingModeActive?: boolean;
  enemyInfluenceLayerActive?: boolean;
  elevationProfileActive?: boolean;
  piccDrawingConfig: PICCDrawingConfig | null;
  onPiccDrawingComplete?: (element?: PICCElement) => void;
  activeTemplateContext: any;
  isTargetSelectionActive?: boolean;
  onTargetSelected?: (location: GeoLocation) => void;
  eventBus: any;
  entityToPanTo: SelectedEntity | null;
  hotspots?: Hotspot[];
  historicalHotspots?: Hotspot[];
  approvePlatoonNovelty?: (noveltyId: string) => void;
  rejectPlatoonNovelty?: (noveltyId: string) => void;
  approveAmmoReport?: (reportId: string) => void;
  rejectAmmoReport?: (reportId: string) => void;
  isMaximized?: boolean;
  onToggleMaximize?: () => void;
}








export interface BMARecommendation {
  unitId: string;
  unitName: string;
  reasoning: string;
  score: number;
  estimatedTimeToIntercept: number;
}

export interface LogisticsPrediction {
  unitId: string;
  unitName: string;
  daysRemaining: number;
  status: string;
  recommendation: string;
}

export interface Hotspot {
  center: GeoLocation;
  radius: number;
  intensity: number;
  description: string;
}

export interface WeatherInfo {
  temperature: number;
  humidity: number;
  windSpeed: number;
  condition: string;
  operationalImpact: boolean;
}
