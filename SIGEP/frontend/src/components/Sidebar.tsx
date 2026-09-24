import React from 'react';
import { useAuth } from '../AuthContext';
import { useUnit } from '../UnitContext';
import type { NavigationTab } from '../types/sigep';
import {
  LayoutDashboard,
  AlertTriangle,
  FileBarChart,
  Search,
  ArrowRightLeft,
  Settings,
  LogOut,
  Building2,
  ChevronRight,
  UploadCloud
} from 'lucide-react';

interface SidebarProps {
  activeTab: NavigationTab;
  setActiveTab: (tab: NavigationTab) => void;
  isMobileDrawerOpen: boolean;
  setIsMobileDrawerOpen: (open: boolean) => void;
  pendingTransfersCount?: number;
  criticalAlertsCount?: number;
}

export function Sidebar({
  activeTab,
  setActiveTab,
  isMobileDrawerOpen,
  setIsMobileDrawerOpen,
  pendingTransfersCount = 2,
  criticalAlertsCount = 1
}: SidebarProps) {
  const { user, logout } = useAuth();
  const { selectedUnit } = useUnit();

  const handleSelectTab = (tab: NavigationTab) => {
    setActiveTab(tab);
    setIsMobileDrawerOpen(false);
  };

  const isAuthorizedForConfig = 
    user?.role === 'ROLE_EJERCITO' || 
    user?.role === 'ROLE_ADMINISTRATOR' || 
    user?.role?.includes('ROLE_COMANDANTE_');

  return (
    <>
      {/* 1. Mobile Backdrop Overlay */}
      {isMobileDrawerOpen && (
        <div
          role="button"
          tabIndex={0}
          aria-label="Cerrar menú lateral"
          onClick={() => setIsMobileDrawerOpen(false)}
          onKeyDown={(e) => {
            if (e.key === 'Escape' || e.key === 'Enter') setIsMobileDrawerOpen(false);
          }}
          className="fixed inset-0 bg-black/75 backdrop-blur-sm z-40 md:hidden transition-opacity duration-300"
        />
      )}

      {/* 2. Responsive Sidebar Drawer */}
      <aside
        className={`fixed md:static inset-y-0 left-0 z-50 w-72 lg:w-76 flex flex-col bg-[#0d1117]/98 border-r border-slate-800/80 shadow-2xl md:shadow-none transition-transform duration-300 ease-in-out md:translate-x-0 ${
          isMobileDrawerOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Unit HUD Header in Sidebar */}
        <div className="p-4 border-b border-slate-800/80 bg-slate-950/40">
          <div className="flex items-center gap-2 text-cyan-400 mb-1">
            <Building2 size={16} />
            <span className="text-[11px] font-mono uppercase tracking-wider font-semibold">
              Jurisdicción Activa
            </span>
          </div>
          <h2 className="text-sm font-bold text-gray-100 truncate" title={selectedUnit?.name || 'Unidad Militar'}>
            {selectedUnit?.name || 'Unidad Militar'}
          </h2>
          <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 mt-1.5">
            <span className="px-1.5 py-0.5 rounded bg-slate-800 text-cyan-300 border border-slate-700">
              ID: {selectedUnit?.id || 'GLOBAL'}
            </span>
            <span className="text-slate-400">
              {selectedUnit?.status || 'OPERACIONAL'}
            </span>
          </div>
        </div>

        {/* Navigation Sections */}
        <nav className="flex-1 py-3 px-2 flex flex-col gap-1 overflow-y-auto custom-scrollbar">
          
          {/* Section 1: Operaciones J1/G1/S1 */}
          <div className="px-3 pt-2 pb-1 text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono">
            Operaciones J1/G1/S1
          </div>

          <button
            type="button"
            onClick={() => handleSelectTab('analisis')}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-all group ${
              activeTab === 'analisis'
                ? 'bg-cyan-500/15 text-cyan-300 border-l-2 border-cyan-400 shadow-[inset_0_0_12px_rgba(34,211,238,0.1)]'
                : 'text-slate-400 hover:text-gray-200 hover:bg-slate-800/60 border-l-2 border-transparent'
            }`}
          >
            <div className="flex items-center gap-3">
              <LayoutDashboard size={18} className={activeTab === 'analisis' ? 'text-cyan-400' : 'text-slate-400 group-hover:text-cyan-400'} />
              <span>Módulo de Análisis</span>
            </div>
            <ChevronRight size={14} className={`opacity-0 group-hover:opacity-100 transition-opacity ${activeTab === 'analisis' ? 'opacity-100 text-cyan-400' : 'text-slate-500'}`} />
          </button>

          <button
            type="button"
            onClick={() => handleSelectTab('recomendaciones')}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-all group ${
              activeTab === 'recomendaciones'
                ? 'bg-cyan-500/15 text-cyan-300 border-l-2 border-cyan-400 shadow-[inset_0_0_12px_rgba(34,211,238,0.1)]'
                : 'text-slate-400 hover:text-gray-200 hover:bg-slate-800/60 border-l-2 border-transparent'
            }`}
          >
            <div className="flex items-center gap-3">
              <AlertTriangle size={18} className={activeTab === 'recomendaciones' ? 'text-cyan-400' : 'text-slate-400 group-hover:text-cyan-400'} />
              <span>Recomendaciones IA</span>
            </div>
            {criticalAlertsCount > 0 ? (
              <span className="px-1.5 py-0.5 text-[10px] font-mono font-bold rounded-full bg-cyan-950 text-cyan-300 border border-cyan-500/50 shadow-sm animate-pulse">
                AI
              </span>
            ) : (
              <ChevronRight size={14} className="opacity-0 group-hover:opacity-100 text-slate-500" />
            )}
          </button>

          <button
            type="button"
            onClick={() => handleSelectTab('informes')}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-all group ${
              activeTab === 'informes'
                ? 'bg-cyan-500/15 text-cyan-300 border-l-2 border-cyan-400 shadow-[inset_0_0_12px_rgba(34,211,238,0.1)]'
                : 'text-slate-400 hover:text-gray-200 hover:bg-slate-800/60 border-l-2 border-transparent'
            }`}
          >
            <div className="flex items-center gap-3">
              <FileBarChart size={18} className={activeTab === 'informes' ? 'text-cyan-400' : 'text-slate-400 group-hover:text-cyan-400'} />
              <span>Informes y Parte Diario</span>
            </div>
            <ChevronRight size={14} className={`opacity-0 group-hover:opacity-100 transition-opacity ${activeTab === 'informes' ? 'opacity-100 text-cyan-400' : 'text-slate-500'}`} />
          </button>

          <button
            type="button"
            onClick={() => handleSelectTab('consulta-personal')}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-all group ${
              activeTab === 'consulta-personal'
                ? 'bg-cyan-500/15 text-cyan-300 border-l-2 border-cyan-400 shadow-[inset_0_0_12px_rgba(34,211,238,0.1)]'
                : 'text-slate-400 hover:text-gray-200 hover:bg-slate-800/60 border-l-2 border-transparent'
            }`}
          >
            <div className="flex items-center gap-3">
              <Search size={18} className={activeTab === 'consulta-personal' ? 'text-cyan-400' : 'text-slate-400 group-hover:text-cyan-400'} />
              <span>Expediente Militar (360°)</span>
            </div>
            <ChevronRight size={14} className={`opacity-0 group-hover:opacity-100 transition-opacity ${activeTab === 'consulta-personal' ? 'opacity-100 text-cyan-400' : 'text-slate-500'}`} />
          </button>

          <button
            type="button"
            onClick={() => handleSelectTab('carga-masiva')}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-all group ${
              activeTab === 'carga-masiva'
                ? 'bg-cyan-500/20 text-cyan-300 border-l-2 border-cyan-400 shadow-[inset_0_0_12px_rgba(34,211,238,0.15)] ring-1 ring-cyan-500/30'
                : 'text-slate-400 hover:text-cyan-300 hover:bg-slate-800/60 border-l-2 border-transparent'
            }`}
          >
            <div className="flex items-center gap-3">
              <UploadCloud size={18} className={activeTab === 'carga-masiva' ? 'text-cyan-400' : 'text-slate-400 group-hover:text-cyan-400'} />
              <div className="flex flex-col text-left">
                <span className="font-semibold text-slate-100">Carga Masiva Personal</span>
                <span className="text-[10px] text-cyan-400/80 font-mono">Excel • CSV • Listas</span>
              </div>
            </div>
            <span className="px-1.5 py-0.5 text-[9px] font-mono font-bold rounded bg-cyan-950 text-cyan-300 border border-cyan-500/50 shadow-sm">
              IMPORTAR
            </span>
          </button>

          {/* Section 2: Workflow de Movilidad & Traslados (Unified Console) */}
          <div className="px-3 pt-4 pb-1 text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono">
            Workflow de Movilidad
          </div>

          <button
            type="button"
            onClick={() => handleSelectTab('traslados')}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-all group ${
              activeTab === 'traslados' || activeTab === 'oficiales' || activeTab === 'suboficiales' || activeTab === 'soldados'
                ? 'bg-cyan-500/15 text-cyan-300 border-l-2 border-cyan-400 shadow-[inset_0_0_12px_rgba(34,211,238,0.1)]'
                : 'text-slate-400 hover:text-gray-200 hover:bg-slate-800/60 border-l-2 border-transparent'
            }`}
          >
            <div className="flex items-center gap-3">
              <ArrowRightLeft size={18} className={activeTab === 'traslados' ? 'text-cyan-400' : 'text-slate-400 group-hover:text-cyan-400'} />
              <div className="flex flex-col text-left">
                <span>Consola de Traslados</span>
                <span className="text-[10px] text-slate-500 font-mono">Ofic • Subofic • Sold</span>
              </div>
            </div>
            {pendingTransfersCount > 0 ? (
              <span className="px-2 py-0.5 text-[10px] font-mono font-bold rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm animate-pulse">
                {pendingTransfersCount}
              </span>
            ) : (
              <ChevronRight size={14} className="opacity-0 group-hover:opacity-100 text-slate-500" />
            )}
          </button>

          {/* Section 3: Administración y Parámetros Doctrinales */}
          {isAuthorizedForConfig && (
            <>
              <div className="px-3 pt-4 pb-1 text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono mt-auto">
                Sistema
              </div>

              <button
                type="button"
                onClick={() => handleSelectTab('configuracion')}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-all group ${
                  activeTab === 'configuracion'
                    ? 'bg-cyan-500/15 text-cyan-300 border-l-2 border-cyan-400 shadow-[inset_0_0_12px_rgba(34,211,238,0.1)]'
                    : 'text-slate-400 hover:text-gray-200 hover:bg-slate-800/60 border-l-2 border-transparent'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Settings size={18} className={activeTab === 'configuracion' ? 'text-cyan-400' : 'text-slate-400 group-hover:text-cyan-400'} />
                  <span>Configuración Doctrinal</span>
                </div>
                <ChevronRight size={14} className={`opacity-0 group-hover:opacity-100 transition-opacity ${activeTab === 'configuracion' ? 'opacity-100 text-cyan-400' : 'text-slate-500'}`} />
              </button>
            </>
          )}

        </nav>

        {/* Sidebar Footer */}
        <div className="p-3 border-t border-slate-800/80 bg-slate-950/40 flex flex-col gap-2">
          <button
            type="button"
            onClick={logout}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/30 transition-all focus:outline-none"
          >
            <LogOut size={16} />
            <span>Cerrar Sesión</span>
          </button>
          
          <div className="px-2 pt-1 flex items-center justify-between text-[10px] font-mono text-slate-500">
            <span>SIGEP Táctico v4.2.0</span>
            <span className="text-emerald-500 font-bold">C2 M2M</span>
          </div>
        </div>

      </aside>
    </>
  );
}

export default Sidebar;
