import React from 'react';
import { useAuth } from '../AuthContext';
import { useUnit } from '../UnitContext';
import { useTacticalClocks } from '../hooks/useTacticalClocks';
import { 
  Shield, 
  Menu, 
  X, 
  LogOut, 
  Radio, 
  Clock, 
  ChevronDown, 
  User as UserIcon,
  RefreshCw,
  UploadCloud
} from 'lucide-react';

interface TacticalNavbarProps {
  onToggleMobileDrawer?: () => void;
  isMobileDrawerOpen?: boolean;
  onOpenCargaMasiva?: () => void;
}

export function TacticalNavbar({ onToggleMobileDrawer, isMobileDrawerOpen, onOpenCargaMasiva }: TacticalNavbarProps) {
  const { user, logout } = useAuth();
  const { 
    accessibleUnits, 
    selectedUnitId, 
    setSelectedUnitId, 
    m2mStatus, 
    refreshUnits, 
    isLoading 
  } = useUnit();
  const clocks = useTacticalClocks();

  // Helper to format role nicely for tactical HUD
  const formatTacticalRole = (role?: string) => {
    if (!role) return 'OPERADOR';
    switch (role) {
      case 'ROLE_ADMINISTRATOR': return 'SUPERADMIN';
      case 'ROLE_EJERCITO': return 'COMANDO EJÉRCITO';
      case 'ROLE_COMANDANTE_EJERCITO': return 'CDTE. EJÉRCITO';
      case 'ROLE_COMANDANTE_DIVISION': return 'CDTE. DIVISIÓN';
      case 'ROLE_COMANDANTE_BRIGADA': return 'CDTE. BRIGADA';
      case 'ROLE_COMANDANTE_BATALLON': return 'CDTE. BATALLÓN';
      case 'ROLE_OFICIAL_G1': return 'OFICIAL G1';
      case 'ROLE_OFICIAL_S1': return 'OFICIAL S1';
      default: return role.replace('ROLE_', '');
    }
  };

  return (
    <header className="sticky top-0 z-40 h-16 w-full bg-[#0d1117]/95 backdrop-blur-md border-b border-slate-800/80 px-3 sm:px-4 lg:px-6 flex items-center justify-between shadow-lg">
      
      {/* 1. Mobile Menu Toggle & Tactical Brand */}
      <div className="flex items-center gap-3">
        {onToggleMobileDrawer && (
          <button
            type="button"
            onClick={onToggleMobileDrawer}
            aria-label={isMobileDrawerOpen ? 'Cerrar menú lateral' : 'Abrir menú lateral'}
            className="md:hidden p-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800/80 transition-colors focus:outline-none focus:ring-1 focus:ring-cyan-500"
          >
            {isMobileDrawerOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        )}

        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-cyan-950/80 border border-cyan-500/40 text-cyan-400 shadow-[0_0_12px_rgba(34,211,238,0.25)]">
            <Shield size={18} className="drop-shadow" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="font-['Orbitron',sans-serif] font-black tracking-widest text-lg text-gray-100">
                SIGEP
              </span>
              <span className="px-1.5 py-0.5 text-[10px] font-mono font-bold text-cyan-400 bg-cyan-950/60 border border-cyan-500/40 rounded tracking-wider shadow-sm animate-pulse">
                LIVE
              </span>
            </div>
            <span className="hidden xl:block text-[9px] uppercase tracking-wider text-slate-400 font-mono leading-none">
              Mando & Control de Personal
            </span>
          </div>
        </div>
      </div>

      {/* 2. Central Tactical Controls: Live M2M Badge & Unit Selector */}
      <div className="flex items-center gap-2 sm:gap-3 lg:gap-4">
        
        {/* M2M Link Status Badge */}
        <div 
          onClick={() => refreshUnits()}
          title="Haga clic para forzar verificación de enlace M2M con SIMCOP"
          className={`cursor-pointer transition-all duration-200 flex items-center px-2.5 py-1 rounded-full text-[11px] font-mono font-semibold tracking-wide border shadow-sm ${
            m2mStatus === 'CONNECTED'
              ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-400 hover:bg-emerald-900/40'
              : m2mStatus === 'CHECKING'
              ? 'bg-amber-950/40 border-amber-500/40 text-amber-400 hover:bg-amber-900/40'
              : 'bg-rose-950/40 border-rose-500/40 text-rose-400 hover:bg-rose-900/40'
          }`}
        >
          {m2mStatus === 'CONNECTED' ? (
            <span className="relative flex h-2 w-2 mr-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
          ) : m2mStatus === 'CHECKING' ? (
            <RefreshCw size={12} className={`mr-1.5 text-amber-400 ${isLoading ? 'animate-spin' : ''}`} />
          ) : (
            <Radio size={12} className="mr-1.5 text-rose-400" />
          )}

          <span className="hidden sm:inline">
            {m2mStatus === 'CONNECTED' 
              ? 'M2M SIMCOP: EN LÍNEA' 
              : m2mStatus === 'CHECKING' 
              ? 'M2M: VERIFICANDO...' 
              : 'M2M: DESCONECTADO (AIR-GAP)'}
          </span>
          <span className="sm:hidden">
            {m2mStatus === 'CONNECTED' ? 'M2M OK' : m2mStatus === 'CHECKING' ? 'M2M...' : 'AIR-GAP'}
          </span>
        </div>

        {/* Hierarchical Unit Selector Capsule */}
        <div className="relative flex items-center">
          <select
            value={selectedUnitId}
            onChange={(e) => setSelectedUnitId(e.target.value)}
            className="appearance-none bg-slate-900/90 hover:bg-slate-900 border border-cyan-500/40 hover:border-cyan-400 text-cyan-300 text-xs font-mono font-medium rounded-lg pl-3 pr-8 py-1.5 focus:outline-none focus:ring-1 focus:ring-cyan-400 shadow-inner cursor-pointer transition-all max-w-[140px] sm:max-w-[200px] md:max-w-[240px] truncate"
            title="Seleccionar unidad militar para consulta y gestión operacional"
          >
            {accessibleUnits.map((u) => (
              <option 
                key={u.id} 
                value={u.id} 
                className="bg-slate-900 text-gray-200 font-mono py-1"
              >
                [{u.id}] {u.name}
              </option>
            ))}
          </select>
          <ChevronDown 
            size={14} 
            className="absolute right-2.5 text-cyan-400 pointer-events-none" 
          />
        </div>

        {/* Quick-Access Carga Masiva Button */}
        {onOpenCargaMasiva && (
          <button
            type="button"
            onClick={onOpenCargaMasiva}
            title="Carga Masiva de Personal (Excel / CSV / Listados)"
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-cyan-950/60 hover:bg-cyan-900/60 border border-cyan-500/50 hover:border-cyan-400 text-cyan-300 text-xs font-semibold shadow-sm transition-all group"
          >
            <UploadCloud size={14} className="text-cyan-400 group-hover:scale-110 transition-transform" />
            <span className="font-mono">Carga Masiva</span>
          </button>
        )}

      </div>

      {/* 3. Right Controls: Dual Tactical Clocks, Operator Profile & Logout */}
      <div className="flex items-center gap-2 sm:gap-3 lg:gap-4">
        
        {/* Dual Operational Clocks: Local COT and Zulu UTC */}
        <div className="hidden lg:flex items-center gap-2 px-3 py-1 rounded-lg bg-slate-950/70 border border-slate-800 text-[11px] font-mono tabular-nums font-semibold tracking-wider text-slate-300 shadow-inner">
          <Clock size={13} className="text-cyan-400 mr-0.5" />
          <span className="text-cyan-300">{clocks.localFormatted}</span>
          <span className="text-slate-600">|</span>
          <span className="text-emerald-400">{clocks.zuluFormatted}</span>
        </div>

        {/* User Profile Badge */}
        <div className="hidden md:flex items-center gap-2 pl-2 border-l border-slate-800/80">
          <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 shadow-sm">
            <UserIcon size={16} />
          </div>
          <div className="flex flex-col text-left">
            <span className="text-xs font-bold text-gray-200 tracking-wide leading-none">
              {user?.username || 'Operador'}
            </span>
            <div className="flex items-center gap-1 mt-0.5">
              <span className="text-[10px] font-mono font-medium text-cyan-400/90 leading-none">
                {formatTacticalRole(user?.role)}
              </span>
              <span className="text-[9px] text-slate-500 font-mono leading-none">
                • {user?.assignedUnitId === 'NATIONAL' ? 'NAC' : user?.assignedUnitId || 'ORG'}
              </span>
            </div>
          </div>
        </div>

        {/* Tactical Logout Button */}
        <button
          onClick={logout}
          title="Cerrar Sesión Operacional"
          className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/30 transition-all focus:outline-none focus:ring-1 focus:ring-rose-500"
        >
          <LogOut size={18} />
        </button>

      </div>

    </header>
  );
}

export default TacticalNavbar;
