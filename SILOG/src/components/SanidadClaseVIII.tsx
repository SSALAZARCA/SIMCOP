import React, { useState } from 'react';
import { CombatSanityItem } from '../types';
import { silogAuthService } from '../services/silogAuthService';

interface SanidadClaseVIIIProps {
  sanityItems: CombatSanityItem[];
  onOpenAddMaterial?: (preselectedClass: string) => void;
  onOpenMovementModal?: (params: any) => void;
}

export const SanidadClaseVIII: React.FC<SanidadClaseVIIIProps> = ({ 
  sanityItems,
  onOpenAddMaterial,
  onOpenMovementModal 
}) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const currentUser = silogAuthService.getCurrentUser();
  const canIngest = silogAuthService.canIngestMaterial(currentUser);

  const filteredItems = sanityItems.filter(s => {
    if (statusFilter !== 'ALL' && s.status !== statusFilter) return false;

    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      return (
        s.kitType.toLowerCase().includes(q) ||
        s.serialOrLotNumber.toLowerCase().includes(q) ||
        s.tourniquetCatLot.toLowerCase().includes(q) ||
        (s.assignedCompanyName && s.assignedCompanyName.toLowerCase().includes(q)) ||
        (s.assignedSoldierId && s.assignedSoldierId.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const totalIfaks = sanityItems.filter(s => s.kitType === 'IFAK_INDIVIDUAL_TRAUMA').length;
  const totalTourniquets = sanityItems.length; // Cada kit tiene al menos 1 torniquete CAT
  const totalHemostatic = sanityItems.reduce((acc, c) => acc + (c.hemostaticGauzeUnits || 0), 0);
  const totalEnfermeroKits = sanityItems.filter(s => s.kitType === 'MOCHILA_ENFERMERO_COMBATE').length;

  return (
    <div className="space-y-5 w-full">
      {/* Encabezado y Acciones Rápidas */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 md:p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-black text-amber-300 uppercase tracking-wider flex items-center gap-2 mb-1">
            <span>🩺</span> Sanidad Militar y Trauma en Combate (Clase VIII)
          </h2>
          <p className="text-xs text-slate-400">
            Control de Botiquines Individuales de Primeros Auxilios (IFAK), torniquetes tácticos CAT C-A-T®, gasas hemostáticas QuikClot y mochilas de Enfermero de Combate.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-red-950/40 border border-red-500/40 rounded-xl p-2.5 px-4 text-right">
            <span className="text-[10px] text-red-300 font-bold block">TORNIQUETES CAT DISPONIBLES</span>
            <span className="text-xl font-black text-white font-mono">{totalTourniquets} UNID</span>
          </div>

          {canIngest && onOpenAddMaterial ? (
            <button
              onClick={() => onOpenAddMaterial('CLASE_VIII')}
              className="px-4 py-2.5 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-red-950/50 transition-all flex items-center gap-2 border border-red-400/50"
            >
              <span>➕</span>
              <span>Registrar IFAK / Sanidad</span>
            </button>
          ) : (
            <div className="text-[11px] font-mono text-slate-500 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
              🔒 Ingreso restringido a Bodegueros / Almacenistas
            </div>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-slate-900/80 border border-slate-800 p-3.5 rounded-xl">
          <span className="text-[10px] text-slate-400 font-mono block">IFAKs INDIVIDUALES</span>
          <span className="text-xl font-black text-white font-mono">{totalIfaks}</span>
          <span className="text-[10px] text-emerald-400 block mt-0.5">Dotación personal</span>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 p-3.5 rounded-xl">
          <span className="text-[10px] text-slate-400 font-mono block">GASAS HEMOSTÁTICAS</span>
          <span className="text-xl font-black text-amber-400 font-mono">{totalHemostatic}</span>
          <span className="text-[10px] text-slate-400 block mt-0.5">Control de hemorragias masivas</span>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 p-3.5 rounded-xl">
          <span className="text-[10px] text-slate-400 font-mono block">BOTIQUINES ENFERMERO</span>
          <span className="text-xl font-black text-cyan-400 font-mono">{totalEnfermeroKits}</span>
          <span className="text-[10px] text-cyan-300 block mt-0.5">Nivel Pelotón / Sección</span>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 p-3.5 rounded-xl">
          <span className="text-[10px] text-slate-400 font-mono block">ESTADO OPERACIONAL</span>
          <span className="text-xl font-black text-emerald-400 font-mono">100% OK</span>
          <span className="text-[10px] text-emerald-300 block mt-0.5">Sin material vencido</span>
        </div>
      </div>

      {/* Barra de Filtros y Búsqueda */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/40 p-3 rounded-xl border border-slate-800/80">
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <span className="text-slate-500 text-xs">🔍</span>
          <input
            type="text"
            placeholder="Buscar por serial, lote CAT, tipo, compañía o militar..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-red-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 font-bold">Estado:</span>
          {['ALL', 'OPERATIVO', 'DOTACION_SOLDADO', 'MANTENIMIENTO'].map(st => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`text-[11px] px-2.5 py-1 rounded-lg font-bold transition ${
                statusFilter === st
                  ? 'bg-red-500 text-slate-950'
                  : 'bg-slate-950 text-slate-400 border border-slate-800 hover:text-white'
              }`}
            >
              {st === 'ALL' ? 'TODOS' : st.replace(/_/g, ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Rejilla de Kits de Sanidad */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3.5">
        {filteredItems.map(s => (
          <div key={s.id} className="bg-slate-900/80 border border-slate-800 hover:border-red-500/50 rounded-xl p-3.5 space-y-2.5 transition flex flex-col justify-between">
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-black text-white truncate">{s.kitType.replace(/_/g, ' ')}</span>
                <span className="text-[9px] px-2 py-0.5 rounded font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 whitespace-nowrap">
                  {s.status}
                </span>
              </div>

              <div className="space-y-1 text-xs text-slate-300 bg-slate-950/60 p-2.5 rounded-lg border border-slate-800 font-mono">
                <p className="text-[11px]">📦 <strong className="text-slate-400">ID/Serial:</strong> <span className="text-cyan-300">{s.serialOrLotNumber}</span></p>
                <p className="text-[11px]">🩸 <strong className="text-slate-400">Lote CAT:</strong> <span className="text-red-300">{s.tourniquetCatLot}</span></p>
                <p className="text-[11px]">⏳ <strong className="text-slate-400">Vigencia:</strong> <span className="text-slate-400">{s.tourniquetExpiration}</span></p>
                <p className="text-[11px]">🩹 <strong className="text-slate-400">Gasas Hemost.:</strong> <span className="text-amber-300 font-bold">{s.hemostaticGauzeUnits} u.</span></p>
                <p className="text-[11px]">🏢 <strong className="text-slate-400">Cía:</strong> <span className="text-blue-300">{s.assignedCompanyName || 'En Almacén'}</span></p>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-800 text-[11px] flex items-center justify-between gap-1">
              <span className="text-slate-500 font-mono text-[10px] truncate max-w-[90px]">
                {s.assignedSoldierId ? s.assignedSoldierId : 'Libre'}
              </span>

              {onOpenMovementModal && (
                <button
                  onClick={() => onOpenMovementModal({
                    category: 'CLASE_VIII',
                    itemId: s.id,
                    itemDescription: `${s.kitType.replace(/_/g, ' ')} (${s.serialOrLotNumber})`,
                    warehouseId: s.warehouseId,
                    companyId: s.assignedCompanyId,
                    soldierId: s.assignedSoldierId
                  })}
                  className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 rounded text-[10px] font-bold transition flex items-center gap-1"
                >
                  <span>🚚</span>
                  <span>Mover</span>
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {filteredItems.length === 0 && (
        <div className="text-center py-12 border border-dashed border-slate-800 rounded-2xl">
          <p className="text-sm text-slate-500">No se encontraron ítems de sanidad con los filtros seleccionados.</p>
        </div>
      )}
    </div>
  );
};
