import React, { useState, useEffect } from 'react';
import { MilitaryWarehouse } from '../types';

interface NavbarSILOGProps {
  selectedWarehouse: MilitaryWarehouse;
  warehouses: MilitaryWarehouse[];
  onSelectWarehouse: (wh: MilitaryWarehouse) => void;
  activeTab: string;
  onSelectTab: (tab: any) => void;
}

export const NavbarSILOG: React.FC<NavbarSILOGProps> = ({
  selectedWarehouse,
  warehouses,
  onSelectWarehouse,
  activeTab,
  onSelectTab
}) => {
  const [zuluTime, setZuluTime] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setZuluTime(now.toISOString().replace('T', ' ').substring(0, 19) + 'Z');
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="bg-slate-950/95 border-b border-amber-500/30 sticky top-0 z-50 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-4">
        {/* Identidad Institucional */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-600 to-amber-900 border border-amber-400/50 flex items-center justify-center text-xl shadow-lg shadow-amber-950/50">
            📦
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-black tracking-wider text-white">SILOG</h1>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
                S-4 / JELOG MILITAR
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 font-bold border border-blue-500/30">
                M2M SIGEP & SIMCOP
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Sistema Integrado de Logística Operacional y Gestión de Almacenes
            </p>
          </div>
        </div>

        {/* Selector de Almacén y Reloj ZULU */}
        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <span className="text-[10px] text-slate-500 font-mono block">TIEMPO MILITAR ZULU</span>
            <span className="text-xs font-mono font-bold text-amber-400">{zuluTime}</span>
          </div>

          <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-xl p-1 px-2.5">
            <span className="text-xs text-slate-400">🏢 Almacén:</span>
            <select
              value={selectedWarehouse.id}
              onChange={(e) => {
                const wh = warehouses.find(w => w.id === e.target.value);
                if (wh) onSelectWarehouse(wh);
              }}
              className="bg-transparent text-amber-300 font-bold text-xs focus:outline-none cursor-pointer"
            >
              {warehouses.map(wh => (
                <option key={wh.id} value={wh.id} className="bg-slate-950 text-slate-200">
                  {wh.name} ({wh.municipality})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Barra de Pestañas de las 6 Clases Doctrinales */}
      <div className="max-w-7xl mx-auto px-4 flex items-center gap-1 overflow-x-auto border-t border-slate-900/80">
        {[
          { id: 'PANORAMA', label: '📊 Panorama General', icon: '⚡' },
          { id: 'ALMACENES', label: '🏢 Almacenes & BASPC', icon: '🏛️' },
          { id: 'CLASE_V', label: '🔫 Armamento (Clase V)', icon: '🎯' },
          { id: 'CLASE_II', label: '🛡️ Intendencia (Clase II)', icon: '🦺' },
          { id: 'CLASE_I', label: '🍞 Alimentación (Clase I)', icon: '🍱' },
          { id: 'CLASE_VIII', label: '🩹 Sanidad (Clase VIII)', icon: '🩺' },
          { id: 'COMUNICACIONES', label: '📻 Comunicaciones (S-6)', icon: '📡' },
          { id: 'ESPECIAL', label: '👁️ Optoelectrónica & UAV', icon: '🔭' },
          { id: 'KARDEX_PERSONAL', label: '👥 Kárdex Soldado (SIGEP)', icon: '🪪' },
          { id: 'PODER_FUEGO', label: '💥 Poder de Fuego (SIMCOP)', icon: '🔥' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => onSelectTab(tab.id)}
            className={`py-2.5 px-3 text-xs font-bold border-b-2 transition whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === tab.id
                ? 'border-amber-400 text-amber-300 bg-amber-950/20'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
            }`}
          >
            <span>{tab.icon}</span> {tab.label}
          </button>
        ))}
      </div>
    </header>
  );
};
