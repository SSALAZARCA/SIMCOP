import React, { useState } from 'react';
import { BallisticArmorItem } from '../types';

interface IntendenciaClaseIIProps {
  armors: BallisticArmorItem[];
  onOpenAddMaterial?: (preselectedClass: string) => void;
}

export const IntendenciaClaseII: React.FC<IntendenciaClaseIIProps> = ({ 
  armors,
  onOpenAddMaterial 
}) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

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

        {onOpenAddMaterial && (
          <button
            onClick={() => onOpenAddMaterial('CLASE_II')}
            className="px-4 py-2 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl shadow-md transition flex items-center gap-1.5"
          >
            <span>➕</span>
            <span>Registrar Chaleco / Casco</span>
          </button>
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
          <span className="text-2xl font-black text-cyan-400 font-mono">{totalVests}</span>
          <p className="text-xs font-bold text-slate-300 mt-0.5">Chalecos Nivel IV</p>
          <p className="text-[10px] text-slate-500">Con placas cerámicas</p>
        </div>
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 text-center">
          <span className="text-2xl font-black text-emerald-400 font-mono">{totalHelmets}</span>
          <p className="text-xs font-bold text-slate-300 mt-0.5">Cascos Kevlar</p>
          <p className="text-[10px] text-slate-500">MICH reglamentarios</p>
        </div>
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 text-center">
          <span className={`text-2xl font-black font-mono ${expiredCount > 0 ? 'text-red-400 animate-pulse' : 'text-emerald-400'}`}>
            {expiredCount}
          </span>
          <p className="text-xs font-bold text-slate-300 mt-0.5">Caducidad Balística</p>
          <p className="text-[10px] text-slate-500">Requieren reemplazo</p>
        </div>
      </div>

      {/* Barra de Filtros y Búsqueda */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/80 border border-slate-800 p-3 rounded-xl">
        <div className="flex-1 min-w-[240px] max-w-md">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="🔍 Buscar serial de chaleco o placa cerámica..."
            className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl p-2 px-3 text-xs text-white focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto">
          {['ALL', 'VIGENTE', 'VENCIDO', 'DISPONIBLE', 'ASIGNADO'].map(f => (
            <button
              key={f}
              onClick={() => setStatusFilter(f)}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition whitespace-nowrap ${
                statusFilter === f 
                  ? 'bg-amber-500 text-slate-950 font-black shadow-md' 
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {f === 'ALL' ? 'Todos' : f}
            </button>
          ))}
        </div>
      </div>

      {/* Grid de Tarjetas Full Width */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3.5">
        {filteredArmors.map(a => {
          const isExpired = new Date(a.expirationDate).getTime() < Date.now();
          return (
            <div key={a.id} className="bg-slate-900/80 border border-slate-800 hover:border-amber-500/40 rounded-xl p-4 space-y-3 transition">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-white">{a.armorType.replace(/_/g, ' ')}</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                  isExpired ? 'bg-red-500/20 text-red-300 border border-red-500/30' : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                }`}>
                  {isExpired ? '⚠️ VENCIDO' : 'VIGENTE'}
                </span>
              </div>

              <div className="space-y-1.5 text-xs text-slate-300 bg-slate-950/60 p-3 rounded-lg border border-slate-800">
                <p>🔢 <strong>Serial:</strong> <span className="font-mono text-amber-300 font-bold">{a.serialNumber}</span></p>
                <p>📏 <strong>Talla:</strong> {a.size}</p>
                {a.frontPlateSerial && (
                  <p>🛡️ <strong>Placa Frontal:</strong> <span className="font-mono text-cyan-300">{a.frontPlateSerial}</span></p>
                )}
                {a.rearPlateSerial && (
                  <p>🛡️ <strong>Placa Dorsal:</strong> <span className="font-mono text-cyan-300">{a.rearPlateSerial}</span></p>
                )}
                <p>⏳ <strong>Vence:</strong> <span className="font-mono text-slate-400">{a.expirationDate}</span></p>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-[11px]">
                <span className="text-slate-400">Custodia:</span>
                <span className="font-mono font-bold text-blue-300">
                  {a.assignedSoldierId ? `Asignado (${a.assignedSoldierId})` : 'En Depósito'}
                </span>
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
