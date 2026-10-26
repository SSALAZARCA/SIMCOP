import React from 'react';
import { RationBatchItem } from '../types';

interface AlimentacionClaseIProps {
  rations: RationBatchItem[];
}

export const AlimentacionClaseI: React.FC<AlimentacionClaseIProps> = ({ rations }) => {
  const mreTotal = rations.filter(r => r.rationType === 'RACION_CAMPANA_MRE').reduce((acc, c) => acc + c.quantityOnHand, 0);
  const daysTotal = Math.round(mreTotal / (36 * 3)); // 36 efectivos x 3 raciones/día

  return (
    <div className="space-y-6">
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-black text-amber-300 uppercase tracking-wider flex items-center gap-2 mb-1">
            <span>🍱</span> Alimentación y Subsistencias Militares (Clase I)
          </h2>
          <p className="text-xs text-slate-400">
            Control de Raciones de Campaña (MRE), fechas de vencimiento bromatológico y autonomía de víveres en el teatro de operaciones.
          </p>
        </div>
        <div className="bg-amber-950/40 border border-amber-500/40 rounded-xl p-3 px-5 text-right">
          <span className="text-xs text-amber-300 font-bold block">AUTONOMÍA ESTIMADA (PELOTÓN 36H)</span>
          <span className="text-2xl font-black text-white font-mono">{daysTotal} DÍAS</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {rations.map(r => (
          <div key={r.id} className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-white">
                {r.rationType === 'RACION_CAMPANA_MRE' ? '🍱 RACIÓN MRE' : r.rationType === 'PASTILLAS_PURIFICADORAS' ? '💧 AGUA Y PURIFICACIÓN' : '🌾 VÍVERES'}
              </span>
              <span className="text-xs font-mono font-black text-amber-400 bg-amber-950/50 px-2 py-0.5 rounded border border-amber-800/40">
                {r.quantityOnHand.toLocaleString()} unidades
              </span>
            </div>

            <div className="space-y-1.5 text-xs text-slate-300 bg-slate-950/60 p-3 rounded-lg border border-slate-800">
              <p className="font-bold text-cyan-300">{r.menuNumber}</p>
              <p>🏷️ <strong>Lote:</strong> <span className="font-mono text-slate-300">{r.lotNumber}</span></p>
              <p>📅 <strong>Vencimiento:</strong> <span className="font-mono text-emerald-400">{r.expirationDate}</span></p>
              <p>⚡ <strong>Aporte Calórico:</strong> <span className="font-mono text-slate-300">{r.caloriesPerUnit} kcal/ración</span></p>
            </div>

            <div className="text-[11px] text-slate-400 flex items-center justify-between pt-1">
              <span>Equivalente Operativo:</span>
              <strong className="text-amber-300 font-mono">{r.daysOfAutonomyEquivalent} días de patrulla</strong>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
