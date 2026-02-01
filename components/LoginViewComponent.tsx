import React, { useState, useEffect } from 'react';
import type { User } from '../types';

interface LoginViewProps {
  onLoginSuccess: (user: User) => void;
  loginFunction: (username: string, passwordAttempt: string) => Promise<User | null>;
}

export const LoginViewComponent: React.FC<LoginViewProps> = ({ onLoginSuccess, loginFunction }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [systemTime, setSystemTime] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setSystemTime(now.toLocaleTimeString('es-CO', {
        timeZone: 'America/Bogota',
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      }));
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    if (!username.trim() || !password.trim()) {
      setError("CRÍTICO: CREDENCIALES REQUERIDAS");
      setIsLoading(false);
      return;
    }

    // Retraso estético para simular conexión táctica
    await new Promise(resolve => setTimeout(resolve, 1500));

    try {
      const user = await loginFunction(username, password);

      if (user) {
        onLoginSuccess(user);
      } else {
        setError("ACCESO DENEGADO: AUTENTICACIÓN INVÁLIDA");
      }
    } catch (err: any) {
      setError("ERROR DE SISTEMA: FALLO EN EL ENLACE");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-[#020617] relative overflow-hidden font-sans">
      {/* Fondo Táctico Mejorado - Radar y Rejilla */}
      <div className="absolute inset-0 z-0 pointer-events-none transition-opacity duration-1000">
        {/* Rejilla de fondo */}
        <div className="absolute inset-0 opacity-[0.1]"
          style={{ backgroundImage: 'linear-gradient(to right, #1e40af 1px, transparent 1px), linear-gradient(to bottom, #1e40af 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>

        {/* Círculos de Radar */}
        <div className="absolute inset-0 flex items-center justify-center opacity-[0.05]">
          <div className="absolute w-[40vw] h-[40vw] border-2 border-blue-500 rounded-full animate-pulse"></div>
          <div className="absolute w-[70vw] h-[70vw] border border-blue-600 rounded-full opacity-50"></div>
          <div className="absolute w-[100vw] h-[100vw] border border-blue-700 rounded-full opacity-30"></div>

          {/* Ejes de Radar */}
          <div className="absolute w-full h-[1px] bg-blue-500/20"></div>
          <div className="absolute w-[1px] h-full bg-blue-500/20"></div>

          {/* Barrido de Radar (Rotating Sweep) */}
          <div className="absolute w-full h-full animate-[spin_8s_linear_infinite]"
            style={{ background: 'conic-gradient(from 0deg, rgba(59, 130, 246, 0.1) 0%, transparent 20%)' }}></div>
        </div>
      </div>

      {/* Elementos HUD Decorativos - Superior Izquierda */}
      <div className="absolute top-10 left-10 hidden lg:block animate-in fade-in slide-in-from-left duration-1000 z-10">
        <div className="text-[10px] font-black text-blue-400/60 uppercase tracking-[.3em] space-y-1 monospace-tech">
          <p className="flex items-center gap-2"><span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span> ESTADO_RED: ENCRIPTADO</p>
          <p>POTENCIA_ENLACE: 98.4%</p>
          <p>NODO_SERVIDOR: BOGOTÁ-ALPHA-7</p>
        </div>
      </div>

      {/* Elementos HUD Decorativos - Inferior Derecha */}
      <div className="absolute bottom-10 right-10 hidden lg:block text-right animate-in fade-in slide-in-from-right duration-1000 z-10">
        <div className="text-3xl font-black text-blue-400/30 monospace-tech mb-2 tracking-widest">{systemTime}</div>
        <div className="text-[10px] font-black text-blue-400/60 uppercase tracking-[.3em]">
          HORA_OPERATIVA_COLOMBIA (COT)
        </div>
      </div>

      {/* Contenedor de Login Premium */}
      <div className="w-full max-w-md p-1 glass-effect rounded-2xl shadow-[0_0_80px_rgba(0,0,0,0.8)] border-white/5 relative z-20 animate-in zoom-in-95 duration-700 mx-4">
        <div className="p-10 space-y-8 bg-[#0a0f1e]/80 backdrop-blur-xl rounded-2xl">
          <div className="text-center relative">
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-20 h-[1px] bg-blue-500/50"></div>
            <h1 className="text-5xl font-black tracking-tighter text-white mb-2">
              SIM<span className="text-blue-500">COP</span>
            </h1>
            <div className="flex items-center justify-center gap-2">
              <span className="h-[1px] w-4 bg-gray-700"></span>
              <p className="text-[9px] font-bold text-gray-500 uppercase tracking-[.5em]">Sistema de Comando y Control</p>
              <span className="h-[1px] w-4 bg-gray-700"></span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <div className="flex justify-between items-center ml-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">ID_OPERADOR</label>
                <span className="text-[8px] text-blue-500/50 font-bold tracking-tighter">NIVEL_SEGURIDAD_4</span>
              </div>
              <input
                type="text"
                autoComplete="username"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-3.5 bg-black/40 border border-white/10 rounded-xl focus:ring-1 focus:ring-blue-500/50 focus:border-blue-500/50 text-white transition-all outline-none placeholder-gray-700 font-medium text-sm"
                placeholder="REGISTRE USUARIO"
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center ml-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">CLAVE_ACCESO</label>
                <span className="text-[8px] text-blue-500/50 font-bold tracking-tighter">ENCRIPTACIÓN_SHA256</span>
              </div>
              <input
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3.5 bg-black/40 border border-white/10 rounded-xl focus:ring-1 focus:ring-blue-500/50 focus:border-blue-500/50 text-white transition-all outline-none placeholder-gray-700 font-medium text-sm"
                placeholder="••••••••••••"
              />
            </div>

            {error && (
              <div className="border border-red-900/30 bg-red-900/10 p-4 rounded-xl animate-in slide-in-from-top-2">
                <p className="text-[9px] font-black text-red-500 text-center tracking-widest leading-relaxed">
                  [ ! ] {error}
                </p>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full relative group overflow-hidden py-4.5 rounded-xl shadow-2xl transition-all active:scale-[0.98] disabled:opacity-50"
            >
              <div className="absolute inset-0 bg-blue-600 group-hover:bg-blue-500 transition-colors"></div>
              {/* Efecto de Brillo en Botón */}
              <div className="absolute inset-0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>

              <span className="relative z-10 text-[11px] font-black text-white tracking-[0.35em] flex items-center justify-center gap-3 py-4">
                {isLoading ? (
                  <>
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    SINCRONIZANDO ENLACE...
                  </>
                ) : (
                  <>
                    VALIDAR ACCESO TÁCTICO
                    <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></div>
                  </>
                )}
              </span>
            </button>
          </form>

          <div className="flex justify-between items-center pt-8 border-t border-white/5">
            <p className="text-[8px] font-black text-gray-600 uppercase tracking-widest">
              SISTEMA: SIMCOP_PRO_V3
            </p>
            <p className="text-[8px] font-black text-blue-900/60 uppercase tracking-widest">
              Mil-Tech Industries
            </p>
          </div>
        </div>
      </div>

      {/* Texto de Fondo - CLASIFICADO */}
      <div className="absolute top-[12%] left-1/2 -translate-x-1/2 text-[18vh] font-black text-blue-500/[0.02] select-none pointer-events-none tracking-tighter uppercase">
        Clasificado
      </div>

      {/* Línea de escaneo decorativa */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-30">
        <div className="w-full h-24 bg-gradient-to-b from-transparent via-blue-500/5 to-transparent absolute -top-24 animate-[scanline_6s_linear_infinite]"></div>
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
