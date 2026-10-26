import React, { useState } from 'react';
import { silogAuthService } from '../services/silogAuthService';
import { SilogUser } from '../types';

interface LoginSILOGProps {
  onLoginSuccess: (user: SilogUser) => void;
}

export const LoginSILOG: React.FC<LoginSILOGProps> = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [selectedBrigade, setSelectedBrigade] = useState('ALL');
  const [selectedEchelonTab, setSelectedEchelonTab] = useState<'ALL' | 'BASPC' | 'BATALLON' | 'COMPANIA' | 'S4'>('ALL');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const predefinedAccounts = silogAuthService.getPredefinedAccounts();
  const brigades = silogAuthService.getSimcopBrigades();

  // Filtrado dual: por Gran Unidad (Brigada) y por Escalón Doctrinal
  const filteredAccounts = predefinedAccounts.filter(acc => {
    // Filtro por Brigada
    if (selectedBrigade === '16-BRIG') {
      if (!['16-BRIG', 'BASPC-16', 'BI-44', 'GM-16', 'BEING-16'].includes(acc.user.assignedUnitId)) return false;
    } else if (selectedBrigade === '18-BRIG') {
      if (!['18-BRIG', 'BI-24', 'GM-18', 'BA-18'].includes(acc.user.assignedUnitId)) return false;
    } else if (selectedBrigade === 'BR23') {
      if (!['BR23', 'BASPC-23', 'BIP-09', 'PEL-AURA-1'].includes(acc.user.assignedUnitId)) return false;
    }

    // Filtro por Escalón
    if (selectedEchelonTab === 'BASPC') {
      return acc.user.role === 'ALMACENISTA_CENTRAL_BASPC' || acc.user.role === 'COMANDANTE_BASPC';
    }
    if (selectedEchelonTab === 'BATALLON') {
      return acc.user.role === 'BODEGUERO_BATALLON' || acc.user.role === 'ALMACENISTA_CLASE_V' || acc.user.role === 'ALMACENISTA_CLASE_II_I';
    }
    if (selectedEchelonTab === 'COMPANIA') {
      return acc.user.role === 'ENCARGADO_COMPANIA' || acc.user.role === 'FURRIEL_PELOTON';
    }
    if (selectedEchelonTab === 'S4') {
      return acc.user.role === 'OFICIAL_S4';
    }

    return true;
  });

  const handleManualLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    setTimeout(() => {
      const result = silogAuthService.login(username, password);
      setIsLoading(false);
      if (result.success && result.user) {
        onLoginSuccess(result.user);
      } else {
        setError(result.message || 'Error de autenticación');
      }
    }, 400);
  };

  const handleQuickLogin = (userId: string) => {
    setError(null);
    setIsLoading(true);
    setTimeout(() => {
      const user = silogAuthService.loginAsPredefined(userId);
      setIsLoading(false);
      if (user) {
        onLoginSuccess(user);
      } else {
        setError('No se pudo iniciar sesión con este perfil.');
      }
    }, 300);
  };

  return (
    <div className="min-h-screen bg-[#070a0f] text-slate-100 flex flex-col justify-center items-center p-4 selection:bg-amber-500 selection:text-slate-950">
      {/* Fondo con textura militar sutil */}
      <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px] opacity-25 pointer-events-none" />

      <div className="w-full max-w-5xl relative z-10 space-y-6 my-6">
        
        {/* Encabezado Institucional y Dominio Oficial */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-600 via-amber-700 to-amber-950 border border-amber-400/50 shadow-2xl shadow-amber-950/60 mb-1">
            <span className="text-3xl">📦</span>
          </div>
          
          <div className="flex flex-wrap items-center justify-center gap-2">
            <span className="text-[10px] font-mono font-bold px-3 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/30 uppercase tracking-widest">
              EJÉRCITO NACIONAL DE COLOMBIA • JELOG
            </span>
            <span className="text-[10px] font-mono font-bold px-3 py-0.5 rounded-full bg-blue-500/10 text-blue-300 border border-blue-500/30">
              DOMINIO OFICIAL: https://siloga.site
            </span>
          </div>

          <h1 className="text-2xl md:text-3xl font-black text-white tracking-wider">
            SISTEMA INTEGRADO DE LOGÍSTICA OPERACIONAL (SILOGA)
          </h1>
          <p className="text-xs md:text-sm text-slate-400 max-w-2xl mx-auto">
            Control de inventarios por escalón: reportes SAP MM, almacenes centralizadores BASPC, depósitos tácticos de batallón, dotación de compañías y kárdex individual.
          </p>
        </div>

        {/* Contenedor Principal en Dos Columnas */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Panel Izquierdo: Formulario de Autenticación */}
          <div className="lg:col-span-5 bg-slate-900/95 border border-amber-500/30 rounded-2xl p-6 shadow-2xl backdrop-blur-md space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <span className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                Ingreso de Personal Logístico
              </span>
              <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                SEGURIDAD S-4
              </span>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-red-950/60 border border-red-500/50 text-red-300 text-xs flex items-center gap-2 animate-in fade-in">
                <span>⚠️</span>
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleManualLogin} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Usuario / Cédula Militar:
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Ej: almacen.baspc16 o bodeguero.bi44"
                  className="w-full bg-slate-950 border border-slate-700 focus:border-amber-500 text-white text-xs rounded-xl p-3 focus:outline-none transition"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Contraseña / Llave Criptográfica:
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full bg-slate-950 border border-slate-700 focus:border-amber-500 text-white text-xs rounded-xl p-3 focus:outline-none transition"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 bg-gradient-to-r from-amber-600 via-amber-700 to-amber-800 hover:from-amber-500 hover:to-amber-700 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-amber-950/50 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <span>🔐</span>
                <span>{isLoading ? 'Autenticando en JELOG...' : 'Acceder al Sistema SILOGA'}</span>
              </button>
            </form>

            <div className="pt-3 border-t border-slate-800 text-center space-y-1.5">
              <span className="text-[10px] text-slate-500 block">
                Canal M2M sincronizado con SIGEP (Personal) y SIMCOP (Operaciones C2)
              </span>
              <span className="text-[10px] font-mono text-cyan-400 block">
                https://siloga.site
              </span>
            </div>
          </div>

          {/* Panel Derecho: Perfiles Logísticos Segmentados por Escalón */}
          <div className="lg:col-span-7 bg-slate-900/70 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
            
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2">
                  <span>🎖️</span> Perfiles de Acceso Rápido por Escalón Doctrinal
                </h3>
                <p className="text-[11px] text-slate-400">
                  Seleccione el rol militar para acceder directamente a la consola operativa:
                </p>
              </div>
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/40 border border-emerald-500/30 px-2 py-0.5 rounded">
                ● ORBAT SIMCOP
              </span>
            </div>

            {/* Selector de Gran Unidad (Brigada de SIMCOP) */}
            <div className="flex items-center gap-2 bg-slate-950/90 border border-slate-800 p-2 px-3 rounded-xl">
              <span className="text-xs text-slate-400 font-bold whitespace-nowrap">📍 Gran Unidad:</span>
              <select
                value={selectedBrigade}
                onChange={(e) => setSelectedBrigade(e.target.value)}
                className="bg-transparent text-amber-300 font-bold text-xs focus:outline-none cursor-pointer flex-1"
              >
                {brigades.map(b => (
                  <option key={b.id} value={b.id} className="bg-slate-950 text-slate-200">
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Pestañas de Escalón Logístico */}
            <div className="flex flex-wrap gap-1 bg-slate-950/60 p-1 rounded-xl border border-slate-800">
              {[
                { id: 'ALL', label: 'Todos' },
                { id: 'BASPC', label: '⭐ 1. Almacén BASPC' },
                { id: 'BATALLON', label: '📦 2. Bodega Batallón' },
                { id: 'COMPANIA', label: '🪪 3. Compañía / Pelotón' },
                { id: 'S4', label: '👁️ 4. Estado Mayor S-4' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setSelectedEchelonTab(tab.id as any)}
                  className={`text-[11px] font-bold px-2.5 py-1 rounded-lg transition ${
                    selectedEchelonTab === tab.id
                      ? 'bg-amber-600 text-slate-950 shadow-md'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Lista de Tarjetas de Perfil */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[440px] overflow-y-auto pr-1">
              {filteredAccounts.map(account => {
                const isBaspc = account.user.role === 'ALMACENISTA_CENTRAL_BASPC' || account.user.role === 'COMANDANTE_BASPC';
                const isBodeguero = account.user.role === 'BODEGUERO_BATALLON' || account.user.role.startsWith('ALMACENISTA_CLASE');
                const isCia = account.user.role === 'ENCARGADO_COMPANIA' || account.user.role === 'FURRIEL_PELOTON';

                return (
                  <div
                    key={account.user.id}
                    onClick={() => handleQuickLogin(account.user.id)}
                    className="bg-slate-950/80 hover:bg-slate-900 border border-slate-800 hover:border-amber-500/60 p-3.5 rounded-xl cursor-pointer transition text-left group relative overflow-hidden flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="text-xs font-black text-white group-hover:text-amber-300 transition block">
                            {account.user.rank} {account.user.fullName}
                          </span>
                          <span className="text-[10px] font-bold text-amber-400 block mt-0.5">
                            {account.user.roleTitle}
                          </span>
                        </div>
                        <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded font-bold ${
                          isBaspc ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' :
                          isBodeguero ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' :
                          isCia ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                          'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        }`}>
                          {isBaspc ? 'BASPC' : isBodeguero ? 'BODEGA' : isCia ? 'COMPAÑÍA' : 'ESTADO MAYOR'}
                        </span>
                      </div>

                      <p className="text-[10px] text-slate-400 mt-2 line-clamp-2 leading-relaxed">
                        {account.description}
                      </p>
                    </div>

                    <div className="mt-3 pt-2 border-t border-slate-900 flex items-center justify-between text-[9px] font-mono">
                      <span className="text-slate-400">
                        {account.user.assignedUnitId}
                      </span>
                      <span className="text-amber-400 font-bold group-hover:translate-x-1 transition-transform">
                        Ingresar Puesto →
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

          </div>
        </div>

        {/* Footer Institucional */}
        <div className="text-center text-[10px] text-slate-600 font-mono space-y-1">
          <p>SISTEMA INTEGRADO DE LOGÍSTICA OPERACIONAL (SILOGA) • DOMINIO: HTTPS://SILOGA.SITE</p>
          <p>DIRECCIÓN DE LOGÍSTICA (S-4 / G-4 / JELOG) • EJÉRCITO NACIONAL DE COLOMBIA</p>
        </div>

      </div>
    </div>
  );
};
