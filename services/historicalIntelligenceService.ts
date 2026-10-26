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
  // Blindaje Territorial Persistente (AOR / Geofencing):
  assignedAreaGeoJson?: string;
  assignedDepartment?: string;
  unitName?: string;
  echelonLevel?: 'COEJC' | 'DIVISION' | 'BRIGADA' | 'BATALLON' | 'COMPANIA' | 'PELOTON';
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

// Algoritmo matemático Point-in-Polygon (Ray Casting) para Geocerca Territorial Inviolable
function isPointInPolygon(point: [number, number], vs: [number, number][]): boolean {
  const x = point[0], y = point[1]; // x = lon, y = lat
  let inside = false;
  for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
    const xi = vs[i][0], yi = vs[i][1];
    const xj = vs[j][0], yj = vs[j][1];
    const intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

function checkPointInGeoJson(lat: number, lon: number, geoJsonString?: string): boolean {
  if (!geoJsonString) return true;
  try {
    const parsed = typeof geoJsonString === 'string' ? JSON.parse(geoJsonString) : geoJsonString;
    const geometry = parsed.geometry || parsed;
    if (geometry.type === 'Polygon' && Array.isArray(geometry.coordinates)) {
      const ring = geometry.coordinates[0];
      return isPointInPolygon([lon, lat], ring);
    } else if (geometry.type === 'MultiPolygon' && Array.isArray(geometry.coordinates)) {
      return geometry.coordinates.some((poly: [number, number][][]) => isPointInPolygon([lon, lat], poly[0]));
    }
    return true;
  } catch (e) {
    return true;
  }
}

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
      maxIncidents = 8,
      assignedAreaGeoJson,
      assignedDepartment,
      unitName = "Unidad Asignada",
      echelonLevel = "BATALLON"
    } = options;

    if (!centroid && !bounds && !assignedAreaGeoJson) {
      return "No se ha delimitado un sector geográfico para la búsqueda histórica.";
    }

    // 1. Obtener eventos estáticos disponibles (BR23 y otros datasets cargados)
    const staticEvents = await this.loadStaticDatasets();

    const cLat = centroid ? centroid.lat : bounds ? ((bounds.minLat + bounds.maxLat) / 2) : 1.25;
    const cLon = centroid ? centroid.lon : bounds ? ((bounds.minLon + bounds.maxLon) / 2) : -77.3;

    // 2. Filtrar eventos estáticos aplicando Blindaje Territorial en 2 capas:
    // Capa 1: Validación de Departamento (evita saltos entre teatros como Nariño vs La Guajira)
    // Capa 2: Geocerca Point-in-Polygon sobre el GeoJSON asignado a la unidad militar
    const nearbyStatic: { item: HistoricalRecordItem; dist: number }[] = [];
    for (const ev of staticEvents) {
      if (typeof ev.lat === 'number' && typeof ev.lon === 'number') {
        // Blindaje por Departamento Administrativo
        if (assignedDepartment && ev.dept) {
          const normEvDept = ev.dept.toUpperCase().trim();
          const normAssigned = assignedDepartment.toUpperCase().trim();
          if (normEvDept !== normAssigned && !normEvDept.includes(normAssigned)) {
            continue; // Descartado de raíz: pertenece a otro departamento/teatro
          }
        }

        // Blindaje por Geocerca Territorial Exacta (Point-in-Polygon)
        if (assignedAreaGeoJson && !checkPointInGeoJson(ev.lat, ev.lon, assignedAreaGeoJson)) {
          continue; // Descartado: cae fuera del perímetro asignado al Batallón
        }

        const dist = calculateDistanceKm(cLat, cLon, ev.lat, ev.lon);
        if (dist <= radiusKm) {
          nearbyStatic.push({ item: ev, dist });
        }
      }
    }
    nearbyStatic.sort((a, b) => a.dist - b.dist);

    // 3. Filtrar eventos dinámicos de historial de unidades respetando la geocerca
    const nearbyUnitHistory: { event: UnitHistoryEvent; dist: number }[] = [];
    for (const uEv of unitHistoryLog) {
      if (uEv.location && typeof uEv.location.lat === 'number' && typeof uEv.location.lon === 'number') {
        if (assignedAreaGeoJson && !checkPointInGeoJson(uEv.location.lat, uEv.location.lon, assignedAreaGeoJson)) {
          continue;
        }
        const dist = calculateDistanceKm(cLat, cLon, uEv.location.lat, uEv.location.lon);
        if (dist <= radiusKm) {
          nearbyUnitHistory.push({ event: uEv, dist });
        }
      }
    }
    nearbyUnitHistory.sort((a, b) => b.event.timestamp - a.event.timestamp);

    // 4. Filtrar Reportes Post-Acción (AAR) respetando la geocerca
    const nearbyAARs: { aar: AfterActionReport; dist: number }[] = [];
    for (const aar of afterActionReports) {
      if (aar.location && typeof aar.location.lat === 'number' && typeof aar.location.lon === 'number') {
        if (assignedAreaGeoJson && !checkPointInGeoJson(aar.location.lat, aar.location.lon, assignedAreaGeoJson)) {
          continue;
        }
        const dist = calculateDistanceKm(cLat, cLon, aar.location.lat, aar.location.lon);
        if (dist <= radiusKm) {
          nearbyAARs.push({ aar, dist });
        }
      }
    }
    nearbyAARs.sort((a, b) => b.aar.reportTimestamp - a.aar.reportTimestamp);

    // 5. Filtrar Eventos OSINT Soberanos respetando la geocerca
    const nearbyOsint: { osint: OsintEvent; dist: number }[] = [];
    for (const oEv of osintEvents) {
      if (oEv.location && typeof oEv.location.lat === 'number' && typeof oEv.location.lon === 'number') {
        if (assignedAreaGeoJson && !checkPointInGeoJson(oEv.location.lat, oEv.location.lon, assignedAreaGeoJson)) {
          continue;
        }
        const dist = calculateDistanceKm(cLat, cLon, oEv.location.lat, oEv.location.lon);
        if (dist <= radiusKm) {
          nearbyOsint.push({ osint: oEv, dist });
        }
      }
    }
    nearbyOsint.sort((a, b) => new Date(b.osint.eventTimestamp || 0).getTime() - new Date(a.osint.eventTimestamp || 0).getTime());

    // Si no hay ningún evento en la zona
    const totalEventsFound = nearbyStatic.length + nearbyUnitHistory.length + nearbyAARs.length + nearbyOsint.length;
    if (totalEventsFound === 0) {
      return `No se registran antecedentes hostiles ni novedades archivadas dentro del Área Asignada a ${unitName} (${assignedDepartment || 'Jurisdicción'}).`;
    }

    // 6. Análisis Estadístico y Reconocimiento de Patrones Hostiles
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

    // 7. Formateo en EJE TEMPORAL ESTRICTO (3 Capas) para evitar cualquier anacronismo
    const pastIncidents: string[] = [];
    for (const { item, dist } of nearbyStatic.slice(0, maxIncidents)) {
      const dateStr = item.date || item.year || "Fecha Histórica";
      const placeStr = item.place ? `${item.place}, ${item.mun || ''}` : (item.mun || 'Sector rural');
      const actorStr = item.groupClean ? `[Actor: ${item.groupClean}]` : '';
      pastIncidents.push(
        `  • [ANTECEDENTE ${dateStr}] en ${placeStr} (a ${dist.toFixed(1)} km): ${item.category || item.type_op || 'Acción hostil'} ${actorStr} - ${item.resumen || item.desc || 'Registro archivado'}`
      );
    }

    const presentEvents: string[] = [];
    for (const { aar, dist } of nearbyAARs.slice(0, 2)) {
      const dateStr = new Date(aar.combatEndTimestamp || aar.reportTimestamp).toLocaleDateString('es-CO');
      presentEvents.push(
        `  • [AAR RECIENTE ${dateStr}] Unidad "${aar.unitName}" (a ${dist.toFixed(1)} km): Bajas Propias ${aar.casualtiesKia} KIA, ${aar.casualtiesWia} WIA. Enemigas: ${aar.enemyCasualtiesKia || 0}. Resumen: ${aar.summary || 'Contacto armado'}`
      );
    }
    for (const { osint, dist } of nearbyOsint.slice(0, 3)) {
      const dateStr = osint.eventTimestamp ? new Date(osint.eventTimestamp).toLocaleDateString('es-CO') : 'Reciente';
      presentEvents.push(
        `  • [ALERTA OSINT/SAT ${dateStr}] ${osint.title || 'Reporte de Fuente Abierta'} (a ${dist.toFixed(1)} km): ${osint.summary || 'Alerta comunitaria'}`
      );
    }

    const unitsOperatedStr = affectedUnits.size > 0 
      ? Array.from(affectedUnits).slice(0, 6).join(', ')
      : "Unidades orgánicas del escalón territorial";

    return (
      `========================================================================\n` +
      `EJE TEMPORAL Y CONVERGENCIA TODO-FUENTE (AOR: ${unitName.toUpperCase()} - ESCALÓN: ${echelonLevel})\n` +
      `JURISDICCIÓN ASIGNADA: ${assignedDepartment || 'SECTOR DELIMITADO'} | TOTAL EVENTOS: ${totalEventsFound}\n` +
      `========================================================================\n\n` +
      `[CAPA 1: MEMORIA HISTÓRICA & PATRONES EN EL AOR (PASADO)]\n` +
      `⚠️ REGLA DE VIGENCIA: Estos antecedentes ocurrieron en años anteriores (2018-2025).\n` +
      `Prohibido tratarlos como combate activo hoy; sirven exclusivamente para inferir el MODUS OPERANDI.\n` +
      `- Volumen Histórico en AOR: ${nearbyStatic.length} antecedentes archivados.\n` +
      `- Modus Operandi Predominante: ${topCategories || 'Control de corredores de movilidad'}.\n` +
      (topGroups ? `- Estructuras y Actores Hostiles Históricos: ${topGroups}.\n` : '') +
      `- Unidades que han operado en el sector: ${unitsOperatedStr}.\n` +
      `- Registros Históricos Documentados:\n` +
      (pastIncidents.length > 0 ? pastIncidents.join('\n') : '  • No hay incidentes estáticos adicionales.') + '\n\n' +
      `[CAPA 2: SITUACIÓN OPERACIONAL EN TIEMPO REAL (PRESENTE)]\n` +
      `Información activa de las últimas 24-72 horas (AARs de combate, novedades y alertas comunitarias/SAT):\n` +
      (presentEvents.length > 0 ? presentEvents.join('\n') : '  • Sin novedades tácticas críticas o alertas abiertas en las últimas 72h.') + '\n\n' +
      `[CAPA 3: SÍNTESIS PREDICTIVA Y ANTICIPACIÓN TÁCTICA (FUTURO)]\n` +
      `Cruce de Modus Operandi Histórico con Posición Actual para el Comandante:\n` +
      `- Correlación: Si tropas propias avanzan sobre ejes con antecedentes de hostigamiento bajo lluvia/niebla, elevar nivel de alerta.\n` +
      `- Vector de Riesgo: ${topCategories ? topCategories.split(',')[0] : 'Vigilancia en puntos críticos y cuellos de botella'}.\n` +
      `========================================================================`
    );
  }
}

export const historicalIntelligenceService = HistoricalIntelligenceService.getInstance();
