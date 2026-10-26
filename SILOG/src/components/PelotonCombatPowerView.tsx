import React from 'react';
import { PlatoonCombatCapability } from '../types';

interface PelotonCombatPowerViewProps {
  capability: PlatoonCombatCapability;
}

export const PelotonCombatPowerView: React.FC<PelotonCombatPowerViewProps> = ({ capability }) => {
  return (
    <div className="space-y-6">
      {/* Encabezado Doctrinal */}
      <div className="bg-gradient-to-r from-red-950/60 via-slate-900 to-slate-900 border border-red-500/40 rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xl">🔥</span>
            <h2 className="text-base font-black text-white uppercase tracking-wider">
              Poder de Combate Real del Pelotón (Cálculo Doctrinal SILOG $\rightarrow$ SIMCOP)
            </h2>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/20 text-red-300 font-bold border border-red-500/30">
              TELEMETRÍA M2M C2
            </span>
          </div>
          <p className="text-xs text-slate-300">
            Unidad: <strong className="text-amber-300">{capability.platoonName}</strong> | Efectivos orgánicos: <strong className="text-white">{capability.totalSoldiers} hombres</strong>
          </p>
        </div>

        <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 px-6 text-center">
          <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Índice Global de Poder de Fuego</span>
          <span className={`text-3xl font-black font-mono ${
            capability.overallFirepowerIndex >= 80 ? 'text-emerald-400' : capability.overallFirepowerIndex >= 60 ? 'text-amber-400' : 'text-red-400'
          }`}>
            {capability.overallFirepowerIndex}%
          </span>
        </div>
      </div>

      {/* Dictamen Táctico para la Mesa de Mando de SIMCOP */}
      <div className="bg-slate-900/90 border border-amber-500/40 rounded-xl p-4 flex items-start gap-3">
        <span className="text-xl mt-0.5">🎖️</span>
        <div>
          <h4 className="text-xs font-bold text-amber-300 uppercase tracking-wider">
            Apreciación del Oficial S-4 / S-3 para la Orden de Operaciones en SIMCOP:
          </h4>
          <p className="text-xs text-slate-200 mt-1 leading-relaxed">
            {capability.tacticalAdvisoryForSimcop}
          </p>
        </div>
      </div>

      {/* Grilla de Capacidades Discriminadas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Potencia Diurna */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-400 uppercase">☀️ Capacidad Diurna</span>
            <span className="text-sm font-black font-mono text-emerald-400">{capability.daytimeReadinessPct}%</span>
          </div>
          <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800">
            <div className="bg-emerald-500 h-full" style={{ width: `${capability.daytimeReadinessPct}%` }} />
          </div>
          <div className="space-y-1 text-xs text-slate-300">
            <p>• Fusiles 5.56mm en línea: <strong>{capability.operationalWeapons.rifles556} operativos</strong></p>
            <p>• Ametralladoras M-60E4: <strong>{capability.operationalWeapons.machineGuns762} operativas</strong></p>
            <p>• Lanzagranadas MGL 40mm: <strong>{capability.operationalWeapons.grenadeLaunchers40mm} operativos</strong></p>
            <p>• Cartuchos 5.56mm a cargo: <strong>{capability.totalRounds556.toLocaleString()}</strong></p>
          </div>
        </div>

        {/* Potencia Nocturna */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-purple-400 uppercase">🌙 Capacidad Nocturna</span>
            <span className={`text-sm font-black font-mono ${
              capability.nightReadinessPct >= 70 ? 'text-emerald-400' : 'text-amber-400'
            }`}>
              {capability.nightReadinessPct}%
            </span>
          </div>
          <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800">
            <div className="bg-purple-500 h-full" style={{ width: `${capability.nightReadinessPct}%` }} />
          </div>
          <div className="space-y-1 text-xs text-slate-300">
            <p>• Cobertura AN/PVS-14: <strong>{capability.nightVisionAvailabilityPct}% de la tropa</strong></p>
            <p>• Miras térmicas en base: <strong>1 unidad PAS-13</strong></p>
            <p>• Drones de apoyo térmico: <strong>1 Mavic 3T operativo</strong></p>
            <p className="text-[11px] text-amber-300">⚠️ Requiere disciplina de luz en avance</p>
          </div>
        </div>

        {/* Autonomía Logística y C2 */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-cyan-400 uppercase">📦 Autonomía y Enlace C2</span>
            <span className="text-sm font-black font-mono text-cyan-300">{capability.commCoverageScore}%</span>
          </div>
          <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800">
            <div className="bg-cyan-500 h-full" style={{ width: `${capability.commCoverageScore}%` }} />
          </div>
          <div className="space-y-1 text-xs text-slate-300">
            <p>• Raciones Clase I: <strong>{capability.rationsAutonomyDays} días de campaña</strong></p>
            <p>• Fuego Sostenido: <strong>{capability.sustainedFireMinutes} minutos continuos</strong></p>
            <p>• Radio Harris Falcon III: <strong>Enlace activo con TOC</strong></p>
            <p>• Munición Mortero 60mm: <strong>{capability.totalMortarBombs60mm} granadas HE</strong></p>
          </div>
        </div>
      </div>
    </div>
  );
};
