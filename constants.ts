

import { UnitType as UnitTypeEnum, UserRole, ArtilleryType } from "./types";
import type { CommanderInfo } from "./types";
import type { PathOptions } from 'leaflet';

export const NO_MOVEMENT_THRESHOLD_MS = 24 * 60 * 60 * 1000; // 24 hours
export const DANGEROUS_ROUTINE_MIN_REPETITIONS = 2; // Min number of times a short sequence is repeated
export const DANGEROUS_ROUTINE_SEQUENCE_LENGTH = 3; // Length of position sequence to check for repetition
export const DANGEROUS_ROUTINE_MAX_HISTORY_CHECK = 10; // How far back in history to check for similar sequences

export const SIMULATION_UPDATE_INTERVAL_MS = 5000; // How often to simulate data updates
export const MAX_ROUTE_HISTORY_LENGTH = 50; // Max points in unit route history

export const UNIT_NAMES_PREFIX = ["Alpha", "Bravo", "Charlie", "Delta", "Eco", "Foxtrot", "Golf", "Hotel", "India", "Juliet", "Kilo", "Lima"];
export const UNIT_NAMES_SUFFIX_COMPANY = ["Víbora", "Dragón", "Lobo", "Halcón", "Cobra"];
export const UNIT_NAMES_SUFFIX_PLATOON = ["1ra", "2da", "3ra", "4ta"];
export const UNIT_NAMES_SUFFIX_TEAM = ["Reconocimiento", "Asalto", "Apoyo", "Francotirador"];

export const RANKS_ABBREVIATIONS: string[] = [
  "GR.", // General (Comandante Ejército)
  "MG.", // Mayor General (Comandante División)
  "BG.", // Brigadier General (Comandante Brigada)
  "CR.", // Coronel
  "TC.", // Teniente Coronel (Comandante Batallón)
  "MY.", // Mayor
  "CP.", // Capitán (Comandante Compañía)
  "TE.", // Teniente
  "ST.", // Subteniente (Comandante Pelotón)
  "SM.", // Sargento Mayor
  "SP.", // Sargento Primero
  "SV.", // Sargento Viceprimero
  "SS.", // Sargento Segundo
  "CS.", // Cabo Primero
  "C3.", // Cabo Tercero (si aplica)
  "SLP", // Soldado Profesional (como referencia, aunque no es un "grado" de mando directo)
];


export const COMMANDERS: CommanderInfo[] = [
  { rank: "MY.", name: "Payne" },
  { rank: "CP.", name: "Miller" },
  { rank: "TE.", name: "Spear" },
  { rank: "SP.", name: "Rock" },
  { rank: "CR.", name: "Shepard" },
  { rank: "TC.", name: "Ackerman" },
  { rank: "MY.", name: "Smith" },
  { rank: "CP.", name: "Jones" },
];

export const EQUIPMENT_LIST = [
  ["Fusil M4", "SAW M249", "Radio PRC-152", "NVG PVS-14", "GPS DAGR"],
  ["Vehículo MRAP", "Raciones MRE", "Botiquín Primeros Auxilios", "Binoculares"],
  ["Misil Javelin", "Mortero M224", "Drone Táctico RQ-11"],
];

export const CAPABILITIES_LIST = [
  // Combat Arms & Maneuver
  "Infantería", "Caballería", "Acorazado", "Acorazado Ruedas", "Anti-Tanque",
  "Mortero", "Fuerzas Especiales", "SOF Infantry", "SOF Recon", "Combate Urbano", "Acción Directa",
  // Combat Support
  "Artillería", "Ingenieros", "Combat Engineer", "Contra-IED", "Aviación", "Helicópteros",
  "Defensa Aérea", "Transmisiones", "Inteligencia de Señales", "Guerra Electrónica", "Policía Militar",
  // Combat Service Support & General
  "Mando", "Logística", "Abastecimiento", "Transporte", "Mantenimiento", "Sanidad", "Evacuación Médica",
  "Vigilancia", "Reconocimiento", "Apoyo de Combate", "Protección de Fuerza",
  // Special/Other
  "Montaña"
];


export const PRIMARY_UNIT_ROLES_APP6 = [
  { label: "Infantería", capabilityTerm: "Infantería" },
  { label: "Caballería (Reconocimiento)", capabilityTerm: "Caballería" },
  { label: "Artillería", capabilityTerm: "Artillería" },
  { label: "Ingenieros", capabilityTerm: "Ingenieros" },
  { label: "Mando y Control", capabilityTerm: "Mando" },
  { label: "Abastecimiento", capabilityTerm: "Abastecimiento" },
  { label: "Transporte", capabilityTerm: "Transporte" },
  { label: "Mantenimiento", capabilityTerm: "Mantenimiento" },
  { label: "Transmisiones", capabilityTerm: "Transmisiones" },
  { label: "Sanidad", capabilityTerm: "Sanidad" },
  { label: "Apoyo de Combate (General)", capabilityTerm: "Apoyo de Combate" },
  { label: "Vigilancia", capabilityTerm: "Vigilancia" },
  { label: "Acorazado (Tanque)", capabilityTerm: "Acorazado" },
  { label: "Acorazado (Ruedas)", capabilityTerm: "Acorazado Ruedas" },
  { label: "Anti-Tanque (Def. Contra Carro)", capabilityTerm: "Anti-Tanque" },
  { label: "Helicópteros (Aviación)", capabilityTerm: "Helicópteros" },
  { label: "Defensa Aérea", capabilityTerm: "Defensa Aérea" },
  { label: "Mortero", capabilityTerm: "Mortero" },
  { label: "Ingenieros de Combate", capabilityTerm: "Combat Engineer" },
  { label: "Fuerzas Especiales (General)", capabilityTerm: "Fuerzas Especiales" },
  { label: "Policía Militar", capabilityTerm: "Policía Militar" },
];

export const CAPABILITY_TO_FUNCTION_ID_APP6: Record<string, string> = {
  // Primary Combat Arms
  'Infantería': 'UCI---',
  'Acorazado': 'UCA---',
  'Acorazado Ruedas': 'UCAW--',
  'Anti-Tanque': 'UCAAT-',
  'Caballería': 'UCR---',
  'Reconocimiento': 'UCR---',
  'Artillería': 'UCF---',
  'Mortero': 'UCFM--',
  'Defensa Aérea': 'UCAD--',
  'Aviación': 'UCV---', // Generic Aviation, can be modified
  'Helicópteros': 'UCV-L-', // Utility/Light Helicopter
  // Special Operations Forces (Dimension P)
  'Fuerzas Especiales': 'UPS---',
  'SOF Infantry': 'UPSI--',
  'SOF Recon': 'UPSR--',
  // Combat Support
  'Ingenieros': 'UCE---',
  'Combat Engineer': 'UCEC--',
  'Contra-IED': 'UCEOD-',
  'Transmisiones': 'UCJ---',
  'Comunicaciones': 'UCJ---',
  'Inteligencia de Señales': 'UCJI--',
  'Guerra Electrónica': 'UCJW--',
  'Policía Militar': 'UCO---',
  'Apoyo de Combate': 'UCS---',
  'Vigilancia': 'UCSV--',
  // Combat Service Support
  'Mando': 'UCHQ--',
  'Logística': 'UL----',
  'Abastecimiento': 'ULSS--',
  'Transporte': 'ULST--',
  'Mantenimiento': 'ULSM--',
  'Sanidad': 'ULM---',
  'Evacuación Médica': 'ULME--',
  // Other specific capabilities that map to a base
  'Acción Directa': 'UCI---', // Infantry Action
  'Combate Urbano': 'UCIU--', // Infantry Urban
  'Montaña': 'UCIM--',       // Infantry Mountain
};


export const INTEL_TITLES = [
  "Actividad Sospechosa Reportada", "Movimiento Enemigo Detectado", "Posible Ubicación de IED",
  "Actualización Concentración Civil", "Reporte Condiciones Atmosféricas", "Interceptación Comunicaciones",
  "Imágenes Satelitales Disponibles", "Pico Actividad Redes Sociales", "Concentración Fuerzas Hostiles",
  "Actividad Nocturna Inusual", "Información Puesto de Control", "Avistamiento Convoy Suministros"
];

export const INTEL_KEYWORDS = [
  "enemigo", "vehículo", "patrulla", "bloqueo", "concentración", "explosión", "arma",
  "vigilancia", "comunicación", "frontera", "convoy", "UAV", "mortero", "francotirador",
  "IED", "emboscada", "puesto de control", "hostil", "civil"
];

export const INTEL_SOURCE_DETAILS_HUMINT = ["Informante Local", "Personal Capturado", "Debrief de Patrulla", "Reporte de Refugiado"];
export const INTEL_SOURCE_DETAILS_SIGINT = ["Interceptación Radio", "Actividad Cibernética", "Detección ELINT", "Análisis COMINT"];
export const INTEL_SOURCE_DETAILS_IMINT = ["Imagen Satelital", "Video UAV", "Foto Reconocimiento Aéreo", "Fotografía Terrestre"];
export const INTEL_SOURCE_DETAILS_OSINT = ["Monitoreo Redes Sociales", "Reporte de Noticias", "Base de Datos Pública", "Investigación Académica"];

// Updated MAP_BOUNDS for all Colombia
export const MAP_BOUNDS = {
  MIN_LAT: -4.3,  // Leticia
  MAX_LAT: 13.5,  // Punta Gallinas + San Andrés
  MIN_LON: -82.0, // San Andrés
  MAX_LON: -66.8, // Puerto Carreño / Guadalupe
};

// Communications Module Constants
export const COMMUNICATION_REPORT_INTERVAL_MS = 1 * 60 * 60 * 1000; // 1 hour
export const COMMUNICATION_OVERDUE_THRESHOLD_MS = 4 * 60 * 60 * 1000; // 4 hours

// Telegram API Configuration
export const TELEGRAM_BOT_TOKEN = "7049049081:AAFpPV8bhuxAVe2oKM2jwgFI_7MfpWCLiSE";
export const TELEGRAM_CHAT_ID = "-1001234567890"; // Example group chat ID, replace with a real one

export const MISSION_TYPES = [
  { sigla: "OPOF", description: "Operación Ofensiva" },
  { sigla: "OPSDH", description: "Operación de Seguridad de Hidrocarburos" },
  { sigla: "OPSEG", description: "Operación de Seguridad y Defensa de la Fuerza" },
  { sigla: "OPCTRLTER", description: "Operación de Control Territorial" },
  { sigla: "OPAPCIV", description: "Operación de Apoyo a la Autoridad Civil" },
  { sigla: "OPRECON", description: "Operación de Reconocimiento" },
  { sigla: "OPENTRN", description: "Entrenamiento / Reentrenamiento" },
  { sigla: "OPLOG", description: "Operación Logística / Abastecimiento" },
  { sigla: "PATCTRL", description: "Patrullaje y Control de Área" },
  { sigla: "N/A", description: "Misión No Asignada / Por Definir" },
];

// APP-6 Symbol Mappings
export const CORRECTED_ECHELON_MAPPING: Record<UnitTypeEnum, string> = {
  [UnitTypeEnum.SQUAD]: 'B',       // Squad
  [UnitTypeEnum.TEAM]: 'A',        // Team/Crew
  [UnitTypeEnum.PLATOON]: 'D',     // Platoon
  [UnitTypeEnum.COMPANY]: 'E',    // Company
  [UnitTypeEnum.BATTALION]: 'F',  // Battalion
  [UnitTypeEnum.BRIGADE]: 'H',     // Brigade (Corrected from G)
  [UnitTypeEnum.DIVISION]: 'I',    // Division (Corrected from H)
  [UnitTypeEnum.COMMAND_POST]: '-',// No Echelon
  [UnitTypeEnum.UAV_ATTACK_TEAM]: 'A', // Team echelon for UAV
  [UnitTypeEnum.UAV_INTEL_TEAM]: 'A',  // Team echelon for UAV
};

// Default function ID if no capability matches
export const UNIT_TYPE_TO_FUNCTION_ID_APP6_DEFAULT: Record<UnitTypeEnum, string> = {
  [UnitTypeEnum.SQUAD]: 'UCI---',       // Default to Infantry
  [UnitTypeEnum.TEAM]: 'UCI---',        // Default to Infantry
  [UnitTypeEnum.PLATOON]: 'UCI---',    // Default to Infantry
  [UnitTypeEnum.COMPANY]: 'UCI---',    // Default to Infantry
  [UnitTypeEnum.BATTALION]: 'UCI---', // Default to Infantry
  [UnitTypeEnum.BRIGADE]: 'UCHQ--',   // Default to HQ
  [UnitTypeEnum.DIVISION]: 'UCHQ--',  // Default to HQ
  [UnitTypeEnum.COMMAND_POST]: 'UCHQ--', // Default to HQ
  [UnitTypeEnum.UAV_ATTACK_TEAM]: 'UCD---', // Drone
  [UnitTypeEnum.UAV_INTEL_TEAM]: 'UCD---',  // Drone
};


export const SIDC_AFFILIATION_FRIEND = 'F';
export const SIDC_AFFILIATION_HOSTILE = 'H';
export const SIDC_AFFILIATION_NEUTRAL = 'N';
export const SIDC_AFFILIATION_UNKNOWN = 'U';

export const SIDC_DIMENSION_GROUND = 'G';
export const SIDC_DIMENSION_AIR = 'A';
export const SIDC_DIMENSION_SEA = 'S';
export const SIDC_DIMENSION_SOF = 'P';
export const SIDC_DIMENSION_SPACE = 'X';
export const SIDC_DIMENSION_UNKNOWN = 'Z';


export const SIDC_STATUS_PRESENT = 'P';
export const SIDC_STATUS_PLANNED = 'A';
export const SIDC_STATUS_FULLY_CAPABLE = 'C';


export const PICC_SIDC = {
  FRIENDLY_UNIT_POINT: `SFGPUC----`,
  ENEMY_UNIT_POINT: `SHGPUC----`,
  NEUTRAL_UNIT_POINT: `SNGPUC----`,
  CIVILIAN_POINT: `SNGPCV----`,
  LINE_OF_CONTACT: `GHTALC----`,
  FRIENDLY_MAIN_ATTACK_AXIS: `GFGPALM---`,
  FRIENDLY_ASSEMBLY_AREA: `GFMPAA----`,
  FRIENDLY_OBJECTIVE: `GFMPO-----`,
  CONTROL_CHECKPOINT: `GNGPPC----`,
  CONTROL_PHASE_LINE: `GNGPLL----`,
  NAI_POINT: `GNTPOI----`,
  TARGET_REFERENCE_POINT: `GHMPAT----`,
  FSCL_LINE: `GAGPFL----`,
  CFL_LINE: `GAGGCL----`,
  NFA_AREA: `GAGANF----`,
  RFA_AREA: `GAGARF----`,
  PLANNED_MINEFIELD_FRIENDLY: `GFMOMP----`,
  DETECTED_MINEFIELD_ENEMY: `SHMOMD----`,
  ENEMY_DEFENSIVE_LINE: `SHGALL----`,
  ENEMY_COA_AXIS: `SHGPALM---`,
};

export const PICC_PATH_OPTIONS_FRIENDLY: PathOptions = { color: '#007bff', weight: 3, opacity: 0.9, fillOpacity: 0.2, fillColor: '#007bff' };
export const PICC_PATH_OPTIONS_HOSTILE: PathOptions = { color: '#dc3545', weight: 3, opacity: 0.9, fillOpacity: 0.2, fillColor: '#dc3545' };
export const PICC_PATH_OPTIONS_NEUTRAL: PathOptions = { color: '#28a745', weight: 2, opacity: 0.9, fillOpacity: 0.2, fillColor: '#28a745' };
export const PICC_PATH_OPTIONS_CONTROL: PathOptions = { color: '#000000', weight: 2, opacity: 0.9, dashArray: '10, 5' };
export const PICC_PATH_OPTIONS_UNKNOWN: PathOptions = { color: '#ffc107', weight: 2, opacity: 0.9, fillOpacity: 0.2, fillColor: '#ffc107' };

export const DEFAULT_PICC_SYMBOL_SIZE = 25;

export const USER_ROLE_TO_RANK_ABBREVIATION: Partial<Record<UserRole, string>> = {
  [UserRole.COMANDANTE_EJERCITO]: 'GR.',
  [UserRole.COMANDANTE_DIVISION]: 'MG.',
  [UserRole.COMANDANTE_BRIGADA]: 'BG.',
  [UserRole.COMANDANTE_BATALLON]: 'TC.',
  [UserRole.COMANDANTE_COMPANIA]: 'CP.',
  [UserRole.COMANDANTE_PELOTON]: 'ST.',
};

// --- ARTILLERY CONSTANTS ---

export const ARTILLERY_TYPE_DETAILS: Record<ArtilleryType, { name: string; minRange: number; maxRange: number; sidcFunctionId: string }> = {
  [ArtilleryType.HOWITZER_155]: { name: 'Obús 155mm', minRange: 3000, maxRange: 22000, sidcFunctionId: 'UCFH--' }, // Unit, Combat, Fires, Howitzer
  [ArtilleryType.MLRS]: { name: 'Lanzacohetes Múltiple', minRange: 8000, maxRange: 70000, sidcFunctionId: 'UCFR--' }, // Unit, Combat, Fires, Rocket
  [ArtilleryType.HOWITZER_105]: { name: 'Obús 105mm M101A1', minRange: 2000, maxRange: 11500, sidcFunctionId: 'UCFH--' }, // Unit, Combat, Fires, Howitzer
  [ArtilleryType.HOWITZER_105_LG1]: { name: 'Obús 105mm LG-1 Mk III', minRange: 3000, maxRange: 22000, sidcFunctionId: 'UCFH--' },
  [ArtilleryType.HOWITZER_105_L119]: { name: 'Obús 105mm L119', minRange: 3000, maxRange: 17200, sidcFunctionId: 'UCFH--' },
  [ArtilleryType.MORTAR_120_M120]: { name: 'Mortero 120mm M120', minRange: 620, maxRange: 13000, sidcFunctionId: 'UCFM--' }, // Unit, Combat, Fires, Mortar
  [ArtilleryType.MORTAR_120_HY112]: { name: 'Mortero 120mm HY1-12', minRange: 600, maxRange: 9500, sidcFunctionId: 'UCFM--' },
};

export const SIDC_FORWARD_OBSERVER = 'UCFO--'; // Unit, Combat, Fires, Observer

export const ARTILLERY_TYPE_TO_FDO_ROLE: Record<ArtilleryType, UserRole> = {
  [ArtilleryType.HOWITZER_155]: UserRole.DIRECTOR_TIRO_155,
  [ArtilleryType.HOWITZER_105]: UserRole.DIRECTOR_TIRO_M101A1,
  [ArtilleryType.HOWITZER_105_LG1]: UserRole.DIRECTOR_TIRO_LG1,
  [ArtilleryType.HOWITZER_105_L119]: UserRole.DIRECTOR_TIRO_L119,
  [ArtilleryType.MORTAR_120_M120]: UserRole.DIRECTOR_TIRO_M120,
  [ArtilleryType.MORTAR_120_HY112]: UserRole.DIRECTOR_TIRO_HY112,
  [ArtilleryType.MLRS]: UserRole.DIRECTOR_TIRO_MLRS,
};

export const MAP_CENTER: [number, number] = [4.0, -73.0]; // Central Colombia approx
export const MAP_ZOOM_DEFAULT = 6;
export const MAP_ZOOM_MIN = 5;
export const MAP_ZOOM_MAX = 18;

export const UNIT_ICONS: Record<string, any> = {}; // Placeholder
export const UNIT_COLORS: Record<string, string> = {
  FRIENDLY: '#007bff',
  HOSTILE: '#dc3545',
  NEUTRAL: '#28a745',
  UNKNOWN: '#ffc107',
};

export const PICC_COLORS = {
  FRIENDLY: '#007bff',
  HOSTILE: '#dc3545',
  NEUTRAL: '#28a745',
  UNKNOWN: '#ffc107',
  CONTROL: '#000000',
};

export const PICC_MARKER_OPTIONS = {
  // Define default marker options if needed
};