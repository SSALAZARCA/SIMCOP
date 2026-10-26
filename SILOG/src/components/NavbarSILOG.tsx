import React, { useState, useEffect } from 'react';
import { MilitaryWarehouse, SilogUser } from '../types';
import { silogAuthService } from '../services/silogAuthService';

interface NavbarSILOGProps {
  selectedWarehouse: MilitaryWarehouse;
  warehouses: MilitaryWarehouse[];
  onSelectWarehouse: (wh: MilitaryWarehouse) => void;
  activeTab: string;
  onSelectTab: (tab: any) => void;
  currentUser: SilogUser;
  onLogout: () => void;
  onOpenAddMaterial: () => void;
}

export const NavbarSILOG: React.FC<NavbarSILOGProps> = ({
  selectedWarehouse,
  warehouses,
  onSelectWarehouse,
  activeTab,
  onSelectTab,
  currentUser,
  onLogout,
  onOpenAddMaterial
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

  const allTabs = [
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
  ];

  const visibleTabs = allTabs.filter(tab => 
    silogAuthService.hasTabPermission(currentUser.role, tab.id)
  );

  return (
    <header className="bg-slate-950/95 border-b border-amber-500/30 sticky top-0 z-50 backdrop-blur-md">
      <div className="w-full max-w-[1920px] mx-auto px-4 md:px-6 py-3 flex flex-wrap items-center justify-between gap-4">
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

        {/* Acciones Rápidas: Botón de Alta de Material + Almacén + Usuario */}
        <div className="flex items-center gap-3">
          
          {/* Botón Principal de Ingreso de Material */}
          <button
            onClick={onOpenAddMaterial}
            className="px-3.5 py-2 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-amber-950/50 transition-all active:scale-95 flex items-center gap-2 border border-amber-400/60"
            title="Registrar nueva entrada de armamento, munición, intendencia o raciones"
          >
            <span className="text-sm">➕</span>
            <span className="whitespace-nowrap">Ingresar Material</span>
          </button>

          <div className="text-right hidden xl:block">
            <span className="text-[10px] text-slate-500 font-mono block">TIEMPO MILITAR ZULU</span>
            <span className="text-xs font-mono font-bold text-amber-400">{zuluTime}</span>
          </div>

          <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-xl p-1.5 px-3">
            <span className="text-xs text-slate-400 font-bold">🏢 Almacén:</span>
            <select
              value={selectedWarehouse.id}
              onChange={(e) => {
                const wh = warehouses.find(w => w.id === e.target.value);
                if (wh) onSelectWarehouse(wh);
              }}
              className="bg-transparent text-amber-300 font-bold text-xs focus:outline-none cursor-pointer max-w-[200px] truncate"
            >
              {warehouses.map(wh => (
                <option key={wh.id} value={wh.id} className="bg-slate-950 text-slate-200">
                  {wh.name} ({wh.municipality})
                </option>
              ))}
            </select>
          </div>

          {/* Insignia de Usuario Logístico Autenticado */}
          <div className="flex items-center gap-2 bg-slate-900/90 border border-slate-800 rounded-xl p-1.5 px-3">
            <div className="w-7 h-7 rounded-lg bg-amber-600/30 border border-amber-500/40 flex items-center justify-center text-xs font-black text-amber-300">
              {currentUser.rank}
            </div>
            <div className="text-left hidden lg:block">
              <span className="text-xs font-bold text-white block leading-tight">
                {currentUser.fullName}
              </span>
              <span className="text-[9px] font-mono text-amber-400 block leading-tight">
                {currentUser.roleTitle} • {currentUser.securityClearance}
              </span>
            </div>
            <button
              onClick={onLogout}
              className="ml-2 p-1 px-2 bg-red-950/60 hover:bg-red-800/80 border border-red-500/40 text-red-300 hover:text-white rounded-lg text-[10px] font-bold transition flex items-center gap-1"
              title="Cerrar sesión de SILOG"
            >
              <span>🚪</span>
              <span className="hidden sm:inline">Salir</span>
            </button>
          </div>
        </div>
      </div>

      {/* Barra de Pestañas de las Clases Doctrinales (Filtradas por Rol) */}
      <div className="w-full max-w-[1920px] mx-auto px-4 md:px-6 flex items-center gap-1 overflow-x-auto border-t border-slate-900/80">
        {visibleTabs.map(tab => (
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
