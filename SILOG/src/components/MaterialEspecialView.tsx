import React, { useState } from 'react';
import { SpecialOptronicsItem } from '../types';

interface MaterialEspecialViewProps {
  optronics: SpecialOptronicsItem[];
  onOpenAddMaterial?: (preselectedClass: string) => void;
}

export const MaterialEspecialView: React.FC<MaterialEspecialViewProps> = ({ 
  optronics,
  onOpenAddMaterial 
}) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const filteredOptronics = optronics.filter(o => {
    if (statusFilter === 'PVS14' && !o.deviceType.includes('PVS_14')) return false;
    if (statusFilter === 'DRON' && !o.deviceType.includes('UAV') && !o.deviceType.includes('DRON')) return false;
    if (statusFilter === 'TERMICA' && !o.deviceType.includes('TERMICA')) return false;
    if (statusFilter === 'VALLON' && !o.deviceType.includes('VALLON')) return false;

    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      return (
        o.deviceType.toLowerCase().includes(q) ||
        o.serialNumber.toLowerCase().includes(q) ||
        o.generation.toLowerCase().includes(q) ||
        (o.assignedSoldierId && o.assignedSoldierId.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const totalPvs = optronics.filter(o => o.deviceType.includes('PVS_14')).length;
  const totalDrones = optronics.filter(o => o.deviceType.includes('UAV') || o.deviceType.includes('DRON')).length;
  const totalThermal = optronics.filter(o => o.deviceType.includes('TERMICA')).length;
  const totalVallon = optronics.filter(o => o.deviceType.includes('VALLON')).length;

  return (
    <div className="space-y-5 w-full">
      {/* Encabezado y Acciones */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 md:p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-black text-amber-300 uppercase tracking-wider flex items-center gap-2 mb-1">
            <span>🔭</span> Material Especial, Optoelectrónica y Drones (Clase VII)
          </h2>
          <p className="text-xs text-slate-400">
            Custodia y trazabilidad de visores nocturnos AN/PVS-14 Gen 3+, miras térmicas acoplables, drones de reconocimiento táctico y detectores antiexplosivos Vallon.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-indigo-950/40 border border-indigo-500/40 rounded-xl p-2.5 px-4 text-right">
            <span className="text-[10px] text-indigo-300 font-bold block">CAPACIDAD NOCTURNA / NVG</span>
            <span className="text-xl font-black text-white font-mono">{totalPvs + totalThermal} EQUIPOS</span>
          </div>

          {onOpenAddMaterial && (
            <button
              onClick={() => onOpenAddMaterial('ESPECIAL')}
              className="px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-indigo-950/50 transition-all flex items-center gap-2 border border-indigo-400/50"
            >
              <span>➕</span>
              <span>Registrar Optrónica / Dron</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-slate-900/80 border border-slate-800 p-3.5 rounded-xl">
          <span className="text-[10px] text-slate-400 font-mono block">VISORES AN/PVS-14</span>
          <span className="text-xl font-black text-white font-mono">{totalPvs}</span>
          <span className="text-[10px] text-indigo-400 block mt-0.5">Fósforo Blanco Gen 3+</span>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 p-3.5 rounded-xl">
          <span className="text-[10px] text-slate-400 font-mono block">UAVs / DRONES TÁCTICOS</span>
          <span className="text-xl font-black text-amber-400 font-mono">{totalDrones}</span>
          <span className="text-[10px] text-slate-400 block mt-0.5">Cámara Térmica & Zoom 56x</span>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 p-3.5 rounded-xl">
          <span className="text-[10px] text-slate-400 font-mono block">MIRAS TÉRMICAS CLIP-ON</span>
          <span className="text-xl font-black text-cyan-400 font-mono">{totalThermal}</span>
          <span className="text-[10px] text-cyan-300 block mt-0.5">FLIR Breach / Trijicon</span>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 p-3.5 rounded-xl">
          <span className="text-[10px] text-slate-400 font-mono block">DETECTORES ANTIEXPLOSIVOS</span>
          <span className="text-xl font-black text-emerald-400 font-mono">{totalVallon}</span>
          <span className="text-[10px] text-emerald-300 block mt-0.5">Vallon VMR3G Doble Sensor</span>
        </div>
      </div>

      {/* Barra de Filtros */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/40 p-3 rounded-xl border border-slate-800/80">
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <span className="text-slate-500 text-xs">🔍</span>
          <input
            type="text"
            placeholder="Buscar por serial, tipo de dispositivo, tecnología o soldado..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 font-bold">Filtro:</span>
          {[
            { id: 'ALL', label: 'TODOS' },
            { id: 'PVS14', label: 'AN/PVS-14' },
            { id: 'DRON', label: 'DRONES' },
            { id: 'TERMICA', label: 'TÉRMICAS' },
            { id: 'VALLON', label: 'VALLON' }
          ].map(flt => (
            <button
              key={flt.id}
              onClick={() => setStatusFilter(flt.id)}
              className={`text-[11px] px-2.5 py-1 rounded-lg font-bold transition ${
                statusFilter === flt.id
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-950 text-slate-400 border border-slate-800 hover:text-white'
              }`}
            >
              {flt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Rejilla de Dispositivos Especiales */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3.5">
        {filteredOptronics.map(o => (
          <div key={o.id} className="bg-slate-900/80 border border-slate-800 hover:border-indigo-500/50 rounded-xl p-3.5 space-y-2.5 transition flex flex-col justify-between">
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-black text-white truncate">{o.deviceType.replace(/_/g, ' ')}</span>
                <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 whitespace-nowrap">
                  {o.status}
                </span>
              </div>

              <div className="space-y-1 text-xs text-slate-300 bg-slate-950/60 p-2.5 rounded-lg border border-slate-800 font-mono">
                <p className="text-[11px]">🔢 <strong className="text-slate-400">Serial:</strong> <span className="text-cyan-300">{o.serialNumber}</span></p>
                <p className="text-[11px]">🔬 <strong className="text-slate-400">Generación:</strong> <span className="text-slate-300">{o.generation}</span></p>
                <div className="flex items-center justify-between pt-1 text-[11px]">
                  <span className="text-slate-400">Batería:</span>
                  <div className="flex items-center gap-1.5">
                    <div className="w-12 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <div 
                        className={`h-full ${o.batteryLevelPct > 50 ? 'bg-emerald-500' : o.batteryLevelPct > 20 ? 'bg-amber-500' : 'bg-red-500'}`} 
                        style={{ width: `${o.batteryLevelPct}%` }}
                      />
                    </div>
                    <span className="font-bold text-emerald-400">{o.batteryLevelPct}%</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-800 text-[11px] flex items-center justify-between">
              <span className="text-slate-500">Asignado:</span>
              <span className="font-mono font-bold text-blue-300 truncate max-w-[140px] text-right">
                {o.assignedSoldierId || 'En Armerillo Especial'}
              </span>
            </div>
          </div>
        ))}
      </div>

      {filteredOptronics.length === 0 && (
        <div className="text-center py-12 border border-dashed border-slate-800 rounded-2xl">
          <p className="text-sm text-slate-500">No se encontraron dispositivos especiales con los filtros seleccionados.</p>
        </div>
      )}
    </div>
  );
};
