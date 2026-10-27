import React, { useState, useEffect, useRef } from 'react';
import { silogAuthService } from '../services/silogAuthService';
import { SilogUser } from '../types';

interface LoginSILOGProps {
  onLoginSuccess: (user: SilogUser) => void;
}

export const LoginSILOG: React.FC<LoginSILOGProps> = ({ onLoginSuccess }) => {
  // Flujo de autenticación: Paso 1 (Credenciales) o Paso 2 (Doble Factor)
  const [authStep, setAuthStep] = useState<'CREDENTIALS' | '2FA'>('CREDENTIALS');
  const [pendingUser, setPendingUser] = useState<SilogUser | null>(null);

  // Campos Paso 1: Credenciales
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberUser, setRememberUser] = useState(true);

  // Campos Paso 2: Doble Factor (2FA)
  const [twoFactorMethod, setTwoFactorMethod] = useState<'TOTP_TACTICO' | 'RADIO_SMS'>('TOTP_TACTICO');
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [resendCooldown, setResendCooldown] = useState<number>(0);
  const [liveTokenData, setLiveTokenData] = useState<{ code: string; secondsRemaining: number; phoneMasked: string; terminalId: string } | null>(null);

  // Estados generales de UI
  const [error, setError] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCredentialDirOpen, setIsCredentialDirOpen] = useState(false);
  const [dirBrigadeFilter, setDirBrigadeFilter] = useState('ALL');
  const [dirEchelonFilter, setDirEchelonFilter] = useState('ALL');
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Referencias a inputs de dígitos OTP para auto-avance
  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Restaurar usuario recordado al cargar
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

  // Timer para actualizar en vivo el token TOTP simulado y su cuenta atrás (30s)
  useEffect(() => {
    if (authStep !== '2FA' || !pendingUser) return;

    const updateToken = () => {
      const token = silogAuthService.get2FATokenForUser(pendingUser.id);
      setLiveTokenData(token);
    };

    updateToken();
    const interval = setInterval(updateToken, 1000);
    return () => clearInterval(interval);
  }, [authStep, pendingUser]);

  // Timer para cuenta regresiva de reenvío SMS/Radiomensajería
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => {
      setResendCooldown(prev => prev - 1);
    }, 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  const predefinedAccounts = silogAuthService.getPredefinedAccounts();
  const brigades = silogAuthService.getSimcopBrigades();

  // Filtrado de directorio de credenciales
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

  // PASO 1: Validación de Credenciales Primarias
  const handleValidateCredentials = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessNotice(null);

    if (!username.trim()) {
      setError('Por favor ingrese su usuario militar o número de cédula.');
      return;
    }

    if (!password.trim()) {
      setError('Por favor ingrese su contraseña o clave criptográfica.');
      return;
    }

    setIsLoading(true);

    setTimeout(() => {
      const result = silogAuthService.validatePrimaryCredentials(username, password);
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

        setPendingUser(result.user);
        setAuthStep('2FA');
        setOtpDigits(['', '', '', '', '', '']);
        // Enfocar primer input de OTP en el siguiente ciclo
        setTimeout(() => {
          otpInputRefs.current[0]?.focus();
        }, 150);
      } else {
        setError(result.message || 'Credenciales inválidas. Verifique usuario y contraseña.');
      }
    }, 450);
  };

  // PASO 2: Manejo de dígitos OTP individuales con auto-avance
  const handleOtpChange = (index: number, value: string) => {
    // Si pegan el código completo de 6 dígitos
    if (value.length > 1) {
      const cleaned = value.replace(/\D/g, '').slice(0, 6);
      if (cleaned.length > 0) {
        const newDigits = [...otpDigits];
        for (let i = 0; i < 6; i++) {
          newDigits[i] = cleaned[i] || '';
        }
        setOtpDigits(newDigits);
        const nextFocus = Math.min(cleaned.length, 5);
        otpInputRefs.current[nextFocus]?.focus();
        return;
      }
    }

    const digit = value.replace(/\D/g, '').slice(-1);
    const newDigits = [...otpDigits];
    newDigits[index] = digit;
    setOtpDigits(newDigits);

    // Auto-avance al siguiente input
    if (digit && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  // Autocompletar con el token activo actual
  const handleAutocompleteLiveToken = () => {
    if (!liveTokenData) return;
    const digits = liveTokenData.code.split('');
    setOtpDigits(digits);
    setError(null);
    otpInputRefs.current[5]?.focus();
  };

  // PASO 2: Validación de Código 2FA y Entrada al Sistema
  const handleVerify2FA = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pendingUser) return;
    setError(null);

    const fullCode = otpDigits.join('');
    if (fullCode.length < 6) {
      setError('Por favor complete los 6 dígitos del código de seguridad 2FA.');
      return;
    }

    setIsLoading(true);

    setTimeout(() => {
      const result = silogAuthService.verify2FA(pendingUser.id, fullCode, twoFactorMethod);
      setIsLoading(false);

      if (result.success && result.user) {
        setSuccessNotice('Acreditación de identidad militar exitosa. Ingresando...');
        setTimeout(() => {
          onLoginSuccess(result.user!);
        }, 350);
      } else {
        setError(result.message || 'Código 2FA incorrecto o expirado.');
      }
    }, 450);
  };

  // Reenviar código por radiomensajería simulada
  const handleResendRadioCode = () => {
    if (resendCooldown > 0) return;
    setResendCooldown(45);
    setSuccessNotice(`Código militar retransmitido al terminal C2 (${liveTokenData?.terminalId || 'RADIO-C2'}) y número satelital ${liveTokenData?.phoneMasked || ''}`);
    setTimeout(() => setSuccessNotice(null), 5000);
  };

  // Cancelar y volver al Paso 1
  const handleBackToCredentials = () => {
    setAuthStep('CREDENTIALS');
    setPendingUser(null);
    setOtpDigits(['', '', '', '', '', '']);
    setError(null);
    setSuccessNotice(null);
  };

  // Cargar credenciales desde el directorio asistido
  const handleSelectFromDirectory = (userUsername: string, userPasswordPlain: string) => {
    setUsername(userUsername);
    setPassword(userPasswordPlain);
    setIsCredentialDirOpen(false);
    setError(null);
    if (authStep === '2FA') {
      handleBackToCredentials();
    }
  };

  const copyToClipboard = (text: string, fieldId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldId);
    setTimeout(() => setCopiedField(null), 2000);
  };

  return (
    <div className="min-h-screen bg-[#050811] text-slate-100 flex flex-col justify-center items-center p-4 selection:bg-amber-500 selection:text-slate-950 relative overflow-hidden">
      
      {/* Fondo táctico: Grilla cibernética y pulso de radar sutil */}
      <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:28px_28px] opacity-25 pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] border border-amber-500/5 rounded-full pointer-events-none animate-ping [animation-duration:12s]" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[450px] h-[450px] border border-blue-500/10 rounded-full pointer-events-none" />
      <div className="absolute top-10 left-10 w-96 h-96 bg-amber-600/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-96 h-96 bg-cyan-600/5 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md md:max-w-lg relative z-10 space-y-6 my-6">
        
        {/* Cabecera Institucional y Dominio Oficial */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-amber-600 via-amber-700 to-amber-950 border border-amber-400/50 shadow-2xl shadow-amber-950/80 mb-1 group transition-transform hover:scale-105">
            <span className="text-4xl">📦</span>
          </div>
          
          <div className="flex flex-col items-center justify-center gap-1.5">
            <span className="text-[10px] font-mono font-bold px-3 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/30 uppercase tracking-widest">
              EJÉRCITO NACIONAL DE COLOMBIA • JELOG
            </span>
            <span className="text-[11px] font-mono font-bold px-3.5 py-1 rounded-full bg-blue-950/60 text-cyan-300 border border-cyan-500/40 shadow-inner flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              PORTAL OFICIAL: https://siloga.site
            </span>
          </div>

          <h1 className="text-xl md:text-2xl font-black text-white tracking-wider">
            SISTEMA INTEGRADO DE LOGÍSTICA OPERACIONAL
          </h1>

          {/* Stepper Doctrinal de Seguridad */}
          <div className="flex items-center justify-center gap-2 pt-1">
            <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-mono font-bold border transition ${
              authStep === 'CREDENTIALS' 
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-md shadow-amber-950/40' 
                : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
            }`}>
              <span>{authStep === 'CREDENTIALS' ? '●' : '✓'}</span>
              <span>1. Credenciales</span>
            </div>

            <span className="text-slate-600 text-xs">→</span>

            <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-mono font-bold border transition ${
              authStep === '2FA' 
                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50 shadow-md shadow-cyan-950/40 animate-pulse' 
                : 'bg-slate-900 text-slate-500 border-slate-800'
            }`}>
              <span>{authStep === '2FA' ? '●' : '○'}</span>
              <span>2. Doble Factor (2FA)</span>
            </div>
          </div>
        </div>

        {/* Tarjeta de Autenticación Principal */}
        <div className="bg-slate-900/95 border border-amber-500/30 rounded-2xl p-7 shadow-2xl backdrop-blur-md space-y-5 relative">
          
          {/* Cabecera del Cuadro de Login */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <span className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
              {authStep === 'CREDENTIALS' ? 'Paso 1: Validación Primaria' : 'Paso 2: Acreditación 2FA / OTP'}
            </span>
            <span className="text-[9px] font-mono px-2.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-cyan-400">
              SEGURIDAD S-4 / JELOG
            </span>
          </div>

          {/* Alerta de Error */}
          {error && (
            <div className="p-3.5 rounded-xl bg-red-950/80 border border-red-500/60 text-red-200 text-xs flex items-start gap-2.5 animate-in fade-in">
              <span className="text-base leading-none">⚠️</span>
              <div className="space-y-0.5">
                <span className="font-bold block">Fallo de Validación:</span>
                <span className="text-red-300">{error}</span>
              </div>
            </div>
          )}

          {/* Alerta de Éxito / Notificación */}
          {successNotice && (
            <div className="p-3.5 rounded-xl bg-emerald-950/80 border border-emerald-500/60 text-emerald-200 text-xs flex items-start gap-2.5 animate-in fade-in">
              <span className="text-base leading-none">✅</span>
              <div className="space-y-0.5">
                <span className="font-bold block">Estado de Seguridad:</span>
                <span className="text-emerald-300">{successNotice}</span>
              </div>
            </div>
          )}

          {/* ================================================================ */}
          {/* PASO 1: FORMULARIO DE CREDENCIALES PRIMARIAS                     */}
          {/* ================================================================ */}
          {authStep === 'CREDENTIALS' && (
            <form onSubmit={handleValidateCredentials} className="space-y-4">
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
                  <span className="text-[9px] font-mono text-slate-500 font-normal">Cifrado Militar AES-256</span>
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

              {/* Recordar Usuario y Enlace de Ayuda */}
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

              {/* Botón Principal: Validar y pasar a 2FA */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 bg-gradient-to-r from-amber-600 via-amber-700 to-amber-800 hover:from-amber-500 hover:to-amber-700 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-amber-950/60 transition-all flex items-center justify-center gap-2 disabled:opacity-50 mt-2 cursor-pointer active:scale-[0.99]"
              >
                <span>🔐</span>
                <span>{isLoading ? 'Verificando Credenciales...' : 'Validar Credenciales e Iniciar 2FA →'}</span>
              </button>
            </form>
          )}

          {/* ================================================================ */}
          {/* PASO 2: DOBLE FACTOR DE AUTENTICACIÓN (2FA / OTP MILITAR)        */}
          {/* ================================================================ */}
          {authStep === '2FA' && pendingUser && (
            <form onSubmit={handleVerify2FA} className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
              
              {/* Tarjeta de Resumen del Oficial Autenticado */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-600 to-amber-900 border border-amber-500/40 flex items-center justify-center text-sm font-black text-white shadow">
                    {pendingUser.rank}
                  </div>
                  <div>
                    <span className="text-xs font-bold text-white block">
                      {pendingUser.fullName}
                    </span>
                    <span className="text-[10px] text-amber-400 font-mono block">
                      {pendingUser.roleTitle}
                    </span>
                    <span className="text-[9px] text-slate-400 font-mono block">
                      Cédula: {pendingUser.militaryId} • Unidad: {pendingUser.unitName}
                    </span>
                  </div>
                </div>

                <span className="text-[9px] font-mono px-2 py-0.5 rounded font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  PASO 1 OK ✓
                </span>
              </div>

              {/* Selector de Método 2FA */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                  Seleccione Método de Doble Factor:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setTwoFactorMethod('TOTP_TACTICO')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition ${
                      twoFactorMethod === 'TOTP_TACTICO'
                        ? 'bg-amber-600/20 border-amber-500 text-amber-300'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <span>🛡️</span>
                    <span>Token Cripto (TOTP)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTwoFactorMethod('RADIO_SMS')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition ${
                      twoFactorMethod === 'RADIO_SMS'
                        ? 'bg-cyan-600/20 border-cyan-500 text-cyan-300'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <span>📻</span>
                    <span>Radiomensajería C2</span>
                  </button>
                </div>
              </div>

              {/* Cuadros de Entrada de los 6 Dígitos OTP */}
              <div className="space-y-2">
                <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider text-center">
                  Ingrese el Código de 6 Dígitos del Token:
                </label>

                <div className="flex items-center justify-center gap-2">
                  {otpDigits.map((digit, idx) => (
                    <input
                      key={idx}
                      ref={(el) => {
                        otpInputRefs.current[idx] = el;
                      }}
                      type="text"
                      inputMode="numeric"
                      maxLength={idx === 0 ? 6 : 1}
                      value={digit}
                      onChange={(e) => handleOtpChange(idx, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                      className="w-11 h-13 text-center text-lg font-black font-mono bg-slate-950 border border-slate-700 focus:border-amber-400 focus:ring-2 focus:ring-amber-500/30 text-white rounded-xl focus:outline-none transition shadow-inner"
                      placeholder="•"
                    />
                  ))}
                </div>
              </div>

              {/* Monitor Táctico de Token en Vivo (Para Demostración / Inspección) */}
              {liveTokenData && (
                <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-3 space-y-2">
                  <div className="flex items-center justify-between text-[10px] font-mono">
                    <span className="text-slate-400 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      Token Activo ({liveTokenData.terminalId}):
                    </span>
                    <span className="text-amber-400 font-bold">
                      Expira en: {liveTokenData.secondsRemaining}s
                    </span>
                  </div>

                  {/* Barra de progreso de tiempo restante */}
                  <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <div 
                      className="bg-amber-500 h-full transition-all duration-1000 ease-linear"
                      style={{ width: `${(liveTokenData.secondsRemaining / 30) * 100}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <div className="text-xs font-mono font-black text-cyan-300 tracking-widest bg-cyan-950/60 border border-cyan-800 px-3 py-1 rounded-lg">
                      {liveTokenData.code.slice(0, 3)} {liveTokenData.code.slice(3, 6)}
                    </div>

                    <button
                      type="button"
                      onClick={handleAutocompleteLiveToken}
                      className="py-1 px-2.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-lg text-[10px] font-bold transition flex items-center gap-1 cursor-pointer"
                    >
                      <span>⚡</span>
                      <span>Autocompletar Código</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Opción de Reenvío por Radiomensajería Satelital */}
              {twoFactorMethod === 'RADIO_SMS' && (
                <div className="text-center pt-1">
                  <button
                    type="button"
                    onClick={handleResendRadioCode}
                    disabled={resendCooldown > 0}
                    className="text-[11px] text-cyan-400 hover:text-cyan-300 disabled:text-slate-600 transition font-bold"
                  >
                    {resendCooldown > 0 
                      ? `Reenviar código por radio en ${resendCooldown}s` 
                      : '📡 Retransmitir nuevo código por radiomensajería satelital'}
                  </button>
                </div>
              )}

              {/* Botón Principal: Confirmar 2FA */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 bg-gradient-to-r from-emerald-600 via-teal-700 to-emerald-800 hover:from-emerald-500 hover:to-teal-600 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-emerald-950/60 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer active:scale-[0.99]"
              >
                <span>🛡️</span>
                <span>{isLoading ? 'Verificando Token Criptográfico...' : 'Confirmar 2FA e Ingresar a SILOGA'}</span>
              </button>

              {/* Botón Volver al Paso 1 */}
              <div className="text-center">
                <button
                  type="button"
                  onClick={handleBackToCredentials}
                  className="text-xs text-slate-400 hover:text-amber-300 transition flex items-center justify-center gap-1.5 mx-auto"
                >
                  <span>←</span>
                  <span>Volver a Credenciales / Cambiar Usuario</span>
                </button>
              </div>

            </form>
          )}

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

          {/* Avisos de Seguridad Criptográfica */}
          <div className="pt-3 border-t border-slate-800/80 text-center space-y-1">
            <span className="text-[10px] text-slate-500 block">
              Doble Factor Obligatorio según Directiva Permanente JELOG / MinDefensa 2026
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
      {/* Permite consultar las credenciales institucionales de cada cargo     */}
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
                  Consulte las credenciales registradas. Al seleccionar una cuenta, se cargará en el formulario para pasar por la validación 2FA:
                </p>
              </div>
              <button
                onClick={() => setIsCredentialDirOpen(false)}
                className="text-slate-400 hover:text-white text-lg p-1 transition cursor-pointer"
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
                    className={`text-[10px] font-bold px-2 py-1 rounded-md transition cursor-pointer ${
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
                        <span>Cargar Credenciales</span>
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
                          className="text-[10px] text-slate-400 hover:text-white px-1.5 py-0.5 rounded bg-slate-800 cursor-pointer"
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
                          className="text-[10px] text-slate-400 hover:text-white px-1.5 py-0.5 rounded bg-slate-800 cursor-pointer"
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
                          className="text-[10px] text-slate-400 hover:text-white px-1.5 py-0.5 rounded bg-slate-800 cursor-pointer"
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
              <span>Haga clic en <strong>"Cargar Credenciales"</strong> para pegarlas en el formulario y pasar a la autenticación 2FA.</span>
              <button
                type="button"
                onClick={() => setIsCredentialDirOpen(false)}
                className="py-1 px-3 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition cursor-pointer"
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
