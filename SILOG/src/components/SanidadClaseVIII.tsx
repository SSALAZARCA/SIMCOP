import React from 'react';
import { CombatSanityItem } from '../types';

interface SanidadClaseVIIIProps {
  sanityItems: CombatSanityItem[];
}

export const SanidadClaseVIII: React.FC<SanidadClaseVIIIProps> = ({ sanityItems }) => {
  return (
    <div className="space-y-6">
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5">
        <h2 className="text-base font-black text-amber-300 uppercase tracking-wider flex items-center gap-2 mb-2">
          <span>🩺</span> Sanidad Militar y Trauma en Combate (Clase VIII)
        </h2>
        <p className="text-xs text-slate-400">
          Control de Botiquines Individuales de Primeros Auxilios (IFAK), torniquetes tácticos CAT (con trazabilidad de lote y vencimiento), gasas hemostáticas y equipos del Enfermero de Combate.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {sanityItems.map(s => (
          <div key={s.id} className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-white">{s.kitType.replace(/_/g, ' ')}</span>
              <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                {s.status}
              </span>
            </div>

            <div className="space-y-1 text-xs text-slate-300 bg-slate-950/60 p-3 rounded-lg border border-slate-800">
              <p>📦 <strong>Serial/Lote:</strong> <span className="font-mono text-cyan-300">{s.serialOrLotNumber}</span></p>
              <p>🩸 <strong>Torniquete CAT:</strong> <span className="font-mono text-red-300">{s.tourniquetCatLot}</span></p>
              <p>⏳ <strong>Vigencia Torniquete:</strong> <span className="font-mono text-slate-400">{s.tourniquetExpiration}</span></p>
              <p>🩹 <strong>Gasas Hemostáticas:</strong> <span className="font-mono font-bold text-amber-300">{s.hemostaticGauzeUnits} unidades</span></p>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-[11px]">
              <span className="text-slate-400">Asignado a:</span>
              <span className="font-mono font-bold text-blue-300">{s.assignedSoldierId || 'En Botiquín de Unidad'}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
