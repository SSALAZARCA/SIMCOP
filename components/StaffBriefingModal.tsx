import React, { useState, useEffect } from 'react';
import { 
  MilitaryUnit, 
  IntelligenceReport, 
  ArtilleryPiece, 
  UnitHistoryEvent, 
  AfterActionReport, 
  OsintEvent,
  GeoLocation 
} from '../types';
import { staffAgentService, StaffBriefing, StaffCOA, StaffEchelon } from '../services/staffAgentService';
import { sovereignOsintService } from '../services/sovereignOsintService';
import { sigepIntegrationService } from '../services/sigepIntegrationService';
import type { SigepUnitPersonnelSummary } from '../types/sigep';
import { BoltIcon } from './icons';

interface StaffBriefingModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeUnit: MilitaryUnit | null;
  units: MilitaryUnit[];
  intelligenceReports: IntelligenceReport[];
  artilleryPieces: ArtilleryPiece[];
  unitHistoryLog?: UnitHistoryEvent[];
  afterActionReports?: AfterActionReport[];
  osintEvents?: OsintEvent[];
  onApproveCoa?: (coa: StaffCOA) => void;
}

export const StaffBriefingModal: React.FC<StaffBriefingModalProps> = ({
  isOpen,
  onClose,
  activeUnit,
  units,
  intelligenceReports,
  artilleryPieces,
  unitHistoryLog = [],
  afterActionReports = [],
  osintEvents = [],
  onApproveCoa
}) => {
  const [selectedEchelon, setSelectedEchelon] = useState<StaffEchelon>('BATALLON');
  const [activeTab, setActiveTab] = useState<'C2' | 'S2' | 'S3' | 'S4' | 'S1_S5' | 'OSINT'>('C2');
  const [briefing, setBriefing] = useState<StaffBriefing | null>(null);
  const [sigepData, setSigepData] = useState<SigepUnitPersonnelSummary | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [approvedCoaMessage, setApprovedCoaMessage] = useState<string | null>(null);

  // Escanear y generar Apreciación de Estado Mayor al abrir o cambiar de unidad / escalón
  useEffect(() => {
    if (!isOpen) return;

    const unit = activeUnit || (units.length > 0 ? units[0] : null);
    if (!unit) return;

    setIsLoading(true);
    setApprovedCoaMessage(null);

    Promise.all([
      staffAgentService.generateStaffBriefing({
        echelon: selectedEchelon,
        activeUnit: unit,
        units,
        intelligenceReports,
        artilleryPieces,
        unitHistoryLog,
        afterActionReports,
        osintEvents
      }),
      sigepIntegrationService.getUnitPersonnelSummary({
        unit: unit,
        soldiers: unit.personnelList,
        aars: afterActionReports
      })
    ]).then(([resBriefing, resSigep]) => {
      setBriefing(resBriefing);
      setSigepData(resSigep);
      setIsLoading(false);
    }).catch(err => {
      console.error("Error generando apreciación de Estado Mayor / SIGEP:", err);
      setIsLoading(false);
    });
  }, [isOpen, activeUnit, selectedEchelon, units.length]);

  const handleProrroga = async (soldierId: string, soldierName: string) => {
    const res = await sigepIntegrationService.submitProrroga(
      soldierId,
      soldierName,
      'Operaciones tácticas continuas en el sector y balance de fuerza crítica'
    );
    setApprovedCoaMessage(`🏛️ ${res.message}`);
    const unit = activeUnit || (units.length > 0 ? units[0] : null);
    if (unit) {
      const updated = await sigepIntegrationService.getUnitPersonnelSummary({
        unit: unit,
        soldiers: unit.personnelList,
        aars: afterActionReports,
        forceRefresh: true
      });
      setSigepData(updated);
    }
  };

  if (!isOpen) return null;

  const unit = activeUnit || (units.length > 0 ? units[0] : null);

  const handleApprove = (coa: StaffCOA) => {
    setApprovedCoaMessage(`✅ ${coa.name} APROBADO POR EL COMANDANTE. Se ha generado la Orden de Operaciones preparatoria y se actualizó el PICC táctico en la red de mando.`);
    if (onApproveCoa) {
      onApproveCoa(coa);
    }
  };

  return (
    <div className="fixed inset-0 z-[300] bg-black/80 backdrop-blur-md flex items-center justify-center p-2 md:p-6 animate-in fade-in duration-200">
      <div className="bg-[#0b0f17] border border-cyan-500/40 rounded-2xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden text-slate-200">
        
        {/* Encabezado Militar de Mando y Control */}
        <div className="bg-slate-900/90 border-b border-slate-800 p-4 md:px-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-950/60 border border-cyan-500/40 text-cyan-400">
              <BoltIcon className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base md:text-lg font-black tracking-wide text-white uppercase">
                  Estado Mayor Virtual • Asesoría de Mando y C2
                </h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                  DOCTRINA MFRE / CEDOE
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Unidad: <span className="text-cyan-300 font-semibold">{unit?.name || 'Unidad No Asignada'}</span> | 
                Jurisdicción: <span className="text-amber-300 font-semibold">{(unit as any)?.department || 'NARIÑO'}</span> | 
                {unit?.areaOfOperations ? (
                  <span className="text-emerald-400 font-bold ml-1">🛡️ ÁREA DE OPERACIONES PERSISTENTE DELIMITADA</span>
                ) : (
                  <span className="text-slate-400 ml-1">JURISDICCIÓN MUNICIPAL ASIGNADA</span>
                )}
              </p>
            </div>
          </div>

          {/* Selector de Escalón Doctrinal en la Estructura de Fuerza */}
          <div className="flex items-center gap-2">
            <label className="text-[11px] font-bold text-slate-400 uppercase hidden sm:inline">Escalón de Mando:</label>
            <select
              value={selectedEchelon}
              onChange={(e) => setSelectedEchelon(e.target.value as StaffEchelon)}
              className="bg-slate-950 border border-cyan-500/50 text-cyan-300 text-xs rounded-lg px-2.5 py-1.5 font-bold focus:outline-none focus:ring-1 focus:ring-cyan-400"
            >
              <option value="COEJC">COEJC (Estratégico Nacional)</option>
              <option value="DIVISION">División (Operacional Regional)</option>
              <option value="BRIGADA">Brigada (Táctico-Operacional)</option>
              <option value="BATALLON">Batallón (Táctico Directo)</option>
              <option value="COMPANIA">Compañía / Pelotón (Maniobra)</option>
            </select>

            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition text-sm font-bold"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Notificación de Aprobación de COA */}
        {approvedCoaMessage && (
          <div className="bg-emerald-950/90 border-b border-emerald-500/50 p-3 px-6 text-xs text-emerald-200 font-semibold flex items-center justify-between animate-in slide-in-from-top">
            <span>{approvedCoaMessage}</span>
            <button 
              onClick={() => setApprovedCoaMessage(null)}
              className="text-emerald-400 hover:text-white font-bold ml-4"
            >
              Cerrar
            </button>
          </div>
        )}

        {/* Pestañas de las Secciones del Estado Mayor */}
        <div className="flex items-center gap-1 bg-slate-950/70 border-b border-slate-800/80 px-4 md:px-6 overflow-x-auto">
          <button
            onClick={() => setActiveTab('C2')}
            className={`py-3 px-3.5 text-xs font-bold border-b-2 transition whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'C2'
                ? 'border-cyan-400 text-cyan-300 bg-cyan-950/30'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
            }`}
          >
            <span>⭐</span> C2 Comandante (Síntesis)
          </button>
          <button
            onClick={() => setActiveTab('S2')}
            className={`py-3 px-3.5 text-xs font-bold border-b-2 transition whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'S2'
                ? 'border-cyan-400 text-cyan-300 bg-cyan-950/30'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
            }`}
          >
            <span>🎯</span> S-2 Inteligencia & Terreno
          </button>
          <button
            onClick={() => setActiveTab('S3')}
            className={`py-3 px-3.5 text-xs font-bold border-b-2 transition whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'S3'
                ? 'border-cyan-400 text-cyan-300 bg-cyan-950/30'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
            }`}
          >
            <span>⚔️</span> S-3 Operaciones & COAs
          </button>
          <button
            onClick={() => setActiveTab('S4')}
            className={`py-3 px-3.5 text-xs font-bold border-b-2 transition whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'S4'
                ? 'border-cyan-400 text-cyan-300 bg-cyan-950/30'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
            }`}
          >
            <span>📦</span> S-4 Logística & Autonomía
          </button>
          <button
            onClick={() => setActiveTab('S1_S5')}
            className={`py-3 px-3.5 text-xs font-bold border-b-2 transition whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'S1_S5'
                ? 'border-cyan-400 text-cyan-300 bg-cyan-950/30'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
            }`}
          >
            <span>👥</span> S-1 SIGEP & S-5 DIH
          </button>
          <button
            onClick={() => setActiveTab('OSINT')}
            className={`py-3 px-3.5 text-xs font-bold border-b-2 transition whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'OSINT'
                ? 'border-cyan-400 text-cyan-300 bg-cyan-950/30'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
            }`}
          >
            <span>📡</span> OSINT Soberano (SAT)
          </button>
        </div>

        {/* Contenido Principal de la Apreciación de Estado Mayor */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
          {isLoading ? (
            <div className="py-16 flex flex-col items-center justify-center gap-3">
              <div className="w-10 h-10 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-sm font-semibold text-cyan-300 animate-pulse">
                El Estado Mayor Virtual está procesando la convergencia todo-fuente y blindaje de geocerca...
              </p>
            </div>
          ) : !briefing ? (
            <div className="text-center py-12 text-slate-400">
              No se ha podido sincronizar la apreciación con la unidad seleccionada.
            </div>
          ) : (
            <>
              {/* TAB C2: APRECIACIÓN EJECUTIVA DEL COMANDANTE */}
              {activeTab === 'C2' && (
                <div className="space-y-4">
                  <div className="bg-gradient-to-r from-slate-900 to-cyan-950/40 border border-slate-800 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-black uppercase tracking-wider text-cyan-400">
                        Apreciación del Comandante Virtual ({briefing.echelon})
                      </span>
                      <span className="text-xs text-slate-400">{briefing.timestamp}</span>
                    </div>
                    <p className="text-sm text-slate-200 leading-relaxed font-medium">
                      {briefing.executiveSummary}
                    </p>
                  </div>

                  {/* Resumen de las 4 Secciones Principales */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3">
                      <div className="text-[10px] font-bold uppercase text-slate-400 mb-1">🎯 Inteligencia S-2</div>
                      <div className="text-sm font-black text-amber-400">Amenaza: {briefing.s2Intel.threatLevel}</div>
                      <p className="text-xs text-slate-300 mt-1 line-clamp-2">{briefing.s2Intel.predominantModusOperandi}</p>
                    </div>

                    <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3">
                      <div className="text-[10px] font-bold uppercase text-slate-400 mb-1">⚔️ Operaciones S-3</div>
                      <div className="text-sm font-black text-cyan-400">{briefing.s3Operaciones.fireSupportPiecesReady} Piezas Listas</div>
                      <p className="text-xs text-slate-300 mt-1 line-clamp-2">{briefing.s3Operaciones.artilleryCoverage}</p>
                    </div>

                    <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3">
                      <div className="text-[10px] font-bold uppercase text-slate-400 mb-1">📦 Logística S-4</div>
                      <div className="text-sm font-black text-emerald-400">{briefing.s4Logistica.operationalAutonomyHours}h Autonomía</div>
                      <p className="text-xs text-slate-300 mt-1">Munición Clase V: {briefing.s4Logistica.classVAmmoPercentage}%</p>
                    </div>

                    <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3">
                      <div className="text-[10px] font-bold uppercase text-slate-400 mb-1">👥 Personal & DIH</div>
                      <div className="text-sm font-black text-blue-400">Capacidad: {briefing.s1Personal.readinessScore}%</div>
                      <p className="text-xs text-slate-300 mt-1">{briefing.s1Personal.effectiveTroops} efectivos en orden</p>
                    </div>
                  </div>

                  {/* Recomendación Ejecutiva de Decisión */}
                  <div className="bg-cyan-950/30 border border-cyan-500/40 rounded-xl p-4">
                    <h3 className="text-xs font-black text-cyan-300 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                      <span>⚡</span> Recomendación Táctica para la Decisión del Comandante
                    </h3>
                    <p className="text-xs md:text-sm text-slate-200">
                      {briefing.commanderDecision.rationale}
                    </p>
                  </div>
                </div>
              )}

              {/* TAB S-2: INTELIGENCIA Y TERRENO OCOPA */}
              {activeTab === 'S2' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
                      <h4 className="text-xs font-bold text-amber-300 uppercase mb-2">Puntos Críticos en el AOR (OCOPA)</h4>
                      <ul className="space-y-1 text-xs text-slate-300">
                        {briefing.s2Intel.criticalPoints.map((pt, i) => (
                          <li key={i} className="flex items-center gap-2">
                            <span className="text-amber-400">⚠️</span> {pt}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
                      <h4 className="text-xs font-bold text-cyan-300 uppercase mb-2">Vectores Probables de Amenaza</h4>
                      <ul className="space-y-1 text-xs text-slate-300">
                        {briefing.s2Intel.probableThreatVectors.map((vec, i) => (
                          <li key={i} className="flex items-center gap-2">
                            <span className="text-cyan-400">➡️</span> {vec}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
                    <h4 className="text-xs font-black text-cyan-400 uppercase tracking-wider mb-2">
                      Convergencia de Memoria Histórica en el AOR (Blindaje Geocerca & Eje Temporal)
                    </h4>
                    <pre className="text-[11px] text-slate-300 whitespace-pre-wrap font-mono leading-relaxed bg-slate-900/80 p-3 rounded-lg border border-slate-800/80 max-h-72 overflow-y-auto">
                      {briefing.s2Intel.historicalSynthesis}
                    </pre>
                  </div>
                </div>
              )}

              {/* TAB S-3: OPERACIONES Y CURSOS DE ACCIÓN (COA) */}
              {activeTab === 'S3' && (
                <div className="space-y-4">
                  <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-slate-400 uppercase">Estado Operacional de la Maniobra:</span>
                      <p className="text-xs text-cyan-300 font-semibold">{briefing.s3Operaciones.maneuverState}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-bold text-slate-400 uppercase">Apoyo de Fuego Directo:</span>
                      <p className="text-xs text-emerald-400 font-semibold">{briefing.s3Operaciones.artilleryCoverage}</p>
                    </div>
                  </div>

                  <h3 className="text-xs font-black text-slate-300 uppercase tracking-wider">
                    Cursos de Acción Formulados (PDM Doctrinal)
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {briefing.s3Operaciones.recommendedCoas.map((coa) => (
                      <div 
                        key={coa.id}
                        className="bg-slate-900/80 border border-slate-700/80 hover:border-cyan-500/60 transition rounded-xl p-4 flex flex-col justify-between shadow-lg"
                      >
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-black text-cyan-300 uppercase">{coa.name}</span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                              Éxito est.: {coa.estimatedSuccessProbability}%
                            </span>
                          </div>
                          
                          <p className="text-xs text-slate-200 mb-3">{coa.description}</p>
                          
                          <div className="text-[11px] text-slate-400 space-y-1 mb-4 border-t border-slate-800 pt-2">
                            <div><strong className="text-slate-300">Maniobra:</strong> {coa.maneuverDetails}</div>
                            <div><strong className="text-slate-300">Tiempo estimado:</strong> {coa.estimatedExecutionMinutes} minutos</div>
                            <div><strong className="text-slate-300">Riesgo táctico:</strong> <span className={coa.riskLevel === 'ALTO' ? 'text-red-400' : 'text-amber-400'}>{coa.riskLevel}</span></div>
                            <div><strong className="text-slate-300">Logística:</strong> {coa.logisticsFeasibility}</div>
                          </div>
                        </div>

                        {/* Botón de Decisión Humana */}
                        <button
                          onClick={() => handleApprove(coa)}
                          className="w-full py-2.5 px-4 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-cyan-900/30 active:scale-98 transition flex items-center justify-center gap-2"
                        >
                          <span>✍️</span> Aprobar COA y Emitir ORDOP
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB S-4: LOGÍSTICA & AUTONOMÍA */}
              {activeTab === 'S4' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 text-center">
                      <span className="text-2xl font-black text-cyan-400">{briefing.s4Logistica.classVAmmoPercentage}%</span>
                      <p className="text-xs font-bold text-slate-300 mt-1">Clase V (Munición)</p>
                      <p className="text-[10px] text-slate-500">Nivel de fuego disponible</p>
                    </div>

                    <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 text-center">
                      <span className="text-2xl font-black text-amber-400">{briefing.s4Logistica.classIIIFuelHours}h</span>
                      <p className="text-xs font-bold text-slate-300 mt-1">Clase III (Combustible)</p>
                      <p className="text-[10px] text-slate-500">Movilidad vehicular estimada</p>
                    </div>

                    <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 text-center">
                      <span className="text-2xl font-black text-emerald-400">{briefing.s4Logistica.classISupplyDays} días</span>
                      <p className="text-xs font-bold text-slate-300 mt-1">Clase I (Raciones)</p>
                      <p className="text-[10px] text-slate-500">Subsistencia de campaña</p>
                    </div>
                  </div>

                  <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4">
                    <h4 className="text-xs font-bold text-slate-300 uppercase mb-1">Apreciación Logística S-4:</h4>
                    <p className="text-xs text-slate-300">{briefing.s4Logistica.advisory}</p>
                  </div>
                </div>
              )}

              {/* TAB S-1 (SIGEP PERSONAL) & S-5: PERSONAL Y DIH */}
              {activeTab === 'S1_S5' && (
                <div className="space-y-4">
                  {/* Banner de Sincronización SIGEP M2M */}
                  <div className="bg-gradient-to-r from-blue-950/60 via-slate-900/80 to-slate-900 border border-blue-500/40 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-3 h-3 rounded-full animate-pulse ${
                        sigepData?.connectionMode === 'ONLINE' ? 'bg-emerald-400' : 'bg-cyan-400'
                      }`} />
                      <div>
                        <span className="text-xs font-bold text-white uppercase tracking-wider block">
                          SISTEMA DE GESTIÓN DE PERSONAL MILITAR (SIGEP S1/G1)
                        </span>
                        <span className="text-[10px] text-blue-300">
                          {sigepData?.connectionMode === 'ONLINE' 
                            ? '✓ Enlace M2M en vivo con la Dirección de Personal del Ejército'
                            : '⚡ Modo Táctico Resiliente Autónomo (Sincronización Local)'}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-mono font-bold text-slate-300">
                        Cobertura TOE: <strong className="text-cyan-300">{sigepData?.readinessPercentage || briefing.s1Personal.readinessScore}%</strong>
                      </span>
                      <p className="text-[10px] text-slate-400">
                        Efectivos: {sigepData?.totalActual || briefing.s1Personal.effectiveTroops} / {sigepData?.totalAuthorized || 40} Autorizados
                      </p>
                    </div>
                  </div>

                  {/* Los 3 Pilares Doctrinales de Retención (Algoritmo SIMCOP-SIGEP) */}
                  <div>
                    <h4 className="text-xs font-black text-cyan-300 uppercase tracking-wider mb-2.5 flex items-center gap-2">
                      <span>⚖️</span> Motor de Retención Analítica (3 Pilares Doctrinales del Ejército)
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {/* PILAR A */}
                      <div className={`p-3 rounded-xl border ${
                        sigepData?.pillarA.threshold80Met 
                          ? 'bg-slate-900/60 border-slate-800' 
                          : 'bg-red-950/40 border-red-500/50'
                      }`}>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[11px] font-bold text-blue-300 uppercase">Pilar A: TOE & Fuerza</span>
                          <span className={`text-[9px] px-1.5 py-0.5 rounded font-black ${
                            sigepData?.pillarA.status === 'OPTIMO' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'
                          }`}>
                            {sigepData?.pillarA.status || 'OPTIMO'}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-300 leading-relaxed mb-2">
                          Auditoría de TOE: {sigepData?.pillarA.coveragePct || 90}% de ocupación. 
                          {sigepData?.pillarA.threshold80Met 
                            ? ' Supera el umbral de combate del 80%.' 
                            : ' ⚠️ Crítico: Menor al 80% TOE.'}
                        </p>
                        <span className="text-[10px] text-slate-400 block font-mono">
                          Dictamen: {sigepData?.pillarA.threshold80Met ? 'Fuerza balanceada' : 'VETO ADMINISTRATIVO'}
                        </span>
                      </div>

                      {/* PILAR B */}
                      <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[11px] font-bold text-amber-300 uppercase">Pilar B: Estatus Operativo</span>
                          <span className={`text-[9px] px-1.5 py-0.5 rounded font-black ${
                            sigepData?.pillarB.scheduledPostCombat 
                              ? 'bg-blue-500/20 text-cyan-300 border border-cyan-500/30' 
                              : 'bg-emerald-500/20 text-emerald-300'
                          }`}>
                            {sigepData?.pillarB.scheduledPostCombat ? 'PROGRAMADO POST-OPERACIÓN' : 'DISPOSICIÓN REGULAR'}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-300 leading-relaxed mb-2">
                          {sigepData?.pillarB.verdictMessage || 'El combate no restringe el trámite de personal; se materializará al culminar la situación táctica.'}
                        </p>
                        <span className="text-[10px] text-slate-400 block font-mono">
                          {sigepData?.pillarB.activeOpord || 'Sin contacto directo en curso'}
                        </span>
                      </div>

                      {/* PILAR C */}
                      <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[11px] font-bold text-purple-300 uppercase">Pilar C: Memoria AAR</span>
                          <span className="text-[9px] px-1.5 py-0.5 rounded font-black bg-purple-500/20 text-purple-300">
                            EXP: {sigepData?.pillarC.tacticalExperienceScore || 85}%
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-300 leading-relaxed mb-2">
                          {sigepData?.pillarC.recommendation || 'Adaptación al terreno verificada mediante AARs.'}
                        </p>
                        <span className="text-[10px] text-slate-400 block font-mono">
                          Veteranos en sector: {sigepData?.pillarC.veteranSpecialistsCount || 9} especialistas
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Alertas de Rotación por Permanencia (21m / 24m / 36m) */}
                  <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                        <span>⏳</span> Rotación por Permanencia en Teatro (Oficiales/Suboficiales 24m | Soldados 36m)
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {sigepData?.rotationAlerts.length || 0} efectivos en umbral
                      </span>
                    </div>

                    <div className="space-y-2 max-h-44 overflow-y-auto">
                      {(sigepData?.rotationAlerts || []).map(al => (
                        <div key={al.soldierId} className="bg-slate-950/70 border border-slate-800 p-2.5 rounded-lg flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-white">{al.fullName}</span>
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-cyan-300 font-mono font-bold">
                                {al.rank} - {al.mosCode}
                              </span>
                              <span className="text-[10px] text-amber-400 font-mono">
                                ({al.months} meses en unidad)
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-400 mt-0.5">{al.actionRequired}</p>
                          </div>
                          <div>
                            <button
                              onClick={() => handleProrroga(al.soldierId, al.fullName)}
                              className="px-2.5 py-1 text-[11px] font-bold bg-blue-600/30 hover:bg-blue-600/60 text-blue-200 border border-blue-500/50 rounded-lg transition"
                            >
                              ✍️ Solicitar Prórroga (6 meses)
                            </button>
                          </div>
                        </div>
                      ))}
                      {(!sigepData?.rotationAlerts || sigepData.rotationAlerts.length === 0) && (
                        <p className="text-xs text-slate-500 italic p-2 text-center">
                          Todo el personal orgánico se encuentra dentro del rango de permanencia regular.
                        </p>
                      )}
                    </div>
                  </div>

                  {/* S-5 Acción Integral & DIH */}
                  <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
                    <h4 className="text-xs font-bold text-emerald-300 uppercase mb-2">⚖️ S-5 Acción Integral & DIH</h4>
                    <p className="text-xs text-slate-300 mb-2">{briefing.s5AccionIntegral.roeAdvisory}</p>
                    <p className="text-xs text-slate-400">
                      {briefing.s5AccionIntegral.civilianProximityStatus}
                    </p>
                  </div>
                </div>
              )}

              {/* TAB OSINT: FUENTES ABIERTAS SOBERANAS */}
              {activeTab === 'OSINT' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-black text-cyan-300 uppercase tracking-wider">
                      Alertas Tempranas SAT y Prensa Regional en el AOR
                    </span>
                    <span className="text-[10px] text-slate-400">
                      Rastreo Interno Soberano (Cero Proveedores Externos)
                    </span>
                  </div>

                  <div className="space-y-2 max-h-80 overflow-y-auto">
                    {sovereignOsintService.geocodeTacticalText((unit as any)?.department || 'NARIÑO') && (
                      <div className="bg-slate-900/80 border border-slate-800 p-3 rounded-xl space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-amber-300">
                            🚨 Alerta SAT 019/26: Movimientos armados en cuenca del Telembí
                          </span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/20 text-red-300 font-bold">CRÍTICO</span>
                        </div>
                        <p className="text-xs text-slate-300">
                          Disputas entre Frente Franco Benavides y Segunda Marquetalia en veredas ribereñas de Barbacoas. Coordenadas: [1.685°, -78.125°].
                        </p>
                      </div>
                    )}

                    <div className="bg-slate-900/80 border border-slate-800 p-3 rounded-xl space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-cyan-300">
                          📢 Reporte Red Vial Comunitaria: Objeto sospechoso en Km 14 Vía Samaniego
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold">ALTO</span>
                      </div>
                      <p className="text-xs text-slate-300">
                        Transportadores alertan sobre caneca metálica tapada con plástico en alcantarilla. Tráfico preventivamente restringido.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Pie de Página con Botones de Acción Global */}
        <div className="bg-slate-950 border-t border-slate-800 p-3.5 px-6 flex flex-wrap items-center justify-between gap-3">
          <div className="text-[11px] text-slate-400">
            Escalón activo: <strong className="text-cyan-400">{briefing?.echelon || selectedEchelon}</strong> | 
            Decisión final reservada al Comandante Humano (*Human-in-the-Loop*).
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="py-1.5 px-4 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition"
            >
              Cerrar Mesa
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
