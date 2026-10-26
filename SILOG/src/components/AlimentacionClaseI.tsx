import React, { useState } from 'react';
import { RationBatchItem } from '../types';
import { silogAuthService } from '../services/silogAuthService';

interface AlimentacionClaseIProps {
  rations: RationBatchItem[];
  onOpenAddMaterial?: (preselectedClass: string) => void;
  onOpenMovementModal?: (params: any) => void;
}

export const AlimentacionClaseI: React.FC<AlimentacionClaseIProps> = ({ 
  rations,
  onOpenAddMaterial,
  onOpenMovementModal 
}) => {
  const [searchTerm, setSearchTerm] = useState<string>('');

  const currentUser = silogAuthService.getCurrentUser();
  const canIngest = silogAuthService.canIngestMaterial(currentUser);

  const filteredRations = rations.filter(r => {
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      return (
        r.menuNumber.toLowerCase().includes(q) ||
        r.lotNumber.toLowerCase().includes(q) ||
        r.rationType.toLowerCase().includes(q) ||
        (r.assignedCompanyName && r.assignedCompanyName.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const mreTotal = rations.filter(r => r.rationType === 'RACION_CAMPANA_MRE').reduce((acc, c) => acc + c.quantityOnHand, 0);
  const daysTotal = Math.round(mreTotal / (36 * 3)); // 36 efectivos x 3 raciones/día
  const waterPurifiersTotal = rations.filter(r => r.rationType === 'PASTILLAS_PURIFICADORAS').reduce((acc, c) => acc + c.quantityOnHand, 0);

  return (
    <div className="space-y-5 w-full">
      {/* Encabezado y Acciones */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 md:p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-black text-amber-300 uppercase tracking-wider flex items-center gap-2 mb-1">
            <span>🍱</span> Alimentación y Subsistencias Militares (Clase I)
          </h2>
          <p className="text-xs text-slate-400">
            Control de Raciones de Campaña (MRE), fechas de vencimiento bromatológico y autonomía de víveres en el teatro de operaciones.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-amber-950/40 border border-amber-500/40 rounded-xl p-2.5 px-4 text-right">
            <span className="text-[10px] text-amber-300 font-bold block">AUTONOMÍA ESTIMADA (PELOTÓN 36H)</span>
            <span className="text-xl font-black text-white font-mono">{daysTotal} DÍAS</span>
          </div>

          {canIngest && onOpenAddMaterial ? (
            <button
              onClick={() => onOpenAddMaterial('CLASE_I')}
              className="px-4 py-2.5 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl shadow-md transition flex items-center gap-1.5"
            >
              <span>➕</span>
              <span>Ingresar Raciones</span>
            </button>
          ) : (
            <div className="text-[11px] font-mono text-slate-500 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
              🔒 Ingreso restringido a Bodegueros / Almacenistas
            </div>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 text-center">
          <span className="text-2xl font-black text-amber-400 font-mono">{mreTotal.toLocaleString()}</span>
          <p className="text-xs font-bold text-slate-300 mt-0.5">Raciones MRE</p>
          <p className="text-[10px] text-slate-500">Listas para consumo</p>
        </div>
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 text-center">
          <span className="text-2xl font-black text-cyan-400 font-mono">{waterPurifiersTotal.toLocaleString()}</span>
          <p className="text-xs font-bold text-slate-300 mt-0.5">Pastillas Purificadoras</p>
          <p className="text-[10px] text-slate-500">Capacidad potabilización</p>
        </div>
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 text-center">
          <span className="text-2xl font-black text-emerald-400 font-mono">{daysTotal}</span>
          <p className="text-xs font-bold text-slate-300 mt-0.5">Días de Autonomía</p>
          <p className="text-[10px] text-slate-500">Unidad de maniobra (36H)</p>
        </div>
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 text-center">
          <span className="text-2xl font-black text-purple-400 font-mono">100%</span>
          <p className="text-xs font-bold text-slate-300 mt-0.5">Garantía Bromatológica</p>
          <p className="text-[10px] text-slate-500">Lotes no caducos</p>
        </div>
      </div>

      {/* Barra de Búsqueda */}
      <div className="bg-slate-900/40 p-3 rounded-xl border border-slate-800">
        <div className="flex items-center gap-2 max-w-md">
          <span className="text-slate-500 text-xs">🔍</span>
          <input
            type="text"
            placeholder="Buscar por menú, número de lote o compañía..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
          />
        </div>
      </div>

      {/* Grid de Raciones Full Width */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
        {filteredRations.map(r => (
          <div key={r.id} className="bg-slate-900/80 border border-slate-800 hover:border-amber-500/40 rounded-xl p-4 space-y-3 transition flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-white">
                  {r.rationType === 'RACION_CAMPANA_MRE' ? '🍱 RACIÓN MRE' : r.rationType === 'PASTILLAS_PURIFICADORAS' ? '💧 AGUA Y PURIFICACIÓN' : '🌾 VÍVERES'}
                </span>
                <span className="text-xs font-mono font-black text-amber-400 bg-amber-950/50 px-2 py-0.5 rounded border border-amber-800/40">
                  {r.quantityOnHand.toLocaleString()} u.
                </span>
              </div>

              <div className="space-y-1.5 text-xs text-slate-300 bg-slate-950/60 p-3 rounded-lg border border-slate-800">
                <p className="font-bold text-cyan-300">{r.menuNumber}</p>
                <p>🏷️ <strong>Lote:</strong> <span className="font-mono text-slate-300">{r.lotNumber}</span></p>
                <p>📅 <strong>Vencimiento:</strong> <span className="font-mono text-emerald-400">{r.expirationDate}</span></p>
                <p>⚡ <strong>Aporte Calórico:</strong> <span className="font-mono text-slate-300">{r.caloriesPerUnit} kcal/ración</span></p>
                <p>🏢 <strong>Asignado a:</strong> <span className="font-bold text-blue-300">{r.assignedCompanyName || 'En Almacén'}</span></p>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[11px]">
              <span className="text-slate-400 font-mono">{r.daysOfAutonomyEquivalent} días patrulla</span>

              {onOpenMovementModal && (
                <button
                  onClick={() => onOpenMovementModal({
                    category: 'CLASE_I',
                    itemId: r.id,
                    itemDescription: `${r.menuNumber} (Lote: ${r.lotNumber})`,
                    warehouseId: r.warehouseId,
                    companyId: r.assignedCompanyId
                  })}
                  className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 rounded text-[10px] font-bold transition flex items-center gap-1"
                >
                  <span>🚚</span>
                  <span>Mover Lote</span>
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
