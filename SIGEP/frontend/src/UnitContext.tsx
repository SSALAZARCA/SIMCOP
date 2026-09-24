import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import { useAuth } from './AuthContext';
import { SIGEP_API_URL } from './apiConfig';
import type { MilitaryUnit, M2MConnectionStatus, UnitContextType } from './types/sigep';

// Air-gap fallback units to guarantee graceful degradation in disconnected scenarios
const AIR_GAP_FALLBACK_UNITS: MilitaryUnit[] = [
  // 1ª División del Ejército
  {
    id: 'DIV1',
    name: 'Primera División del Ejército',
    type: 'DIVISION',
    status: 'OPERATIONAL',
    authorizedStrength: 4500,
    currentStrength: 4120,
    commander: { name: 'MG. Caro Cancelado Fabio', rank: 'MG' },
    personnelBreakdown: { officers: 320, ncos: 950, professionalSoldiers: 2200, slRegulars: 650 }
  },
  {
    id: 'BR1',
    name: 'Primera Brigada Blindada',
    type: 'BRIGADE',
    parentId: 'DIV1',
    status: 'OPERATIONAL',
    authorizedStrength: 1800,
    currentStrength: 1650,
    commander: { name: 'CR. Gómez Fernando', rank: 'CR' },
    personnelBreakdown: { officers: 120, ncos: 380, professionalSoldiers: 920, slRegulars: 230 }
  },
  {
    id: 'BAEEV4',
    name: 'Batallón de Operaciones Terrestres N. 4',
    type: 'BATTALION',
    parentId: 'BR1',
    status: 'OPERATIONAL',
    authorizedStrength: 650,
    currentStrength: 575,
    commander: { name: 'TC. Salazar Santiago', rank: 'TC' },
    personnelBreakdown: { officers: 25, ncos: 80, professionalSoldiers: 350, slRegulars: 120 }
  },
  {
    id: 'BATRO3',
    name: 'Batallón de Artillería N. 3 Batalla de Palonegro',
    type: 'BATTALION',
    parentId: 'BR1',
    status: 'STANDBY',
    authorizedStrength: 520,
    currentStrength: 480,
    commander: { name: 'MY. Herrera David', rank: 'MY' },
    personnelBreakdown: { officers: 22, ncos: 75, professionalSoldiers: 290, slRegulars: 93 }
  },

  // 8ª División del Ejército (Estructura doctrinal SIMCOP)
  {
    id: '8-DIV',
    name: 'Octava División - Yopal',
    type: 'DIVISION',
    status: 'OPERATIONAL',
    authorizedStrength: 5200,
    currentStrength: 4850,
    commander: { name: 'MG. Fabio Leonardo Caro Cancelado', rank: 'MG' },
    personnelBreakdown: { officers: 380, ncos: 1100, professionalSoldiers: 2600, slRegulars: 770 }
  },
  {
    id: '16-BRIG',
    name: 'Décima Sexta Brigada - Casanare',
    type: 'BRIGADE',
    parentId: '8-DIV',
    status: 'OPERATIONAL',
    authorizedStrength: 2100,
    currentStrength: 1950,
    commander: { name: 'CR. Carlos Realpe', rank: 'CR' },
    personnelBreakdown: { officers: 140, ncos: 420, professionalSoldiers: 1100, slRegulars: 290 }
  },
  {
    id: 'BI-44',
    name: 'Batallón de Infantería No. 44 Ramón Nonato Pérez',
    type: 'BATTALION',
    parentId: '16-BRIG',
    status: 'OPERATIONAL',
    authorizedStrength: 720,
    currentStrength: 690,
    commander: { name: 'TC. Gustavo Adolfo Rodríguez', rank: 'TC' },
    personnelBreakdown: { officers: 28, ncos: 110, professionalSoldiers: 450, slRegulars: 102 }
  },
  {
    id: 'GM-16',
    name: 'Grupo de Caballería Montado No. 16 Guías del Casanare',
    type: 'BATTALION',
    parentId: '16-BRIG',
    status: 'OPERATIONAL',
    authorizedStrength: 680,
    currentStrength: 640,
    commander: { name: 'TC. José Ramón Pérez', rank: 'TC' },
    personnelBreakdown: { officers: 25, ncos: 95, professionalSoldiers: 420, slRegulars: 100 }
  },
  {
    id: 'BEING-16',
    name: 'Batallón de Ingenieros No. 16 Rafael Navas Pardo',
    type: 'BATTALION',
    parentId: '16-BRIG',
    status: 'OPERATIONAL',
    authorizedStrength: 530,
    currentStrength: 510,
    commander: { name: 'TC. Óscar Marín', rank: 'TC' },
    personnelBreakdown: { officers: 20, ncos: 70, professionalSoldiers: 320, slRegulars: 100 }
  },
  {
    id: 'BASPC-16',
    name: 'Batallón de Apoyo y Servicios No. 16',
    type: 'BATTALION',
    parentId: '16-BRIG',
    status: 'OPERATIONAL',
    authorizedStrength: 420,
    currentStrength: 395,
    commander: { name: 'TC. Andrés Villar', rank: 'TC' },
    personnelBreakdown: { officers: 18, ncos: 80, professionalSoldiers: 200, slRegulars: 97 }
  },
  {
    id: '18-BRIG',
    name: 'Décima Octava Brigada - Arauca',
    type: 'BRIGADE',
    parentId: '8-DIV',
    status: 'OPERATIONAL',
    authorizedStrength: 1950,
    currentStrength: 1820,
    commander: { name: 'CR. César Augusto Karan', rank: 'CR' },
    personnelBreakdown: { officers: 130, ncos: 390, professionalSoldiers: 1020, slRegulars: 280 }
  },
  {
    id: 'BI-24',
    name: 'Batallón de Infantería No. 24 Luis Tovar Lucero',
    type: 'BATTALION',
    parentId: '18-BRIG',
    status: 'OPERATIONAL',
    authorizedStrength: 750,
    currentStrength: 710,
    commander: { name: 'TC. Juan Carlos Ortiz', rank: 'TC' },
    personnelBreakdown: { officers: 26, ncos: 115, professionalSoldiers: 460, slRegulars: 109 }
  },
  {
    id: 'GM-18',
    name: 'Grupo de Caballería Mecanizado No. 18 Gabriel Reveiz Pizarro',
    type: 'BATTALION',
    parentId: '18-BRIG',
    status: 'OPERATIONAL',
    authorizedStrength: 650,
    currentStrength: 620,
    commander: { name: 'TC. Edwin Torres', rank: 'TC' },
    personnelBreakdown: { officers: 23, ncos: 100, professionalSoldiers: 410, slRegulars: 87 }
  },
  {
    id: 'BA-18',
    name: 'Batallón de Artillería No. 18 José María Mantilla',
    type: 'BATTALION',
    parentId: '18-BRIG',
    status: 'OPERATIONAL',
    authorizedStrength: 550,
    currentStrength: 490,
    commander: { name: 'TC. Lucas Moreno', rank: 'TC' },
    personnelBreakdown: { officers: 20, ncos: 90, professionalSoldiers: 320, slRegulars: 60 }
  },
  {
    id: '28-BRIG',
    name: 'Vigésima Octava Brigada - Vichada',
    type: 'BRIGADE',
    parentId: '8-DIV',
    status: 'OPERATIONAL',
    authorizedStrength: 1150,
    currentStrength: 1080,
    commander: { name: 'CR. Ricardo Salazar', rank: 'CR' },
    personnelBreakdown: { officers: 80, ncos: 290, professionalSoldiers: 580, slRegulars: 130 }
  },
  {
    id: 'BIS-45',
    name: 'Batallón de Infantería de Selva No. 45 Gr. Próspero Pinzón',
    type: 'BATTALION',
    parentId: '28-BRIG',
    status: 'OPERATIONAL',
    authorizedStrength: 680,
    currentStrength: 650,
    commander: { name: 'TC. Jairo Linares', rank: 'TC' },
    personnelBreakdown: { officers: 24, ncos: 105, professionalSoldiers: 420, slRegulars: 101 }
  }
];

const UnitContext = createContext<UnitContextType | null>(null);

const STORAGE_SELECTED_KEY = 'sigep_selected_unit_id';
const STORAGE_CACHED_UNITS_KEY = 'sigep_cached_units';

export function UnitProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const userToken = user?.token;
  const userRole = user?.role;
  const userAssignedUnitId = user?.assignedUnitId;

  const [allUnits, setAllUnits] = useState<MilitaryUnit[]>(() => {
    try {
      const cached = localStorage.getItem(STORAGE_CACHED_UNITS_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // ignore
    }
    return AIR_GAP_FALLBACK_UNITS;
  });

  const [rawSelectedUnitId, setRawSelectedUnitId] = useState<string>(() => {
    return sessionStorage.getItem(STORAGE_SELECTED_KEY) || '';
  });

  const [m2mStatus, setM2mStatus] = useState<M2MConnectionStatus>('CHECKING');
  const [lastSyncTimestamp, setLastSyncTimestamp] = useState<Date | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Helper: Determines if user has unrestricted command access across all units.
   */
  const isSuperiorEchelon = useCallback((role?: string, assignedUnitId?: string): boolean => {
    if (!role) return false;
    const r = role.toUpperCase();
    return (
      r === 'ROLE_ADMINISTRATOR' ||
      r === 'ADMINISTRATOR' ||
      r === 'ROLE_EJERCITO' ||
      r === 'ROLE_COMANDANTE_EJERCITO' ||
      r === 'COMANDANTE_EJERCITO' ||
      assignedUnitId === 'NATIONAL' ||
      !assignedUnitId
    );
  }, []);

  /**
   * Builds the accessible sub-tree using Breadth-First Search (BFS)
   * Starting from the user's assigned unit down to all descendant sub-units.
   */
  const accessibleUnits = useMemo<MilitaryUnit[]>(() => {
    if (!allUnits || allUnits.length === 0) return [];

    if (isSuperiorEchelon(userRole, userAssignedUnitId)) {
      return allUnits;
    }

    const rootId = userAssignedUnitId;
    if (!rootId || rootId === 'NATIONAL') return allUnits;

    // Normalizador de alias (DIV01 -> DIV1, BR01 -> BR1, BAT01 -> BAEEV4)
    const normalize = (id?: string) => {
      if (!id) return '';
      const trimmed = id.trim().toUpperCase();
      if (trimmed === 'DIV01') return 'DIV1';
      if (trimmed === 'BR01') return 'BR1';
      if (trimmed === 'BAT01') return 'BAEEV4';
      return trimmed;
    };

    const normRoot = normalize(rootId);
    const rootUnit = allUnits.find(u => u.id === rootId || normalize(u.id) === normRoot);

    if (!rootUnit) {
      // Si la unidad asignada no existe en el catálogo, limitar estrictamente a un registro representativo
      // NUNCA filtrar todas las unidades a un usuario con jurisdicción asignada.
      return [{
        id: rootId,
        name: `Unidad Asignada [${rootId}]`,
        type: userRole?.includes('BATALLON') ? 'BATTALION' : userRole?.includes('BRIGADA') ? 'BRIGADE' : 'DIVISION',
        status: 'OPERATIONAL'
      }];
    }

    const queue: string[] = [rootUnit.id];
    const visited = new Set<string>();
    const tree: MilitaryUnit[] = [];

    while (queue.length > 0) {
      const currentId = queue.shift()!;
      if (!visited.has(currentId)) {
        visited.add(currentId);
        const currentUnit = allUnits.find(u => u.id === currentId || normalize(u.id) === normalize(currentId));
        if (currentUnit && !tree.some(t => t.id === currentUnit.id)) {
          tree.push(currentUnit);
        }
        const children = allUnits.filter(
          u => u.parentId === currentId || (u.parentId && normalize(u.parentId) === normalize(currentId))
        );
        for (const child of children) {
          if (!visited.has(child.id)) {
            queue.push(child.id);
          }
        }
      }
    }

    return tree;
  }, [allUnits, userRole, userAssignedUnitId, isSuperiorEchelon]);

  /**
   * Derived selected unit ID: guarantees synchronous validity without cascading effects
   */
  const selectedUnitId = useMemo<string>(() => {
    if (accessibleUnits.length === 0) return rawSelectedUnitId;
    const exists = accessibleUnits.some(u => u.id === rawSelectedUnitId);
    if (exists) return rawSelectedUnitId;
    if (userAssignedUnitId && accessibleUnits.some(u => u.id === userAssignedUnitId)) {
      return userAssignedUnitId;
    }
    return accessibleUnits[0].id;
  }, [accessibleUnits, rawSelectedUnitId, userAssignedUnitId]);

  /**
   * Active selected unit instance
   */
  const selectedUnit = useMemo<MilitaryUnit | null>(() => {
    if (!selectedUnitId) return accessibleUnits[0] || null;
    return (
      accessibleUnits.find(u => u.id === selectedUnitId) ||
      allUnits.find(u => u.id === selectedUnitId) ||
      null
    );
  }, [accessibleUnits, allUnits, selectedUnitId]);

  /**
   * Setter for selected unit that also updates persistent storage
   */
  const setSelectedUnitId = useCallback((newId: string) => {
    setRawSelectedUnitId(newId);
    sessionStorage.setItem(STORAGE_SELECTED_KEY, newId);
  }, []);

  /**
   * Fetches units from /api/simcop/units via backend M2M proxy
   */
  const refreshUnits = useCallback(async () => {
    setIsLoading(true);
    setM2mStatus('CHECKING');
    try {
      const token = userToken || localStorage.getItem('token');
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await axios.get(`${SIGEP_API_URL}/simcop/units`, {
        headers,
        timeout: 6000
      });

      if (Array.isArray(res.data) && res.data.length > 0) {
        setAllUnits(res.data);
        setM2mStatus('CONNECTED');
        setLastSyncTimestamp(new Date());
        setError(null);
        try {
          localStorage.setItem(STORAGE_CACHED_UNITS_KEY, JSON.stringify(res.data));
        } catch {
          // ignore storage quota issues
        }
      } else {
        setM2mStatus('DISCONNECTED');
        setError('El enlace M2M con SIMCOP no retornó unidades activas.');
      }
    } catch (err: unknown) {
      console.warn('UnitContext: Failed to reach /api/simcop/units, activating Air-Gap mode', err);
      setM2mStatus('DISCONNECTED');
      const msg = err instanceof Error ? err.message : 'Error de comunicación M2M';
      setError(msg);

      setAllUnits(prev => (prev.length > 0 ? prev : AIR_GAP_FALLBACK_UNITS));
    } finally {
      setIsLoading(false);
    }
  }, [userToken]);

  // Initial fetch on mount or when token changes
  useEffect(() => {
    let isMounted = true;
    const execute = async () => {
      if (isMounted) {
        await refreshUnits();
      }
    };
    execute();
    return () => {
      isMounted = false;
    };
  }, [refreshUnits]);

  // Periodic heartbeat every 45 seconds to keep M2M status updated
  useEffect(() => {
    const interval = setInterval(() => {
      refreshUnits();
    }, 45000);
    return () => clearInterval(interval);
  }, [refreshUnits]);

  const contextValue = useMemo<UnitContextType>(() => ({
    units: accessibleUnits,
    allUnits,
    accessibleUnits,
    selectedUnitId,
    selectedUnit,
    setSelectedUnitId,
    m2mStatus,
    lastSyncTimestamp,
    isLoading,
    error,
    refreshUnits
  }), [
    accessibleUnits,
    allUnits,
    selectedUnitId,
    selectedUnit,
    setSelectedUnitId,
    m2mStatus,
    lastSyncTimestamp,
    isLoading,
    error,
    refreshUnits
  ]);

  return (
    <UnitContext.Provider value={contextValue}>
      {children}
    </UnitContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useUnit(): UnitContextType {
  const context = useContext(UnitContext);
  if (!context) {
    throw new Error('useUnit must be used within a UnitProvider');
  }
  return context;
}
