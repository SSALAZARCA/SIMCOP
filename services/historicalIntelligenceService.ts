import { GeoLocation, UnitHistoryEvent, AfterActionReport, OsintEvent } from '../types';

export interface HistoricalRecordItem {
  id?: string;
  aff?: string;
  category?: string;
  lat: number;
  lon: number;
  date?: string;
  year?: string | number;
  dept?: string;
  mun?: string;
  place?: string;
  type_op?: string;
  desc?: string;
  groupClean?: string;
  unit?: string;
  brigade?: string;
  div?: string;
  resumen?: string;
}

export interface HistoricalContextOptions {
  centroid?: { lat: number; lon: number };
  radiusKm?: number;
  bounds?: { minLat: number; maxLat: number; minLon: number; maxLon: number };
  unitHistoryLog?: UnitHistoryEvent[];
  afterActionReports?: AfterActionReport[];
  osintEvents?: OsintEvent[];
  maxIncidents?: number;
}

const calculateDistanceKm = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

class HistoricalIntelligenceService {
  private static instance: HistoricalIntelligenceService;
  private cachedStaticEvents: HistoricalRecordItem[] | null = null;
  private isLoadingStatic = false;

  public static getInstance(): HistoricalIntelligenceService {
    if (!HistoricalIntelligenceService.instance) {
      HistoricalIntelligenceService.instance = new HistoricalIntelligenceService();
    }
    return HistoricalIntelligenceService.instance;
  }

  /**
   * Carga bajo demanda los datasets masivos de históricos de inestabilidad (BR23 y contingencias).
   */
  public async loadStaticDatasets(): Promise<HistoricalRecordItem[]> {
    if (this.cachedStaticEvents !== null) {
      return this.cachedStaticEvents;
    }
    if (this.isLoadingStatic) {
      // Esperar si ya se está cargando
      while (this.isLoadingStatic) {
        await new Promise(r => setTimeout(r, 100));
      }
      return this.cachedStaticEvents || [];
    }

    this.isLoadingStatic = true;
    try {
      const response = await fetch('/historico_inestabilidad_br23.json');
      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data)) {
          this.cachedStaticEvents = data;
          this.isLoadingStatic = false;
          return this.cachedStaticEvents;
        }
      }
    } catch (err) {
      console.warn("Fallo cargando dataset primario historico_inestabilidad_br23.json:", err);
    }

    // Fallback táctico liviano si no se pudo cargar el archivo completo
    try {
      const respTactico = await fetch('/historico_inestabilidad_tactico.json');
      if (respTactico.ok) {
        const dataTactico = await respTactico.json();
        if (Array.isArray(dataTactico)) {
          this.cachedStaticEvents = dataTactico;
          this.isLoadingStatic = false;
          return this.cachedStaticEvents;
        }
      }
    } catch (fallbackErr) {
      console.warn("Fallo cargando contingencia táctica histórica:", fallbackErr);
    }

    this.cachedStaticEvents = [];
    this.isLoadingStatic = false;
    return [];
  }

  /**
   * Genera el contexto histórico operacional integral (Datasets Masivos + Historial de Cualquier Unidad + AARs).
   */
  public async getHistoricalTacticalContext(options: HistoricalContextOptions): Promise<string> {
    const {
      centroid,
      radiusKm = 25,
      bounds,
      unitHistoryLog = [],
      afterActionReports = [],
      osintEvents = [],
      maxIncidents = 8
    } = options;

    if (!centroid && !bounds) {
      return "No se ha delimitado un sector geográfico para la búsqueda histórica.";
    }

    // 1. Obtener eventos estáticos disponibles (BR23 y otros datasets cargados)
    const staticEvents = await this.loadStaticDatasets();

    const cLat = centroid ? centroid.lat : ((bounds!.minLat + bounds!.maxLat) / 2);
    const cLon = centroid ? centroid.lon : ((bounds!.minLon + bounds!.maxLon) / 2);

    // 2. Filtrar eventos estáticos dentro del radio del AOI
    const nearbyStatic: { item: HistoricalRecordItem; dist: number }[] = [];
    for (const ev of staticEvents) {
      if (typeof ev.lat === 'number' && typeof ev.lon === 'number') {
        const dist = calculateDistanceKm(cLat, cLon, ev.lat, ev.lon);
        if (dist <= radiusKm) {
          nearbyStatic.push({ item: ev, dist });
        }
      }
    }
    nearbyStatic.sort((a, b) => a.dist - b.dist);

    // 3. Filtrar eventos dinámicos de cualquier unidad (unitHistoryLog)
    const nearbyUnitHistory: { event: UnitHistoryEvent; dist: number }[] = [];
    for (const uEv of unitHistoryLog) {
      if (uEv.location && typeof uEv.location.lat === 'number' && typeof uEv.location.lon === 'number') {
        const dist = calculateDistanceKm(cLat, cLon, uEv.location.lat, uEv.location.lon);
        if (dist <= radiusKm) {
          nearbyUnitHistory.push({ event: uEv, dist });
        }
      }
    }
    nearbyUnitHistory.sort((a, b) => b.event.timestamp - a.event.timestamp);

    // 4. Filtrar Reportes Post-Acción (AAR) de cualquier unidad
    const nearbyAARs: { aar: AfterActionReport; dist: number }[] = [];
    for (const aar of afterActionReports) {
      if (aar.location && typeof aar.location.lat === 'number' && typeof aar.location.lon === 'number') {
        const dist = calculateDistanceKm(cLat, cLon, aar.location.lat, aar.location.lon);
        if (dist <= radiusKm) {
          nearbyAARs.push({ aar, dist });
        }
      }
    }
    nearbyAARs.sort((a, b) => b.aar.reportTimestamp - a.aar.reportTimestamp);

    // Si no hay ningún evento en la zona
    const totalEventsFound = nearbyStatic.length + nearbyUnitHistory.length + nearbyAARs.length;
    if (totalEventsFound === 0) {
      return `No se registran antecedentes hostiles o novedades históricas archivadas en un radio de ${radiusKm} km alrededor del sector [${cLat.toFixed(4)}°, ${cLon.toFixed(4)}°].`;
    }

    // 5. Análisis Estadístico y Reconocimiento de Patrones Hostiles
    const categoryCounts: Record<string, number> = {};
    const groupCounts: Record<string, number> = {};
    const affectedUnits = new Set<string>();

    for (const { item } of nearbyStatic) {
      const cat = (item.category || item.type_op || "OTROS").toUpperCase().trim();
      categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;

      const grp = (item.groupClean || item.desc || "GAO NO ESPECIFICADO").toUpperCase().trim();
      if (grp && grp !== "N/A" && grp !== "") {
        groupCounts[grp] = (groupCounts[grp] || 0) + 1;
      }
      if (item.unit) affectedUnits.add(item.unit);
      if (item.brigade) affectedUnits.add(item.brigade);
    }

    // Extraer AARs y eventos dinámicos a las estadísticas
    for (const { aar } of nearbyAARs) {
      affectedUnits.add(aar.unitName);
      const cat = `COMBATE AAR (CONTACTO ARMADO)`;
      categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
    }

    for (const { event } of nearbyUnitHistory) {
      if (event.unitName) affectedUnits.add(event.unitName);
      const cat = `NOVEDAD UNIDAD (${event.eventType})`;
      categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
    }

    const topCategories = Object.entries(categoryCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([k, v]) => `${k}: ${v} incidentes`)
      .join(', ');

    const topGroups = Object.entries(groupCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([k, v]) => `${k} (${v} acciones)`)
      .join(', ');

    // 6. Síntesis de los incidentes más relevantes y cercanos
    const incidentsSummary: string[] = [];

    // Priorizar AARs recientes (combates reales)
    for (const { aar, dist } of nearbyAARs.slice(0, 3)) {
      const dateStr = new Date(aar.combatEndTimestamp || aar.reportTimestamp).toLocaleDateString('es-CO');
      incidentsSummary.push(
        `- [COMBATE RECIENTE AAR] Unidad: "${aar.unitName}" (${dateStr}, a ${dist.toFixed(1)} km en [${aar.location.lat.toFixed(4)}°, ${aar.location.lon.toFixed(4)}°]): ` +
        `Bajas Propias: ${aar.casualtiesKia} KIA, ${aar.casualtiesWia} WIA. Bajas Enemigas: ${aar.enemyCasualtiesKia || 0}. ` +
        `Observaciones/Lecciones: ${aar.positiveObservations || aar.summary || "Contacto armado registrado"}`
      );
    }

    // Eventos dinámicos de historial de unidades
    for (const { event, dist } of nearbyUnitHistory.slice(0, 3)) {
      const dateStr = new Date(event.timestamp).toLocaleDateString('es-CO');
      incidentsSummary.push(
        `- [HISTORIAL UNIDAD] ${event.unitName || 'Fuerza Propia'} - ${event.eventType} (${dateStr}, a ${dist.toFixed(1)} km): ` +
        `${event.details}`
      );
    }

    // Incidentes históricos de la base de datos (BR23 y registros militares)
    for (const { item, dist } of nearbyStatic.slice(0, maxIncidents)) {
      const dateStr = item.date || item.year || "Fecha Histórica";
      const placeStr = item.place ? `${item.place}, ${item.mun || ''}` : (item.mun || 'Sector rural');
      const actorStr = item.groupClean ? `[Actor: ${item.groupClean}]` : '';
      incidentsSummary.push(
        `- [HISTÓRICO OPERACIONAL] ${dateStr} - ${placeStr} (a ${dist.toFixed(1)} km en [${item.lat.toFixed(4)}°, ${item.lon.toFixed(4)}°]): ` +
        `${item.category || item.type_op || 'Incidente'} ${actorStr} - ${item.resumen || item.desc || 'Acción hostil registrada en archivo operacional'}`
      );
    }

    const unitsOperatedStr = affectedUnits.size > 0 
      ? Array.from(affectedUnits).slice(0, 6).join(', ')
      : "Unidades orgánicas del escalón territorial";

    return (
      `ANTECEDENTES HISTÓRICOS Y FACTORES DE INESTABILIDAD EN EL AOI (RADIO ${radiusKm} KM):\n` +
      `- Volumen Histórico Registrado: ${totalEventsFound} incidentes identificados en este cuadrante operativo.\n` +
      `- Patrón Hostil Predominante: ${topCategories || 'Incidentes de control territorial y seguridad'}.\n` +
      (topGroups ? `- Estructuras y Actores Hostiles Históricos: ${topGroups}.\n` : '') +
      `- Unidades que han operado en el sector: ${unitsOperatedStr}.\n` +
      `- Incidentes Críticos y Contactos de Combate Relevantes:\n` +
      incidentsSummary.join('\n')
    );
  }
}

export const historicalIntelligenceService = HistoricalIntelligenceService.getInstance();
