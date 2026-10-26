import React, { useState } from 'react';
import { WeaponItem, AmmunitionLotItem } from '../types';

interface ArmamentoClaseVProps {
  weapons: WeaponItem[];
  ammoLots: AmmunitionLotItem[];
  onOpenAddMaterial?: (preselectedClass: string) => void;
}

export const ArmamentoClaseV: React.FC<ArmamentoClaseVProps> = ({ 
  weapons, 
  ammoLots,
  onOpenAddMaterial 
}) => {
  const [filterType, setFilterType] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');

  const filteredWeapons = weapons.filter(w => {
    if (filterType === 'FUSIL' && !w.model.includes('GALIL')) return false;
    if (filterType === 'APOYO' && !(w.model.includes('AMETRALLADORA') || w.model.includes('MORTERO') || w.model.includes('LANZAGRANADAS'))) return false;
    if (filterType === 'TALLER' && w.status !== 'EN_TALLER_BASPC') return false;

    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      return (
        w.serialNumber.toLowerCase().includes(q) ||
        w.model.toLowerCase().includes(q) ||
        w.caliber.toLowerCase().includes(q) ||
        (w.assignedSoldierId && w.assignedSoldierId.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const total556 = ammoLots.filter(a => a.caliber === '5.56x45mm').reduce((acc, c) => acc + c.quantityRounds, 0);
  const total762 = ammoLots.filter(a => a.caliber === '7.62x51mm').reduce((acc, c) => acc + c.quantityRounds, 0);
  const total40mm = ammoLots.filter(a => a.caliber === '40mm_HE').reduce((acc, c) => acc + c.quantityRounds, 0);
  const total60mm = ammoLots.filter(a => a.caliber === '60mm_MORTERO_HE').reduce((acc, c) => acc + c.quantityRounds, 0);

  return (
    <div className="space-y-5 w-full">
      {/* Resumen Superior de Munición y Acciones Rápidas */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/60 border border-slate-800 p-4 rounded-2xl">
        <div>
          <h2 className="text-base font-black text-amber-300 uppercase tracking-wider flex items-center gap-2">
            <span>🔫</span> Armamento Orgánico y Municiones (Clase V)
          </h2>
          <p className="text-xs text-slate-400">
            Control de fusiles de asalto, ametralladoras de apoyo, morteros, lanzagranadas y lotes de munición por almacén.
          </p>
        </div>

        {onOpenAddMaterial && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => onOpenAddMaterial('CLASE_V_ARMA')}
              className="px-3.5 py-2 bg-amber-600 hover:bg-amber-500 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl shadow-md transition flex items-center gap-1.5"
            >
              <span>➕</span>
              <span>Registrar Arma</span>
            </button>
            <button
              onClick={() => onOpenAddMaterial('CLASE_V_MUNICION')}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 border border-amber-500/40 text-amber-300 font-bold text-xs uppercase tracking-wider rounded-xl shadow-md transition flex items-center gap-1.5"
            >
              <span>📦</span>
              <span>Ingresar Lote Munición</span>
            </button>
          </div>
        )}
      </div>

      {/* KPI Cards de Municiones en Línea */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5 text-center">
          <span className="text-2xl font-black text-amber-400 font-mono">{total556.toLocaleString()}</span>
          <p className="text-xs font-bold text-slate-300 mt-0.5">Calibre 5.56×45mm</p>
          <p className="text-[10px] text-slate-500">Cartuchos de Fusil Galil / ACE</p>
        </div>
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5 text-center">
          <span className="text-2xl font-black text-red-400 font-mono">{total762.toLocaleString()}</span>
          <p className="text-xs font-bold text-slate-300 mt-0.5">Calibre 7.62×51mm</p>
          <p className="text-[10px] text-slate-500">Cananas Ametralladora M-60</p>
        </div>
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5 text-center">
          <span className="text-2xl font-black text-cyan-400 font-mono">{total40mm}</span>
          <p className="text-xs font-bold text-slate-300 mt-0.5">Granadas 40mm HE</p>
          <p className="text-[10px] text-slate-500">Dotación MGL / M203</p>
        </div>
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5 text-center">
          <span className="text-2xl font-black text-purple-400 font-mono">{total60mm}</span>
          <p className="text-xs font-bold text-slate-300 mt-0.5">Bombas Mortero 60mm</p>
          <p className="text-[10px] text-slate-500">Apoyo de Fuego Indirecto</p>
        </div>
      </div>

      {/* Tabla de Armas con Búsqueda y Filtros */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div className="flex-1 min-w-[240px] max-w-md">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="🔍 Buscar por serial, modelo o soldado asignado..."
              className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl p-2 px-3 text-xs text-white focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto">
            {['ALL', 'FUSIL', 'APOYO', 'TALLER'].map(t => (
              <button
                key={t}
                onClick={() => setFilterType(t)}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition whitespace-nowrap ${
                  filterType === t 
                    ? 'bg-amber-500 text-slate-950 font-black shadow-md' 
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {t === 'ALL' ? 'Todos los Tipos' : t === 'FUSIL' ? 'Fusiles' : t === 'APOYO' ? 'Apoyo Fuego' : 'En Taller'}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-800/80">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800 font-mono">
              <tr>
                <th className="p-3">Serial Militar</th>
                <th className="p-3">Modelo</th>
                <th className="p-3">Calibre</th>
                <th className="p-3">Disparos Estimados</th>
                <th className="p-3">Estado</th>
                <th className="p-3">Asignación Kárdex</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 bg-slate-900/40">
              {filteredWeapons.map(w => (
                <tr key={w.id} className="hover:bg-slate-800/50 transition">
                  <td className="p-3 font-mono font-bold text-amber-300">{w.serialNumber}</td>
                  <td className="p-3 font-medium text-white">{w.model.replace(/_/g, ' ')}</td>
                  <td className="p-3 font-mono text-slate-400">{w.caliber}</td>
                  <td className="p-3 font-mono text-cyan-300">{w.roundsFiredEstimate.toLocaleString()}</td>
                  <td className="p-3">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      w.status === 'OPERATIVO' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                      w.status === 'ASIGNADO' ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' :
                      'bg-red-500/20 text-red-300 border border-red-500/30'
                    }`}>
                      {w.status.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="p-3 font-mono text-xs">
                    {w.assignedSoldierId ? (
                      <span className="text-amber-400 font-bold">{w.assignedSoldierId}</span>
                    ) : (
                      <span className="text-slate-500">En Armerillo</span>
                    )}
                  </td>
                </tr>
              ))}
              {filteredWeapons.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-slate-500">
                    No se encontró armamento con los filtros seleccionados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Tabla de Lotes de Munición */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
            <span>📦</span> Lotes de Munición y Pirotecnia en Polvorín
          </h3>
          <span className="text-xs font-mono text-slate-400">{ammoLots.length} lotes registrados</span>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-800/80">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800 font-mono">
              <tr>
                <th className="p-3">Lote Indumil</th>
                <th className="p-3">Calibre</th>
                <th className="p-3">Cantidad</th>
                <th className="p-3">Año Fab.</th>
                <th className="p-3">Empaque</th>
                <th className="p-3">Clasificación</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 bg-slate-900/40">
              {ammoLots.map(a => (
                <tr key={a.id} className="hover:bg-slate-800/50 transition">
                  <td className="p-3 font-mono font-bold text-amber-300">{a.lotNumber}</td>
                  <td className="p-3 font-mono text-white">{a.caliber}</td>
                  <td className="p-3 font-mono text-emerald-400 font-bold">{a.quantityRounds.toLocaleString()}</td>
                  <td className="p-3 font-mono text-slate-400">{a.manufacturingYear}</td>
                  <td className="p-3 text-slate-400">{a.packagingType.replace(/_/g, ' ')}</td>
                  <td className="p-3">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-300 border border-amber-500/30">
                      {a.securityClassification.replace(/_/g, ' ')}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

