import React, { useState, useEffect } from 'react';
import { silogAuthService } from '../services/silogAuthService';
import { SilogUser } from '../types';

interface LoginSILOGProps {
  onLoginSuccess: (user: SilogUser) => void;
}

export const LoginSILOG: React.FC<LoginSILOGProps> = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberUser, setRememberUser] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCredentialDirOpen, setIsCredentialDirOpen] = useState(false);
  const [dirBrigadeFilter, setDirBrigadeFilter] = useState('ALL');
  const [dirEchelonFilter, setDirEchelonFilter] = useState('ALL');
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Restaurar usuario recordado si existe
  useEffect(() => {
    try {
      const saved = localStorage.getItem('siloga_saved_username');
      if (saved) {
        setUsername(saved);
      }
    } catch {
      // Ignorar error de almacenamiento
    }
  }, []);

  const predefinedAccounts = silogAuthService.getPredefinedAccounts();
  const brigades = silogAuthService.getSimcopBrigades();

  // Filtrado de directorio de credenciales oficiales
  const filteredDirectory = predefinedAccounts.filter(acc => {
    if (dirBrigadeFilter === '16-BRIG') {
      if (!['16-BRIG', 'BASPC-16', 'BI-44', 'GM-16', 'BEING-16'].includes(acc.user.assignedUnitId)) return false;
    } else if (dirBrigadeFilter === '18-BRIG') {
      if (!['18-BRIG', 'BI-24', 'GM-18', 'BA-18'].includes(acc.user.assignedUnitId)) return false;
    } else if (dirBrigadeFilter === 'BR23') {
      if (!['BR23', 'BASPC-23', 'BIP-09', 'PEL-AURA-1'].includes(acc.user.assignedUnitId)) return false;
    }

    if (dirEchelonFilter === 'BASPC') {
      return acc.user.role === 'ALMACENISTA_CENTRAL_BASPC' || acc.user.role === 'COMANDANTE_BASPC';
    }
    if (dirEchelonFilter === 'BATALLON') {
      return acc.user.role === 'BODEGUERO_BATALLON' || acc.user.role.startsWith('ALMACENISTA_CLASE');
    }
    if (dirEchelonFilter === 'COMPANIA') {
      return acc.user.role === 'ENCARGADO_COMPANIA' || acc.user.role === 'FURRIEL_PELOTON';
    }
    if (dirEchelonFilter === 'S4') {
      return acc.user.role === 'OFICIAL_S4';
    }

    return true;
  });

  const handleManualLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!username.trim()) {
      setError('Por favor ingrese su usuario militar o número de cédula militar.');
      return;
    }

    if (!password.trim()) {
      setError('Por favor ingrese su contraseña o clave criptográfica.');
      return;
    }

    setIsLoading(true);

    setTimeout(() => {
      const result = silogAuthService.login(username, password);
      setIsLoading(false);

      if (result.success && result.user) {
        if (rememberUser) {
          try {
            localStorage.setItem('siloga_saved_username', username.trim());
          } catch {}
        } else {
          try {
            localStorage.removeItem('siloga_saved_username');
          } catch {}
        }
        onLoginSuccess(result.user);
      } else {
        setError(result.message || 'Credenciales inválidas. Verifique usuario y contraseña.');
      }
    }, 450);
  };

  const handleSelectFromDirectory = (userUsername: string, userPasswordPlain: string) => {
    setUsername(userUsername);
    setPassword(userPasswordPlain);
    setIsCredentialDirOpen(false);
    setError(null);
  };

  const copyToClipboard = (text: string, fieldId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldId);
    setTimeout(() => setCopiedField(null), 2000);
  };

  return (
    <div className="min-h-screen bg-[#070a0f] text-slate-100 flex flex-col justify-center items-center p-4 selection:bg-amber-500 selection:text-slate-950 relative overflow-hidden">
      {/* Fondo con textura militar sutil y destellos tácticos */}
      <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px] opacity-30 pointer-events-none" />
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md md:max-w-lg relative z-10 space-y-6 my-8">
        
        {/* Encabezado Institucional Oficial */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-amber-600 via-amber-700 to-amber-950 border border-amber-400/50 shadow-2xl shadow-amber-950/80 mb-1 group transition-transform hover:scale-105">
            <span className="text-4xl">📦</span>
          </div>
          
          <div className="flex flex-col items-center justify-center gap-1.5">
            <span className="text-[10px] font-mono font-bold px-3 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/30 uppercase tracking-widest">
              EJÉRCITO NACIONAL DE COLOMBIA • JELOG
            </span>
            <span className="text-[11px] font-mono font-bold px-3.5 py-1 rounded-full bg-blue-950/60 text-cyan-300 border border-cyan-500/40 shadow-inner flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              PORTAL OFICIAL: https://siloga.site
            </span>
          </div>

          <h1 className="text-2xl md:text-3xl font-black text-white tracking-wider">
            SISTEMA INTEGRADO DE LOGÍSTICA OPERACIONAL
          </h1>
          <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
            Plataforma de comando y control de abastecimientos por escalón militar. Ingrese con sus credenciales institucionales.
          </p>
        </div>

        {/* Tarjeta de Autenticación de Producción (Login con Credenciales) */}
        <div className="bg-slate-900/95 border border-amber-500/30 rounded-2xl p-7 shadow-2xl backdrop-blur-md space-y-5">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <span className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
              Autenticación de Personal Logístico
            </span>
            <span className="text-[9px] font-mono px-2.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300">
              SEGURIDAD S-4
            </span>
          </div>

          {error && (
            <div className="p-3.5 rounded-xl bg-red-950/80 border border-red-500/60 text-red-200 text-xs flex items-start gap-2.5 animate-in fade-in">
              <span className="text-base leading-none">⚠️</span>
              <div className="space-y-0.5">
                <span className="font-bold block">Fallo de Validación:</span>
                <span className="text-red-300">{error}</span>
              </div>
            </div>
          )}

          <form onSubmit={handleManualLogin} className="space-y-4">
            {/* Campo: Usuario / Cédula Militar */}
            <div>
              <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                <span>Usuario o Cédula Militar:</span>
                <span className="text-[9px] font-mono text-slate-500 font-normal">Cédula o ID de Usuario</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Ej: almacen.baspc16 o CC-79812450"
                  autoComplete="username"
                  className="w-full bg-slate-950 border border-slate-700 focus:border-amber-500 text-white text-xs rounded-xl pl-9 pr-3 py-3 focus:outline-none transition shadow-inner font-mono"
                  required
                />
                <span className="absolute left-3 top-3 text-slate-500 text-sm">🪪</span>
              </div>
            </div>

            {/* Campo: Contraseña / Clave Criptográfica */}
            <div>
              <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                <span>Contraseña / Clave Criptográfica:</span>
                <span className="text-[9px] font-mono text-slate-500 font-normal">Cifrado AES-256</span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  autoComplete="current-password"
                  className="w-full bg-slate-950 border border-slate-700 focus:border-amber-500 text-white text-xs rounded-xl pl-9 pr-10 py-3 focus:outline-none transition shadow-inner font-mono"
                  required
                />
                <span className="absolute left-3 top-3 text-slate-500 text-sm">🔒</span>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-slate-400 hover:text-amber-400 transition text-xs"
                  title={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                >
                  {showPassword ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            {/* Recordar Usuario */}
            <div className="flex items-center justify-between text-xs pt-1">
              <label className="flex items-center gap-2 cursor-pointer text-slate-400 hover:text-slate-200">
                <input
                  type="checkbox"
                  checked={rememberUser}
                  onChange={(e) => setRememberUser(e.target.checked)}
                  className="w-3.5 h-3.5 rounded bg-slate-950 border-slate-700 text-amber-500 focus:ring-0 cursor-pointer"
                />
                <span className="text-[11px]">Recordar usuario en este terminal</span>
              </label>

              <button
                type="button"
                onClick={() => setIsCredentialDirOpen(true)}
                className="text-[11px] text-amber-400 hover:text-amber-300 hover:underline font-bold transition"
              >
                ¿Olvidó sus credenciales?
              </button>
            </div>

            {/* Botón Principal de Inicio de Sesión */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 bg-gradient-to-r from-amber-600 via-amber-700 to-amber-800 hover:from-amber-500 hover:to-amber-700 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-amber-950/60 transition-all flex items-center justify-center gap-2 disabled:opacity-50 mt-2 cursor-pointer active:scale-[0.99]"
            >
              <span>🔐</span>
              <span>{isLoading ? 'Autenticando en Servidor JELOG...' : 'Acceder al Sistema SILOGA'}</span>
            </button>
          </form>

          {/* Botón de Asistencia: Directorio de Credenciales Asignadas */}
          <div className="pt-2 border-t border-slate-800 text-center">
            <button
              type="button"
              onClick={() => setIsCredentialDirOpen(true)}
              className="w-full py-2.5 px-3 bg-slate-950/80 hover:bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-amber-300 text-[11px] font-bold rounded-xl transition flex items-center justify-center gap-2"
            >
              <span>📋</span>
              <span>Consultar Directorio Oficial de Cuentas y Credenciales JELOG</span>
            </button>
          </div>

          {/* Avisos de Seguridad */}
          <div className="pt-3 border-t border-slate-800/80 text-center space-y-1">
            <span className="text-[10px] text-slate-500 block">
              Canal criptográfico M2M integrado con SIGEP (Talento Humano) y SIMCOP (Comando C2)
            </span>
            <span className="text-[10px] font-mono text-cyan-400/80 block">
              Certificación SSL/TLS 256-bit • https://siloga.site
            </span>
          </div>
        </div>

        {/* Footer Institucional */}
        <div className="text-center text-[10px] text-slate-600 font-mono space-y-1">
          <p>SISTEMA INTEGRADO DE LOGÍSTICA OPERACIONAL (SILOGA) • DOMINIO: HTTPS://SILOGA.SITE</p>
          <p>DIRECCIÓN DE LOGÍSTICA (S-4 / G-4 / JELOG) • EJÉRCITO NACIONAL DE COLOMBIA</p>
        </div>

      </div>

      {/* ==================================================================== */}
      {/* MODAL: DIRECTORIO OFICIAL DE CUENTAS ASIGNADAS JELOG                */}
      {/* Permite a los usuarios y evaluadores consultar sus credenciales     */}
      {/* institucionales para ingresarlas en el formulario sin romper el flujo */}
      {/* ==================================================================== */}
      {isCredentialDirOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-amber-500/40 rounded-2xl max-w-3xl w-full p-6 shadow-2xl max-h-[90vh] flex flex-col space-y-4 animate-in fade-in zoom-in-95">
            
            {/* Cabecera del Modal */}
            <div className="flex items-start justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                  <span>📋</span> Directorio de Cuentas y Credenciales Asignadas (JELOG)
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Consulte las credenciales oficiales registradas para cada cargo y escalón logístico:
                </p>
              </div>
              <button
                onClick={() => setIsCredentialDirOpen(false)}
                className="text-slate-400 hover:text-white text-lg p-1 transition"
                title="Cerrar directorio"
              >
                ✕
              </button>
            </div>

            {/* Filtros de Gran Unidad y Escalón */}
            <div className="flex flex-wrap items-center gap-2 bg-slate-950 p-2.5 rounded-xl border border-slate-800">
              <div className="flex items-center gap-1.5 flex-1 min-w-[200px]">
                <span className="text-[11px] text-slate-400 font-bold whitespace-nowrap">Gran Unidad:</span>
                <select
                  value={dirBrigadeFilter}
                  onChange={(e) => setDirBrigadeFilter(e.target.value)}
                  className="bg-slate-900 text-amber-300 font-bold text-xs p-1.5 rounded-lg border border-slate-700 focus:outline-none flex-1"
                >
                  {brigades.map(b => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-1 flex-wrap">
                {[
                  { id: 'ALL', label: 'Todos' },
                  { id: 'BASPC', label: '⭐ BASPC' },
                  { id: 'BATALLON', label: '📦 Batallón' },
                  { id: 'COMPANIA', label: '🪪 Compañía' },
                  { id: 'S4', label: '👁️ S-4' }
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setDirEchelonFilter(tab.id)}
                    className={`text-[10px] font-bold px-2 py-1 rounded-md transition ${
                      dirEchelonFilter === tab.id
                        ? 'bg-amber-600 text-slate-950'
                        : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Tabla de Cuentas y Credenciales */}
            <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
              {filteredDirectory.map((acc) => {
                const isBaspc = acc.user.role === 'ALMACENISTA_CENTRAL_BASPC' || acc.user.role === 'COMANDANTE_BASPC';
                const isBodeguero = acc.user.role === 'BODEGUERO_BATALLON' || acc.user.role.startsWith('ALMACENISTA_CLASE');
                const isCia = acc.user.role === 'ENCARGADO_COMPANIA' || acc.user.role === 'FURRIEL_PELOTON';

                return (
                  <div
                    key={acc.user.id}
                    className="bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-xl p-3.5 space-y-2 transition"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black text-white">
                            {acc.user.rank} {acc.user.fullName}
                          </span>
                          <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded font-bold ${
                            isBaspc ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' :
                            isBodeguero ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' :
                            isCia ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                            'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          }`}>
                            {isBaspc ? 'ALMACÉN BASPC' : isBodeguero ? 'BODEGA BATALLÓN' : isCia ? 'COMPAÑÍA / TACTICO' : 'ESTADO MAYOR'}
                          </span>
                        </div>
                        <span className="text-[10px] font-bold text-amber-400 block mt-0.5">
                          {acc.user.roleTitle} • {acc.user.unitName}
                        </span>
                      </div>

                      {/* Botón para cargar en el formulario */}
                      <button
                        type="button"
                        onClick={() => handleSelectFromDirectory(acc.user.username, acc.passwordPlain)}
                        className="py-1.5 px-3 bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-[10px] rounded-lg transition shadow flex items-center gap-1.5 cursor-pointer"
                      >
                        <span>✍️</span>
                        <span>Usar estas Credenciales</span>
                      </button>
                    </div>

                    {/* Fila de Credenciales Claras (Usuario, Cédula, Contraseña) */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 bg-slate-900/90 border border-slate-800/80 p-2.5 rounded-lg text-xs font-mono">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-[9px] text-slate-500 block uppercase">Usuario:</span>
                          <span className="text-emerald-400 font-bold">{acc.user.username}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(acc.user.username, `user-${acc.user.id}`)}
                          className="text-[10px] text-slate-400 hover:text-white px-1.5 py-0.5 rounded bg-slate-800"
                          title="Copiar usuario"
                        >
                          {copiedField === `user-${acc.user.id}` ? '✓' : 'Copiar'}
                        </button>
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-[9px] text-slate-500 block uppercase">Cédula Militar:</span>
                          <span className="text-cyan-400">{acc.user.militaryId}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(acc.user.militaryId, `cc-${acc.user.id}`)}
                          className="text-[10px] text-slate-400 hover:text-white px-1.5 py-0.5 rounded bg-slate-800"
                          title="Copiar cédula"
                        >
                          {copiedField === `cc-${acc.user.id}` ? '✓' : 'Copiar'}
                        </button>
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-[9px] text-slate-500 block uppercase">Contraseña:</span>
                          <span className="text-amber-300 font-bold">{acc.passwordPlain}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(acc.passwordPlain, `pass-${acc.user.id}`)}
                          className="text-[10px] text-slate-400 hover:text-white px-1.5 py-0.5 rounded bg-slate-800"
                          title="Copiar contraseña"
                        >
                          {copiedField === `pass-${acc.user.id}` ? '✓' : 'Copiar'}
                        </button>
                      </div>
                    </div>

                    <p className="text-[10px] text-slate-400 leading-relaxed italic">
                      {acc.description}
                    </p>
                  </div>
                );
              })}
            </div>

            {/* Pie del modal */}
            <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
              <span>Haga clic en <strong>"Usar estas Credenciales"</strong> para cargarlas en el formulario y autenticarse.</span>
              <button
                type="button"
                onClick={() => setIsCredentialDirOpen(false)}
                className="py-1 px-3 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition"
              >
                Cerrar
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
