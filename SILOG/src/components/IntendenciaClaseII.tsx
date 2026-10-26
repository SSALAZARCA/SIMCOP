import React from 'react';
import { BallisticArmorItem } from '../types';

interface IntendenciaClaseIIProps {
  armors: BallisticArmorItem[];
}

export const IntendenciaClaseII: React.FC<IntendenciaClaseIIProps> = ({ armors }) => {
  return (
    <div className="space-y-6">
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5">
        <h2 className="text-base font-black text-amber-300 uppercase tracking-wider flex items-center gap-2 mb-2">
          <span>🛡️</span> Intendencia y Protección Balística (Clase II / VII)
        </h2>
        <p className="text-xs text-slate-400">
          Control estricto de chalecos antibalas con seriales de placa balística frontal/dorsal, cascos de Kevlar y fechas de caducidad balística reglamentaria (5 años de vida útil).
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {armors.map(a => {
          const isExpired = new Date(a.expirationDate).getTime() < Date.now();
          return (
            <div key={a.id} className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-white">{a.armorType.replace(/_/g, ' ')}</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                  isExpired ? 'bg-red-500/20 text-red-300 border border-red-500/30' : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                }`}>
                  {isExpired ? '⚠️ VENCIDO' : 'VIGENTE'}
                </span>
              </div>

              <div className="space-y-1 text-xs text-slate-300 bg-slate-950/60 p-3 rounded-lg border border-slate-800">
                <p>🔢 <strong>Serial Chaleco:</strong> <span className="font-mono text-amber-300">{a.serialNumber}</span></p>
                <p>📏 <strong>Talla:</strong> {a.size}</p>
                {a.frontPlateSerial && (
                  <p>🛡️ <strong>Placa Frontal:</strong> <span className="font-mono text-cyan-300">{a.frontPlateSerial}</span></p>
                )}
                {a.rearPlateSerial && (
                  <p>🛡️ <strong>Placa Dorsal:</strong> <span className="font-mono text-cyan-300">{a.rearPlateSerial}</span></p>
                )}
                <p>⏳ <strong>Vencimiento Balístico:</strong> <span className="font-mono text-slate-400">{a.expirationDate}</span></p>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-[11px]">
                <span className="text-slate-400">Asignado:</span>
                <span className="font-mono font-bold text-blue-300">
                  {a.assignedSoldierId || 'En Depósito'}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
