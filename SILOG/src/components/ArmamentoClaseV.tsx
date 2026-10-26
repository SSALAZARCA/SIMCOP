import React, { useState } from 'react';
import { WeaponItem, AmmunitionLotItem } from '../types';

interface ArmamentoClaseVProps {
  weapons: WeaponItem[];
  ammoLots: AmmunitionLotItem[];
}

export const ArmamentoClaseV: React.FC<ArmamentoClaseVProps> = ({ weapons, ammoLots }) => {
  const [filterType, setFilterType] = useState<string>('ALL');

  const filteredWeapons = weapons.filter(w => {
    if (filterType === 'ALL') return true;
    if (filterType === 'FUSIL') return w.model.includes('GALIL');
    if (filterType === 'APOYO') return w.model.includes('AMETRALLADORA') || w.model.includes('MORTERO') || w.model.includes('LANZAGRANADAS');
    if (filterType === 'TALLER') return w.status === 'EN_TALLER_BASPC';
    return true;
  });

  const total556 = ammoLots.filter(a => a.caliber === '5.56x45mm').reduce((acc, c) => acc + c.quantityRounds, 0);
  const total762 = ammoLots.filter(a => a.caliber === '7.62x51mm').reduce((acc, c) => acc + c.quantityRounds, 0);
  const total40mm = ammoLots.filter(a => a.caliber === '40mm_HE').reduce((acc, c) => acc + c.quantityRounds, 0);
  const total60mm = ammoLots.filter(a => a.caliber === '60mm_MORTERO_HE').reduce((acc, c) => acc + c.quantityRounds, 0);

  return (
    <div className="space-y-6">
      {/* Resumen Superior de Munición */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 text-center">
          <span className="text-2xl font-black text-amber-400 font-mono">{total556.toLocaleString()}</span>
          <p className="text-xs font-bold text-slate-300 mt-1">Calibre 5.56×45mm</p>
          <p className="text-[10px] text-slate-500">Cartuchos de Fusil Galil</p>
        </div>
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 text-center">
          <span className="text-2xl font-black text-red-400 font-mono">{total762.toLocaleString()}</span>
          <p className="text-xs font-bold text-slate-300 mt-1">Calibre 7.62×51mm</p>
          <p className="text-[10px] text-slate-500">Cananas Ametralladora M-60</p>
        </div>
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 text-center">
          <span className="text-2xl font-black text-cyan-400 font-mono">{total40mm}</span>
          <p className="text-xs font-bold text-slate-300 mt-1">Granadas 40mm HE</p>
          <p className="text-[10px] text-slate-500">Dotación MGL / M203</p>
        </div>
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 text-center">
          <span className="text-2xl font-black text-purple-400 font-mono">{total60mm}</span>
          <p className="text-xs font-bold text-slate-300 mt-1">Bombas Mortero 60mm</p>
          <p className="text-[10px] text-slate-500">Apoyo de Fuego Indirecto</p>
        </div>
      </div>

      {/* Control de Armamento */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div>
            <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
              <span>🔫</span> Armamento de Línea y Apoyo de Fuego (Armerillo)
            </h3>
            <p className="text-xs text-slate-400">Control por serial, estado operativo y disparos acumulados</p>
          </div>

          <div className="flex items-center gap-2">
            {['ALL', 'FUSIL', 'APOYO', 'TALLER'].map(t => (
              <button
                key={t}
                onClick={() => setFilterType(t)}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition ${
                  filterType === t 
                    ? 'bg-amber-500 text-slate-950 font-black' 
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {t === 'ALL' ? 'Todos' : t === 'FUSIL' ? 'Fusiles' : t === 'APOYO' ? 'Apoyo Fuego' : 'En Taller BASPC'}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800 font-mono">
              <tr>
                <th className="py-2.5 px-3">Serial / ID</th>
                <th className="py-2.5 px-3">Modelo Armamento</th>
                <th className="py-2.5 px-3">Calibre</th>
                <th className="py-2.5 px-3">Disparos Aprox.</th>
                <th className="py-2.5 px-3">Estado</th>
                <th className="py-2.5 px-3">Asignado a (SIGEP)</th>
                <th className="py-2.5 px-3">Último Mtto.</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-sans">
              {filteredWeapons.map(w => (
                <tr key={w.id} className="hover:bg-slate-800/40 transition">
                  <td className="py-3 px-3 font-mono font-bold text-amber-300">{w.serialNumber}</td>
                  <td className="py-3 px-3 font-bold text-white">{w.model.replace(/_/g, ' ')}</td>
                  <td className="py-3 px-3 font-mono text-slate-300">{w.caliber}</td>
                  <td className="py-3 px-3 font-mono text-slate-400">{w.roundsFiredEstimate.toLocaleString()}</td>
                  <td className="py-3 px-3">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      w.status === 'OPERATIVO' 
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
                        : w.status === 'ASIGNADO'
                        ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                        : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    }`}>
                      {w.status}
                    </span>
                  </td>
                  <td className="py-3 px-3">
                    {w.assignedSoldierId ? (
                      <span className="font-mono text-blue-300 font-semibold bg-blue-950/40 px-2 py-0.5 rounded border border-blue-900/40">
                        {w.assignedSoldierId}
                      </span>
                    ) : (
                      <span className="text-slate-500 italic">En Armerillo</span>
                    )}
                  </td>
                  <td className="py-3 px-3 text-slate-400 font-mono text-[11px]">{w.lastMaintenanceDate}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
