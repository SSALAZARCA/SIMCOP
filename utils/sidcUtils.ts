
import {
    SIDC_AFFILIATION_FRIEND, SIDC_AFFILIATION_HOSTILE, SIDC_AFFILIATION_NEUTRAL, SIDC_AFFILIATION_UNKNOWN,
    SIDC_DIMENSION_GROUND, SIDC_STATUS_PRESENT, PICC_SIDC, CORRECTED_ECHELON_MAPPING, SIDC_DIMENSION_SOF, SIDC_DIMENSION_AIR,
    UNIT_TYPE_TO_FUNCTION_ID_APP6_DEFAULT, CAPABILITY_TO_FUNCTION_ID_APP6
} from '../constants';
import { UnitType, PICCElementType, IntelligenceReport, IntelligenceReliability, IntelligenceCredibility, AssessedThreatLevel, MilitaryUnit, SIDCGenerationOptions } from '../types';

export const INITIAL_ENEMY_FILTER_KEYWORDS = ['enemigo', 'hostil', 'presencia', 'actividad', 'gao', 'disidencia', 'combate', 'patrulla', 'enfrentamiento', 'ataque', 'amenaza', 'sospechoso', 'base', 'campamento', 'artillería', 'mortero', 'cuartel', 'explosivos', 'secuestro', 'retén'];
const HIGH_THREAT_KEYWORDS = ["base enemiga", "campamento", "artillería", "mortero", "ataque confirmado", "cuartel", "fábrica explosivos", "secuestro", "amenaza crítica"];
const MEDIUM_THREAT_KEYWORDS = ["patrulla enemiga", "movimiento hostil", "presencia gao", "enfrentamiento", "retén ilegal", "combate en curso", "hostigamiento", "fuerza considerable"];
const LOW_THREAT_KEYWORDS = ["posible actividad", "sospecha", "rumor", "avistamiento no confirmado", "propaganda", "informante menciona"];

const RELIABILITY_WEIGHTS: { [key in IntelligenceReliability]?: number } = {
    [IntelligenceReliability.A]: 3, [IntelligenceReliability.B]: 2, [IntelligenceReliability.C]: 1,
    [IntelligenceReliability.D]: -1, [IntelligenceReliability.E]: -2, [IntelligenceReliability.F]: 0,
};

const CREDIBILITY_WEIGHTS: { [key in IntelligenceCredibility]?: number } = {
    [IntelligenceCredibility.ONE]: 3, [IntelligenceCredibility.TWO]: 2, [IntelligenceCredibility.THREE]: 1,
    [IntelligenceCredibility.FOUR]: -1, [IntelligenceCredibility.FIVE]: -2, [IntelligenceCredibility.SIX]: 0,
};

const SYMBOL_PRIORITY_ORDER: string[] = [
    'SOF Infantry', 'SOF Recon', 'Mortero', 'Anti-Tanque', 'Howitzer', 'Contra-IED', 'Combat Engineer',
    'Infantería', 'Combate Urbano', 'Acción Directa', 'Acorazado Ruedas', 'Acorazado', 'Tanque', 'Caballería',
    'Artillería', 'Ingenieros', 'Helicópteros', 'Defensa Aérea', 'Aviación', 'Vigilancia', 'Reconocimiento',
    'Mando', 'Transmisiones', 'Comunicaciones', 'Inteligencia de Señales', 'Fuerzas Especiales', 'Sanidad',
    'Evacuación Médica', 'Mantenimiento', 'Transporte', 'Abastecimiento', 'Apoyo de Combate', 'Logística',
    'Apoyo Logístico', 'Policía Militar', 'Montaña', 'Blindado',
];

export const assessThreatLevel = (report: IntelligenceReport): AssessedThreatLevel => {
    let threatScore = 0;
    const searchText = `${report.title.toLowerCase()} ${report.details.toLowerCase()}`;
    if (HIGH_THREAT_KEYWORDS.some(kw => searchText.includes(kw))) threatScore += 5;
    else if (MEDIUM_THREAT_KEYWORDS.some(kw => searchText.includes(kw))) threatScore += 3;
    else if (LOW_THREAT_KEYWORDS.some(kw => searchText.includes(kw))) threatScore += 1;
    threatScore += RELIABILITY_WEIGHTS[report.reliability] || 0;
    threatScore += CREDIBILITY_WEIGHTS[report.credibility] || 0;
    if (threatScore >= 6) return 'Alto';
    if (threatScore >= 3) return 'Medio';
    if (threatScore > 0) return 'Bajo';
    return 'Ninguno';
};

export const getThreatStyle = (level: AssessedThreatLevel): { radiusKm: number; color: string; fillColor: string; fillOpacity: number; weight: number } => {
    switch (level) {
        case 'Alto': return { radiusKm: 2.5, color: '#B91C1C', fillColor: '#FF0000', fillOpacity: 0.3, weight: 2 };
        case 'Medio': return { radiusKm: 1.5, color: '#D97706', fillColor: '#FFA500', fillOpacity: 0.25, weight: 1.5 };
        case 'Bajo': return { radiusKm: 0.75, color: '#FACC15', fillColor: '#FFFF00', fillOpacity: 0.2, weight: 1 };
        default: return { radiusKm: 0, color: '', fillColor: '', fillOpacity: 0, weight: 0 };
    }
};

export const getUnitFunctionIdAPP6 = (unitType: UnitType, capabilities: string[]): string => {
    const unitCapabilitiesLower = capabilities.map(c => c.toLowerCase().trim());
    if (unitCapabilitiesLower.length === 0) {
        return UNIT_TYPE_TO_FUNCTION_ID_APP6_DEFAULT[unitType] || 'UCI---';
    }
    for (const priorityCap of SYMBOL_PRIORITY_ORDER) {
        const lowerPriorityCapTrimmed = priorityCap.toLowerCase().trim();
        if (unitCapabilitiesLower.includes(lowerPriorityCapTrimmed)) {
            const functionId = CAPABILITY_TO_FUNCTION_ID_APP6[priorityCap];
            if (functionId) return functionId;
        }
    }
    return UNIT_TYPE_TO_FUNCTION_ID_APP6_DEFAULT[unitType] || 'UCI---';
};

export const generateUnitSIDC = (unit: MilitaryUnit): string => {
    const affiliation = SIDC_AFFILIATION_FRIEND;
    let battleDimension = SIDC_DIMENSION_GROUND;
    const status = SIDC_STATUS_PRESENT;
    let rawFunctionId = getUnitFunctionIdAPP6(unit.type, unit.capabilities);

    if (!rawFunctionId || rawFunctionId.trim() === '' || rawFunctionId.length > 6) {
        console.warn(`[MapDisplay SIDC Gen] Invalid rawFunctionId "${rawFunctionId}" for unit ${unit.name}. Defaulting to Infantry (UCI---).`);
        rawFunctionId = 'UCI---';
    }

    const isSOF = unit.capabilities.some(c => c.toLowerCase().trim().includes("fuerzas especiales") || c.toLowerCase().trim().includes("sof")) || rawFunctionId.startsWith('UPS');
    if (isSOF) {
        battleDimension = SIDC_DIMENSION_SOF;
    } else if (rawFunctionId.startsWith('UCV')) {
        battleDimension = SIDC_DIMENSION_AIR;
    }

    const echelon = CORRECTED_ECHELON_MAPPING[unit.type] || '-';
    const functionId = rawFunctionId.padEnd(6, '-');
    const sidc = `S${affiliation}${battleDimension}${status}${functionId}-${echelon}---`;
    return sidc;
};

export const getPICCElementSIDC = (type: PICCElementType, options?: SIDCGenerationOptions): string => {
    if (options?.sidc && options.sidc.length >= 10) return options.sidc.toUpperCase();

    let baseSIDC: string;
    const affiliation = options?.affiliation || SIDC_AFFILIATION_UNKNOWN;

    switch (type) {
        case PICCElementType.FRIENDLY_UNIT_POINT_SIT: baseSIDC = `S${SIDC_AFFILIATION_FRIEND}GPUC----`; break;
        case PICCElementType.ENEMY_UNIT_POINT_SIT: baseSIDC = `S${SIDC_AFFILIATION_HOSTILE}GPUC----`; break;
        case PICCElementType.NEUTRAL_POINT_SIT: baseSIDC = `S${SIDC_AFFILIATION_NEUTRAL}GPUC----`; break;
        case PICCElementType.CIVILIAN_POINT_SIT: baseSIDC = `S${SIDC_AFFILIATION_NEUTRAL}GPCV----`; break;

        case PICCElementType.LINE_OF_CONTACT: baseSIDC = PICC_SIDC.LINE_OF_CONTACT; break;
        case PICCElementType.FRIENDLY_MAIN_ATTACK_AXIS: baseSIDC = PICC_SIDC.FRIENDLY_MAIN_ATTACK_AXIS; break;
        case PICCElementType.FRIENDLY_SUPPORTING_ATTACK_AXIS: baseSIDC = `GFGPALS---`; break;
        case PICCElementType.FRIENDLY_ASSEMBLY_AREA: baseSIDC = PICC_SIDC.FRIENDLY_ASSEMBLY_AREA; break;
        case PICCElementType.FRIENDLY_OBJECTIVE: baseSIDC = PICC_SIDC.FRIENDLY_OBJECTIVE; break;
        case PICCElementType.FRIENDLY_TASK_MANEUVER: baseSIDC = `GFFPTF----`; break;

        case PICCElementType.OBSTACLE_MINEFIELD_PLANNED: baseSIDC = PICC_SIDC.PLANNED_MINEFIELD_FRIENDLY; break;
        case PICCElementType.OBSTACLE_MINEFIELD_DETECTED: baseSIDC = PICC_SIDC.DETECTED_MINEFIELD_ENEMY; break;
        case PICCElementType.OBSTACLE_BARRIER_GENERIC: baseSIDC = `G${affiliation}MOO-----`; break;
        case PICCElementType.OBSTACLE_DEMOLITION_PLANNED: baseSIDC = `GFMODP----`; break;

        case PICCElementType.TARGET_REFERENCE_POINT:
            if (affiliation === SIDC_AFFILIATION_HOSTILE) baseSIDC = `GHMPAT----`;
            else if (affiliation === SIDC_AFFILIATION_FRIEND) baseSIDC = `GFMPAT----`;
            else baseSIDC = `G${SIDC_AFFILIATION_NEUTRAL}MPAT----`;
            break;
        case PICCElementType.FSCL_LINE: baseSIDC = PICC_SIDC.FSCL_LINE; break;
        case PICCElementType.CFL_LINE: baseSIDC = PICC_SIDC.CFL_LINE; break;
        case PICCElementType.NFA_AREA: baseSIDC = PICC_SIDC.NFA_AREA; break;
        case PICCElementType.RFA_AREA: baseSIDC = PICC_SIDC.RFA_AREA; break;

        case PICCElementType.NAI_POINT: baseSIDC = PICC_SIDC.NAI_POINT; break;
        case PICCElementType.TPL_LINE: baseSIDC = `GHGALLTP--`; break;
        case PICCElementType.ENEMY_DEFENSIVE_LINE: baseSIDC = PICC_SIDC.ENEMY_DEFENSIVE_LINE; break;
        case PICCElementType.ENEMY_COA_AXIS: baseSIDC = PICC_SIDC.ENEMY_COA_AXIS; break;

        case PICCElementType.CONTROL_PHASE_LINE: baseSIDC = PICC_SIDC.CONTROL_PHASE_LINE; break;
        case PICCElementType.CONTROL_CHECKPOINT: baseSIDC = PICC_SIDC.CONTROL_CHECKPOINT; break;
        case PICCElementType.CONTROL_AREA_GENERIC: baseSIDC = `G${affiliation}GAC-----`; break;

        default:
            console.warn(`PICC Element Type ${type} has no defined SIDC. Using generic point.`);
            baseSIDC = `S${affiliation}GPP-----`;
            break;
    }

    if (baseSIDC.length === 10) {
        const currentAff = baseSIDC.charAt(1).toUpperCase();
        const optionAff = affiliation.toUpperCase();
        if (['F', 'H', 'N', 'U'].includes(currentAff) && currentAff !== optionAff && ['F', 'H', 'N', 'U'].includes(optionAff)) {
            baseSIDC = baseSIDC.charAt(0) + optionAff + baseSIDC.substring(2);
        }
    }
    return baseSIDC.toUpperCase();
};
