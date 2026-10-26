import React from 'react';
import { MilitaryWarehouse } from '../types';

interface AlmacenesHierarchyViewProps {
  warehouses: MilitaryWarehouse[];
  selectedWarehouse: MilitaryWarehouse;
  onSelectWarehouse: (wh: MilitaryWarehouse) => void;
}

export const AlmacenesHierarchyView: React.FC<AlmacenesHierarchyViewProps> = ({
  warehouses,
  selectedWarehouse,
  onSelectWarehouse
}) => {
  return (
    <div className="space-y-6">
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5">
        <h2 className="text-base font-black text-amber-300 uppercase tracking-wider flex items-center gap-2 mb-2">
          <span>🏛️</span> Cadena de Suministro Militar según Estructura de Fuerza
        </h2>
        <p className="text-xs text-slate-400">
          Escalonamiento de abastecimientos desde el Almacén General Centralizador (BASPC de Brigada) hacia los depósitos tácticos de los Batallones de maniobra y armerillos de bases avanzadas.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {warehouses.map(wh => {
          const isSelected = wh.id === selectedWarehouse.id;
          return (
            <div
              key={wh.id}
              onClick={() => onSelectWarehouse(wh)}
              className={`p-5 rounded-2xl border transition cursor-pointer relative overflow-hidden flex flex-col justify-between ${
                isSelected 
                  ? 'bg-amber-950/30 border-amber-500 shadow-xl shadow-amber-950/40 ring-1 ring-amber-500/50' 
                  : 'bg-slate-900/80 border-slate-800 hover:border-slate-700 hover:bg-slate-900'
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                    wh.type === 'BASPC_CENTRAL' 
                      ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40' 
                      : wh.type === 'BATALLON_DEPOSITO'
                      ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                      : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  }`}>
                    {wh.type === 'BASPC_CENTRAL' ? '⭐ CENTRALIZADOR BASPC' : wh.type === 'BATALLON_DEPOSITO' ? '📦 DEPÓSITO BATALLÓN' : '🏕️ BASE DE PATRULLA'}
                  </span>
                  <span className="text-[10px] font-mono text-slate-500">
                    ID: {wh.id}
                  </span>
                </div>

                <div>
                  <h3 className="text-sm font-bold text-white">{wh.name}</h3>
                  <p className="text-xs text-amber-400 font-semibold mt-0.5">{wh.unitName}</p>
                </div>

                <div className="text-xs text-slate-300 space-y-1 bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
                  <p>📍 <strong>Jurisdicción:</strong> {wh.municipality}, {wh.department}</p>
                  <p>👮 <strong>Comandante:</strong> {wh.commanderInCharge}</p>
                  <p>🔑 <strong>Almacenista/Armero:</strong> {wh.storekeeperName}</p>
                  <p>🛡️ <strong>Seguridad:</strong> <span className="text-emerald-400 font-bold">{wh.securityLevel}</span></p>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between">
                <span className="text-[11px] text-slate-400">
                  Coordenadas: <strong className="text-slate-300 font-mono">[{wh.location.lat}°, {wh.location.lon}°]</strong>
                </span>
                <span className={`text-xs font-bold ${isSelected ? 'text-amber-400' : 'text-slate-500'}`}>
                  {isSelected ? '✓ Seleccionado' : 'Seleccionar →'}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
