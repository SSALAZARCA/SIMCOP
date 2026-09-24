import React, { useState, useEffect, useMemo, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from '../AuthContext';
import { useUnit } from '../UnitContext';
import { SIGEP_API_URL } from '../apiConfig';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import {
  Shield,
  Users,
  Target,
  Activity,
  Clock,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Search,
  ArrowRightLeft,
  HeartPulse,
  TrendingDown,
  TrendingUp,
  X,
  Send,
  Building2,
  FileSpreadsheet
} from 'lucide-react';
import { exportToeToExcel } from '../services/militaryReportsService';

// ---------------------------------------------------------------------------
// Strict TypeScript Interfaces (erasableSyntaxOnly compliant, 0 runtime enums)
// ---------------------------------------------------------------------------

export interface ToeBalanceItem {
  unitId: string;
  mosCode: string;
  required: number;
  actual: number;
  deficit: number;
}

export interface AvailabilityData {
  aptos: number;
  noAptos: number;
  excusados: number;
  licencias: number;
}

export interface CriticalRotationSoldier {
  id: string | number;
  name: string;
  rank: string;
  mosCode: string;
  unitId: string;
  timeInPosition?: number;
  timeInPositionMonths?: number;
  healthStatus?: string;
  branch?: string;
  assignmentDate?: string;
}

export interface AnalysisDashboardProps {
  unitId?: string;
  selectedUnitId?: string;
  onSelectUnit?: (unitId: string) => void;
  role?: string;
}

// ---------------------------------------------------------------------------
// Doctrinal MOS Dictionary & Color Palette
// ---------------------------------------------------------------------------

const MOS_DESCRIPTIONS: Record<string, string> = {
  '11B': 'Infantería Ligera / Fusilero',
  '11A': 'Oficial de Infantería',
  '19D': 'Caballería / Exploración y Reconocimiento',
  '19K': 'Blindados / Tripulante de Tanques',
  '13A': 'Oficial de Artillería de Campaña',
  '13B': 'Artillería / Cañones y Obuses',
  '12B': 'Ingenieros Militares de Combate',
  '25B': 'Comunicaciones y Telemática',
  '25U': 'Sistemas de Transmisiones Tácticas',
  '35M': 'Inteligencia Militar / Interrogatorio',
  '35F': 'Analista de Inteligencia Táctica',
  '68W': 'Sanidad Militar / Enfermero de Combate',
  '91B': 'Mantenimiento de Vehículos y Blindados',
  '92Y': 'Logística / Abastecimiento Clase I-V',
  'MOS-SD': 'Sin Determinar'
};

function getMosLabel(code?: string): string {
  if (!code) return 'Sin Determinar';
  return MOS_DESCRIPTIONS[code] || `Especialidad Militar ${code}`;
}

const COLOR_REQUIRED = '#38bdf8'; // NATO Sky Blue (Requeridos TOE)
const COLOR_ACTUAL = '#10b981';   // Operational Emerald (Físicos Reales)
const PIE_COLORS = [
  '#10b981', // Aptos
  '#f43f5e', // No Aptos / Bajas
  '#f59e0b', // Excusados
  '#0ea5e9'  // Licencias
];

// Helper: 100% semantic Tailwind class for progress widths (Zero inline styles)
function getWidthClass(percentage: number): string {
  const p = Math.max(0, Math.min(100, Math.round(percentage)));
  if (p >= 100) return 'w-full';
  if (p >= 95) return 'w-[95%]';
  if (p >= 90) return 'w-[90%]';
  if (p >= 85) return 'w-[85%]';
  if (p >= 80) return 'w-[80%]';
  if (p >= 75) return 'w-[75%]';
  if (p >= 70) return 'w-[70%]';
  if (p >= 65) return 'w-[65%]';
  if (p >= 60) return 'w-[60%]';
  if (p >= 55) return 'w-[55%]';
  if (p >= 50) return 'w-[50%]';
  if (p >= 45) return 'w-[45%]';
  if (p >= 40) return 'w-[40%]';
  if (p >= 35) return 'w-[35%]';
  if (p >= 30) return 'w-[30%]';
  if (p >= 25) return 'w-[25%]';
  if (p >= 20) return 'w-[20%]';
  if (p >= 15) return 'w-[15%]';
  if (p >= 10) return 'w-[10%]';
  if (p >= 5) return 'w-[5%]';
  return 'w-[0%]';
}

function getIndicatorColorClass(name?: string, dataKey?: string): string {
  if (dataKey === 'required') return 'bg-sky-400';
  if (dataKey === 'actual') return 'bg-emerald-500';
  if (name?.includes('Apto') && !name.includes('No Apto')) return 'bg-emerald-500';
  if (name?.includes('No Apto') || name?.includes('Baja')) return 'bg-rose-500';
  if (name?.includes('Excusado')) return 'bg-amber-500';
  if (name?.includes('Licencia')) return 'bg-sky-500';
  return 'bg-cyan-400';
}

// ---------------------------------------------------------------------------
// Recharts Custom Tactical Tooltip (100% Tailwind CSS — 0 inline styles)
// ---------------------------------------------------------------------------

interface TacticalTooltipPayloadItem {
  name?: string;
  value?: number | string;
  color?: string;
  fill?: string;
  dataKey?: string;
  payload?: Record<string, unknown>;
}

interface CustomTacticalTooltipProps {
  active?: boolean;
  payload?: TacticalTooltipPayloadItem[];
  label?: string;
}

const CustomTacticalTooltip: React.FC<CustomTacticalTooltipProps> = ({ active, payload, label }) => {
  if (!active || !payload || payload.length === 0) return null;

  const isBarChart = payload.length >= 2;
  const isPieChart = payload.length === 1 && !label;

  const reqItem = payload.find(p => p.dataKey === 'required');
  const actItem = payload.find(p => p.dataKey === 'actual');

  const reqVal = typeof reqItem?.value === 'number' ? reqItem.value : 0;
  const actVal = typeof actItem?.value === 'number' ? actItem.value : 0;
  const delta = actVal - reqVal;

  return (
    <div className="bg-slate-950/95 border border-cyan-500/40 backdrop-blur-md rounded-xl p-3.5 shadow-2xl shadow-cyan-950/50 font-mono text-xs text-slate-100 min-w-[220px] pointer-events-none">
      {label && (
        <div className="border-b border-slate-800 pb-2 mb-2">
          <div className="text-[10px] text-cyan-400 font-bold uppercase tracking-widest">
            MOS / Especialidad
          </div>
          <div className="text-sm font-bold text-white flex items-center gap-2">
            <span>{label}</span>
            <span className="text-[11px] font-normal text-slate-400 font-sans">
              ({getMosLabel(label)})
            </span>
          </div>
        </div>
      )}

      {isPieChart && payload[0] && (
        <div className="border-b border-slate-800 pb-2 mb-2">
          <div className="text-[10px] text-cyan-400 font-bold uppercase tracking-widest">
            Disponibilidad Médica
          </div>
          <div className="text-sm font-bold text-white">
            {payload[0].name}
          </div>
        </div>
      )}

      <div className="space-y-1.5 py-1">
        {payload.map((entry, index) => {
          const dotClass = getIndicatorColorClass(entry.name, entry.dataKey);
          return (
            <div key={`entry-${index}`} className="flex items-center justify-between gap-4 py-0.5">
              <span className="text-slate-300 font-sans flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ring-1 ring-slate-700 ${dotClass}`} />
                <span>{entry.name}:</span>
              </span>
              <span className="font-bold text-white tabular-nums font-mono">
                {entry.value}
              </span>
            </div>
          );
        })}
      </div>

      {isBarChart && reqItem && actItem && (
        <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between font-mono">
          <span className="text-[11px] text-slate-400">Balance Diferencial:</span>
          <span
            className={`font-bold tabular-nums text-xs px-2 py-0.5 rounded ${
              delta >= 0
                ? 'text-emerald-400 bg-emerald-950/60 border border-emerald-500/30'
                : 'text-rose-400 bg-rose-950/60 border border-rose-500/30'
            }`}
          >
            {delta >= 0 ? `+${delta} Excedente` : `${delta} Déficit`}
          </span>
        </div>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Main Component: AnalysisDashboard
// ---------------------------------------------------------------------------

export default function AnalysisDashboard({
  unitId: propUnitId,
  selectedUnitId: propSelectedUnitId,
  onSelectUnit
}: AnalysisDashboardProps) {
  const { user } = useAuth();
  const {
    selectedUnitId: contextUnitId,
    selectedUnit,
    accessibleUnits,
    allUnits,
    setSelectedUnitId
  } = useUnit();

  // Reactive unit binding: props take priority, fallback to UnitContext, fallback to user.unitId
  const effectiveUnitId =
    propUnitId || propSelectedUnitId || contextUnitId || user?.unitId || 'BAEEV4';

  // State: Operational Metrics Data
  const [toeData, setToeData] = useState<ToeBalanceItem[]>([]);
  const [availability, setAvailability] = useState<AvailabilityData | null>(null);
  const [criticalRotation, setCriticalRotation] = useState<CriticalRotationSoldier[]>([]);
  const [isLoadingData, setIsLoadingData] = useState<boolean>(false);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date>(new Date());

  // State: BarChart Specialty Filter ('ALL' | 'DEFICIT' | 'COMPLETE')
  const [chartMosFilter, setChartMosFilter] = useState<'ALL' | 'DEFICIT' | 'COMPLETE'>('ALL');

  // State: Critical Rotation Table Search Query
  const [rotationSearchQuery, setRotationSearchQuery] = useState<string>('');

  // State: Projected Transfer Feedback Toast / Modal
  const [projectedSoldier, setProjectedSoldier] = useState<CriticalRotationSoldier | null>(null);

  // Available units for dashboard quick-selector
  const unitCatalog = useMemo(() => {
    if (accessibleUnits && accessibleUnits.length > 0) return accessibleUnits;
    if (allUnits && allUnits.length > 0) return allUnits;
    return [];
  }, [accessibleUnits, allUnits]);

  // Active unit metadata
  const currentUnitMeta = useMemo(() => {
    return (
      unitCatalog.find(u => u.id === effectiveUnitId) ||
      selectedUnit || {
        id: effectiveUnitId,
        name: `Unidad Táctica ${effectiveUnitId}`,
        type: 'BATALLON'
      }
    );
  }, [unitCatalog, effectiveUnitId, selectedUnit]);

  // -------------------------------------------------------------------------
  // Data Fetching: Reactive to effectiveUnitId
  // -------------------------------------------------------------------------

  const userToken = user?.token;

  const reloadData = useCallback(async () => {
    if (!userToken || !effectiveUnitId) return;
    setIsLoadingData(true);
    const config = { headers: { Authorization: `Bearer ${userToken}` }, timeout: 8000 };

    try {
      const [resToe, resAvail, resCrit] = await Promise.all([
        axios
          .get<ToeBalanceItem[]>(`${SIGEP_API_URL}/analysis/toe-balance/${effectiveUnitId}`, config)
          .catch(err => {
            console.warn('TOE balance fetch warning:', err);
            return { data: [] as ToeBalanceItem[] };
          }),
        axios
          .get<AvailabilityData>(`${SIGEP_API_URL}/analysis/availability/${effectiveUnitId}`, config)
          .catch(err => {
            console.warn('Availability fetch warning:', err);
            return { data: null };
          }),
        axios
          .get<CriticalRotationSoldier[]>(
            `${SIGEP_API_URL}/analysis/critical-rotation/${effectiveUnitId}`,
            config
          )
          .catch(err => {
            console.warn('Critical rotation fetch warning:', err);
            return { data: [] as CriticalRotationSoldier[] };
          })
      ]);

      setToeData(Array.isArray(resToe.data) ? resToe.data : []);
      setAvailability(resAvail.data || null);
      setCriticalRotation(Array.isArray(resCrit.data) ? resCrit.data : []);
      setLastRefreshedAt(new Date());
    } catch (err: unknown) {
      console.error('Error fetching analysis data:', err);
    } finally {
      setIsLoadingData(false);
    }
  }, [userToken, effectiveUnitId]);

  useEffect(() => {
    let isCancelled = false;
    if (!userToken || !effectiveUnitId) return;

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsLoadingData(true);
    const config = { headers: { Authorization: `Bearer ${userToken}` }, timeout: 8000 };

    Promise.all([
      axios
        .get<ToeBalanceItem[]>(`${SIGEP_API_URL}/analysis/toe-balance/${effectiveUnitId}`, config)
        .catch(err => {
          console.warn('TOE balance fetch warning:', err);
          return { data: [] as ToeBalanceItem[] };
        }),
      axios
        .get<AvailabilityData>(`${SIGEP_API_URL}/analysis/availability/${effectiveUnitId}`, config)
        .catch(err => {
          console.warn('Availability fetch warning:', err);
          return { data: null };
        }),
      axios
        .get<CriticalRotationSoldier[]>(
          `${SIGEP_API_URL}/analysis/critical-rotation/${effectiveUnitId}`,
          config
        )
        .catch(err => {
          console.warn('Critical rotation fetch warning:', err);
          return { data: [] as CriticalRotationSoldier[] };
        })
    ])
      .then(([resToe, resAvail, resCrit]) => {
        if (isCancelled) return;
        setToeData(Array.isArray(resToe.data) ? resToe.data : []);
        setAvailability(resAvail.data || null);
        setCriticalRotation(Array.isArray(resCrit.data) ? resCrit.data : []);
        setLastRefreshedAt(new Date());
        setIsLoadingData(false);
      })
      .catch(err => {
        if (isCancelled) return;
        console.warn('Initial analysis fetch warning:', err);
        setIsLoadingData(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [userToken, effectiveUnitId]);

  // Handler for internal quick-unit change: syncs with global UnitContext
  const handleUnitChange = (newUnitId: string) => {
    setSelectedUnitId(newUnitId);
    onSelectUnit?.(newUnitId);
  };

  // -------------------------------------------------------------------------
  // KPI Calculations (Genuine calculations from live data)
  // -------------------------------------------------------------------------

  // KPI 1: Fuerza Total vs TOE
  const totalActual = useMemo(() => {
    return toeData.reduce((acc, c) => acc + (c.actual || 0), 0);
  }, [toeData]);

  const totalRequired = useMemo(() => {
    return toeData.reduce((acc, c) => acc + (c.required || 0), 0);
  }, [toeData]);

  const forceDelta = totalActual - totalRequired;
  const toeFilledPct = totalRequired > 0 ? (totalActual / totalRequired) * 100 : totalActual > 0 ? 100 : 0;

  // KPI 2: % Cobertura Orgánica (with Doctrinal Threshold 80.0%)
  const coveragePercent = totalRequired > 0 ? (totalActual / totalRequired) * 100 : totalActual > 0 ? 100 : 0;
  const isDoctrinalPass = coveragePercent >= 80.0;
  const isOptimal = coveragePercent >= 85.0;

  // KPI 3: Disponibilidad Psicofísica / Sanidad
  const totalHealthPersonnel = useMemo(() => {
    if (!availability) return 0;
    return (
      (availability.aptos || 0) +
      (availability.noAptos || 0) +
      (availability.excusados || 0) +
      (availability.licencias || 0)
    );
  }, [availability]);

  const operationalFitnessPct =
    totalHealthPersonnel > 0
      ? ((availability?.aptos || 0) / totalHealthPersonnel) * 100
      : 0;

  // KPI 4: Alertas de Rotación Crítica por Especialidad MOS (>24 meses)
  const criticalRotationCount = criticalRotation.length;

  const mosBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    for (const s of criticalRotation) {
      const code = s.mosCode || 'MOS-SD';
      map[code] = (map[code] || 0) + 1;
    }
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [criticalRotation]);

  // -------------------------------------------------------------------------
  // Chart Data Preparation
  // -------------------------------------------------------------------------

  const filteredToeData = useMemo(() => {
    if (chartMosFilter === 'DEFICIT') {
      return toeData.filter(t => t.actual < t.required);
    }
    if (chartMosFilter === 'COMPLETE') {
      return toeData.filter(t => t.actual >= t.required);
    }
    return toeData;
  }, [toeData, chartMosFilter]);

  const pieData = useMemo(() => {
    if (!availability) {
      return [
        { name: 'Aptos', value: 0 },
        { name: 'No Aptos/Baja', value: 0 },
        { name: 'Excusados', value: 0 },
        { name: 'Licencias', value: 0 }
      ];
    }
    return [
      { name: 'Aptos Operacionales', value: availability.aptos || 0 },
      { name: 'No Aptos / Bajas', value: availability.noAptos || 0 },
      { name: 'Excusados Médicos', value: availability.excusados || 0 },
      { name: 'Licencias / Permisos', value: availability.licencias || 0 }
    ];
  }, [availability]);

  // -------------------------------------------------------------------------
  // Filtered Critical Rotation Personnel Table
  // -------------------------------------------------------------------------

  const filteredCriticalSoldiers = useMemo(() => {
    if (!rotationSearchQuery.trim()) return criticalRotation;
    const q = rotationSearchQuery.toLowerCase();
    return criticalRotation.filter(s => {
      const name = s.name?.toLowerCase() || '';
      const rank = s.rank?.toLowerCase() || '';
      const mos = s.mosCode?.toLowerCase() || '';
      const id = String(s.id || '').toLowerCase();
      return name.includes(q) || rank.includes(q) || mos.includes(q) || id.includes(q);
    });
  }, [criticalRotation, rotationSearchQuery]);

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div className="flex flex-col gap-6 p-2 sm:p-4 text-gray-100 font-sans">
      
      {/* 1. Tactical Command Header & Global Unit Sync */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-slate-900/90 border border-slate-800 shadow-xl backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-cyan-950/80 border border-cyan-500/50 flex items-center justify-center text-cyan-400 shadow-[0_0_12px_rgba(34,211,238,0.25)]">
            <Activity size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-gray-100 font-['Orbitron',sans-serif] tracking-wider">
                Centro de Inteligencia de Personal
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono font-bold rounded bg-cyan-950/80 text-cyan-400 border border-cyan-500/40">
                G1 / ANÁLISIS
              </span>
            </div>
            <p className="text-xs font-mono text-slate-400 mt-0.5">
              Monitoreo analítico de dotación TOE, aptitud psicofísica y permanencia orgánica
            </p>
          </div>
        </div>

        {/* Global Unit Selector & Refresh */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-950/80 border border-slate-800 text-xs font-mono">
            <Building2 size={14} className="text-cyan-400" />
            <span className="text-slate-400">Unidad Evaluada:</span>
            <select
              value={effectiveUnitId}
              onChange={(e) => handleUnitChange(e.target.value)}
              className="bg-transparent text-cyan-300 font-bold focus:outline-none cursor-pointer"
            >
              {unitCatalog.map((u) => (
                <option key={u.id} value={u.id} className="bg-slate-900 text-slate-100">
                  {u.name} ({u.id})
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => reloadData()}
            disabled={isLoadingData}
            title="Actualizar datos de telemetría"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-950/80 border border-slate-800 hover:border-cyan-500/50 text-xs font-mono text-slate-300 hover:text-cyan-300 transition disabled:opacity-50"
          >
            <RefreshCw size={14} className={isLoadingData ? 'animate-spin text-cyan-400' : ''} />
            <span>{isLoadingData ? 'Sincronizando...' : 'Recargar'}</span>
          </button>

          <button
            type="button"
            onClick={() => exportToeToExcel(toeData, availability, effectiveUnitId)}
            title="Exportar Balance TOE y Sanidad a Excel"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-950/60 border border-emerald-500/40 hover:border-emerald-400 text-xs font-mono text-emerald-300 transition shadow-sm"
          >
            <FileSpreadsheet size={14} />
            <span>Exportar TOE (Excel)</span>
          </button>
        </div>
      </div>

      {/* 2. Top Row: 4 High-Impact Tactical KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        
        {/* KPI 1: Fuerza Total vs TOE */}
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800/90 shadow-xl backdrop-blur-md flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider">
                Fuerza Total vs TOE
              </span>
              <div className="w-8 h-8 rounded-lg bg-cyan-950/60 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                <Users size={16} />
              </div>
            </div>
            
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-black text-white font-mono tabular-nums tracking-tight">
                {totalActual}
              </span>
              <span className="text-sm font-mono text-slate-400">
                / {totalRequired} TOE
              </span>
            </div>

            <div className="mt-2 flex items-center gap-2">
              {totalRequired === 0 && totalActual === 0 ? (
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-mono font-bold bg-slate-800/80 text-slate-400 border border-slate-700/60">
                  <AlertCircle size={12} />
                  <span>Sin Dotación TOE</span>
                </span>
              ) : forceDelta < 0 ? (
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-mono font-bold bg-rose-950/70 text-rose-400 border border-rose-500/40">
                  <TrendingDown size={12} />
                  <span>{forceDelta} Déficit</span>
                </span>
              ) : forceDelta === 0 ? (
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-mono font-bold bg-emerald-950/70 text-emerald-400 border border-emerald-500/40">
                  <CheckCircle2 size={12} />
                  <span>Dotación Completa</span>
                </span>
              ) : (
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-mono font-bold bg-emerald-950/70 text-emerald-400 border border-emerald-500/40">
                  <TrendingUp size={12} />
                  <span>+{forceDelta} Excedente</span>
                </span>
              )}
              <span className="text-[11px] text-slate-400 font-mono">
                ({toeFilledPct.toFixed(1)}% cubierto)
              </span>
            </div>
          </div>

          <div className="mt-4">
            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 bg-gradient-to-r from-cyan-500 to-emerald-400 ${getWidthClass(
                  toeFilledPct
                )}`}
              />
            </div>
            <p className="text-[10px] text-slate-500 font-mono mt-1.5">
              Efectivos Físicos vs Dotación TOE Autorizada
            </p>
          </div>
        </div>

        {/* KPI 2: % Cobertura Orgánica (80.0% Doctrinal Military Threshold) */}
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800/90 shadow-xl backdrop-blur-md flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider">
                % Cobertura Orgánica
              </span>
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  isDoctrinalPass
                    ? 'bg-emerald-950/60 border border-emerald-500/30 text-emerald-400'
                    : 'bg-rose-950/60 border border-rose-500/30 text-rose-400 animate-pulse'
                }`}
              >
                <Target size={16} />
              </div>
            </div>

            <div className="flex items-baseline gap-2 mt-1">
              <span
                className={`text-2xl font-black font-mono tabular-nums tracking-tight ${
                  isOptimal
                    ? 'text-emerald-400'
                    : isDoctrinalPass
                    ? 'text-cyan-400'
                    : 'text-rose-400'
                }`}
              >
                {coveragePercent.toFixed(1)}%
              </span>
            </div>

            <div className="mt-2">
              {isOptimal ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-mono font-bold bg-emerald-950/70 text-emerald-400 border border-emerald-500/40">
                  <CheckCircle2 size={12} />
                  <span>Óptimo Doctrinal (≥85%)</span>
                </span>
              ) : isDoctrinalPass ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-mono font-bold bg-cyan-950/70 text-cyan-300 border border-cyan-500/40">
                  <CheckCircle2 size={12} />
                  <span>Cumple Mínimo (≥80%)</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-mono font-bold bg-rose-950/70 text-rose-400 border border-rose-500/40 animate-pulse">
                  <AlertTriangle size={12} />
                  <span>Alerta Doctrinal (&lt;80%)</span>
                </span>
              )}
            </div>
          </div>

          <div className="mt-4">
            <div className="relative w-full h-2 bg-slate-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  isDoctrinalPass ? 'bg-emerald-500' : 'bg-rose-500'
                } ${getWidthClass(coveragePercent)}`}
              />
              {/* Doctrinal 80% Marker */}
              <div
                className="absolute top-0 bottom-0 left-[80%] w-0.5 bg-amber-400 shadow-[0_0_6px_rgba(245,158,11,0.9)]"
                title="Umbral Doctrinal 80%"
              />
            </div>
            <div className="flex justify-between text-[10px] font-mono text-slate-500 mt-1">
              <span>0%</span>
              <span className="text-amber-400/90 font-semibold">Umbral Doctrinal: 80.0%</span>
              <span>100%</span>
            </div>
          </div>
        </div>

        {/* KPI 3: Disponibilidad Psicofísica / Sanidad */}
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800/90 shadow-xl backdrop-blur-md flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider">
                Disponibilidad Psicofísica
              </span>
              <div className="w-8 h-8 rounded-lg bg-emerald-950/60 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <HeartPulse size={16} />
              </div>
            </div>

            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-black text-white font-mono tabular-nums tracking-tight">
                {operationalFitnessPct.toFixed(1)}%
              </span>
              <span className="text-xs font-mono text-emerald-400 font-semibold">
                Aptitud Operativa
              </span>
            </div>

            {/* Breakdown Chips */}
            <div className="grid grid-cols-2 gap-1.5 mt-2.5">
              <div className="flex items-center justify-between px-2 py-1 rounded bg-emerald-950/50 border border-emerald-500/30 text-[10px] font-mono text-emerald-300">
                <span>Aptos:</span>
                <span className="font-bold tabular-nums">{availability?.aptos || 0}</span>
              </div>
              <div className="flex items-center justify-between px-2 py-1 rounded bg-rose-950/50 border border-rose-500/30 text-[10px] font-mono text-rose-300">
                <span>No Aptos:</span>
                <span className="font-bold tabular-nums">{availability?.noAptos || 0}</span>
              </div>
              <div className="flex items-center justify-between px-2 py-1 rounded bg-amber-950/50 border border-amber-500/30 text-[10px] font-mono text-amber-300">
                <span>Excusados:</span>
                <span className="font-bold tabular-nums">{availability?.excusados || 0}</span>
              </div>
              <div className="flex items-center justify-between px-2 py-1 rounded bg-sky-950/50 border border-sky-500/30 text-[10px] font-mono text-sky-300">
                <span>Licencias:</span>
                <span className="font-bold tabular-nums">{availability?.licencias || 0}</span>
              </div>
            </div>
          </div>

          <p className="text-[10px] text-slate-500 font-mono mt-3">
            Efectivos con capacidad de combate inmediata
          </p>
        </div>

        {/* KPI 4: Alertas de Rotación Crítica por Especialidad MOS */}
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800/90 shadow-xl backdrop-blur-md flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider">
                Rotación Crítica MOS
              </span>
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  criticalRotationCount > 0
                    ? 'bg-rose-950/60 border border-rose-500/30 text-rose-400 animate-pulse'
                    : 'bg-emerald-950/60 border border-emerald-500/30 text-emerald-400'
                }`}
              >
                <Clock size={16} />
              </div>
            </div>

            <div className="flex items-baseline gap-2 mt-1">
              <span
                className={`text-2xl font-black font-mono tabular-nums tracking-tight ${
                  criticalRotationCount > 0 ? 'text-rose-400' : 'text-emerald-400'
                }`}
              >
                {criticalRotationCount}
              </span>
              <span className="text-xs font-mono text-slate-400">
                Efectivos (&gt;24 meses)
              </span>
            </div>

            <div className="mt-2">
              {criticalRotationCount > 0 ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-mono font-bold bg-rose-950/70 text-rose-400 border border-rose-500/40">
                  <AlertTriangle size={12} />
                  <span>Requiere Plan de Relevo</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-mono font-bold bg-emerald-950/70 text-emerald-400 border border-emerald-500/40">
                  <CheckCircle2 size={12} />
                  <span>Rotación en Norma</span>
                </span>
              )}
            </div>

            {/* MOS Breakdown Tags */}
            {mosBreakdown.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2.5">
                {mosBreakdown.slice(0, 3).map(([mos, count]) => (
                  <span
                    key={mos}
                    className="px-2 py-0.5 rounded bg-slate-950/80 border border-slate-700/80 text-[10px] font-mono text-amber-300 font-semibold"
                  >
                    {mos}: {count}
                  </span>
                ))}
                {mosBreakdown.length > 3 && (
                  <span className="px-1.5 py-0.5 rounded bg-slate-950/60 text-[10px] font-mono text-slate-400">
                    +{mosBreakdown.length - 3}
                  </span>
                )}
              </div>
            )}
          </div>

          <p className="text-[10px] text-slate-500 font-mono mt-3">
            Permanencia continua superior al ciclo doctrinal (24 meses)
          </p>
        </div>

      </div>

      {/* 3. Operational Charts Grid: BarChart (TOE vs Real) + PieChart (Sanidad) */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* Left Column (2 Cols): BarChart Balance del Pie de Fuerza */}
        <div className="xl:col-span-2 p-5 rounded-xl bg-slate-900/90 border border-slate-800 shadow-xl backdrop-blur-md flex flex-col justify-between">
          <div>
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3 mb-4">
              <div>
                <div className="flex items-center gap-2">
                  <Shield size={18} className="text-cyan-400" />
                  <h2 className="text-sm font-bold text-gray-100 uppercase tracking-wider font-['Orbitron',sans-serif]">
                    Balance del Pie de Fuerza (TOE vs. Real)
                  </h2>
                </div>
                <p className="text-xs font-mono text-slate-400 mt-0.5">
                  Dotación requerida por cuadro de organización vs. efectivos físicos por especialidad MOS
                </p>
              </div>

              {/* MOS Filter Controls */}
              <div className="flex items-center gap-1 rounded-lg bg-slate-950/80 border border-slate-800 p-0.5 text-[11px] font-mono">
                <button
                  onClick={() => setChartMosFilter('ALL')}
                  className={`px-2.5 py-1 rounded-md transition ${
                    chartMosFilter === 'ALL'
                      ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/40'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Todas ({toeData.length})
                </button>
                <button
                  onClick={() => setChartMosFilter('DEFICIT')}
                  className={`px-2.5 py-1 rounded-md transition ${
                    chartMosFilter === 'DEFICIT'
                      ? 'bg-rose-500/20 text-rose-300 font-bold border border-rose-500/40'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Con Déficit ({toeData.filter(t => t.actual < t.required).length})
                </button>
                <button
                  onClick={() => setChartMosFilter('COMPLETE')}
                  className={`px-2.5 py-1 rounded-md transition ${
                    chartMosFilter === 'COMPLETE'
                      ? 'bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/40'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Completas ({toeData.filter(t => t.actual >= t.required).length})
                </button>
              </div>
            </div>

            {/* Recharts BarChart */}
            <div className="w-full h-[360px] overflow-hidden">
              {filteredToeData.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-500 font-mono text-xs">
                  <Shield size={32} className="text-slate-600 mb-2" />
                  <span>No hay especialidades registradas para este filtro en {currentUnitMeta.name}.</span>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={360}>
                  <BarChart
                    data={filteredToeData}
                    margin={{ top: 15, right: 20, left: 0, bottom: 25 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                    <XAxis
                      dataKey="mosCode"
                      stroke="#475569"
                      tick={{ fill: '#94a3b8', fontSize: 11, fontFamily: 'monospace' }}
                      tickLine={{ stroke: '#334155' }}
                      dy={5}
                    />
                    <YAxis
                      stroke="#475569"
                      tick={{ fill: '#94a3b8', fontSize: 11, fontFamily: 'monospace' }}
                      tickLine={{ stroke: '#334155' }}
                      allowDecimals={false}
                    />
                    <RechartsTooltip content={<CustomTacticalTooltip />} />
                    <Legend
                      verticalAlign="top"
                      align="right"
                      iconType="circle"
                      formatter={(val: string) => (
                        <span className="text-xs font-mono text-slate-300 mr-2">{val}</span>
                      )}
                    />
                    <Bar
                      dataKey="required"
                      name="Dotación Requerida (TOE)"
                      fill={COLOR_REQUIRED}
                      radius={[4, 4, 0, 0]}
                      maxBarSize={40}
                    />
                    <Bar
                      dataKey="actual"
                      name="Efectivos Físicos (Real)"
                      fill={COLOR_ACTUAL}
                      radius={[4, 4, 0, 0]}
                      maxBarSize={40}
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between text-[11px] font-mono text-slate-400 pt-3 border-t border-slate-800/80 mt-2">
            <span>Unidad: {currentUnitMeta.name} ({effectiveUnitId})</span>
            <span>Última sincronización: {lastRefreshedAt.toLocaleTimeString()}</span>
          </div>
        </div>

        {/* Right Column (1 Col): PieChart Disponibilidad Humana y Sanidad */}
        <div className="p-5 rounded-xl bg-slate-900/90 border border-slate-800 shadow-xl backdrop-blur-md flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 border-b border-slate-800 pb-3 mb-4">
              <HeartPulse size={18} className="text-emerald-400" />
              <div>
                <h2 className="text-sm font-bold text-gray-100 uppercase tracking-wider font-['Orbitron',sans-serif]">
                  Disponibilidad Humana
                </h2>
                <p className="text-xs font-mono text-slate-400">
                  Desglose psicofísico y capacidad de despliegue
                </p>
              </div>
            </div>

            {/* Donut PieChart */}
            <div className="w-full h-[260px] overflow-hidden flex items-center justify-center">
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={pieData}
                    innerRadius={65}
                    outerRadius={95}
                    paddingAngle={4}
                    dataKey="value"
                    nameKey="name"
                  >
                    {pieData.map((_entry, index) => (
                      <Cell
                        key={`pie-cell-${index}`}
                        fill={PIE_COLORS[index % PIE_COLORS.length]}
                        stroke="#0f172a"
                        strokeWidth={2}
                      />
                    ))}
                  </Pie>
                  <RechartsTooltip content={<CustomTacticalTooltip />} />
                  <Legend
                    verticalAlign="bottom"
                    align="center"
                    iconType="circle"
                    formatter={(val: string) => (
                      <span className="text-[11px] font-mono text-slate-300">{val}</span>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Metric Summary Boxes Underneath PieChart */}
            <div className="grid grid-cols-2 gap-3 mt-4 text-center">
              <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800/80">
                <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
                  Fuerza Evaluada
                </span>
                <p className="text-xl font-bold font-mono text-emerald-400 mt-0.5 tabular-nums">
                  {totalHealthPersonnel}
                </p>
                <span className="text-[10px] text-slate-500 font-mono">100% efectivos</span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800/80">
                <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
                  No Disponibles
                </span>
                <p className="text-xl font-bold font-mono text-rose-400 mt-0.5 tabular-nums">
                  {availability
                    ? (availability.noAptos || 0) +
                      (availability.excusados || 0) +
                      (availability.licencias || 0)
                    : 0}
                </p>
                <span className="text-[10px] text-slate-500 font-mono">bajas + excusas + lic.</span>
              </div>
            </div>
          </div>

          <div className="text-[10px] font-mono text-slate-500 pt-3 border-t border-slate-800/80 mt-4 text-center">
            Fuente: Sanidad Militar / Fichas Psicofísicas
          </div>
        </div>

      </div>

      {/* 4. Critical Rotation Personnel Table (>24 Meses en Cargo) */}
      <div className="p-5 rounded-xl bg-slate-900/90 border border-slate-800 shadow-xl backdrop-blur-md">
        
        {/* Table Header Controls */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-3 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-950/60 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <AlertTriangle size={16} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-gray-100 uppercase tracking-wider font-['Orbitron',sans-serif]">
                  Alertas de Permanencia y Rotación Crítica (&gt;24 Meses)
                </h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-950/80 text-amber-400 border border-amber-500/40">
                  {criticalRotationCount} Casos
                </span>
              </div>
              <p className="text-xs font-mono text-slate-400 mt-0.5">
                Personal que supera el tiempo máximo doctrinal en el mismo cargo orgánico
              </p>
            </div>
          </div>

          {/* Quick Search */}
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-2.5 text-slate-500" size={14} />
            <input
              type="text"
              placeholder="Buscar por Nombre, Grado o MOS..."
              value={rotationSearchQuery}
              onChange={(e) => setRotationSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-950/80 border border-slate-800 rounded-lg text-xs font-mono text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500/60 transition"
            />
          </div>
        </div>

        {/* Personnel Table */}
        {filteredCriticalSoldiers.length === 0 ? (
          <div className="p-8 text-center rounded-xl bg-slate-950/40 border border-slate-800/60 font-mono text-xs text-slate-400">
            <CheckCircle2 size={32} className="mx-auto text-emerald-500 mb-2 opacity-80" />
            <p className="font-bold text-slate-200">Normalidad en Ciclos de Rotación</p>
            <p className="text-slate-500 text-[11px] mt-1">
              No se registran efectivos con permanencia superior a 24 meses en {currentUnitMeta.name}.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-slate-800">
            <table className="w-full text-left border-collapse text-xs font-mono">
              <thead className="bg-slate-950/90 text-slate-400 uppercase text-[11px] border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Efectivo / Cédula</th>
                  <th className="py-3 px-4">Grado Militar</th>
                  <th className="py-3 px-4">Especialidad (MOS)</th>
                  <th className="py-3 px-4">Meses en Cargo</th>
                  <th className="py-3 px-4">Aptitud Sanidad</th>
                  <th className="py-3 px-4 text-right">Acción Doctrinal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 bg-slate-900/40">
                {filteredCriticalSoldiers.map((soldier, idx) => {
                  const months = soldier.timeInPosition ?? soldier.timeInPositionMonths ?? 25;
                  return (
                    <tr
                      key={soldier.id || idx}
                      className="hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-3 px-4 font-sans font-medium text-slate-200">
                        <div className="font-bold text-white">{soldier.name}</div>
                        <div className="text-[10px] font-mono text-slate-500">ID: {soldier.id}</div>
                      </td>
                      <td className="py-3 px-4 font-bold text-cyan-300">
                        {soldier.rank}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5">
                          <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-200 font-bold text-[11px]">
                            {soldier.mosCode}
                          </span>
                          <span className="text-[10px] text-slate-400 font-sans hidden sm:inline">
                            {getMosLabel(soldier.mosCode)}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-950/70 text-rose-300 border border-rose-500/40">
                          <Clock size={11} />
                          <span>{months} Meses</span>
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            soldier.healthStatus === 'NO_APTO'
                              ? 'bg-rose-950/70 text-rose-400 border border-rose-500/40'
                              : soldier.healthStatus === 'EXCUSADO'
                              ? 'bg-amber-950/70 text-amber-400 border border-amber-500/40'
                              : 'bg-emerald-950/70 text-emerald-400 border border-emerald-500/40'
                          }`}
                        >
                          {soldier.healthStatus || 'APTO'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => setProjectedSoldier(soldier)}
                          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-cyan-600/20 text-cyan-300 border border-cyan-500/40 hover:bg-cyan-500/30 transition text-xs font-mono font-semibold"
                        >
                          <ArrowRightLeft size={12} />
                          <span>Proyectar Traslado</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

      </div>

      {/* 5. Projected Transfer Tactical Action Toast / Modal */}
      {projectedSoldier && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-md p-6 rounded-2xl bg-slate-900 border border-cyan-500/40 shadow-2xl shadow-cyan-950/60 font-sans text-gray-100 relative">
            <button
              onClick={() => setProjectedSoldier(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white transition"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-cyan-950/80 border border-cyan-500/50 flex items-center justify-center text-cyan-400">
                <ArrowRightLeft size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold text-white font-['Orbitron',sans-serif]">
                  Plan de Relevo Operacional
                </h3>
                <p className="text-xs font-mono text-slate-400">
                  Rotación por permanencia crítica (&gt;24 meses)
                </p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2 text-xs font-mono mb-4">
              <div className="flex justify-between">
                <span className="text-slate-400">Efectivo:</span>
                <span className="font-bold text-white">{projectedSoldier.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Grado Militar:</span>
                <span className="font-bold text-cyan-400">{projectedSoldier.rank}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Especialidad (MOS):</span>
                <span className="font-bold text-amber-300">
                  {projectedSoldier.mosCode} ({getMosLabel(projectedSoldier.mosCode)})
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Permanencia en Unidad:</span>
                <span className="font-bold text-rose-400">
                  {projectedSoldier.timeInPosition ?? projectedSoldier.timeInPositionMonths ?? 25} Meses
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Unidad Actual:</span>
                <span className="font-bold text-slate-200">{effectiveUnitId}</span>
              </div>
            </div>

            <p className="text-xs text-slate-300 mb-5 leading-relaxed font-sans">
              La iniciativa de relevo doctrinal ha sido registrada. Proceda a la{' '}
              <strong className="text-cyan-300">Consola Centralizada de Movilidad y Traslados</strong>{' '}
              para ejecutar la simulación de impacto TOE hacia la unidad receptora y emitir el Webhook M2M.
            </p>

            <div className="flex items-center justify-end gap-2.5">
              <button
                onClick={() => setProjectedSoldier(null)}
                className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs font-mono font-semibold transition"
              >
                Cerrar
              </button>
              <button
                onClick={() => {
                  setProjectedSoldier(null);
                  // Global notification or tab switch can be handled by navigation
                }}
                className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold text-xs font-mono transition flex items-center gap-1.5 shadow-[0_0_12px_rgba(6,182,212,0.4)]"
              >
                <Send size={14} />
                <span>Confirmar Proyección</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
