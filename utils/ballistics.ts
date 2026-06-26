import type { GeoLocation, BallisticDataEntry, TrajectoryPoint, ProjectileType, FiringSolution } from '../types';

const G = 9.80665; // Gravity m/s^2
const R_EARTH = 6371e3; // Earth radius in meters

// ========================================
// CALCULO DE DISTANCIA Y AZIMUT
// ========================================

export const calculateDistanceAndAzimuth = (start: GeoLocation, end: GeoLocation): { distance: number, azimuth: number } => {
    const lat1 = start.lat * Math.PI / 180;
    const lat2 = end.lat * Math.PI / 180;
    const lon1 = start.lon * Math.PI / 180;
    const lon2 = end.lon * Math.PI / 180;

    const deltaLat = lat2 - lat1;
    const deltaLon = lon2 - lon1;

    // Haversine formula for distance
    const a = Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
              Math.cos(lat1) * Math.cos(lat2) *
              Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R_EARTH * c;

    // Formula for azimuth
    const y = Math.sin(deltaLon) * Math.cos(lat2);
    const x = Math.cos(lat1) * Math.sin(lat2) -
              Math.sin(lat1) * Math.cos(lat2) * Math.cos(deltaLon);
    let azimuth = Math.atan2(y, x) * 180 / Math.PI;
    azimuth = (azimuth + 360) % 360;

    return { distance, azimuth };
};

// Alias to fix error in useSimulatedData
export const calculateDistanceAndBearing = calculateDistanceAndAzimuth;

// ========================================
// CÁLCULO DE TRAYECTORIA
// ========================================

export const generateTrajectory = (vo: number, angleDegrees: number, h_diff: number): { trajectory: TrajectoryPoint[], flightTime: number } => {
    const angleRad = angleDegrees * Math.PI / 180;
    const vox = vo * Math.cos(angleRad);
    const voy = vo * Math.sin(angleRad);

    // Calculate flight time using the quadratic formula for vertical motion: y(t) = h_initial + voy*t - 0.5*g*t^2
    // We are solving for t when y(t) = h_target. Here h_initial is 0 and h_target is h_diff.
    // So: h_diff = voy*t - 0.5*g*t^2  => 0.5*g*t^2 - voy*t + h_diff = 0
    // a=0.5g, b=-voy, c=h_diff
    const discriminant = voy * voy - 4 * (0.5 * G) * h_diff;
    if (discriminant < 0) { // Target is unreachable at this angle
        return { trajectory: [], flightTime: 0 };
    }
    // We take the positive root for the time it takes to come down
    const flightTime = (voy + Math.sqrt(discriminant)) / G;

    const trajectory: TrajectoryPoint[] = [];
    const steps = 100;
    for (let i = 0; i <= steps; i++) {
        const t = (i / steps) * flightTime;
        const x = vox * t;
        const y = (voy * t) - (0.5 * G * t * t);
        trajectory.push({ x, y });
    }
    return { trajectory, flightTime };
};

export const calculateMrsiSolution = (vo: number, distance: number): { angle: number, time: number }[] => {
    // This is highly complex. Return a plausible but simplified result.
    const baseTime = (distance / vo) * 1.5; // very rough estimate
    return [
        { angle: 65, time: baseTime + 5 },
        { angle: 55, time: baseTime },
        { angle: 48, time: baseTime - 5 },
    ];
};

// ========================================
// BASE DE DATOS BALÍSTICA
// ========================================

// Corresponds to the BALISTICA dictionary in the Python code for 155mm
// Keys are formatted as "ProjectileType-Charge"
export const BALISTICA: Record<string, BallisticDataEntry> = {
    "HE-3": { elev_base: 12, vo: 680, alcance: 15 },
    "HE-4": { elev_base: 26, vo: 750, alcance: 20 },
    "HE-5": { elev_base: 38, vo: 800, alcance: 24 },
    "HE-6": { elev_base: 55, vo: 850, alcance: 30 },
    "ERFB-BB-3": { elev_base: 10, vo: 700, alcance: 18 },
    "ERFB-BB-4": { elev_base: 22, vo: 780, alcance: 25 },
    "ERFB-BB-5": { elev_base: 34, vo: 840, alcance: 30 },
    "ERFB-BB-6": { elev_base: 48, vo: 897, alcance: 39 },
    "V-LAP-6": { elev_base: 58, vo: 950, alcance: 52 },
    "EXCALIBUR-6": { elev_base: 50, vo: 850, alcance: 40, guidance: true }
};

export const AVAILABLE_PROJECTILES: Record<string, { charges: number[] }> = {
    "HE": { charges: [3, 4, 5, 6] },
    "ERFB-BB": { charges: [3, 4, 5, 6] },
    "V-LAP": { charges: [6] },
    "EXCALIBUR": { charges: [6] }
};

// Corresponds to the BALISTICA_105 dictionary for M101A1 (105mm)
export const BALISTICA_105: Record<string, BallisticDataEntry> = {
    "HE M1-1": { elev_base: 8, vo: 375, alcance: 5.8 },
    "HE M1-2": { elev_base: 12, vo: 400, alcance: 7.2 },
    "HE M1-3": { elev_base: 18, vo: 435, alcance: 8.9 },
    "HE M1-4": { elev_base: 26, vo: 472, alcance: 11.5 },
    "HEAT M67-4": { elev_base: 26, vo: 438, alcance: 1.5 },
    "SMOKE M84-4": { elev_base: 26, vo: 472, alcance: 7.0 }
};

export const AVAILABLE_PROJECTILES_105: Record<string, { charges: number[] }> = {
    "HE M1": { charges: [1, 2, 3, 4] },
    "HEAT M67": { charges: [4] },
    "SMOKE M84": { charges: [4] },
};

// Ballistic data for LG-1 105mm Howitzer
export const BALISTICA_LG1: Record<string, BallisticDataEntry> = {
    "HE M1-4": { elev_base: 28, vo: 600, alcance: 14.0 },
    "HE M1-5": { elev_base: 32, vo: 630, alcance: 15.5 },
    "ERATO HE-5": { elev_base: 30, vo: 640, alcance: 17.5 },
    "V-LAP 105-5": { elev_base: 45, vo: 660, alcance: 22.0 },
    "SMOKE M84-4": { elev_base: 28, vo: 600, alcance: 9.0 },
    "Illum M485-5": { elev_base: 34, vo: 630, alcance: 11.0 }
};

export const AVAILABLE_PROJECTILES_LG1: Record<string, { charges: number[] }> = {
    "HE M1": { charges: [4, 5] },
    "ERATO HE": { charges: [5] },
    "V-LAP 105": { charges: [5] },
    "SMOKE M84": { charges: [4] },
    "Illum M485": { charges: [5] }
};

// Ballistic data for L119 105mm Howitzer
export const BALISTICA_L119: Record<string, BallisticDataEntry> = {
    "L31 HE-5": { elev_base: 30, vo: 700, alcance: 15.0 },
    "L31 HE-6": { elev_base: 34, vo: 755, alcance: 17.2 },
    "L47 Smoke-6": { elev_base: 34, vo: 750, alcance: 16.0 },
    "L48 Illum-6": { elev_base: 36, vo: 750, alcance: 15.5 },
};

export const AVAILABLE_PROJECTILES_L119: Record<string, { charges: number[] }> = {
    "L31 HE": { charges: [5, 6] },
    "L47 Smoke": { charges: [6] },
    "L48 Illum": { charges: [6] },
};

// Ballistic data for M120 120mm Mortar
export const BALISTICA_M120: Record<string, BallisticDataEntry> = {
    "M931 HE-1": { elev_base: 50, vo: 200, alcance: 3500 },
    "M931 HE-2": { elev_base: 55, vo: 250, alcance: 5500 },
    "M931 HE-3": { elev_base: 60, vo: 300, alcance: 7200 },
    "XM1113 RAP-3": { elev_base: 60, vo: 350, alcance: 13000 },
    "M821 Illum-3": { elev_base: 60, vo: 280, alcance: 6000 },
    "M722 Smoke-3": { elev_base: 60, vo: 280, alcance: 6500 },
    "M993 Penetrator-3": { elev_base: 50, vo: 320, alcance: 4000 },
};

export const AVAILABLE_PROJECTILES_M120: Record<string, { charges: number[] }> = {
    "M931 HE": { charges: [1, 2, 3] },
    "XM1113 RAP": { charges: [3] },
    "M821 Illum": { charges: [3] },
    "M722 Smoke": { charges: [3] },
    "M993 Penetrator": { charges: [3] },
};

// Ballistic data for HY1-12 120mm Mortar
export const BALISTICA_HY112: Record<string, BallisticDataEntry> = {
    "HE Y12-HE-1": { elev_base: 50, vo: 180, alcance: 3000 },
    "HE Y12-HE-2": { elev_base: 55, vo: 230, alcance: 5000 },
    "HE Y12-HE-3": { elev_base: 60, vo: 280, alcance: 7000 },
    "RAP Y12-RAP-3": { elev_base: 60, vo: 320, alcance: 9500 },
    "Illum Y12-ILL-3": { elev_base: 60, vo: 260, alcance: 5500 },
    "Smoke Y12-SMK-3": { elev_base: 60, vo: 260, alcance: 6000 },
    "Pen Y12-PEN-3": { elev_base: 50, vo: 300, alcance: 3500 },
};

export const AVAILABLE_PROJECTILES_HY112: Record<string, { charges: number[] }> = {
    "HE Y12-HE": { charges: [1, 2, 3] },
    "RAP Y12-RAP": { charges: [3] },
    "Illum Y12-ILL": { charges: [3] },
    "Smoke Y12-SMK": { charges: [3] },
    "Pen Y12-PEN": { charges: [3] },
};

// ========================================
// CÁLCULOS DE SOLUCIÓN DE TIRO
// ========================================

const createGenericSolution = (
    gun_loc: GeoLocation,
    target_loc: GeoLocation,
    gun_alt: number,
    target_alt: number,
    projectile: ProjectileType,
    charge: number,
    ballistics_table: Record<string, BallisticDataEntry>,
    options?: { wind?: number, temp?: number, pressure?: number }
): { solution: FiringSolution | null, trajectory: TrajectoryPoint[] } => {
    const key = `${projectile}-${charge}`;
    const ballisticData = ballistics_table[key];
    if (!ballisticData) return { solution: null, trajectory: [] };
    
    const h_diff = target_alt - gun_alt;
    const { distance, azimuth } = calculateDistanceAndAzimuth(gun_loc, target_loc);
    const { vo, elev_base } = ballisticData;
    
    // Simplified corrections
    const corr_alt = h_diff !== 0 ? Math.atan(h_diff / distance) * (180 / Math.PI) : 0;
    const corr_viento = (options?.wind || 0) * 0.05;
    const corr_temp = ((options?.temp || 15) - 15) * 0.02;
    const corr_pres = ((options?.pressure || 1013) - 1013) * -0.01;

    const finalElevation = elev_base + corr_alt + corr_viento + corr_temp + corr_pres;
    const { trajectory, flightTime } = generateTrajectory(vo, finalElevation, h_diff);
    
    const solution: FiringSolution = {
        distance,
        azimuth,
        elevation: finalElevation,
        flightTime,
        isMrsi: false,
        elevationStatus: finalElevation < 800 ? '✅ Ángulo Válido' : '⚠️ Ángulo Excesivo',
        correction_alt: corr_alt,
        correction_viento: corr_viento,
        correction_temp: corr_temp,
        correction_pres: corr_pres,
    };
    return { solution, trajectory };
};

export const calculateM101A1Solution = (gun_loc: GeoLocation, target_loc: GeoLocation, gun_alt: number, target_alt: number, projectile: ProjectileType, charge: number) => {
    return createGenericSolution(gun_loc, target_loc, gun_alt, target_alt, projectile, charge, BALISTICA_105);
};

export const calculateLG1Solution = (gun_loc: GeoLocation, target_loc: GeoLocation, gun_alt: number, target_alt: number, projectile: ProjectileType, charge: number, wind: number, temp: number) => {
    return createGenericSolution(gun_loc, target_loc, gun_alt, target_alt, projectile, charge, BALISTICA_LG1, { wind, temp });
};

export const calculateL119Solution = (gun_loc: GeoLocation, target_loc: GeoLocation, gun_alt: number, target_alt: number, projectile: ProjectileType, charge: number, wind: number, temp: number, pressure: number) => {
    return createGenericSolution(gun_loc, target_loc, gun_alt, target_alt, projectile, charge, BALISTICA_L119, { wind, temp, pressure });
};

export const calculateM120Solution = (gun_loc: GeoLocation, target_loc: GeoLocation, gun_alt: number, target_alt: number, projectile: ProjectileType, charge: number, wind: number, temp: number) => {
    return createGenericSolution(gun_loc, target_loc, gun_alt, target_alt, projectile, charge, BALISTICA_M120, { wind, temp });
};

export const calculateHY112Solution = (gun_loc: GeoLocation, target_loc: GeoLocation, gun_alt: number, target_alt: number, projectile: ProjectileType, charge: number, wind: number, temp: number) => {
    return createGenericSolution(gun_loc, target_loc, gun_alt, target_alt, projectile, charge, BALISTICA_HY112, { wind, temp });
};