import React, { useState, useEffect, useCallback } from 'react';
import type { MilitaryUnit, Alert, SelectedEntity, User, IntelligenceReport } from '../types';
import { MapEntityType, UnitStatus, AlertSeverity } from '../types';
import { UnitCardComponent } from './UnitCardComponent';
import { AlertPanelComponent } from './AlertPanelComponent';
import { ShieldCheckIcon } from './icons/ShieldCheckIcon';
import { EyeIcon } from './icons/EyeIcon';
import { BellAlertIcon } from './icons/BellAlertIcon';
import { AcademicCapIcon } from './icons/AcademicCapIcon';
import { LightBulbIcon } from './icons/LightBulbIcon';
import { MapPinIcon } from './icons/MapPinIcon';
import { XMarkIcon } from './icons/XMarkIcon';
import { CheckCircleIcon } from './icons/CheckCircleIcon';
import { getProactiveAnalysis, useAITask, shouldTriggerAutoAI } from '../utils/geminiService';
import {
  getActiveCOTLocation,
  COLOMBIA_STRATEGIC_LOCATIONS,
  COT_STORAGE_KEY,
  COT_COORDS_STORAGE_KEY,
  resolveColombiaLocation
} from '../utils/colombiaGeoUtils';

interface ProactiveAnalysisComponentProps {
  units: MilitaryUnit[];
  alerts: Alert[];
  intelligenceReports: IntelligenceReport[];
}

const ProactiveAnalysisComponent: React.FC<ProactiveAnalysisComponentProps> = ({ units, alerts, intelligenceReports }) => {
  const taskState = useAITask('proactiveAnalysis');

  // Keep latest state in refs to avoid re-triggering the useEffect interval on every telemetry update
  const unitsRef = React.useRef(units);
  const alertsRef = React.useRef(alerts);
  const intelRef = React.useRef(intelligenceReports);

  useEffect(() => {
    unitsRef.current = units;
    alertsRef.current = alerts;
    intelRef.current = intelligenceReports;
  }, [units, alerts, intelligenceReports]);

  const fetchAnalysis = useCallback(async (force = false) => {
    if (!force && !shouldTriggerAutoAI('proactiveAnalysis')) {
      return;
    }
    try {
      await getProactiveAnalysis(unitsRef.current, alertsRef.current, intelRef.current, force);
    } catch (err: any) {
      console.error("Error fetching proactive analysis:", err);
    }
  }, []); // Stable dependencies

  useEffect(() => {
    fetchAnalysis(false); // Initial strategic hour check
    const intervalId = setInterval(() => fetchAnalysis(false), 60000); // Check every 60 seconds
    return () => clearInterval(intervalId);
  }, [fetchAnalysis]);

  // Compute points from taskState result
  const text = taskState.result?.text || "";
  const analysisPoints = text.split(/-\s+/).map((p: string) => p.trim()).filter((p: string) => p.length > 0);

  const isLoading = taskState.status === 'QUEUED' || taskState.status === 'RUNNING';

  return (
    <div className="glass-effect p-5 rounded-2xl shadow-xl border border-white/5 relative overflow-hidden">
      <div className="absolute top-0 right-0 p-4 opacity-5">
        <LightBulbIcon className="w-24 h-24" />
      </div>
      <h3 className="text-sm font-bold text-blue-400 uppercase tracking-[0.2em] mb-4 flex items-center justify-between">
        <div className="flex items-center">
          <div className="w-2 h-2 bg-blue-500 rounded-full mr-2 animate-pulse"></div>
          Inteligencia Predictiva (IA)
        </div>
        <button
          onClick={() => fetchAnalysis(true)}
          disabled={isLoading}
          className="text-[10px] bg-blue-500/20 hover:bg-blue-500/40 disabled:opacity-50 text-blue-200 px-2.5 py-1 rounded border border-blue-500/30 transition-all font-bold uppercase tracking-wider flex items-center gap-1"
        >
          {isLoading ? 'Consultando...' : 'Actualizar con IA'}
        </button>
      </h3>
      
      {taskState.status === 'QUEUED' ? (
        <div className="flex flex-col items-center py-8">
          <div className="flex space-x-2 mb-4">
            <div className="w-2 h-2 bg-amber-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
            <div className="w-2 h-2 bg-amber-500 rounded-full animate-bounce" style={{ animationDelay: '200ms' }}></div>
            <div className="w-2 h-2 bg-amber-500 rounded-full animate-bounce" style={{ animationDelay: '400ms' }}></div>
          </div>
          <p className="text-xs font-semibold text-amber-400 uppercase tracking-widest animate-pulse">
            En cola de espera de IA (Puesto #{taskState.queuePosition})...
          </p>
        </div>
      ) : taskState.status === 'RUNNING' ? (
        <div className="flex flex-col items-center py-8">
          <div className="flex space-x-2 mb-4 animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
          <p className="text-xs font-semibold text-blue-400 uppercase tracking-widest">
            Procesando análisis de IA...
          </p>
        </div>
      ) : taskState.status === 'FAILED' ? (
        <div className="bg-red-900/20 border border-red-800/50 p-4 rounded-xl text-center">
          <p className="text-xs font-bold text-red-400 uppercase tracking-wider">{taskState.error || 'Fallo al obtener análisis.'}</p>
        </div>
      ) : analysisPoints.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {analysisPoints.map((point, index) => (
            <div key={index} className="group bg-gray-900/40 hover:bg-gray-800/60 p-4 rounded-xl border border-white/5 transition-all flex gap-3 items-start">
              <div className="mt-1 w-1.5 h-1.5 bg-blue-500 rounded-full shadow-[0_0_8px_rgba(59,130,246,0.6)] flex-shrink-0"></div>
              <p className="text-xs font-medium text-gray-300 leading-relaxed group-hover:text-white transition-colors">
                {point}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-6">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">
            No se han registrado consultas automáticas aún
          </p>
          <p className="text-[10px] text-gray-600 max-w-md mx-auto">
            Las consultas se realizan automáticamente a las 06:00, 14:00 y 22:00, o presione "Actualizar con IA" arriba para iniciar una consulta.
          </p>
        </div>
      )}
    </div>
  );
};


interface DashboardViewProps {
  units: MilitaryUnit[];
  allUnits: MilitaryUnit[];
  alerts: Alert[];
  intelligenceReports: IntelligenceReport[];
  intelCount: number;
  onSelectEntity: (entity: SelectedEntity | null) => void;
  currentUser: User | null;
  approvePlatoonNovelty: (alertId: string, approverUserId: string) => void;
  approveAmmoReport: (alertId: string, approverUserId: string) => void;
  rejectAmmoReport: (alertId: string, approverUserId: string, reason: string) => void;
  rejectPlatoonNovelty: (alertId: string, approverUserId: string, reason: string) => void;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export const DashboardView: React.FC<DashboardViewProps> = ({
  units,
  allUnits,
  alerts,
  intelligenceReports,
  intelCount,
  onSelectEntity,
  currentUser,
  approvePlatoonNovelty,
  approveAmmoReport,
  rejectAmmoReport,
  rejectPlatoonNovelty
}) => {
  const criticalAlerts = alerts.filter(alert => alert.severity === AlertSeverity.CRITICAL && !alert.acknowledged);
  const highAlerts = alerts.filter(alert => alert.severity === AlertSeverity.HIGH && !alert.acknowledged);

  const operationalUnitsCount = units.filter(unit =>
    unit.status !== UnitStatus.ON_LEAVE_RETRAINING &&
    unit.status !== UnitStatus.AAR_PENDING
  ).length;

  const now = Date.now();
  const unitsOnLeaveCount = units.filter(unit =>
    unit.status === UnitStatus.ON_LEAVE_RETRAINING &&
    unit.leaveStartDate &&
    unit.leaveDurationDays &&
    (unit.leaveStartDate + (unit.leaveDurationDays * MS_PER_DAY)) > now
  ).length;

  const unitsInRetrainingCount = units.filter(unit =>
    unit.status === UnitStatus.ON_LEAVE_RETRAINING &&
    unit.retrainingStartDate &&
    unit.retrainingDurationDays &&
    (unit.retrainingStartDate + (unit.retrainingDurationDays * MS_PER_DAY)) > now
  ).length;


  const summaryStats = [
    { label: "UNIDADES TOTALES", value: units.length, icon: ShieldCheckIcon, color: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/20" },
    { label: "OPERATIVAS", value: operationalUnitsCount, icon: ShieldCheckIcon, color: "text-green-400", bg: "bg-green-500/10", border: "border-green-500/20" },
    { label: "REPORTES INTEL", value: intelCount, icon: EyeIcon, color: "text-yellow-400", bg: "bg-yellow-500/10", border: "border-yellow-500/20" },
    { label: "ALERTAS CRÍTICAS", value: criticalAlerts.length, icon: BellAlertIcon, color: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/20", animate: "animate-pulse" },
    { label: "ALERTAS ALTAS", value: highAlerts.length, icon: BellAlertIcon, color: "text-orange-400", bg: "bg-orange-500/10", border: "border-orange-500/20" },
    { label: "EN PERMISO", value: unitsOnLeaveCount, icon: AcademicCapIcon, color: "text-indigo-400", bg: "bg-indigo-500/10", border: "border-indigo-500/20" },
    { label: "EN REENTRENO", value: unitsInRetrainingCount, icon: AcademicCapIcon, color: "text-purple-400", bg: "bg-purple-500/10", border: "border-purple-500/20" },
  ];

  const recentUnitsForDisplay = units
    .filter(u => u.status !== UnitStatus.ON_LEAVE_RETRAINING && u.status !== UnitStatus.AAR_PENDING)
    .slice(0, 3);

  // Ubicación del Centro de Operaciones Tácticas (COT) dinámica y configurable
  const [cotInfo, setCotInfo] = useState(() => getActiveCOTLocation(units, currentUser));
  const [isCotModalOpen, setIsCotModalOpen] = useState(false);
  const [customCotInput, setCustomCotInput] = useState('');

  // Actualizar cotInfo dinámicamente si cambian las unidades o el usuario (si no es custom manual)
  useEffect(() => {
    setCotInfo(getActiveCOTLocation(units, currentUser));
  }, [units, currentUser]);

  const handleSelectPreset = (preset: { municipio: string; departamento: string; lat: number; lon: number }) => {
    const name = `${preset.municipio}, ${preset.departamento}`.toUpperCase();
    localStorage.setItem(COT_STORAGE_KEY, name);
    localStorage.setItem(COT_COORDS_STORAGE_KEY, JSON.stringify({ lat: preset.lat, lon: preset.lon }));
    setCotInfo({ name, lat: preset.lat, lon: preset.lon, isCustom: true });
    setIsCotModalOpen(false);
  };

  const handleSelectUnit = (unit: MilitaryUnit) => {
    if (!unit.location) return;
    const resolved = resolveColombiaLocation(unit.location.lat, unit.location.lon);
    const name = `${unit.name} (${resolved.municipio}, ${resolved.departamento})`.toUpperCase();
    localStorage.setItem(COT_STORAGE_KEY, name);
    localStorage.setItem(COT_COORDS_STORAGE_KEY, JSON.stringify(unit.location));
    setCotInfo({ name, lat: unit.location.lat, lon: unit.location.lon, isCustom: true });
    setIsCotModalOpen(false);
  };

  const handleSaveCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customCotInput.trim()) return;
    const name = customCotInput.trim().toUpperCase();
    localStorage.setItem(COT_STORAGE_KEY, name);
    setCotInfo(prev => ({ ...prev, name, isCustom: true }));
    setCustomCotInput('');
    setIsCotModalOpen(false);
  };

  const handleResetAuto = () => {
    localStorage.removeItem(COT_STORAGE_KEY);
    localStorage.removeItem(COT_COORDS_STORAGE_KEY);
    const autoLoc = getActiveCOTLocation(units, currentUser);
    setCotInfo(autoLoc);
    setIsCotModalOpen(false);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-white/10 pb-6 gap-4">
        <div>
          <h2 className="text-3xl font-black text-white uppercase tracking-tighter leading-none">Mando y Control</h2>
          <p className="text-xs font-bold text-gray-500 uppercase tracking-[0.2em] mt-2">Centro de Operaciones Tácticas - SIMCOP 3.0</p>
        </div>
        <button
          onClick={() => setIsCotModalOpen(true)}
          className="flex items-center gap-4 bg-gray-900/60 hover:bg-gray-800/80 px-4 py-2 rounded-2xl border border-white/10 hover:border-cyan-500/50 shadow-inner transition-all group cursor-pointer text-left focus:outline-none focus:ring-1 focus:ring-cyan-500"
          title="Clic para cambiar o configurar la Sede del Centro de Operaciones Tácticas (COT)"
        >
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(34,197,94,1)]"></div>
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest group-hover:text-gray-300">RED OPERATIVA</span>
          </div>
          <div className="w-px h-4 bg-gray-700"></div>
          <div className="flex items-center gap-1.5">
            <MapPinIcon className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span className="text-[10px] font-black text-cyan-400 uppercase tracking-widest group-hover:text-cyan-300">
              {cotInfo.name}
            </span>
            <span className="text-[10px] text-gray-500 group-hover:text-cyan-400 ml-1">✎</span>
          </div>
        </button>
      </div>

      {/* Modal de Configuración y Cambio de Sede del COT */}
      {isCotModalOpen && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center backdrop-blur-md p-4 overflow-y-auto">
          <div className="bg-gray-900 border border-cyan-500/80 rounded-2xl p-6 w-full max-w-2xl shadow-2xl my-8">
            <div className="flex justify-between items-center pb-4 border-b border-gray-800">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-cyan-950/80 rounded-xl border border-cyan-500/50">
                  <MapPinIcon className="w-6 h-6 text-cyan-400" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white tracking-wide">Sede del Centro de Operaciones Tácticas (COT)</h3>
                  <p className="text-xs text-gray-400 font-mono">Configuración y despliegue del Puesto de Mando Principal</p>
                </div>
              </div>
              <button
                onClick={() => setIsCotModalOpen(false)}
                className="text-gray-400 hover:text-white p-1 rounded-lg"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-5 mt-5 text-xs">
              {/* Sede Actual */}
              <div className="bg-gray-800/80 p-4 rounded-xl border border-gray-700 flex justify-between items-center">
                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">SEDE ACTIVA EN RED</span>
                  <p className="text-base font-black text-cyan-300 font-mono">{cotInfo.name}</p>
                  <p className="text-[11px] text-gray-400 font-mono mt-0.5">
                    Coordenadas Base: Lat {cotInfo.lat.toFixed(4)}°, Lon {cotInfo.lon.toFixed(4)}°
                    {cotInfo.isCustom && <span className="text-amber-400 ml-2">(Fijada manualmente)</span>}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleResetAuto}
                  className="bg-gray-700 hover:bg-gray-600 text-gray-200 text-xs px-3 py-1.5 rounded-lg border border-gray-600 transition-colors"
                  title="Detectar automáticamente según el Puesto de Mando o tropas en el terreno"
                >
                  🔄 Auto-Detectar por Tropas
                </button>
              </div>

              {/* Guarniciones y Jurisdicciones Militares Estratégicas de Colombia */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-300 mb-2">
                  Guarniciones Estratégicas y Puestos de Mando (Colombia)
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-44 overflow-y-auto custom-scrollbar p-1">
                  {COLOMBIA_STRATEGIC_LOCATIONS.map((loc) => {
                    const isSelected = cotInfo.name.includes(loc.municipio.toUpperCase());
                    return (
                      <button
                        key={`${loc.municipio}-${loc.departamento}`}
                        type="button"
                        onClick={() => handleSelectPreset(loc)}
                        className={`p-2 rounded-lg border text-left transition-all ${
                          isSelected
                            ? 'bg-cyan-950/70 border-cyan-400 text-cyan-300 shadow-md font-bold'
                            : 'bg-gray-800/60 border-gray-700/80 text-gray-300 hover:bg-gray-700 hover:border-gray-600'
                        }`}
                      >
                        <span className="block text-xs font-semibold">{loc.municipio}</span>
                        <span className="block text-[10px] text-gray-400">{loc.departamento}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Unidades Militares en Terreno */}
              {units.length > 0 && (
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-300 mb-2">
                    Vincular a Unidad Militar Desplegada
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-36 overflow-y-auto custom-scrollbar p-1">
                    {units.slice(0, 10).map((u) => (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => handleSelectUnit(u)}
                        className="p-2 rounded-lg bg-gray-800/60 border border-gray-700/80 hover:bg-gray-700 hover:border-gray-600 text-left transition-all flex items-center justify-between"
                      >
                        <div className="truncate mr-2">
                          <span className="block text-xs font-semibold text-white truncate">{u.name}</span>
                          <span className="block text-[10px] text-gray-400">{u.type}</span>
                        </div>
                        <span className="text-[10px] font-mono text-cyan-400 shrink-0">
                          {u.location ? `${u.location.lat.toFixed(2)}, ${u.location.lon.toFixed(2)}` : 'Sin GPS'}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Nombre Personalizado */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-300 mb-1">
                  O Establecer Nombre Personalizado de Puesto de Mando (COT)
                </label>
                <form onSubmit={handleSaveCustom} className="flex gap-2">
                  <input
                    type="text"
                    value={customCotInput}
                    onChange={(e) => setCustomCotInput(e.target.value)}
                    placeholder="Ej. PUESTO DE MANDO AVANZADO - TUMACO, NARIÑO"
                    className="flex-1 bg-gray-800 border border-gray-700 focus:border-cyan-500 rounded-lg p-2.5 text-white text-xs font-mono"
                  />
                  <button
                    type="submit"
                    disabled={!customCotInput.trim()}
                    className="bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 text-white font-bold px-4 py-2 rounded-lg text-xs transition-colors shrink-0 flex items-center gap-1.5"
                  >
                    <CheckCircleIcon className="w-4 h-4" />
                    Establecer
                  </button>
                </form>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-800">
              <button
                type="button"
                onClick={() => setIsCotModalOpen(false)}
                className="px-5 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-xs font-semibold transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        {summaryStats.map(stat => (
          <div key={stat.label} className={`glass-effect p-5 rounded-2xl shadow-xl border ${stat.border} relative overflow-hidden group transition-all hover:scale-[1.05] hover:shadow-2xl`}>
            <div className={`absolute -right-4 -top-4 w-16 h-16 rounded-full opacity-[0.05] ${stat.bg}`}></div>
            <stat.icon className={`w-6 h-6 mb-4 ${stat.color} ${stat.animate || ''}`} />
            <p className={`text-3xl font-black tracking-tighter ${stat.color} mb-1`}>{stat.value}</p>
            <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest leading-tight">{stat.label}</p>
          </div>
        ))}
      </div>

      <ProactiveAnalysisComponent
        units={allUnits}
        alerts={alerts}
        intelligenceReports={intelligenceReports}
      />

      <div className="glass-effect rounded-2xl border border-white/5 overflow-hidden">
        <AlertPanelComponent
          alerts={alerts}
          acknowledgeAlert={() => { }}
          title="SITUACIONES TÁCTICAS RELEVANTES"
          maxItems={5}
          filterAcknowledged={true}
          currentUser={currentUser}
          approvePlatoonNovelty={approvePlatoonNovelty}
          approveAmmoReport={approveAmmoReport}
          rejectAmmoReport={rejectAmmoReport}
          rejectPlatoonNovelty={rejectPlatoonNovelty}
        />
      </div>

      <div className="space-y-4">
        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-[0.2em] ml-1">Unidades Críticas en Operación</h3>
        {recentUnitsForDisplay.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {recentUnitsForDisplay.map(unit => (
              <div key={unit.id} className="transition-all hover:translate-y-[-4px]">
                <UnitCardComponent
                  unit={unit}
                  onSelectUnit={(selectedUnit) => onSelectEntity({ type: MapEntityType.UNIT, id: selectedUnit.id })}
                  isSelected={false}
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-gray-900/40 border border-gray-800 rounded-2xl p-8 text-center">
            <p className="text-xs font-bold text-gray-600 uppercase tracking-widest">No hay unidades operacionales en el sector</p>
          </div>
        )}
      </div>

    </div>
  );
};