import { GeoLocation, MilitaryUnit, UnitType, User } from '../types';

export interface ColombiaLocationRef {
    municipio: string;
    departamento: string;
    lat: number;
    lon: number;
}

// Catálogo de guarniciones y municipios estratégicos de Colombia
export const COLOMBIA_STRATEGIC_LOCATIONS: ColombiaLocationRef[] = [
    { municipio: 'Bogotá', departamento: 'Cundinamarca / D.C.', lat: 4.7110, lon: -74.0721 },
    { municipio: 'Pasto', departamento: 'Nariño', lat: 1.2136, lon: -77.2811 },
    { municipio: 'Tumaco', departamento: 'Nariño', lat: 1.7986, lon: -78.8156 },
    { municipio: 'Ipiales', departamento: 'Nariño', lat: 0.8303, lon: -77.6444 },
    { municipio: 'Samaniego', departamento: 'Nariño', lat: 1.3361, lon: -77.5969 },
    { municipio: 'Yopal', departamento: 'Casanare', lat: 5.3377, lon: -72.3959 },
    { municipio: 'Aguazul', departamento: 'Casanare', lat: 5.1728, lon: -72.5469 },
    { municipio: 'Tauramena', departamento: 'Casanare', lat: 5.0169, lon: -72.7531 },
    { municipio: 'Paz de Ariporo', departamento: 'Casanare', lat: 5.8808, lon: -71.8917 },
    { municipio: 'Popayán', departamento: 'Cauca', lat: 2.4448, lon: -76.6147 },
    { municipio: 'Santander de Quilichao', departamento: 'Cauca', lat: 3.0094, lon: -76.4842 },
    { municipio: 'Argelia', departamento: 'Cauca', lat: 2.2611, lon: -77.1758 },
    { municipio: 'Cali', departamento: 'Valle del Cauca', lat: 3.4516, lon: -76.5320 },
    { municipio: 'Buenaventura', departamento: 'Valle del Cauca', lat: 3.8801, lon: -77.0312 },
    { municipio: 'Tuluá', departamento: 'Valle del Cauca', lat: 4.0847, lon: -76.1954 },
    { municipio: 'Medellín', departamento: 'Antioquia', lat: 6.2442, lon: -75.5812 },
    { municipio: 'Caucasia', departamento: 'Antioquia', lat: 7.9869, lon: -75.1931 },
    { municipio: 'Turbo', departamento: 'Antioquia', lat: 8.0931, lon: -76.7289 },
    { municipio: 'Apartadó', departamento: 'Antioquia', lat: 7.8828, lon: -76.6258 },
    { municipio: 'Cúcuta', departamento: 'Norte de Santander', lat: 7.8939, lon: -72.5078 },
    { municipio: 'Tibú', departamento: 'Norte de Santander', lat: 8.6389, lon: -72.7358 },
    { municipio: 'Ocaña', departamento: 'Norte de Santander', lat: 8.2389, lon: -73.3558 },
    { municipio: 'Arauca', departamento: 'Arauca', lat: 7.0847, lon: -70.7591 },
    { municipio: 'Saravena', departamento: 'Arauca', lat: 6.9536, lon: -71.8767 },
    { municipio: 'Tame', departamento: 'Arauca', lat: 6.4597, lon: -71.7347 },
    { municipio: 'Villavicencio', departamento: 'Meta', lat: 4.1420, lon: -73.6266 },
    { municipio: 'Granada', departamento: 'Meta', lat: 3.5461, lon: -73.7069 },
    { municipio: 'Vista Hermosa', departamento: 'Meta', lat: 3.1239, lon: -73.7511 },
    { municipio: 'Florencia', departamento: 'Caquetá', lat: 1.6144, lon: -75.6062 },
    { municipio: 'San Vicente del Caguán', departamento: 'Caquetá', lat: 2.1158, lon: -74.7694 },
    { municipio: 'Mocoa', departamento: 'Putumayo', lat: 1.1528, lon: -76.6497 },
    { municipio: 'Puerto Asís', departamento: 'Putumayo', lat: 0.5056, lon: -76.5008 },
    { municipio: 'Bucaramanga', departamento: 'Santander', lat: 7.1254, lon: -73.1198 },
    { municipio: 'Barrancabermeja', departamento: 'Santander', lat: 7.0653, lon: -73.8547 },
    { municipio: 'Ibagué', departamento: 'Tolima', lat: 4.4389, lon: -75.2322 },
    { municipio: 'Tolemaida / Nilo', departamento: 'Cundinamarca / Tolima', lat: 4.2464, lon: -74.7225 },
    { municipio: 'Neiva', departamento: 'Huila', lat: 2.9273, lon: -75.2819 },
    { municipio: 'Montería', departamento: 'Córdoba', lat: 8.7479, lon: -75.8814 },
    { municipio: 'Valledupar', departamento: 'Cesar', lat: 10.4631, lon: -73.2532 },
    { municipio: 'Santa Marta', departamento: 'Magdalena', lat: 11.2408, lon: -74.1990 },
    { municipio: 'Barranquilla', departamento: 'Atlántico', lat: 10.9685, lon: -74.7813 },
    { municipio: 'Cartagena', departamento: 'Bolívar', lat: 10.3910, lon: -75.4794 },
    { municipio: 'Riohacha', departamento: 'La Guajira', lat: 11.5444, lon: -72.9072 },
    { municipio: 'Quibdó', departamento: 'Chocó', lat: 5.6947, lon: -76.6611 },
    { municipio: 'Pereira', departamento: 'Risaralda', lat: 4.8133, lon: -75.6961 },
    { municipio: 'Manizales', departamento: 'Caldas', lat: 5.0689, lon: -75.5174 },
    { municipio: 'Armenia', departamento: 'Quindío', lat: 4.5339, lon: -75.6811 },
    { municipio: 'Tunja', departamento: 'Boyacá', lat: 5.5353, lon: -73.3678 },
    { municipio: 'San José del Guaviare', departamento: 'Guaviare', lat: 2.5728, lon: -72.6459 },
    { municipio: 'Leticia', departamento: 'Amazonas', lat: -4.2153, lon: -69.9406 }
];

export const COT_STORAGE_KEY = 'simcop_cot_location_name';
export const COT_COORDS_STORAGE_KEY = 'simcop_cot_coords';

/**
 * Distancia Haversine en kilómetros entre dos coordenadas
 */
export function calculateHaversineDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Radio de la Tierra en km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

/**
 * Resuelve el municipio y departamento más cercano en Colombia a partir de coordenadas GPS
 */
export function resolveColombiaLocation(lat: number, lon: number): ColombiaLocationRef {
    let closest = COLOMBIA_STRATEGIC_LOCATIONS[0];
    let minDistance = calculateHaversineDistanceKm(lat, lon, closest.lat, closest.lon);

    for (let i = 1; i < COLOMBIA_STRATEGIC_LOCATIONS.length; i++) {
        const item = COLOMBIA_STRATEGIC_LOCATIONS[i];
        const dist = calculateHaversineDistanceKm(lat, lon, item.lat, item.lon);
        if (dist < minDistance) {
            minDistance = dist;
            closest = item;
        }
    }

    return closest;
}

/**
 * Determina el nombre del Centro de Operaciones Tácticas (COT) de forma completamente dinámica
 */
export function getActiveCOTLocation(
    units: MilitaryUnit[],
    currentUser: User | null
): { name: string; lat: number; lon: number; isCustom: boolean } {
    // 1. Verificar si hay una sede personalizada guardada en localStorage
    if (typeof window !== 'undefined') {
        const savedName = localStorage.getItem(COT_STORAGE_KEY);
        const savedCoords = localStorage.getItem(COT_COORDS_STORAGE_KEY);
        if (savedName) {
            let lat = 4.7110;
            let lon = -74.0721;
            if (savedCoords) {
                try {
                    const parsed = JSON.parse(savedCoords);
                    if (typeof parsed.lat === 'number' && typeof parsed.lon === 'number') {
                        lat = parsed.lat;
                        lon = parsed.lon;
                    }
                } catch (ignored) {}
            }
            return { name: savedName.toUpperCase(), lat, lon, isCustom: true };
        }
    }

    // 2. Si el usuario actual tiene una unidad asignada, usar su ubicación
    if (currentUser?.assignedUnitId) {
        const assignedUnit = units.find(u => u.id === currentUser.assignedUnitId);
        if (assignedUnit && assignedUnit.location) {
            const loc = resolveColombiaLocation(assignedUnit.location.lat, assignedUnit.location.lon);
            return {
                name: `${loc.municipio}, ${loc.departamento}`.toUpperCase(),
                lat: assignedUnit.location.lat,
                lon: assignedUnit.location.lon,
                isCustom: false
            };
        }
    }

    // 3. Buscar si hay una unidad de tipo COMMAND_POST o DIVISIÓN / BRIGADA
    const commandPost = units.find(u => u.type === UnitType.COMMAND_POST);
    if (commandPost && commandPost.location) {
        const loc = resolveColombiaLocation(commandPost.location.lat, commandPost.location.lon);
        return {
            name: `${loc.municipio}, ${loc.departamento}`.toUpperCase(),
            lat: commandPost.location.lat,
            lon: commandPost.location.lon,
            isCustom: false
        };
    }

    const brigadeOrDiv = units.find(u => u.type === UnitType.DIVISION || u.type === UnitType.BRIGADE);
    if (brigadeOrDiv && brigadeOrDiv.location) {
        const loc = resolveColombiaLocation(brigadeOrDiv.location.lat, brigadeOrDiv.location.lon);
        return {
            name: `${loc.municipio}, ${loc.departamento}`.toUpperCase(),
            lat: brigadeOrDiv.location.lat,
            lon: brigadeOrDiv.location.lon,
            isCustom: false
        };
    }

    // 4. Si hay unidades activas, calcular centro geográfico
    const unitsWithLoc = units.filter(u => u.location && typeof u.location.lat === 'number' && typeof u.location.lon === 'number');
    if (unitsWithLoc.length > 0) {
        const avgLat = unitsWithLoc.reduce((acc, u) => acc + u.location!.lat, 0) / unitsWithLoc.length;
        const avgLon = unitsWithLoc.reduce((acc, u) => acc + u.location!.lon, 0) / unitsWithLoc.length;
        const loc = resolveColombiaLocation(avgLat, avgLon);
        return {
            name: `${loc.municipio}, ${loc.departamento}`.toUpperCase(),
            lat: avgLat,
            lon: avgLon,
            isCustom: false
        };
    }

    // 5. Fallback por defecto institucional: Bogotá D.C. (Cuartel General)
    return {
        name: 'BOGOTÁ, CUNDINAMARCA / D.C.',
        lat: 4.7110,
        lon: -74.0721,
        isCustom: false
    };
}
