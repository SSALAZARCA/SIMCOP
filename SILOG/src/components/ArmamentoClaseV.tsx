import React, { useState } from 'react';
import { WeaponItem, AmmunitionLotItem } from '../types';
import { silogAuthService } from '../services/silogAuthService';

interface ArmamentoClaseVProps {
  weapons: WeaponItem[];
  ammoLots: AmmunitionLotItem[];
  onOpenAddMaterial?: (preselectedClass: string) => void;
  onOpenMovementModal?: (params: any) => void;
}

export const ArmamentoClaseV: React.FC<ArmamentoClaseVProps> = ({ 
  weapons, 
  ammoLots,
  onOpenAddMaterial,
  onOpenMovementModal
}) => {
  const [filterType, setFilterType] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');

  const currentUser = silogAuthService.getCurrentUser();
  const canIngest = silogAuthService.canIngestMaterial(currentUser);

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
        (w.assignedCompanyName && w.assignedCompanyName.toLowerCase().includes(q)) ||
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

        {canIngest && onOpenAddMaterial ? (
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
        ) : (
          <div className="text-[11px] font-mono text-slate-500 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
            🔒 Ingreso restringido a Bodegueros / Almacenistas
          </div>
        )}
      </div>

      {/* KPI Cards de Municiones */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-slate-900/80 border border-slate-800 p-3.5 rounded-xl">
          <span className="text-[10px] text-slate-400 font-mono block">MUNICIÓN 5.56x45mm</span>
          <span className="text-xl font-black text-white font-mono">{total556.toLocaleString()}</span>
          <span className="text-[10px] text-emerald-400 block mt-0.5">Dotación reglamentaria Galil</span>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 p-3.5 rounded-xl">
          <span className="text-[10px] text-slate-400 font-mono block">MUNICIÓN 7.62x51mm</span>
          <span className="text-xl font-black text-white font-mono">{total762.toLocaleString()}</span>
          <span className="text-[10px] text-amber-400 block mt-0.5">Ametralladoras M-60 E4</span>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 p-3.5 rounded-xl">
          <span className="text-[10px] text-slate-400 font-mono block">GRANADAS 40mm HE</span>
          <span className="text-xl font-black text-white font-mono">{total40mm}</span>
          <span className="text-[10px] text-red-400 block mt-0.5">Lanzagranadas MGL / M203</span>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 p-3.5 rounded-xl">
          <span className="text-[10px] text-slate-400 font-mono block">BOMBAS MORTERO 60mm</span>
          <span className="text-xl font-black text-white font-mono">{total60mm}</span>
          <span className="text-[10px] text-cyan-400 block mt-0.5">Apoyo indirecto de Pelotón</span>
        </div>
      </div>

      {/* Tabla de Armamento Orgánico con Asignación Doctrinal */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 md:p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-1 max-w-md">
            <span className="text-slate-500 text-xs">🔍</span>
            <input
              type="text"
              placeholder="Buscar arma por serial, modelo, compañía o militar..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="flex items-center gap-2">
            {['ALL', 'FUSIL', 'APOYO', 'TALLER'].map(t => (
              <button
                key={t}
                onClick={() => setFilterType(t)}
                className={`text-xs px-3 py-1 rounded-lg font-bold transition ${
                  filterType === t 
                    ? 'bg-amber-600 text-slate-950' 
                    : 'bg-slate-950 text-slate-400 border border-slate-800 hover:text-white'
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
                <th className="p-3">Disparos</th>
                <th className="p-3">Estado</th>
                <th className="p-3">Compañía Asignada</th>
                <th className="p-3">Combatiente a Cargo</th>
                <th className="p-3 text-right">Cadena Custodia</th>
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
                  <td className="p-3 text-xs">
                    {w.assignedCompanyName ? (
                      <span className="text-blue-300 font-bold bg-blue-950/40 px-2 py-0.5 rounded border border-blue-900/40">
                        {w.assignedCompanyName}
                      </span>
                    ) : (
                      <span className="text-slate-500 italic">En Bodega Batallón</span>
                    )}
                  </td>
                  <td className="p-3 font-mono text-xs">
                    {w.assignedSoldierId ? (
                      <span className="text-amber-400 font-bold bg-amber-950/40 px-2 py-0.5 rounded border border-amber-900/40">
                        {w.assignedSoldierId}
                      </span>
                    ) : (
                      <span className="text-slate-500">Sin asignar a soldado</span>
                    )}
                  </td>
                  <td className="p-3 text-right">
                    {onOpenMovementModal && (
                      <button
                        onClick={() => onOpenMovementModal({
                          category: 'CLASE_V_ARMA',
                          itemId: w.id,
                          itemDescription: `${w.model.replace(/_/g, ' ')} (${w.serialNumber})`,
                          warehouseId: w.warehouseId,
                          companyId: w.assignedCompanyId,
                          soldierId: w.assignedSoldierId
                        })}
                        className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-amber-300 hover:text-white border border-amber-500/30 rounded-lg font-bold text-[11px] transition inline-flex items-center gap-1"
                        title="Despachar desde BASPC, distribuir a compañía o asignar a soldado"
                      >
                        <span>🚚</span>
                        <span>Mover / Asignar</span>
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {filteredWeapons.length === 0 && (
                <tr>
                  <td colSpan={8} className="p-6 text-center text-slate-500">
                    No se encontró armamento con los filtros seleccionados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Lotes de Munición */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 md:p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-black text-amber-300 uppercase tracking-wider flex items-center gap-2">
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
                <th className="p-3">Compañía Asignada</th>
                <th className="p-3 text-right">Cadena Custodia</th>
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
                  <td className="p-3 text-xs">
                    {a.assignedCompanyName ? (
                      <span className="text-blue-300 font-bold">{a.assignedCompanyName}</span>
                    ) : (
                      <span className="text-slate-500 italic">En Polvorín Batallón</span>
                    )}
                  </td>
                  <td className="p-3 text-right">
                    {onOpenMovementModal && (
                      <button
                        onClick={() => onOpenMovementModal({
                          category: 'CLASE_V_MUNICION',
                          itemId: a.id,
                          itemDescription: `Lote ${a.lotNumber} (${a.quantityRounds.toLocaleString()} tiros ${a.caliber})`,
                          warehouseId: a.warehouseId,
                          companyId: a.assignedCompanyId
                        })}
                        className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-amber-300 hover:text-white border border-amber-500/30 rounded-lg font-bold text-[11px] transition inline-flex items-center gap-1"
                      >
                        <span>🚚</span>
                        <span>Mover Lote</span>
                      </button>
                    )}
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
