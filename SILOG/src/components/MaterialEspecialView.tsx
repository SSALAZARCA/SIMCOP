import React from 'react';
import { SpecialOptronicsItem } from '../types';

interface MaterialEspecialViewProps {
  optronics: SpecialOptronicsItem[];
}

export const MaterialEspecialView: React.FC<MaterialEspecialViewProps> = ({ optronics }) => {
  return (
    <div className="space-y-6">
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5">
        <h2 className="text-base font-black text-amber-300 uppercase tracking-wider flex items-center gap-2 mb-2">
          <span>🔭</span> Material Especial, Optoelectrónica y Drones (Clase VII)
        </h2>
        <p className="text-xs text-slate-400">
          Custodia y trazabilidad de intensificadores de imagen AN/PVS-14, miras térmicas, aeronaves remotamente tripuladas (UAV térmicos) y detectores antiexplosivos Vallon.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {optronics.map(o => (
          <div key={o.id} className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-white">{o.deviceType.replace(/_/g, ' ')}</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                {o.status}
              </span>
            </div>

            <div className="space-y-1 text-xs text-slate-300 bg-slate-950/60 p-3 rounded-lg border border-slate-800">
              <p>🔢 <strong>Serial:</strong> <span className="font-mono text-cyan-300">{o.serialNumber}</span></p>
              <p>🔬 <strong>Tecnología:</strong> <span className="font-mono text-slate-300">{o.generation}</span></p>
              <div className="flex items-center justify-between pt-1">
                <span className="text-slate-400">Batería:</span>
                <span className="font-mono font-bold text-emerald-400">{o.batteryLevelPct}%</span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-[11px]">
              <span className="text-slate-400">Asignado a:</span>
              <span className="font-mono font-bold text-blue-300">{o.assignedSoldierId || 'En Armerillo Especial'}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
