import React, { useState } from 'react';
import { BallisticArmorItem } from '../types';
import { silogAuthService } from '../services/silogAuthService';

interface IntendenciaClaseIIProps {
  armors: BallisticArmorItem[];
  onOpenAddMaterial?: (preselectedClass: string) => void;
  onOpenMovementModal?: (params: any) => void;
}

export const IntendenciaClaseII: React.FC<IntendenciaClaseIIProps> = ({ 
  armors,
  onOpenAddMaterial,
  onOpenMovementModal 
}) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const currentUser = silogAuthService.getCurrentUser();
  const canIngest = silogAuthService.canIngestMaterial(currentUser);

  const filteredArmors = armors.filter(a => {
    const isExpired = new Date(a.expirationDate).getTime() < Date.now();
    if (statusFilter === 'VIGENTE' && isExpired) return false;
    if (statusFilter === 'VENCIDO' && !isExpired) return false;
    if (statusFilter === 'ASIGNADO' && !a.assignedSoldierId) return false;
    if (statusFilter === 'DISPONIBLE' && a.assignedSoldierId) return false;

    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      return (
        a.serialNumber.toLowerCase().includes(q) ||
        (a.frontPlateSerial && a.frontPlateSerial.toLowerCase().includes(q)) ||
        (a.rearPlateSerial && a.rearPlateSerial.toLowerCase().includes(q)) ||
        (a.assignedCompanyName && a.assignedCompanyName.toLowerCase().includes(q)) ||
        (a.assignedSoldierId && a.assignedSoldierId.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const totalVests = armors.filter(a => a.armorType.includes('CHALECO')).length;
  const totalHelmets = armors.filter(a => a.armorType.includes('CASCO')).length;
  const expiredCount = armors.filter(a => new Date(a.expirationDate).getTime() < Date.now()).length;

  return (
    <div className="space-y-5 w-full">
      {/* Encabezado y Acciones */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 md:p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-black text-amber-300 uppercase tracking-wider flex items-center gap-2">
            <span>🛡️</span> Intendencia y Protección Balística (Clase II / VII)
          </h2>
          <p className="text-xs text-slate-400">
            Control de chalecos antibalas con seriales de placa balística frontal/dorsal, cascos de Kevlar y fechas de caducidad balística.
          </p>
        </div>

        {canIngest && onOpenAddMaterial ? (
          <button
            onClick={() => onOpenAddMaterial('CLASE_II')}
            className="px-4 py-2 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl shadow-md transition flex items-center gap-1.5"
          >
            <span>➕</span>
            <span>Registrar Chaleco / Casco</span>
          </button>
        ) : (
          <div className="text-[11px] font-mono text-slate-500 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
            🔒 Ingreso restringido a Bodegueros / Almacenistas
          </div>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 text-center">
          <span className="text-2xl font-black text-white font-mono">{armors.length}</span>
          <p className="text-xs font-bold text-slate-300 mt-0.5">Total Elementos</p>
          <p className="text-[10px] text-slate-500">Blindaje en inventario</p>
        </div>
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 text-center">
          <span className="text-2xl font-black text-amber-400 font-mono">{totalVests}</span>
          <p className="text-xs font-bold text-slate-300 mt-0.5">Chalecos Balísticos</p>
          <p className="text-[10px] text-slate-500">Nivel IV con placas</p>
        </div>
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 text-center">
          <span className="text-2xl font-black text-cyan-400 font-mono">{totalHelmets}</span>
          <p className="text-xs font-bold text-slate-300 mt-0.5">Cascos Kevlar</p>
          <p className="text-[10px] text-slate-500">Protección fragmentación</p>
        </div>
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 text-center">
          <span className={`text-2xl font-black font-mono ${expiredCount > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
            {expiredCount}
          </span>
          <p className="text-xs font-bold text-slate-300 mt-0.5">Vencidos / Caducos</p>
          <p className="text-[10px] text-slate-500">Garantía balística</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/40 p-3 rounded-xl border border-slate-800">
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <span className="text-slate-500 text-xs">🔍</span>
          <input
            type="text"
            placeholder="Buscar por serial de chaleco, placa o militar..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
          />
        </div>

        <div className="flex items-center gap-2">
          {['ALL', 'DISPONIBLE', 'ASIGNADO', 'VIGENTE', 'VENCIDO'].map(st => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`text-xs px-3 py-1 rounded-lg font-bold transition ${
                statusFilter === st 
                  ? 'bg-amber-600 text-slate-950' 
                  : 'bg-slate-950 text-slate-400 border border-slate-800 hover:text-white'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Grid de Blindajes */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3.5">
        {filteredArmors.map(a => {
          const isExpired = new Date(a.expirationDate).getTime() < Date.now();
          return (
            <div key={a.id} className="bg-slate-900/80 border border-slate-800 hover:border-amber-500/50 rounded-xl p-3.5 space-y-2.5 transition flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-black text-white truncate">
                    {a.armorType.replace(/_/g, ' ')}
                  </span>
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded whitespace-nowrap ${
                    isExpired ? 'bg-red-500/20 text-red-300 border border-red-500/30' : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  }`}>
                    {isExpired ? 'VENCIDO' : 'VIGENTE'}
                  </span>
                </div>

                <div className="space-y-1 text-xs text-slate-300 bg-slate-950/60 p-2.5 rounded-lg border border-slate-800 font-mono">
                  <p className="text-[11px]">🔢 <strong className="text-slate-400">Serial:</strong> <span className="text-amber-300 font-bold">{a.serialNumber}</span></p>
                  <p className="text-[11px]">📏 <strong className="text-slate-400">Talla:</strong> {a.size}</p>
                  {a.frontPlateSerial && (
                    <p className="text-[11px]">🛡️ <strong className="text-slate-400">Placa F:</strong> <span className="text-cyan-300">{a.frontPlateSerial}</span></p>
                  )}
                  {a.rearPlateSerial && (
                    <p className="text-[11px]">🛡️ <strong className="text-slate-400">Placa D:</strong> <span className="text-cyan-300">{a.rearPlateSerial}</span></p>
                  )}
                  <p className="text-[11px]">⏳ <strong className="text-slate-400">Vence:</strong> <span className="text-slate-400">{a.expirationDate}</span></p>
                  <p className="text-[11px]">🏢 <strong className="text-slate-400">Cía:</strong> <span className="text-blue-300">{a.assignedCompanyName || 'En Bodega'}</span></p>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800 text-[11px] flex items-center justify-between gap-1">
                <span className="text-slate-500 font-mono text-[10px] truncate max-w-[90px]">
                  {a.assignedSoldierId ? a.assignedSoldierId : 'Libre'}
                </span>

                {onOpenMovementModal && (
                  <button
                    onClick={() => onOpenMovementModal({
                      category: 'CLASE_II',
                      itemId: a.id,
                      itemDescription: `${a.armorType.replace(/_/g, ' ')} (${a.serialNumber})`,
                      warehouseId: a.warehouseId,
                      companyId: a.assignedCompanyId,
                      soldierId: a.assignedSoldierId
                    })}
                    className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 rounded text-[10px] font-bold transition flex items-center gap-1"
                  >
                    <span>🚚</span>
                    <span>Mover</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
        {filteredArmors.length === 0 && (
          <div className="col-span-full p-8 text-center bg-slate-900/40 border border-slate-800 rounded-xl text-slate-500">
            No se encontraron chalecos o cascos con los criterios indicados.
          </div>
        )}
      </div>
    </div>
  );
};
