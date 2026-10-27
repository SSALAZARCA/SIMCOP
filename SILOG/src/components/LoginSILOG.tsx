import React, { useState, useEffect, useRef } from 'react';
import { silogAuthService } from '../services/silogAuthService';
import { SilogUser } from '../types';

interface LoginSILOGProps {
  onLoginSuccess: (user: SilogUser) => void;
}

export const LoginSILOG: React.FC<LoginSILOGProps> = ({ onLoginSuccess }) => {
  // Flujo: Paso 1 (Credenciales) o Paso 2 (Doble Factor 2FA)
  const [authStep, setAuthStep] = useState<'CREDENTIALS' | '2FA'>('CREDENTIALS');
  const [pendingUser, setPendingUser] = useState<SilogUser | null>(null);

  // Campos Paso 1: Credenciales SuperAdmin
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberUser, setRememberUser] = useState(false);

  // Campos Paso 2: Doble Factor (2FA)
  const [twoFactorMethod, setTwoFactorMethod] = useState<'TOTP_TACTICO' | 'RADIO_SMS'>('TOTP_TACTICO');
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [resendCooldown, setResendCooldown] = useState<number>(0);
  const [liveTokenData, setLiveTokenData] = useState<{ code: string; secondsRemaining: number; phoneMasked: string; terminalId: string } | null>(null);

  // Estados de validación
  const [error, setError] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Referencias a inputs de dígitos OTP
  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Timer para actualizar en tiempo real el token TOTP dinámico de 30s
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

  // Timer para cuenta regresiva de reenvío por radiomensajería
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => {
      setResendCooldown(prev => prev - 1);
    }, 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  // PASO 1: Validación de Credenciales Primarias
  const handleValidateCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessNotice(null);

    if (!username.trim()) {
      setError('Por favor ingrese su usuario o cédula de Super Administrador.');
      return;
    }

    if (!password.trim()) {
      setError('Por favor ingrese su clave criptográfica de Super Administrador.');
      return;
    }

    setIsLoading(true);

    try {
      const result = await silogAuthService.validatePrimaryCredentials(username, password);
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
        setTimeout(() => {
          otpInputRefs.current[0]?.focus();
        }, 150);
      } else {
        setError(result.message || 'Credenciales inválidas de Super Administrador.');
      }
    } catch {
      setIsLoading(false);
      setError('Error de comunicación con el servidor de seguridad.');
    }
  };

  // PASO 2: Manejo de casillas de 6 dígitos con auto-avance
  const handleOtpChange = (index: number, value: string) => {
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

    if (digit && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  const handleAutocompleteLiveToken = () => {
    if (!liveTokenData) return;
    const digits = liveTokenData.code.split('');
    setOtpDigits(digits);
    setError(null);
    otpInputRefs.current[5]?.focus();
  };

  const handleVerify2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pendingUser) return;
    setError(null);

    const fullCode = otpDigits.join('');
    if (fullCode.length < 6) {
      setError('Complete los 6 dígitos del código de seguridad 2FA.');
      return;
    }

    setIsLoading(true);

    try {
      const result = await silogAuthService.verify2FA(pendingUser.id, fullCode, twoFactorMethod);
      setIsLoading(false);

      if (result.success && result.user) {
        setSuccessNotice('Identidad de Super Administrador confirmada. Ingresando...');
        setTimeout(() => {
          onLoginSuccess(result.user!);
        }, 300);
      } else {
        setError(result.message || 'Código 2FA incorrecto o expirado.');
      }
    } catch {
      setIsLoading(false);
      setError('Error validando token con el servidor central.');
    }
  };

  const handleResendRadioCode = () => {
    if (resendCooldown > 0) return;
    setResendCooldown(45);
    setSuccessNotice(`Código militar retransmitido al terminal satelital del Super Administrador (${liveTokenData?.terminalId || 'TERMINAL-C2'}).`);
    setTimeout(() => setSuccessNotice(null), 5000);
  };

  const handleBackToCredentials = () => {
    setAuthStep('CREDENTIALS');
    setPendingUser(null);
    setOtpDigits(['', '', '', '', '', '']);
    setError(null);
    setSuccessNotice(null);
  };

  return (
    <div className="min-h-screen bg-[#060810] text-slate-100 flex flex-col justify-between selection:bg-amber-500 selection:text-slate-950 font-sans relative overflow-hidden">
      
      {/* Background Decorativo Militar: Grid táctico y halos cibernéticos */}
      <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:32px_32px] opacity-20 pointer-events-none" />
      <div className="absolute -top-40 -left-40 w-[600px] h-[600px] bg-amber-600/5 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-[600px] h-[600px] bg-blue-600/5 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute top-1/2 left-1/3 -translate-y-1/2 w-[800px] h-[800px] bg-emerald-500/[0.02] rounded-full blur-[180px] pointer-events-none" />

      {/* Barra Superior Institucional */}
      <header className="w-full border-b border-slate-800/80 bg-slate-950/70 backdrop-blur-md px-6 py-3 relative z-20">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Escudo Heráldico Militar */}
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 via-amber-700 to-amber-950 p-[1px] shadow-lg shadow-amber-950/40 flex items-center justify-center">
              <div className="w-full h-full bg-[#070a13] rounded-[11px] flex items-center justify-center">
                <svg className="w-5 h-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black tracking-widest text-white uppercase">SILOGA</span>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/25">
                  SUPERADMINISTRADOR
                </span>
              </div>
              <span className="text-[10px] text-slate-400 tracking-wider font-medium block">
                Comando General de las Fuerzas Militares • JELOG
              </span>
            </div>
          </div>

          {/* Estado de Seguridad y Dominio Oficial */}
          <div className="flex items-center gap-3">
            <a 
              href="https://siloga.site" 
              target="_blank" 
              rel="noreferrer"
              className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900 border border-slate-700 hover:border-amber-500/50 text-[11px] font-mono text-cyan-300 transition group"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>https://siloga.site</span>
              <span className="text-slate-500 group-hover:text-cyan-300 transition">↗</span>
            </a>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-900/80 border border-slate-800 text-[10px] font-mono text-slate-300">
              <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <span>TLS 256-bit</span>
            </div>
          </div>
        </div>
      </header>

      {/* Contenedor Principal: Split-Screen Hero y Consola de SuperAdmin */}
      <main className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12 flex-1 flex items-center justify-center relative z-10">
        <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          
          {/* Columna Izquierda: Identidad Doctrinal y Mando Operativo */}
          <div className="hidden lg:flex lg:col-span-7 flex-col justify-center space-y-8 pr-6">
            
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gradient-to-r from-amber-500/10 via-amber-500/20 to-transparent border border-amber-500/30 text-amber-300 text-xs font-mono font-bold tracking-wider">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                CONSOLA DE MANDO SUPREMO LOGÍSTICO (C2)
              </div>

              <h1 className="text-3xl xl:text-4xl font-black text-white tracking-tight leading-tight">
                Sistema Integrado de Logística Operacional y Gestión de Almacenes
              </h1>

              <p className="text-sm text-slate-300/90 leading-relaxed max-w-xl">
                Centro de comando de inventarios, polvorines estratégicos, reportes SAP MM, 
                auditoría balística de kárdex y abastecimiento integral de la fuerza con acreditación 
                de Super Administrador.
              </p>
            </div>

            {/* Tarjetas de Control Central */}
            <div className="grid grid-cols-3 gap-4 max-w-xl">
              <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 backdrop-blur-sm">
                <div className="flex items-center gap-2 text-amber-400 mb-1">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                  <span className="text-[10px] font-mono uppercase font-bold tracking-wider text-slate-400">Jurisdicción</span>
                </div>
                <span className="text-2xl font-black text-white">Nacional</span>
                <span className="text-[10px] text-slate-400 block mt-0.5">Todas las Brigadas</span>
              </div>

              <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 backdrop-blur-sm">
                <div className="flex items-center gap-2 text-cyan-400 mb-1">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                  </svg>
                  <span className="text-[10px] font-mono uppercase font-bold tracking-wider text-slate-400">Seguridad</span>
                </div>
                <span className="text-2xl font-black text-white">2FA Militar</span>
                <span className="text-[10px] text-emerald-400 font-bold block mt-0.5">TOTP + Master C2</span>
              </div>

              <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 backdrop-blur-sm">
                <div className="flex items-center gap-2 text-emerald-400 mb-1">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  <span className="text-[10px] font-mono uppercase font-bold tracking-wider text-slate-400">Autorización</span>
                </div>
                <span className="text-2xl font-black text-white">Irrestricta</span>
                <span className="text-[10px] text-slate-400 block mt-0.5">Mando Supremo</span>
              </div>
            </div>

            {/* Credenciales de Seguridad del SuperAdmin */}
            <div className="flex items-center gap-3 p-3.5 rounded-xl bg-slate-950/80 border border-slate-800/80 max-w-xl">
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <p className="text-xs text-slate-400 leading-normal">
                <strong className="text-slate-200">Consola Protegida:</strong> Acceso reservado exclusivamente para el Super Administrador (<span className="font-mono text-amber-300">santiago.salazar</span>). Sesión monitoreada por el sistema de contramedidas ciberdefensa de SIMCOP.
              </p>
            </div>

          </div>

          {/* Columna Derecha: Tarjeta de Acceso del SuperAdmin */}
          <div className="lg:col-span-5 w-full max-w-md mx-auto">
            <div className="bg-[#0b0f19]/95 border border-slate-800 hover:border-slate-700/80 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl transition duration-300 relative">
              
              {/* Resplandor ámbar militar en la parte superior */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-1 bg-gradient-to-r from-transparent via-amber-500/80 to-transparent rounded-full" />

              {/* Encabezado */}
              <div className="space-y-4 mb-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
                    <span className="text-xs font-mono font-bold uppercase tracking-wider text-amber-400">
                      {authStep === 'CREDENTIALS' ? 'Acceso SuperAdmin' : 'Verificación 2FA'}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-purple-300 font-bold">
                    ULTRASECRETO
                  </span>
                </div>

                <div>
                  <h2 className="text-xl font-black text-white tracking-wide">
                    {authStep === 'CREDENTIALS' ? 'Iniciar Sesión' : 'Segundo Factor de Seguridad'}
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    {authStep === 'CREDENTIALS' 
                      ? 'Ingrese sus credenciales de Super Administrador.' 
                      : 'Confirme su identidad con el token criptográfico táctico.'}
                  </p>
                </div>

                {/* Stepper Visual */}
                <div className="flex items-center gap-2 pt-1">
                  <div className={`flex-1 h-1.5 rounded-full transition-all duration-300 ${
                    authStep === 'CREDENTIALS' ? 'bg-amber-500 shadow-sm shadow-amber-500/50' : 'bg-emerald-500'
                  }`} />
                  <div className={`flex-1 h-1.5 rounded-full transition-all duration-300 ${
                    authStep === '2FA' ? 'bg-cyan-400 shadow-sm shadow-cyan-400/50' : 'bg-slate-800'
                  }`} />
                </div>
              </div>

              {/* Mensajes de Error Contextuales */}
              {error && (
                <div className="mb-5 p-3.5 rounded-xl bg-red-950/70 border border-red-500/50 text-red-200 text-xs flex items-start gap-3 animate-in fade-in duration-200">
                  <svg className="w-5 h-5 text-red-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <div className="space-y-0.5">
                    <span className="font-bold block text-red-300">Aviso de Seguridad:</span>
                    <span className="text-red-200/90 leading-relaxed">{error}</span>
                  </div>
                </div>
              )}

              {/* Mensajes de Éxito Contextuales */}
              {successNotice && (
                <div className="mb-5 p-3.5 rounded-xl bg-emerald-950/70 border border-emerald-500/50 text-emerald-200 text-xs flex items-start gap-3 animate-in fade-in duration-200">
                  <svg className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div className="space-y-0.5">
                    <span className="font-bold block text-emerald-300">Confirmación:</span>
                    <span className="text-emerald-200/90 leading-relaxed">{successNotice}</span>
                  </div>
                </div>
              )}

              {/* ============================================================ */}
              {/* PASO 1: FORMULARIO DE CREDENCIALES DEL SUPERADMIN            */}
              {/* ============================================================ */}
              {authStep === 'CREDENTIALS' && (
                <form onSubmit={handleValidateCredentials} noValidate autoComplete="off" className="space-y-4">
                  {/* Campo: Usuario / Cédula Militar */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-2">
                      Usuario o Cédula Militar
                    </label>
                    <div className="relative flex items-center">
                      <div className="absolute left-3.5 text-slate-400 pointer-events-none z-10">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </div>
                      <input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="Ingrese su usuario o cédula militar"
                        autoComplete="off"
                        autoCorrect="off"
                        autoCapitalize="off"
                        spellCheck={false}
                        style={{ backgroundColor: '#070a13', color: '#ffffff', caretColor: '#f59e0b' }}
                        className="w-full !bg-[#070a13] !text-white border border-slate-700/80 focus:border-amber-500 focus:ring-1 focus:ring-amber-500/50 text-xs rounded-xl pl-11 pr-4 py-3.5 focus:outline-none transition shadow-inner font-mono placeholder:text-slate-500"
                      />
                    </div>
                  </div>

                  {/* Campo: Contraseña / Clave Criptográfica */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-2">
                      Contraseña de Seguridad
                    </label>
                    <div className="relative flex items-center">
                      <div className="absolute left-3.5 text-slate-400 pointer-events-none z-10">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                      </div>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Ingrese su contraseña"
                        autoComplete="new-password"
                        autoCorrect="off"
                        autoCapitalize="off"
                        spellCheck={false}
                        style={{ backgroundColor: '#070a13', color: '#ffffff', caretColor: '#f59e0b' }}
                        className="w-full !bg-[#070a13] !text-white border border-slate-700/80 focus:border-amber-500 focus:ring-1 focus:ring-amber-500/50 text-xs rounded-xl pl-11 pr-11 py-3.5 focus:outline-none transition shadow-inner font-mono placeholder:text-slate-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 text-slate-400 hover:text-amber-400 transition cursor-pointer p-1 z-10"
                        title={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                      >
                        {showPassword ? (
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                          </svg>
                        ) : (
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Recordar Terminal */}
                  <div className="flex items-center justify-between text-xs pt-1">
                    <label className="flex items-center gap-2 cursor-pointer text-slate-400 hover:text-slate-200">
                      <input
                        type="checkbox"
                        checked={rememberUser}
                        onChange={(e) => setRememberUser(e.target.checked)}
                        className="w-3.5 h-3.5 rounded bg-[#070a13] border-slate-700 text-amber-500 focus:ring-0 cursor-pointer"
                      />
                      <span className="text-[11px]">Recordar terminal seguro</span>
                    </label>

                    <span className="text-[10px] font-mono text-emerald-400">
                      ● C2 Activo
                    </span>
                  </div>

                  {/* Botón Principal: Validar Credenciales */}
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-3.5 px-4 bg-gradient-to-r from-amber-600 via-amber-500 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-amber-950/60 transition-all flex items-center justify-center gap-2 disabled:opacity-50 mt-4 cursor-pointer active:scale-[0.99]"
                  >
                    {isLoading ? (
                      <>
                        <svg className="w-4 h-4 animate-spin text-slate-950" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                        </svg>
                        <span>Verificando SuperAdmin...</span>
                      </>
                    ) : (
                      <>
                        <span>Autenticar SuperAdmin e Iniciar 2FA</span>
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                        </svg>
                      </>
                    )}
                  </button>
                </form>
              )}

              {/* ============================================================ */}
              {/* PASO 2: VERIFICACIÓN 2FA (OTP MILITAR DE 6 DÍGITOS)         */}
              {/* ============================================================ */}
              {authStep === '2FA' && pendingUser && (
                <form onSubmit={handleVerify2FA} noValidate className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
                  
                  {/* Tarjeta de Resumen del SuperAdmin */}
                  <div className="bg-[#070a13] border border-amber-500/30 rounded-2xl p-3.5 flex items-center justify-between gap-3 shadow-inner">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-800 border border-amber-400/50 flex items-center justify-center text-sm font-black text-slate-950 shadow">
                        MG.
                      </div>
                      <div>
                        <span className="text-xs font-bold text-white block">
                          {pendingUser.fullName}
                        </span>
                        <span className="text-[10px] text-amber-400 font-mono block">
                          Super Administrador • JELOG
                        </span>
                        <span className="text-[9px] text-slate-400 font-mono block">
                          Cédula: {pendingUser.militaryId} • Acreditación ULTRASECRETO
                        </span>
                      </div>
                    </div>

                    <span className="text-[9px] font-mono px-2 py-0.5 rounded-full font-bold bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 whitespace-nowrap">
                      Paso 1 OK ✓
                    </span>
                  </div>

                  {/* Selector de Método 2FA */}
                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                      Método de Doble Factor
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setTwoFactorMethod('TOTP_TACTICO')}
                        className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer ${
                          twoFactorMethod === 'TOTP_TACTICO'
                            ? 'bg-amber-500/15 border-amber-500 text-amber-300 shadow-sm'
                            : 'bg-[#070a13] border-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                        </svg>
                        <span>Token TOTP</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setTwoFactorMethod('RADIO_SMS')}
                        className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer ${
                          twoFactorMethod === 'RADIO_SMS'
                            ? 'bg-cyan-500/15 border-cyan-500 text-cyan-300 shadow-sm'
                            : 'bg-[#070a13] border-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                        <span>Radiomensajería</span>
                      </button>
                    </div>
                  </div>

                  {/* Entrada de los 6 Dígitos OTP */}
                  <div className="space-y-2">
                    <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider text-center">
                      Código de 6 Dígitos del Token
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
                          autoComplete="off"
                          style={{ backgroundColor: '#070a13', color: '#ffffff', caretColor: '#06b6d4' }}
                          className="w-11 sm:w-12 h-14 text-center text-xl font-black font-mono !bg-[#070a13] !text-white border border-slate-700/80 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/50 rounded-xl focus:outline-none transition shadow-inner"
                          placeholder="-"
                        />
                      ))}
                    </div>
                  </div>

                  {/* Monitor Táctico del Token en Vivo */}
                  {liveTokenData && (
                    <div className="bg-[#070a13] border border-slate-800 rounded-xl p-3.5 space-y-2.5">
                      <div className="flex items-center justify-between text-[10px] font-mono">
                        <span className="text-slate-400 flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                          <span>Terminal Táctico ({liveTokenData.terminalId}):</span>
                        </span>
                        <span className="text-amber-400 font-bold">
                          {liveTokenData.secondsRemaining}s
                        </span>
                      </div>

                      {/* Barra de progreso de cuenta regresiva de 30s */}
                      <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden">
                        <div 
                          className="bg-gradient-to-r from-amber-500 to-cyan-400 h-full transition-all duration-1000 ease-linear"
                          style={{ width: `${(liveTokenData.secondsRemaining / 30) * 100}%` }}
                        />
                      </div>

                      <div className="flex items-center justify-between pt-1">
                        <div className="text-xs font-mono font-black text-cyan-300 tracking-widest bg-cyan-950/40 border border-cyan-800/60 px-3 py-1 rounded-lg">
                          {liveTokenData.code.slice(0, 3)} {liveTokenData.code.slice(3, 6)}
                        </div>

                        <button
                          type="button"
                          onClick={handleAutocompleteLiveToken}
                          className="py-1 px-2.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-lg text-[10px] font-bold transition flex items-center gap-1 cursor-pointer"
                        >
                          <svg className="w-3 h-3 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                          </svg>
                          <span>Autocompletar Código</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Opción de Reenvío Satelital */}
                  {twoFactorMethod === 'RADIO_SMS' && (
                    <div className="text-center pt-1">
                      <button
                        type="button"
                        onClick={handleResendRadioCode}
                        disabled={resendCooldown > 0}
                        className="text-[11px] text-cyan-400 hover:text-cyan-300 disabled:text-slate-600 transition font-bold cursor-pointer"
                      >
                        {resendCooldown > 0 
                          ? `Retransmitir en ${resendCooldown}s` 
                          : '📡 Retransmitir nuevo código por radiomensajería'}
                      </button>
                    </div>
                  )}

                  {/* Botón Principal: Confirmar 2FA */}
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-3.5 px-4 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-500 hover:to-teal-500 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-emerald-950/60 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer active:scale-[0.99]"
                  >
                    {isLoading ? (
                      <>
                        <svg className="w-4 h-4 animate-spin text-slate-950" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                        </svg>
                        <span>Verificando Token...</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                        </svg>
                        <span>Confirmar 2FA e Ingresar a SILOGA</span>
                      </>
                    )}
                  </button>

                  {/* Botón Volver al Paso 1 */}
                  <div className="text-center pt-1">
                    <button
                      type="button"
                      onClick={handleBackToCredentials}
                      className="text-xs text-slate-400 hover:text-amber-300 transition flex items-center justify-center gap-1.5 mx-auto cursor-pointer"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                      </svg>
                      <span>Volver a Credenciales / Cambiar Usuario</span>
                    </button>
                  </div>

                </form>
              )}

            </div>
          </div>

        </div>
      </main>

      {/* Footer Institucional */}
      <footer className="w-full border-t border-slate-800/80 bg-slate-950/80 backdrop-blur-md px-6 py-4 relative z-20 text-center">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-[10px] text-slate-500 font-mono">
          <span>SISTEMA INTEGRADO DE LOGÍSTICA OPERACIONAL (SILOGA) • COMANDO GENERAL FF.MM.</span>
          <span className="text-slate-400">EJÉRCITO NACIONAL DE COLOMBIA • 2026</span>
        </div>
      </footer>

    </div>
  );
};
