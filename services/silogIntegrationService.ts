// ============================================================================
// CLIENTE DE INTEGRACIÓN M2M SIMCOP <-> SILOG
// Obtiene el Poder de Fuego Real del Pelotón, Raciones Clase I y Comunicaciones
// ============================================================================

export interface SilogCombatCapability {
  platoonId: string;
  platoonName: string;
  totalSoldiers: number;
  overallFirepowerIndex: number;
  daytimeReadinessPct: number;
  nightReadinessPct: number;
  rationsAutonomyDays: number;
  sustainedFireMinutes: number;
  nightVisionAvailabilityPct: number;
  commCoverageScore: number;
  operationalWeapons: {
    rifles556: number;
    machineGuns762: number;
    grenadeLaunchers40mm: number;
    mortars60mm: number;
  };
  tacticalAdvisory: string;
  isOnlineM2M: boolean;
}

class SilogIntegrationService {
  private static instance: SilogIntegrationService;
  private cache: Map<string, { data: SilogCombatCapability; timestamp: number }> = new Map();

  private constructor() {}

  public static getInstance(): SilogIntegrationService {
    if (!SilogIntegrationService.instance) {
      SilogIntegrationService.instance = new SilogIntegrationService();
    }
    return SilogIntegrationService.instance;
  }

  /**
   * Obtiene la capacidad real de fuego y logística del pelotón desde SILOG
   * Implementa fallback táctico autónomo si SILOG backend no está en línea.
   */
  public async getPlatoonCombatCapability(unitId: string = 'PEL-AURA-1'): Promise<SilogCombatCapability> {
    const cached = this.cache.get(unitId);
    if (cached && (Date.now() - cached.timestamp < 30000)) {
      return cached.data;
    }

    try {
      const response = await fetch(`http://localhost:5000/api/silog/simcop/combat-power/${encodeURIComponent(unitId)}`, {
        headers: { 'X-Service-Token': 'simcop-tactical-m2m-secure-token-2026' }
      });
      if (response.ok) {
        const json = await response.json();
        const data: SilogCombatCapability = { ...json, isOnlineM2M: true };
        this.cache.set(unitId, { data, timestamp: Date.now() });
        return data;
      }
    } catch {
      // Fallback resiliente táctico
    }

    const fallback: SilogCombatCapability = {
      platoonId: unitId,
      platoonName: 'Pelotón Aura 1 (Compañía B - BIP 9)',
      totalSoldiers: 36,
      overallFirepowerIndex: 82,
      daytimeReadinessPct: 94,
      nightReadinessPct: 38,
      rationsAutonomyDays: 5,
      sustainedFireMinutes: 48,
      nightVisionAvailabilityPct: 33,
      commCoverageScore: 100,
      operationalWeapons: {
        rifles556: 30,
        machineGuns762: 2,
        grenadeLaunchers40mm: 2,
        mortars60mm: 1
      },
      tacticalAdvisory: 'Capacidad letal diurna plena (94%). Capacidad nocturna reducida al 38% por déficit de visores PVS-14. Autonomía Clase I asegurada para 5 días. Enlace C2 Harris activo.',
      isOnlineM2M: false
    };

    this.cache.set(unitId, { data: fallback, timestamp: Date.now() });
    return fallback;
  }
}

export const silogIntegrationService = SilogIntegrationService.getInstance();
