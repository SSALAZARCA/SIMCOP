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
import { getProactiveAnalysis } from '../utils/geminiService';

interface ProactiveAnalysisComponentProps {
  units: MilitaryUnit[];
  alerts: Alert[];
  intelligenceReports: IntelligenceReport[];
}

const ProactiveAnalysisComponent: React.FC<ProactiveAnalysisComponentProps> = ({ units, alerts, intelligenceReports }) => {
  const [analysis, setAnalysis] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalysis = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await getProactiveAnalysis(units, alerts, intelligenceReports);
      // Split by markdown list items
      const points = result.text.split(/-\s+/).map(p => p.trim()).filter(p => p.length > 0);
      setAnalysis(points);
    } catch (err: any) {
      setError(err.message || 'Error al obtener análisis.');
      setAnalysis([]);
    } finally {
      setIsLoading(false);
    }
  }, [units, alerts, intelligenceReports]);

  useEffect(() => {
    fetchAnalysis(); // Initial fetch
    const intervalId = setInterval(fetchAnalysis, 60000); // Fetch every 60 seconds
    return () => clearInterval(intervalId);
  }, [fetchAnalysis]);

  return (
    <div className="glass-effect p-5 rounded-2xl shadow-xl border border-white/5 relative overflow-hidden">
      <div className="absolute top-0 right-0 p-4 opacity-5">
        <LightBulbIcon className="w-24 h-24" />
      </div>
      <h3 className="text-sm font-bold text-blue-400 uppercase tracking-[0.2em] mb-4 flex items-center">
        <div className="w-2 h-2 bg-blue-500 rounded-full mr-2 animate-pulse"></div>
        Inteligencia Predictiva (Gemini AI)
      </h3>
      {isLoading ? (
        <div className="flex flex-col items-center py-8">
          <div className="flex space-x-2 mb-4">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '200ms' }}></div>
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '400ms' }}></div>
          </div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest">Analizando Red Táctica...</p>
        </div>
      ) : error ? (
        <div className="bg-red-900/20 border border-red-800/50 p-4 rounded-xl text-center">
          <p className="text-xs font-bold text-red-400 uppercase tracking-wider">{error}</p>
        </div>
      ) : analysis.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {analysis.map((point, index) => (
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
          <p className="text-xs font-bold text-gray-600 uppercase tracking-widest">Sin Anomalías Críticas Detectadas</p>
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

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-white/10 pb-6 gap-4">
        <div>
          <h2 className="text-3xl font-black text-white uppercase tracking-tighter leading-none">Mando y Control</h2>
          <p className="text-xs font-bold text-gray-500 uppercase tracking-[0.2em] mt-2">Centro de Operaciones Tácticas - SIMCOP 3.0</p>
        </div>
        <div className="flex items-center gap-4 bg-gray-900/50 px-4 py-2 rounded-2xl border border-white/5 shadow-inner">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(34,197,94,1)]"></div>
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">RED OPERATIVA</span>
          </div>
          <div className="w-px h-4 bg-gray-700"></div>
          <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">YOPAL, CASANARE</span>
        </div>
      </div>

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