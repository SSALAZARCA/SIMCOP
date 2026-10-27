import React, { useState } from 'react';
import { MilitaryWarehouse } from '../types';
import { silogService } from '../services/silogService';

interface AlmacenesHierarchyViewProps {
  warehouses: MilitaryWarehouse[];
  selectedWarehouse: MilitaryWarehouse;
  onSelectWarehouse: (wh: MilitaryWarehouse) => void;
  onOpenAddMaterial?: (warehouseId: string) => void;
}

export const AlmacenesHierarchyView: React.FC<AlmacenesHierarchyViewProps> = ({
  warehouses,
  selectedWarehouse,
  onSelectWarehouse,
  onOpenAddMaterial
}) => {
  const [selectedBrigadeFilter, setSelectedBrigadeFilter] = useState<string>('ALL');

  // Derivar dinámicamente las Brigadas u Órganos Superiores reales de los almacenes
  const uniqueBrigades = Array.from(
    new Set(warehouses.map(w => w.brigadeId).filter((b): b is string => Boolean(b)))
  ).map(bId => {
    const parentWh = warehouses.find(w => w.unitId === bId || w.brigadeId === bId);
    return {
      id: bId,
      name: parentWh?.unitName || `Unidad ${bId}`
    };
  });

  const brigades = [
    { id: 'ALL', name: 'Todas las Unidades Orgánicas' },
    ...uniqueBrigades
  ];

  const filteredWarehouses = warehouses.filter(wh => {
    if (selectedBrigadeFilter === 'ALL') return true;
    return wh.brigadeId === selectedBrigadeFilter;
  });

  return (
    <div className="space-y-6 w-full">
      {/* Encabezado Doctrinal */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-black text-amber-300 uppercase tracking-wider flex items-center gap-2 mb-1">
            <span>🏛️</span> Cadena de Suministro Militar según Estructura de Fuerza
          </h2>
          <p className="text-xs text-slate-400">
            Escalonamiento de abastecimientos desde el Almacén General Centralizador (BASPC de Brigada) hacia los depósitos tácticos de los Batallones de maniobra y armerillos de bases avanzadas.
          </p>
        </div>

        {/* Filtro por Brigada */}
        <div className="flex items-center gap-2 bg-slate-950 p-1 rounded-xl border border-slate-800">
          <span className="text-xs text-slate-400 font-bold px-2">Brigada:</span>
          {brigades.map(b => (
            <button
              key={b.id}
              onClick={() => setSelectedBrigadeFilter(b.id)}
              className={`text-xs px-3 py-1.5 rounded-lg font-bold transition ${
                selectedBrigadeFilter === b.id
                  ? 'bg-amber-600 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {b.name}
            </button>
          ))}
        </div>
      </div>

      {/* Grid de Almacenes */}
      {filteredWarehouses.length === 0 ? (
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-12 text-center space-y-4">
          <div className="w-16 h-16 mx-auto rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-3xl">
            🏛️
          </div>
          <h3 className="text-sm font-black uppercase text-amber-300 tracking-wider">
            Sincronización con Estructura de Fuerza SIMCOP
          </h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
            No se han registrado unidades u almacenes para este filtro. Las unidades operacionales creadas en SIMCOP (Brigadas, Batallones y Compañías) se reflejan automáticamente como depósitos y armerillos oficiales de SILOGA.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filteredWarehouses.map(wh => {
          const isSelected = wh.id === selectedWarehouse.id;
          
          // Métricas en tiempo real de este almacén
          const wWeapons = silogService.getWeapons(wh.id);
          const wAmmo = silogService.getAmmoLots(wh.id);
          const wArmors = silogService.getArmors(wh.id);
          const wRations = silogService.getRations(wh.id);
          const wComms = silogService.getComms(wh.id);
          const totalAmmoRounds = wAmmo.reduce((a, c) => a + c.quantityRounds, 0);
          const totalRations = wRations.reduce((a, c) => a + c.quantityOnHand, 0);

          return (
            <div
              key={wh.id}
              className={`p-5 rounded-2xl border transition relative overflow-hidden flex flex-col justify-between ${
                isSelected 
                  ? 'bg-amber-950/25 border-amber-500 shadow-xl shadow-amber-950/40 ring-1 ring-amber-500/50' 
                  : 'bg-slate-900/80 border-slate-800 hover:border-slate-700 hover:bg-slate-900'
              }`}
            >
              <div className="space-y-3.5">
                <div className="flex items-center justify-between">
                  <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full ${
                    wh.type === 'BASPC_CENTRAL' 
                      ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40' 
                      : wh.type === 'BATALLON_DEPOSITO'
                      ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                      : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  }`}>
                    {wh.type === 'BASPC_CENTRAL' ? '⭐ BASPC CENTRAL' : wh.type === 'BATALLON_DEPOSITO' ? '📦 DEPÓSITO BATALLÓN' : '🏕️ BASE DE PATRULLA'}
                  </span>
                  <span className="text-[10px] font-mono text-slate-400 font-bold bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                    {wh.brigadeId || 'BRIGADA'}
                  </span>
                </div>

                <div>
                  <h3 className="text-sm font-black text-white leading-tight">{wh.name}</h3>
                  <p className="text-xs text-amber-400 font-semibold mt-0.5">{wh.unitName}</p>
                </div>

                {/* Métricas rápidas de inventario */}
                <div className="grid grid-cols-3 gap-2 bg-slate-950/80 p-2.5 rounded-xl border border-slate-800/80 text-center font-mono">
                  <div>
                    <span className="text-[9px] text-slate-500 block">ARMAS</span>
                    <span className="text-xs font-bold text-amber-300">{wWeapons.length}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-500 block">TIROS</span>
                    <span className="text-xs font-bold text-white">{(totalAmmoRounds / 1000).toFixed(0)}k</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-500 block">RACIONES</span>
                    <span className="text-xs font-bold text-emerald-300">{totalRations}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-500 block">BLINDAJE</span>
                    <span className="text-xs font-bold text-slate-300">{wArmors.length}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-500 block">RADIOS</span>
                    <span className="text-xs font-bold text-cyan-300">{wComms.length}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-500 block">SEGURIDAD</span>
                    <span className="text-xs font-bold text-emerald-400">MAX</span>
                  </div>
                </div>

                <div className="text-xs text-slate-300 space-y-1 bg-slate-950/40 p-2.5 rounded-xl border border-slate-800/60">
                  <p>📍 <strong>Jurisdicción:</strong> {wh.municipality}, {wh.department}</p>
                  <p>👮 <strong>Comandante:</strong> {wh.commanderInCharge}</p>
                  <p>🔑 <strong>Almacenista:</strong> {wh.storekeeperName}</p>
                </div>
              </div>

              {/* Botonera de Acción */}
              <div className="mt-4 pt-3 border-t border-slate-800/80 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <button
                    onClick={() => onSelectWarehouse(wh)}
                    className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                      isSelected
                        ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-950/40'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white'
                    }`}
                  >
                    <span>{isSelected ? '✓ Activo en Consola' : 'Ver Inventario'}</span>
                  </button>

                  {onOpenAddMaterial && (
                    <button
                      onClick={() => onOpenAddMaterial(wh.id)}
                      className="py-1.5 px-3 bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/40 rounded-xl text-xs font-bold transition flex items-center gap-1"
                      title="Ingresar material directamente a este almacén"
                    >
                      <span>➕</span>
                      <span>Alta</span>
                    </button>
                  )}
                </div>

                <div className="flex items-center justify-between text-[10px] text-slate-500">
                  <span>Coordenadas:</span>
                  <span className="font-mono text-slate-400">[{wh.location.lat}°, {wh.location.lon}°]</span>
                </div>
              </div>
            </div>
          );
        })}
        </div>
      )}
    </div>
  );
};
