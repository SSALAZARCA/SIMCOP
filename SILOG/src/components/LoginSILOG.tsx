import React, { useState } from 'react';
import { silogAuthService } from '../services/silogAuthService';
import { SilogUser } from '../types';

interface LoginSILOGProps {
  onLoginSuccess: (user: SilogUser) => void;
}

export const LoginSILOG: React.FC<LoginSILOGProps> = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const predefinedAccounts = silogAuthService.getPredefinedAccounts();

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
      {/* Fondo con textura táctica sutil */}
      <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:20px_20px] opacity-20 pointer-events-none" />

      <div className="w-full max-w-4xl relative z-10 space-y-6">
        
        {/* Encabezado Institucional */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-600 via-amber-700 to-amber-950 border border-amber-400/50 shadow-2xl shadow-amber-950/60 mb-2">
            <span className="text-3xl">📦</span>
          </div>
          <div className="flex items-center justify-center gap-2">
            <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/30 uppercase tracking-widest">
              EJÉRCITO NACIONAL DE COLOMBIA • JELOG
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-white tracking-wider">
            SISTEMA INTEGRADO DE LOGÍSTICA MILITAR (SILOG)
          </h1>
          <p className="text-xs md:text-sm text-slate-400 max-w-xl mx-auto">
            Plataforma dedicada de gestión de almacenes BASPC, depósitos tácticos, Clases I a VIII, kárdex militar y certificación de paz y salvo.
          </p>
        </div>

        {/* Contenedor Principal: Formulario + Perfiles Rápidos */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Panel Izquierdo: Formulario de Autenticación */}
          <div className="lg:col-span-5 bg-slate-900/90 border border-amber-500/30 rounded-2xl p-6 shadow-2xl backdrop-blur-md space-y-5">
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
                  placeholder="Ej: s4.br23 o CC-98451204"
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
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg shadow-amber-950/50 transition-all active:scale-95 disabled:opacity-50"
              >
                {isLoading ? 'Autenticando en Servidor...' : 'Ingresar a SILOG'}
              </button>
            </form>

            <div className="pt-2 border-t border-slate-800/80 text-center">
              <span className="text-[10px] text-slate-500 block">
                Aplicación autónoma con canal M2M hacia SIMCOP y SIGEP
              </span>
            </div>
          </div>

          {/* Panel Derecho: Perfiles Logísticos Doctrinales (Acceso Rápido) */}
          <div className="lg:col-span-7 bg-slate-900/60 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-black text-white uppercase tracking-wider">
                  Acceso Rápido Doctrinal (Selección por Rol)
                </h3>
                <p className="text-[11px] text-slate-400">
                  Seleccione el perfil logístico para ingresar con sus permisos específicos:
                </p>
              </div>
              <span className="text-[10px] font-mono text-amber-400 bg-amber-950/40 border border-amber-500/30 px-2 py-0.5 rounded">
                MFRE 4-0
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {predefinedAccounts.map(account => (
                <div
                  key={account.user.id}
                  onClick={() => handleQuickLogin(account.user.id)}
                  className="bg-slate-950/80 hover:bg-slate-900 border border-slate-800 hover:border-amber-500/60 p-3 rounded-xl cursor-pointer transition text-left group relative overflow-hidden"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-black text-white group-hover:text-amber-300 transition">
                          {account.user.rank} {account.user.fullName}
                        </span>
                      </div>
                      <span className="text-[10px] font-bold text-amber-400/90 block mt-0.5">
                        {account.user.roleTitle}
                      </span>
                    </div>
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                      {account.user.securityClearance}
                    </span>
                  </div>

                  <p className="text-[10px] text-slate-400 mt-2 line-clamp-2 leading-relaxed">
                    {account.description}
                  </p>

                  <div className="mt-2.5 pt-2 border-t border-slate-900 flex items-center justify-between text-[9px] font-mono text-slate-500">
                    <span>Unidad: {account.user.unit}</span>
                    <span className="text-amber-400 font-bold group-hover:translate-x-0.5 transition-transform">
                      Entrar →
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer Institucional */}
        <div className="text-center text-[10px] text-slate-600 font-mono">
          SILOG V4.2 • SISTEMA DE GESTIÓN Y ABASTECIMIENTO LOGÍSTICO MILITAR • CEDOE / JELOG
        </div>

      </div>
    </div>
  );
};
