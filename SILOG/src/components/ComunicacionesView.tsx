import React, { useState } from 'react';
import { CommEquipmentItem } from '../types';

interface ComunicacionesViewProps {
  comms: CommEquipmentItem[];
  onOpenAddMaterial?: (preselectedClass: string) => void;
}

export const ComunicacionesView: React.FC<ComunicacionesViewProps> = ({ 
  comms,
  onOpenAddMaterial 
}) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const filteredComms = comms.filter(c => {
    if (statusFilter === 'CRYPTO_OK' && !c.cryptoKeyLoaded) return false;
    if (statusFilter === 'SIN_LLAVE' && c.cryptoKeyLoaded) return false;
    if (statusFilter === 'OPERATIVO' && c.status !== 'OPERATIVO' && c.status !== 'ASIGNADO') return false;
    if (statusFilter === 'MANTENIMIENTO' && c.status !== 'EN_REPARACION_S6') return false;

    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      return (
        c.model.toLowerCase().includes(q) ||
        c.serialNumber.toLowerCase().includes(q) ||
        c.frequencyBand.toLowerCase().includes(q) ||
        (c.assignedSoldierId && c.assignedSoldierId.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const totalHarris = comms.filter(c => c.model.includes('HARRIS')).length;
  const totalMotorola = comms.filter(c => c.model.includes('MOTOROLA')).length;
  const cryptoLoadedCount = comms.filter(c => c.cryptoKeyLoaded).length;

  return (
    <div className="space-y-5 w-full">
      {/* Encabezado y Acciones */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 md:p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-black text-amber-300 uppercase tracking-wider flex items-center gap-2 mb-1">
            <span>📡</span> Comunicaciones Tácticas y Criptografía (S-6 / Clase VII)
          </h2>
          <p className="text-xs text-slate-400">
            Control de radios tácticos Harris Falcon III, transceptores Motorola APX, baterías recargables BB-2590, repetidoras tácticas y llaves de seguridad COMSEC.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-cyan-950/40 border border-cyan-500/40 rounded-xl p-2.5 px-4 text-right">
            <span className="text-[10px] text-cyan-300 font-bold block">COMSEC CRIPTO CARGADAS</span>
            <span className="text-xl font-black text-white font-mono">{cryptoLoadedCount}/{comms.length}</span>
          </div>

          {onOpenAddMaterial && (
            <button
              onClick={() => onOpenAddMaterial('COMUNICACIONES')}
              className="px-4 py-2.5 bg-gradient-to-r from-cyan-600 to-cyan-700 hover:from-cyan-500 hover:to-cyan-600 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-cyan-950/50 transition-all flex items-center gap-2 border border-cyan-400/50"
            >
              <span>➕</span>
              <span>Registrar Radio / Batería</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-slate-900/80 border border-slate-800 p-3.5 rounded-xl">
          <span className="text-[10px] text-slate-400 font-mono block">HARRIS FALCON III</span>
          <span className="text-xl font-black text-white font-mono">{totalHarris}</span>
          <span className="text-[10px] text-cyan-400 block mt-0.5">HF / VHF / UHF SATCOM</span>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 p-3.5 rounded-xl">
          <span className="text-[10px] text-slate-400 font-mono block">MOTOROLA APX (INTRA-ESCUADRA)</span>
          <span className="text-xl font-black text-amber-400 font-mono">{totalMotorola}</span>
          <span className="text-[10px] text-slate-400 block mt-0.5">Enlace a nivel pelotón</span>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 p-3.5 rounded-xl">
          <span className="text-[10px] text-slate-400 font-mono block">LLAVES CRIPTOGRÁFICAS</span>
          <span className="text-xl font-black text-emerald-400 font-mono">{cryptoLoadedCount}</span>
          <span className="text-[10px] text-emerald-300 block mt-0.5">Cifrado de salto de frec.</span>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 p-3.5 rounded-xl">
          <span className="text-[10px] text-slate-400 font-mono block">DISPONIBILIDAD TOTAL</span>
          <span className="text-xl font-black text-white font-mono">{comms.length} EQUIPOS</span>
          <span className="text-[10px] text-cyan-300 block mt-0.5">100% Cobertura de Mando</span>
        </div>
      </div>

      {/* Barra de Filtros */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/40 p-3 rounded-xl border border-slate-800/80">
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <span className="text-slate-500 text-xs">🔍</span>
          <input
            type="text"
            placeholder="Buscar por serial, modelo, banda o soldado asignado..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 font-bold">Filtro:</span>
          {[
            { id: 'ALL', label: 'TODOS' },
            { id: 'CRYPTO_OK', label: '🔒 CRIPTO OK' },
            { id: 'SIN_LLAVE', label: '⚠️ SIN LLAVE' },
            { id: 'OPERATIVO', label: 'OPERATIVOS' },
            { id: 'MANTENIMIENTO', label: 'TALLER S-6' }
          ].map(flt => (
            <button
              key={flt.id}
              onClick={() => setStatusFilter(flt.id)}
              className={`text-[11px] px-2.5 py-1 rounded-lg font-bold transition ${
                statusFilter === flt.id
                  ? 'bg-cyan-500 text-slate-950'
                  : 'bg-slate-950 text-slate-400 border border-slate-800 hover:text-white'
              }`}
            >
              {flt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Rejilla de Radios */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3.5">
        {filteredComms.map(c => (
          <div key={c.id} className="bg-slate-900/80 border border-slate-800 hover:border-cyan-500/50 rounded-xl p-3.5 space-y-2.5 transition flex flex-col justify-between">
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-black text-white truncate">{c.model.replace(/_/g, ' ')}</span>
                <span className={`text-[9px] font-bold px-2 py-0.5 rounded whitespace-nowrap ${
                  c.status === 'OPERATIVO' || c.status === 'ASIGNADO'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                }`}>
                  {c.status}
                </span>
              </div>

              <div className="space-y-1 text-xs text-slate-300 bg-slate-950/60 p-2.5 rounded-lg border border-slate-800 font-mono">
                <p className="text-[11px]">🔢 <strong className="text-slate-400">Serial:</strong> <span className="text-cyan-300">{c.serialNumber}</span></p>
                <p className="text-[11px]">📶 <strong className="text-slate-400">Banda:</strong> <span className="text-slate-300">{c.frequencyBand}</span></p>
                <p className="text-[11px]">🔋 <strong className="text-slate-400">Batería:</strong> <span className="text-amber-300">{c.batteryType}</span></p>
                <div className="flex items-center justify-between pt-1 text-[10px]">
                  <span className="text-slate-400">COMSEC:</span>
                  <span className={`font-bold px-1.5 py-0.5 rounded ${
                    c.cryptoKeyLoaded ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300'
                  }`}>
                    {c.cryptoKeyLoaded ? '🔒 CARGADA' : '🔓 SIN LLAVE'}
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-800 text-[11px] flex items-center justify-between">
              <span className="text-slate-500">Asignado:</span>
              <span className="font-mono font-bold text-blue-300 truncate max-w-[140px] text-right">
                {c.assignedSoldierId || 'En Taller S-6'}
              </span>
            </div>
          </div>
        ))}
      </div>

      {filteredComms.length === 0 && (
        <div className="text-center py-12 border border-dashed border-slate-800 rounded-2xl">
          <p className="text-sm text-slate-500">No se encontraron equipos de comunicaciones con los filtros seleccionados.</p>
        </div>
      )}
    </div>
  );
};
