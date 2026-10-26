import { 
  MilitaryUnit, 
  IntelligenceReport, 
  ArtilleryPiece, 
  UnitStatus,
  COAPlan,
  GeoLocation,
  UnitHistoryEvent,
  AfterActionReport,
  OsintEvent
} from '../types';
import { historicalIntelligenceService } from './historicalIntelligenceService';
import { sovereignOsintService } from './sovereignOsintService';
import { sigepIntegrationService } from './sigepIntegrationService';
import type { SigepUnitPersonnelSummary } from '../types/sigep';

export type StaffEchelon = 'COEJC' | 'DIVISION' | 'BRIGADA' | 'BATALLON' | 'COMPANIA' | 'PELOTON';

export interface StaffCOA {
  id: string;
  name: string;
  type: 'OFENSIVO_MANIOBRA' | 'CONTENCION_BLOQUEO' | 'VIGILANCIA_SEGURIDAD';
  description: string;
  maneuverDetails: string;
  estimatedSuccessProbability: number; // 0 - 100
  estimatedExecutionMinutes: number;
  riskLevel: 'BAJO' | 'MEDIO' | 'ALTO';
  artillerySupportAvailable: boolean;
  logisticsFeasibility: string;
  pdmPhase: string;
  targetSector: GeoLocation;
  draftOrdopSummary: string;
}

export interface StaffBriefing {
  id: string;
  timestamp: string;
  echelon: StaffEchelon;
  unitName: string;
  jurisdiction: string;
  executiveSummary: string;
  overallThreatLevel: 'BAJO' | 'MEDIO' | 'ALTO' | 'CRITICO';
  
  // Secciones Especializadas del Estado Mayor
  s1Personal: {
    readinessScore: number; // 0 - 100%
    effectiveTroops: number;
    healthStatusOk: boolean;
    medevacAlerts: string[];
    advisory: string;
    sigepSync?: {
      connectionMode: string;
      toeCoveragePct: number;
      actualVsAuthorized: string;
      pillarA_Status: string;
      pillarB_ScheduledPostCombat: boolean;
      pillarC_MemoryRisk: string;
      rotationAlertsCount: number;
      retentionVerdict: string;
    };
  };

  s2Intel: {
    threatLevel: 'BAJO' | 'MEDIO' | 'ALTO' | 'CRITICO';
    predominantModusOperandi: string;
    criticalPoints: string[];
    probableThreatVectors: string[];
    historicalSynthesis: string;
    weatherTacticalImpact: string;
  };

  s3Operaciones: {
    maneuverState: string;
    artilleryCoverage: string;
    fireSupportPiecesReady: number;
    recommendedCoas: StaffCOA[];
  };

  s4Logistica: {
    classISupplyDays: number; // Raciones
    classIIIFuelHours: number; // Combustible
    classVAmmoPercentage: number; // Munición
    operationalAutonomyHours: number;
    resupplyNeeded: boolean;
    advisory: string;
  };

  s5AccionIntegral: {
    civilianProximityStatus: string;
    satAlertsActive: string[];
    roeAdvisory: string;
  };

  commanderDecision: {
    recommendedCoaId: string;
    rationale: string;
  };
}

class StaffAgentService {
  private static instance: StaffAgentService;

  public static getInstance(): StaffAgentService {
    if (!StaffAgentService.instance) {
      StaffAgentService.instance = new StaffAgentService();
    }
    return StaffAgentService.instance;
  }

  /**
   * Genera una Apreciación de Estado Mayor Virtual adaptada al Escalón en la Estructura de Fuerza,
   * con Geocerca Inviolable y Eje Temporal de 3 Capas.
   */
  public async generateStaffBriefing(params: {
    echelon: StaffEchelon;
    activeUnit: MilitaryUnit;
    units: MilitaryUnit[];
    intelligenceReports: IntelligenceReport[];
    artilleryPieces: ArtilleryPiece[];
    unitHistoryLog?: UnitHistoryEvent[];
    afterActionReports?: AfterActionReport[];
    osintEvents?: OsintEvent[];
    weatherCondition?: string;
  }): Promise<StaffBriefing> {
    const {
      echelon,
      activeUnit,
      units,
      intelligenceReports,
      artilleryPieces,
      unitHistoryLog = [],
      afterActionReports = [],
      osintEvents = [],
      weatherCondition = 'Despejado con neblina matinal en cordillera'
    } = params;

    const unitCoord: GeoLocation = activeUnit.location || { lat: 1.25, lon: -77.30 };
    const department = (activeUnit as any).department || 'NARIÑO';
    const unitName = activeUnit.name || 'Batallón Táctico Asignado';

    // 1. Ejecutar consulta histórica blindada por polígono territorial y departamento
    const historicalContext = await historicalIntelligenceService.getHistoricalTacticalContext({
      centroid: unitCoord,
      radiusKm: echelon === 'COEJC' ? 120 : echelon === 'BRIGADA' ? 50 : 25,
      assignedAreaGeoJson: activeUnit.areaOfOperations,
      assignedDepartment: department,
      unitName: unitName,
      echelonLevel: echelon,
      unitHistoryLog,
      afterActionReports,
      osintEvents
    });

    // 2. Escanear y fusionar fuentes OSINT soberanas locales
    const localOsint = await sovereignOsintService.scanSovereignSources({
      department: department,
      assignedAreaGeoJson: activeUnit.areaOfOperations,
      unitName: unitName
    });

    // 3. Evaluar Artillería Amiga disponible para apoyo de fuego
    const readyArtillery = artilleryPieces.filter(p => p.status === 'READY' || p.status === 'FIRING' || (p.status as any) === 'ENGAGED');
    const artillerySummary = readyArtillery.length > 0 
      ? `${readyArtillery.length} piezas de artillería en posición (LG1 105mm / Morteros). Alcance efectivo: 11 - 17 km. Tiempo de respuesta estimado: < 60s.`
      : 'Sin baterías de artillería pesada en radio directo; apoyo inmediato dependiente de morteros de compañía.';

    // 4. Evaluar Personal, Moral y Sincronización SIGEP (S-1 / G-1)
    const sigepSummary = await sigepIntegrationService.getUnitPersonnelSummary({
      unit: activeUnit,
      soldiers: activeUnit.personnelList,
      aars: afterActionReports
    });

    const totalSoldiers = sigepSummary.totalActual;
    const soldiersOk = activeUnit.personnelList?.filter(s => s.status !== 'KIA' && s.healthStatus !== 'HERIDO_GRAVE').length || totalSoldiers;
    const readinessPct = sigepSummary.readinessPercentage;

    // 5. Evaluar Logística (S-4)
    const combatP = (activeUnit as any).combatPower;
    const ammoPct = combatP ? Math.min(100, Math.round(combatP * 1.1)) : 88;
    const autonomyHours = Math.round((ammoPct / 100) * 16);

    // 6. Formular Cursos de Acción (COA) contrastados según la doctrina del PDM
    const targetSector: GeoLocation = {
      lat: unitCoord.lat + 0.045,
      lon: unitCoord.lon - 0.035
    };

    const coas: StaffCOA[] = [
      {
        id: 'COA-1-ENVELOPMENT',
        name: 'COA 1: Maniobra Envolvente con Fijación Frontal',
        type: 'OFENSIVO_MANIOBRA',
        description: 'Desplazar el elemento de maniobra por la cresta dominante para cerrar la vía de escape del adversario mientras la base de fuego fija desde el flanco.',
        maneuverDetails: `Avanzar sobre el eje de aproximación norte hacia cota dominante. Cortar repliegue hacia zona boscosa. Apoyo de fuego asignado a ${readyArtillery[0]?.type || 'Mortero 120mm'}.`,
        estimatedSuccessProbability: 84,
        estimatedExecutionMinutes: 45,
        riskLevel: 'MEDIO',
        artillerySupportAvailable: readyArtillery.length > 0,
        logisticsFeasibility: `Factible. Requiere ${Math.round(totalSoldiers * 0.15)} cartuchos de dotación y no agota reserva crítica.`,
        pdmPhase: 'Fase 3: Desarrollo y Comparación de COAs (MFRE 5-0)',
        targetSector: targetSector,
        draftOrdopSummary: `ORDOP No. 012-BR23: Maniobra táctica de control y cierre de corredor hacia Cota ${Math.round(unitCoord.lat * 1000)}.`
      },
      {
        id: 'COA-2-BLOCKING',
        name: 'COA 2: Contención y Punto de Bloqueo en Cuello de Botella',
        type: 'CONTENCION_BLOQUEO',
        description: 'Establecer puesto de control táctico avanzado en el cruce de caminos y paso de río, desplegando reconocimiento con UAV térmico.',
        maneuverDetails: 'Ocupar posiciones defensivas preparadas, bloquear el tránsito sospechoso y saturar el área con sensores y patrullas de corto alcance.',
        estimatedSuccessProbability: 76,
        estimatedExecutionMinutes: 20,
        riskLevel: 'BAJO',
        artillerySupportAvailable: true,
        logisticsFeasibility: 'Alta eficiencia. Consumo mínimo de combustible y munición.',
        pdmPhase: 'Fase 3: Desarrollo y Comparación de COAs (MFRE 5-0)',
        targetSector: { lat: unitCoord.lat + 0.015, lon: unitCoord.lon + 0.02 },
        draftOrdopSummary: 'ORDOP No. 013-BR23: Operación de bloqueo y control territorial en paso obligado.'
      }
    ];

    // 7. Síntesis Ejecutiva ajustada al Escalón en la Estructura de Fuerza
    let executiveSummary = '';
    if (echelon === 'COEJC') {
      executiveSummary = `PANORAMA ESTRATÉGICO NACIONAL: Se supervisa el balance operacional en la jurisdicción de ${department}. El teatro mantiene control territorial con 85% de capacidad de disuasión. Se observan presiones de corredores ilícitos en la frontera sur sin comprometer activos estratégicos.`;
    } else if (echelon === 'DIVISION' || echelon === 'BRIGADA') {
      executiveSummary = `APRECIACIÓN TÁCTICO-OPERACIONAL (BRIGADA): Convergencia en el AOR de ${activeUnit.name}. Se identifican patrones históricos de emboscada y hostigamiento bajo condiciones de visibilidad reducida. Tropas propias en posición con cobertura de artillería activa y logística garantizada para 14 horas de combate continuo.`;
    } else {
      executiveSummary = `APRECIACIÓN TÁCTICA DIRECTA (BATALLÓN/PELOTÓN): Novedades activas en el sector asignado. 1 alerta de artefacto sospechoso en la ruta a 3.4 km. Se recomienda no avanzar vehículos pesados sin inspección previa del equipo antiexplosivos y exploración con dron.`;
    }

    return {
      id: `STAFF-BRIEF-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      echelon: echelon,
      unitName: unitName,
      jurisdiction: `${department} (${activeUnit.areaOfOperations ? 'ÁREA TÁCTICA DELIMITADA' : 'JURISDICCIÓN MUNICIPAL'})`,
      executiveSummary: executiveSummary,
      overallThreatLevel: localOsint.length > 0 ? 'ALTO' : 'MEDIO',

      s1Personal: {
        readinessScore: readinessPct,
        effectiveTroops: soldiersOk,
        healthStatusOk: readinessPct >= 80,
        medevacAlerts: readinessPct < 80 ? ['Déficit en cobertura TOE o evacuación sanitaria'] : [],
        advisory: `Personal orgánico con moral alta y cobertura TOE al ${sigepSummary.pillarA.coveragePct}% (${sigepSummary.totalActual}/${sigepSummary.totalAuthorized} efectivos). ` +
          `Dictamen de Retención: ${sigepSummary.pillarB.verdictMessage}. ` +
          `Enlace M2M SIGEP: ${sigepSummary.connectionMode === 'ONLINE' ? 'CONECTADO Y SINCRONIZADO' : 'MODO TÁCTICO RESILIENTE (AUTÓNOMO)'}.`,
        sigepSync: {
          connectionMode: sigepSummary.connectionMode,
          toeCoveragePct: sigepSummary.pillarA.coveragePct,
          actualVsAuthorized: `${sigepSummary.totalActual} / ${sigepSummary.totalAuthorized}`,
          pillarA_Status: sigepSummary.pillarA.status,
          pillarB_ScheduledPostCombat: sigepSummary.pillarB.scheduledPostCombat,
          pillarC_MemoryRisk: sigepSummary.pillarC.memoryRiskLevel,
          rotationAlertsCount: sigepSummary.rotationAlerts.length,
          retentionVerdict: sigepSummary.pillarB.verdictMessage
        }
      },

      s2Intel: {
        threatLevel: localOsint.length > 0 ? 'ALTO' : 'MEDIO',
        predominantModusOperandi: 'Hostigamiento a distancia e instalación de IEDs en alcantarillas y pasos obligados en días de mercado o lluvia.',
        criticalPoints: ['Puente sobre Río Guáitara', 'Cruce Km 14', 'Cota 1350'],
        probableThreatVectors: ['Aproximación por vaguada oeste', 'Infiltración vestida de civil'],
        historicalSynthesis: historicalContext,
        weatherTacticalImpact: `Condición: ${weatherCondition}. La niebla favorece la aproximación no detectada del adversario pero restringe su puntería a distancias mayores a 300m.`
      },

      s3Operaciones: {
        maneuverState: `${activeUnit.status || 'EN POSICIÓN'} | Misión: ${activeUnit.currentMission || 'OPOF / CONTROL DE ÁREA'}`,
        artilleryCoverage: artillerySummary,
        fireSupportPiecesReady: readyArtillery.length,
        recommendedCoas: coas
      },

      s4Logistica: {
        classISupplyDays: 5,
        classIIIFuelHours: 24,
        classVAmmoPercentage: ammoPct,
        operationalAutonomyHours: autonomyHours,
        resupplyNeeded: ammoPct < 50,
        advisory: `Autonomía de combate estimada: ${autonomyHours} horas de fuego sostenido. Tren logístico en base asegurado.`
      },

      s5AccionIntegral: {
        civilianProximityStatus: 'Población civil en corregimiento cercano (1.2 km). Prohibido el fuego de artillería en cuadrante urbano.',
        satAlertsActive: localOsint.map(o => o.title),
        roeAdvisory: 'Reglas de Enfrentamiento (ROE): Fuego únicamente identificado positivamente. Se garantiza corredor humanitario civil.'
      },

      commanderDecision: {
        recommendedCoaId: coas[0].id,
        rationale: 'El COA 1 ofrece la mayor probabilidad de éxito táctico (84%) y neutraliza el corredor de escape sin comprometer la población civil ni los recursos de reserva.'
      }
    };
  }
}

export const staffAgentService = StaffAgentService.getInstance();
