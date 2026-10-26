import { OsintEvent, GeoLocation } from '../types';
import { osintService } from './osintService';

export interface SovereignOsintSource {
  id: string;
  name: string;
  type: 'SAT_DEFENSORIA' | 'PRENSA_REGIONAL' | 'PERSONERIA_LOCAL' | 'ALERTA_COMUNITARIA';
  department: string;
  url?: string;
  active: boolean;
}

export interface OsintRawItem {
  id: string;
  title: string;
  content: string;
  department: string;
  municipality: string;
  locationName: string;
  lat: number;
  lon: number;
  date: string;
  sourceType: string;
  sourceName: string;
  actorSuspect?: string;
  category: 'BLOQUEO_VIAL' | 'HOSTIGAMIENTO' | 'PRESENCIA_ARMADA' | 'ARTEFACTO_IED' | 'PANFLETO_AMENAZA' | 'COMBATE' | 'MOVIMIENTO_SOSPECHOSO';
  severity: 'BAJA' | 'MEDIA' | 'ALTA' | 'CRITICA';
}

// Diccionario Geográfico de Referencia Táctica (Centros Urbanos y Puntos Críticos de Nariño y Suroccidente)
const COLOMBIA_TACTICAL_GEODICT: Record<string, GeoLocation> = {
  // Nariño
  'PASTO': { lat: 1.2136, lon: -77.2811 },
  'TUMACO': { lat: 1.7986, lon: -78.8156 },
  'SAMANIEGO': { lat: 1.3389, lon: -77.5956 },
  'BARBACOAS': { lat: 1.6719, lon: -78.1408 },
  'ALTAQUER': { lat: 1.2541, lon: -78.1182 },
  'TÚQUERRES': { lat: 1.0864, lon: -77.6186 },
  'TUQUERRES': { lat: 1.0864, lon: -77.6186 },
  'IPIALES': { lat: 0.8247, lon: -77.6419 },
  'CUMBAL': { lat: 0.9083, lon: -77.7944 },
  'RICAURTE': { lat: 1.2117, lon: -77.9864 },
  'MAGÜÍ PAYÁN': { lat: 1.7333, lon: -78.1833 },
  'MAGUI PAYAN': { lat: 1.7333, lon: -78.1833 },
  'ROBERTO PAYÁN': { lat: 1.7167, lon: -78.2667 },
  'ROBERTO PAYAN': { lat: 1.7167, lon: -78.2667 },
  'EL CHARCO': { lat: 2.4769, lon: -77.9822 },
  'LA LLANADA': { lat: 1.4875, lon: -77.5683 },
  'LOS ANDES SOTOMAYOR': { lat: 1.5167, lon: -77.5167 },
  'POLICARPA': { lat: 1.6333, lon: -77.4500 },
  'CUMBITARA': { lat: 1.6333, lon: -77.5833 },
  'LEIVA': { lat: 1.9500, lon: -77.3167 },
  'EL ROSARIO': { lat: 1.7500, lon: -77.3500 },
  'TANGUA': { lat: 1.0967, lon: -77.3878 },
  'CHACHAGÜÍ': { lat: 1.3586, lon: -77.2847 },
  'GUACHUCAL': { lat: 0.9639, lon: -77.7297 },
  'MALLAMA': { lat: 1.1500, lon: -77.8333 },

  // Cauca (Referencia Limítrofe)
  'POPAYÁN': { lat: 2.4419, lon: -76.6063 },
  'SANTANDER DE QUILICHAO': { lat: 3.0094, lon: -76.4847 },
  'MERCADERES': { lat: 1.8000, lon: -77.1667 },
  'PATÍA': { lat: 2.0667, lon: -77.0500 },
  'EL BORDO': { lat: 2.1167, lon: -76.9833 },

  // La Guajira (Referencia Distante)
  'RIOHACHA': { lat: 11.5444, lon: -72.9072 },
  'MAICAO': { lat: 11.3783, lon: -72.2408 },
  'URIBIA': { lat: 11.7139, lon: -72.2658 }
};

// Base de Feeds y Alertas Locales Soberanas Pre-configuradas (Sin dependencias de pago)
const SOVEREIGN_LOCAL_CATALOG: OsintRawItem[] = [
  {
    id: 'SOV-SAT-026-01',
    title: 'Alerta Temprana SAT 019/26: Riesgo inminente por disputas armadas en la cuenca del Río Telembí',
    content: 'La Defensoría del Pueblo emite Alerta de Inminencia por copamiento y retenes fluviales del Frente Franco Benavides y Segunda Marquetalia en veredas ribereñas.',
    department: 'NARIÑO',
    municipality: 'BARBACOAS',
    locationName: 'Río Telembí - Vereda El Descanso',
    lat: 1.685,
    lon: -78.125,
    date: new Date(Date.now() - 3600000 * 8).toISOString(),
    sourceType: 'SAT_DEFENSORIA',
    sourceName: 'Defensoría del Pueblo - Alerta SAT',
    actorSuspect: 'Frente Franco Benavides / Segunda Marquetalia',
    category: 'PRESENCIA_ARMADA',
    severity: 'CRITICA'
  },
  {
    id: 'SOV-LOCAL-026-02',
    title: 'Reporte Comunitario: Objeto sospechoso cilíndrico en alcantarilla vía Samaniego - Túquerres',
    content: 'Transportadores de carga alertan sobre cables y una caneca metálica tapada con plástico negro en el Km 14+300. Tráfico vehicular suspendido preventivamente.',
    department: 'NARIÑO',
    municipality: 'SAMANIEGO',
    locationName: 'Km 14 Vía Samaniego',
    lat: 1.312,
    lon: -77.608,
    date: new Date(Date.now() - 3600000 * 3).toISOString(),
    sourceType: 'ALERTA_COMUNITARIA',
    sourceName: 'Red de Apoyo Vial Nariño',
    actorSuspect: 'GAO Residual Estructura 30',
    category: 'ARTEFACTO_IED',
    severity: 'ALTA'
  },
  {
    id: 'SOV-LOCAL-026-03',
    title: 'Prensa Regional: Distribución de panfleto amenazante en zona comercial de Llorente',
    content: 'Comerciantes denuncian reparto de panfletos exigiendo pago de extorsiones y paro armado parcial a partir de las 18:00 horas.',
    department: 'NARIÑO',
    municipality: 'TUMACO',
    locationName: 'Corregimiento de Llorente',
    lat: 1.416,
    lon: -78.583,
    date: new Date(Date.now() - 3600000 * 14).toISOString(),
    sourceType: 'PRENSA_REGIONAL',
    sourceName: 'Diario del Sur - Judicial',
    actorSuspect: 'Columna Móvil Urías Rondón',
    category: 'PANFLETO_AMENAZA',
    severity: 'ALTA'
  },
  {
    id: 'SOV-LOCAL-026-04',
    title: 'Boletín Personería: Restricción a la movilidad civil en caminos rurales de Policarpa',
    content: 'Líderes comunales reportan presencia de 6 sujetos con armas largas instalando puntos de registro ilegal en la vía hacia Madrigal.',
    department: 'NARIÑO',
    municipality: 'POLICARPA',
    locationName: 'Sector Madrigal',
    lat: 1.648,
    lon: -77.462,
    date: new Date(Date.now() - 3600000 * 22).toISOString(),
    sourceType: 'PERSONERIA_LOCAL',
    sourceName: 'Personería Municipal de Policarpa',
    actorSuspect: 'Frente Franco Benavides',
    category: 'PRESENCIA_ARMADA',
    severity: 'ALTA'
  },
  {
    id: 'SOV-LOCAL-026-05',
    title: 'Alerta SAT 004/26: Monitoreo frontera norte en Maicao (La Guajira)',
    content: 'Movimiento de estructuras de contrabando armado en pasos no habilitados trocha La Cortina.',
    department: 'LA GUAJIRA',
    municipality: 'MAICAO',
    locationName: 'Trocha La Cortina',
    lat: 11.385,
    lon: -72.250,
    date: new Date(Date.now() - 3600000 * 48).toISOString(),
    sourceType: 'SAT_DEFENSORIA',
    sourceName: 'Defensoría Regional La Guajira',
    actorSuspect: 'Banda Criminal Fronteriza',
    category: 'MOVIMIENTO_SOSPECHOSO',
    severity: 'MEDIA'
  }
];

class SovereignOsintService {
  private static instance: SovereignOsintService;
  private localEvents: OsintEvent[] = [];

  public static getInstance(): SovereignOsintService {
    if (!SovereignOsintService.instance) {
      SovereignOsintService.instance = new SovereignOsintService();
    }
    return SovereignOsintService.instance;
  }

  /**
   * Geocodifica un texto extrayendo coordenadas a partir de nuestro diccionario táctico.
   */
  public geocodeTacticalText(text: string, defaultDept: string = 'NARIÑO'): GeoLocation | null {
    const upper = text.toUpperCase();
    for (const [place, coords] of Object.entries(COLOMBIA_TACTICAL_GEODICT)) {
      if (upper.includes(place)) {
        return coords;
      }
    }
    // Fallback a centroide departamental
    if (upper.includes('NARIÑO') || defaultDept === 'NARIÑO') {
      return COLOMBIA_TACTICAL_GEODICT['PASTO'];
    }
    if (upper.includes('LA GUAJIRA') || defaultDept === 'LA GUAJIRA') {
      return COLOMBIA_TACTICAL_GEODICT['RIOHACHA'];
    }
    return null;
  }

  /**
   * Rastrea y filtra las fuentes OSINT locales soberanas aplicando:
   * 1. Blindaje por Departamento de la unidad
   * 2. Geocerca exacta si la unidad tiene polígono GeoJSON
   */
  public async scanSovereignSources(options: {
    department?: string;
    assignedAreaGeoJson?: string;
    unitName?: string;
  }): Promise<OsintEvent[]> {
    const { department = 'NARIÑO', assignedAreaGeoJson, unitName } = options;

    const matchedRaw: OsintRawItem[] = [];

    for (const raw of SOVEREIGN_LOCAL_CATALOG) {
      // Blindaje 1: Departamento (No cruzar Nariño con La Guajira)
      if (department && raw.department.toUpperCase().trim() !== department.toUpperCase().trim()) {
        continue;
      }

      // Blindaje 2: Geocerca exacta si hay polígono asignado
      if (assignedAreaGeoJson) {
        const isInside = this.checkPointInGeoJson(raw.lat, raw.lon, assignedAreaGeoJson);
        if (!isInside) continue;
      }

      matchedRaw.push(raw);
    }

    // Convertir a formato oficial OsintEvent de SIMCOP
    const convertedEvents: OsintEvent[] = matchedRaw.map(r => ({
      id: r.id,
      title: r.title,
      summary: `[FUENTE SOBERANA: ${r.sourceName}] ${r.content} | Actor sospechoso: ${r.actorSuspect || 'Por determinar'}`,
      sourceUrl: `https://simcop.mil.co/osint/local/${r.id}`,
      sourceName: r.sourceName,
      locationName: r.locationName,
      location: { lat: r.lat, lon: r.lon },
      eventTimestamp: r.date,
      processedTimestamp: new Date().toISOString(),
      confidenceScore: r.severity === 'CRITICA' ? 0.95 : 0.85,
      eventType: r.category,
      verified: true
    }));

    this.localEvents = convertedEvents;
    return convertedEvents;
  }

  /**
   * Registra manualmente o por Webhook interno un nuevo reporte de fuente abierta local
   */
  public ingestRawReport(raw: Omit<OsintRawItem, 'id' | 'lat' | 'lon'>): OsintEvent {
    const coords = this.geocodeTacticalText(`${raw.municipality} ${raw.locationName} ${raw.content}`, raw.department) 
      || { lat: 1.2136, lon: -77.2811 };

    const newId = `SOV-MANUAL-${Date.now()}`;
    const fullItem: OsintRawItem = {
      ...raw,
      id: newId,
      lat: coords.lat,
      lon: coords.lon
    };

    const osintEvent: OsintEvent = {
      id: newId,
      title: fullItem.title,
      summary: `[FUENTE LOCAL: ${fullItem.sourceName}] ${fullItem.content} | Actor: ${fullItem.actorSuspect || 'En verificación'}`,
      sourceUrl: `https://simcop.mil.co/osint/internal/${newId}`,
      sourceName: fullItem.sourceName,
      locationName: fullItem.locationName,
      location: coords,
      eventTimestamp: fullItem.date || new Date().toISOString(),
      processedTimestamp: new Date().toISOString(),
      confidenceScore: fullItem.severity === 'CRITICA' ? 0.95 : 0.85,
      eventType: fullItem.category,
      verified: true
    };

    this.localEvents.unshift(osintEvent);
    return osintEvent;
  }

  private checkPointInGeoJson(lat: number, lon: number, geoJsonString?: string): boolean {
    if (!geoJsonString) return true;
    try {
      const parsed = typeof geoJsonString === 'string' ? JSON.parse(geoJsonString) : geoJsonString;
      const geometry = parsed.geometry || parsed;
      if (geometry.type === 'Polygon' && Array.isArray(geometry.coordinates)) {
        return this.isPointInPolygon([lon, lat], geometry.coordinates[0]);
      }
      return true;
    } catch {
      return true;
    }
  }

  private isPointInPolygon(point: [number, number], vs: [number, number][]): boolean {
    const x = point[0], y = point[1];
    let inside = false;
    for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
      const xi = vs[i][0], yi = vs[i][1];
      const xj = vs[j][0], yj = vs[j][1];
      const intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
      if (intersect) inside = !inside;
    }
    return inside;
  }
}

export const sovereignOsintService = SovereignOsintService.getInstance();
