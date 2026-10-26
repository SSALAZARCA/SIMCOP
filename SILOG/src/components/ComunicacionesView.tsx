import React from 'react';
import { CommEquipmentItem } from '../types';

interface ComunicacionesViewProps {
  comms: CommEquipmentItem[];
}

export const ComunicacionesView: React.FC<ComunicacionesViewProps> = ({ comms }) => {
  return (
    <div className="space-y-6">
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5">
        <h2 className="text-base font-black text-amber-300 uppercase tracking-wider flex items-center gap-2 mb-2">
          <span>📡</span> Comunicaciones Tácticas y Criptografía (S-6 / Clase VII)
        </h2>
        <p className="text-xs text-slate-400">
          Control de radios tácticos Harris Falcon III, transceptores intra-escuadra Motorola APX, baterías recargables BB-2590, repetidoras tácticas y llaves de seguridad criptográfica cargadas.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {comms.map(c => (
          <div key={c.id} className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-white">{c.model.replace(/_/g, ' ')}</span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                c.status === 'OPERATIVO' || c.status === 'ASIGNADO'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
              }`}>
                {c.status}
              </span>
            </div>

            <div className="space-y-1.5 text-xs text-slate-300 bg-slate-950/60 p-3 rounded-lg border border-slate-800">
              <p>🔢 <strong>Serial Equipo:</strong> <span className="font-mono text-cyan-300">{c.serialNumber}</span></p>
              <p>📶 <strong>Banda:</strong> <span className="font-mono text-slate-300">{c.frequencyBand}</span></p>
              <p>🔋 <strong>Batería de Campaña:</strong> <span className="font-mono text-amber-300">{c.batteryType}</span></p>
              <div className="flex items-center gap-2 pt-1">
                <span className="text-[10px] text-slate-400">Llave Cripto:</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                  c.cryptoKeyLoaded ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300'
                }`}>
                  {c.cryptoKeyLoaded ? '🔒 CARGADA (COMSEC OK)' : '🔓 SIN LLAVE'}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-[11px]">
              <span className="text-slate-400">Asignado a:</span>
              <span className="font-mono font-bold text-blue-300">{c.assignedSoldierId || 'En Taller S-6'}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
