import React, { useState } from 'react';
import { ShieldCheckIcon } from './icons/ShieldCheckIcon';
import { UserCircleIcon } from './icons/UserCircleIcon';

interface LoginViewComponentProps {
  onLogin: (role: any) => void;
}

export const LoginViewComponent: React.FC<LoginViewComponentProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    // Simulaci├│n de login
    setTimeout(() => {
      onLogin('ADMIN');
      setIsLoading(false);
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-[#050510] flex items-center justify-center p-4 relative overflow-hidden font-sans selection:bg-blue-500/30">
      {/* Fondo Animado de Radar */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[150vmax] h-[150vmax] border border-blue-500/10 rounded-full animate-[ping_8s_linear_infinite]"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[100vmax] h-[100vmax] border border-blue-500/5 rounded-full animate-[ping_12s_linear_infinite]"></div>
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-blue-900/5 to-transparent"></div>
      </div>

      <div className="w-full max-w-md bg-white/5 backdrop-blur-2xl p-8 rounded-3xl border border-white/10 shadow-[0_0_50px_rgba(30,58,138,0.3)] relative z-10 animate-in fade-in zoom-in-95 duration-700">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-tr from-blue-600 to-sky-400 rounded-2xl shadow-lg shadow-blue-500/30 mb-6 rotate-3">
            <ShieldCheckIcon className="w-12 h-12 text-white" />
          </div>
          <h1 className="text-4xl font-black text-white tracking-tighter mb-2 uppercase italic">
            SIM<span className="text-blue-500">COP</span>
          </h1>
          <p className="text-gray-400 text-xs font-bold uppercase tracking-[0.3em] font-mono">
            Sistemas Operacionales Avanzados
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Identificaci├│n</label>
            <div className="relative group">
              <UserCircleIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 group-focus-within:text-blue-500 transition-colors" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white placeholder:text-gray-600 focus:outline-none focus:border-blue-500/50 focus:bg-white/10 transition-all font-medium"
                placeholder="Nombre de Operador..."
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Protocolo Acceso</label>
            <div className="relative group">
               <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 group-focus-within:text-blue-500 transition-colors">
                <path fillRule="evenodd" d="M12 1.5a5.25 5.25 0 00-5.25 5.25v3a3 3 0 00-3 3v6.75a3 3 0 003 3h10.5a3 3 0 003-3v-6.75a3 3 0 00-3-3v-3c0-2.9-2.35-5.25-5.25-5.25zm3.75 8.25v-3a3.75 3.75 0 10-7.5 0v3h7.5z" clipRule="evenodd" />
              </svg>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white placeholder:text-gray-600 focus:outline-none focus:border-blue-500/50 focus:bg-white/10 transition-all font-medium"
                placeholder="ÔÇóÔÇóÔÇóÔÇóÔÇóÔÇóÔÇóÔÇó"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-black py-4 rounded-2xl shadow-lg shadow-blue-500/25 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-widest text-sm flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                <span>Validando...</span>
              </>
            ) : (
              <>
                <span>Acceder a Plataforma</span>
                <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></div>
              </>
            )}
          </button>
        </form>

        <div className="flex justify-between items-center pt-8 border-t border-white/5 mt-8">
          <p className="text-[8px] font-black text-gray-600 uppercase tracking-widest">
            SISTEMA: SIMCOP_PRO_V4.0.0
          </p>
          <p className="text-[8px] font-black text-blue-900/60 uppercase tracking-widest">
            Mil-Tech Industries
          </p>
        </div>
      </div>

      {/* Texto de Fondo - CLASIFICADO */}
      <div className="absolute top-[12%] left-1/2 -translate-x-1/2 text-[18vh] font-black text-blue-500/[0.02] select-none pointer-events-none tracking-tighter uppercase">
        Clasificado
      </div>

      {/* Marcador de Versi├│n en Esquina */}
      <div className="absolute bottom-4 left-4 z-40">
        <div className="px-2 py-1 bg-blue-950/40 backdrop-blur-md border border-blue-500/30 rounded text-[9px] font-black text-blue-400 tracking-tighter">
          BUILD: V4.0.0_TACTICAL_INTELLIGENCE
        </div>
      </div>

      <style dangerouslySetInnerHTML={{
        __html: `
        @keyframes scanline {
          0% { top: -100px; }
          100% { top: 100%; }
        }
      `}} />
    </div>
  );
};
