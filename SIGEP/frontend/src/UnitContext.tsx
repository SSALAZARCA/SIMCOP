import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import { useAuth } from './AuthContext';
import { SIGEP_API_URL } from './apiConfig';
import type { MilitaryUnit, M2MConnectionStatus, UnitContextType } from './types/sigep';

// Air-gap fallback units to guarantee graceful degradation in disconnected scenarios
const AIR_GAP_FALLBACK_UNITS: MilitaryUnit[] = [
  {
    id: 'DIV1',
    name: 'Primera División del Ejército',
    type: 'DIVISION',
    status: 'OPERATIONAL',
    authorizedStrength: 4500,
    currentStrength: 4120,
    commander: { name: 'BG. Ramírez Carlos', rank: 'BG' },
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
    return (
      role === 'ROLE_ADMINISTRATOR' ||
      role === 'ROLE_EJERCITO' ||
      role === 'ROLE_COMANDANTE_EJERCITO' ||
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
    if (!rootId) return allUnits;

    const queue: string[] = [rootId];
    const visited = new Set<string>();
    const tree: MilitaryUnit[] = [];

    while (queue.length > 0) {
      const currentId = queue.shift()!;
      if (!visited.has(currentId)) {
        visited.add(currentId);
        const currentUnit = allUnits.find(u => u.id === currentId);
        if (currentUnit) {
          tree.push(currentUnit);
        }
        const children = allUnits.filter(u => u.parentId === currentId);
        for (const child of children) {
          if (!visited.has(child.id)) {
            queue.push(child.id);
          }
        }
      }
    }

    return tree.length > 0 ? tree : allUnits;
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
