import React, { useState, useEffect, useMemo } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { 
  MessageSquare, 
  Smartphone, 
  QrCode, 
  RefreshCw, 
  CheckCircle2, 
  AlertTriangle, 
  X, 
  Send, 
  PhoneCall, 
  ShieldAlert, 
  Radio, 
  Target, 
  Crosshair,
  LogOut,
  Clock,
  Lock,
  KeyRound
} from 'lucide-react';
import type { User, ArtilleryPiece } from '../types';
import { whatsAppService, type WhatsAppStatus } from '../services/whatsAppService';

interface WhatsAppConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  allUsers: User[];
  artilleryPieces: ArtilleryPiece[];
  onUpdateUserPhone: (userId: string, phoneNumber: string) => Promise<boolean>;
}

export const WhatsAppConfigModal: React.FC<WhatsAppConfigModalProps> = ({
  isOpen,
  onClose,
  allUsers,
  artilleryPieces,
  onUpdateUserPhone
}) => {
  const [status, setStatus] = useState<WhatsAppStatus>({
    instanceName: 'SIMCOP_CENTRAL',
    status: 'connecting',
    connected: false
  });
  const [loadingStatus, setLoadingStatus] = useState<boolean>(true);
  const [qrBase64, setQrBase64] = useState<string | null>(null);
  const [qrCodeString, setQrCodeString] = useState<string | null>(null);
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [loadingQr, setLoadingQr] = useState<boolean>(false);
  const [qrError, setQrError] = useState<string | null>(null);

  // Estados de prueba
  const [testPhone, setTestPhone] = useState<string>('');
  const [testMessage, setTestMessage] = useState<string>('🔔 [SIMCOP TÁCTICO] Prueba de enlace operacional militar vía WhatsApp.');
  const [testSending, setTestSending] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{ success?: boolean; text?: string } | null>(null);

  // Estados de teléfonos de usuarios
  const [phoneMap, setPhoneMap] = useState<Record<string, string>>({});
  const [savingUser, setSavingUser] = useState<Record<string, boolean>>({});
  const [testUserStatus, setTestUserStatus] = useState<Record<string, 'sending' | 'success' | 'error' | null>>({});

  useEffect(() => {
    if (isOpen) {
      loadStatus();
      // Inicializar mapa de teléfonos
      const initial: Record<string, string> = {};
      allUsers.forEach(u => {
        if (u.phoneNumber) initial[u.id] = u.phoneNumber;
      });
      setPhoneMap(initial);
    }
  }, [isOpen, allUsers]);

  const loadStatus = async () => {
    setLoadingStatus(true);
    try {
      const res = await whatsAppService.getStatus();
      setStatus(res);
      if (res.connected) {
        setQrBase64(null);
      }
    } catch {
      setStatus({ instanceName: 'SIMCOP_CENTRAL', status: 'disconnected', connected: false });
    } finally {
      setLoadingStatus(false);
    }
  };

  const handleGenerateQr = async () => {
    setLoadingQr(true);
    setQrError(null);
    setQrBase64(null);
    setQrCodeString(null);
    setPairingCode(null);
    try {
      const res = await whatsAppService.getQrCode();
      if (res.connected) {
        setStatus(prev => ({ ...prev, status: 'open', connected: true }));
        setQrBase64(null);
        setQrCodeString(null);
        setPairingCode(null);
        return;
      }

      if (res.success && (res.qrcode || res.code || res.pairingCode)) {
        if (res.qrcode) setQrBase64(res.qrcode);
        if (res.code) setQrCodeString(res.code);
        if (res.pairingCode) setPairingCode(res.pairingCode);
      } else {
        setQrError(res.error || 'No se pudo obtener el código QR de Evolution API.');
      }
    } catch (e: any) {
      setQrError(e.message || 'Error de conexión con Evolution API');
    } finally {
      setLoadingQr(false);
    }
  };

  const handleDisconnect = async () => {
    if (!window.confirm('¿Está seguro de que desea desconectar la línea oficial de WhatsApp?')) return;
    setLoadingStatus(true);
    await whatsAppService.disconnect();
    setQrBase64(null);
    setQrCodeString(null);
    setPairingCode(null);
    await loadStatus();
  };

  const handleSendQuickTest = async () => {
    if (!testPhone.trim()) {
      alert('Por favor ingrese un número telefónico de destino.');
      return;
    }
    setTestSending(true);
    setTestResult(null);
    try {
      const res = await whatsAppService.sendTestMessage(testPhone.trim(), testMessage.trim());
      if (res.success) {
        setTestResult({ success: true, text: '¡Mensaje despachado y recibido con éxito!' });
      } else {
        setTestResult({ success: false, text: res.error || 'Fallo al despachar mensaje.' });
      }
    } catch (e: any) {
      setTestResult({ success: false, text: e.message || 'Error en envío' });
    } finally {
      setTestSending(false);
    }
  };

  const handleSavePhone = async (userId: string) => {
    const raw = phoneMap[userId] || '';
    setSavingUser(prev => ({ ...prev, [userId]: true }));
    try {
      const ok = await onUpdateUserPhone(userId, raw.trim());
      if (ok) {
        alert('Número de WhatsApp militar guardado.');
      } else {
        alert('Error al guardar el número telefónico.');
      }
    } finally {
      setSavingUser(prev => ({ ...prev, [userId]: false }));
    }
  };

  const handleTestUserPhone = async (userId: string) => {
    const phone = phoneMap[userId]?.trim();
    if (!phone) {
      alert('Guarde un número telefónico antes de probar.');
      return;
    }
    setTestUserStatus(prev => ({ ...prev, [userId]: 'sending' }));
    const res = await whatsAppService.sendTestMessage(phone, '🎯 [SIMCOP ARTILLERÍA] Enlace balístico con Director de Tiro / Pieza verificado.');
    setTestUserStatus(prev => ({ ...prev, [userId]: res.success ? 'success' : 'error' }));
    setTimeout(() => {
      setTestUserStatus(prev => ({ ...prev, [userId]: null }));
    }, 4000);
  };

  // Filtrar directores de tiro, comandantes y administradores
  const tacticalOfficers = useMemo(() => {
    return allUsers.filter(u => 
      u.role.startsWith('Director de Tiro') || 
      u.role.includes('Comandante') || 
      u.role === 'ADMINISTRATOR' ||
      u.role.includes('Artillería')
    );
  }, [allUsers]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-5xl bg-[#0b0f19] border border-blue-500/30 rounded-xl shadow-2xl shadow-blue-950/40 flex flex-col max-h-[92vh] overflow-hidden text-slate-200 font-sans">
        
        {/* ENCABEZADO TÁCTICO */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-slate-900 via-[#0d1627] to-slate-900 border-b border-blue-500/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold tracking-wide uppercase text-white font-mono">
                  Centro de Notificaciones WhatsApp (Evolution API)
                </h2>
                {status.connected ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    EN LÍNEA
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/40">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                    DESCONECTADO
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">
                Mensajería Unificada en Tiempo Real para <strong className="text-blue-400">SIMCOP</strong>, <strong className="text-emerald-400">SIGEP</strong> y <strong className="text-amber-400">SILOGA</strong>
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* CONTENIDO PRINCIPAL */}
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* COLUMNA IZQUIERDA: ESTADO DE LÍNEA, ESCANEO QR Y PRUEBA */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* ESTADO DE INSTANCIA */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-blue-400" />
                  <span className="text-xs font-mono font-bold uppercase text-slate-300">Línea Militar Central</span>
                </div>
                <button
                  onClick={loadStatus}
                  disabled={loadingStatus}
                  className="flex items-center gap-1 text-[11px] text-blue-400 hover:text-blue-300 transition-colors"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingStatus ? 'animate-spin' : ''}`} />
                  Actualizar
                </button>
              </div>

              <div className="bg-[#070b13] p-3 rounded border border-slate-800/80 space-y-2 text-xs font-mono">
                <div className="flex justify-between">
                  <span className="text-slate-500">Instancia:</span>
                  <span className="text-slate-200 font-bold">{status.instanceName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Motor:</span>
                  <span className="text-emerald-400 font-bold">Evolution API v2 (Baileys)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Estado de Enlace:</span>
                  <span className={status.connected ? "text-emerald-400 font-bold" : "text-amber-400 font-bold"}>
                    {status.connected ? 'Sesión Activa y Operacional' : 'Esperando Escaneo de QR'}
                  </span>
                </div>
              </div>

              {/* ACCIONES DE CONEXIÓN */}
              <div className="mt-4">
                {status.connected ? (
                  <button
                    onClick={handleDisconnect}
                    className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/40 text-xs font-bold transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    Desconectar o Rotar Línea WhatsApp
                  </button>
                ) : (
                  <button
                    onClick={handleGenerateQr}
                    disabled={loadingQr}
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg shadow-blue-900/30 transition-all disabled:opacity-50"
                  >
                    <QrCode className="w-4 h-4" />
                    {loadingQr ? 'Generando Código QR...' : 'Vincular Teléfono (Generar Código QR)'}
                  </button>
                )}
              </div>

              {/* RENDERIZADO DEL CÓDIGO QR / CÓDIGO DE VINCULACIÓN */}
              {(qrBase64 || qrCodeString || pairingCode) && !status.connected && (
                <div className="mt-4 p-4 bg-white rounded-lg flex flex-col items-center justify-center shadow-inner text-slate-800">
                  <p className="text-[11px] text-slate-900 font-mono font-bold mb-2 text-center">
                    Escanee este código desde WhatsApp:
                    <br />
                    <span className="text-slate-600 font-normal">Ajustes &gt; Dispositivos vinculados</span>
                  </p>

                  {qrBase64 ? (
                    <img 
                      src={qrBase64.startsWith('data:') ? qrBase64 : `data:image/png;base64,${qrBase64}`} 
                      alt="Código QR de Vinculación WhatsApp" 
                      className="w-56 h-56 object-contain"
                    />
                  ) : qrCodeString ? (
                    <div className="p-3 bg-white rounded-lg border border-slate-200">
                      <QRCodeSVG value={qrCodeString} size={210} level="M" />
                    </div>
                  ) : null}

                  {pairingCode && (
                    <div className="mt-3 w-full bg-slate-100 p-2.5 rounded border border-slate-300 text-center">
                      <div className="flex items-center justify-center gap-1.5 text-[10px] text-slate-600 font-bold uppercase mb-1">
                        <KeyRound className="w-3 h-3 text-blue-600" />
                        <span>Código Numérico Alternativo:</span>
                      </div>
                      <span className="text-base font-mono font-black text-blue-900 tracking-widest select-all">
                        {pairingCode}
                      </span>
                      <p className="text-[9px] text-slate-500 mt-0.5">
                        En WhatsApp: Vincular con el número de teléfono
                      </p>
                    </div>
                  )}

                  <span className="text-[10px] text-slate-500 mt-2 font-mono text-center">
                    El código se renueva automáticamente al escanear
                  </span>
                </div>
              )}

              {qrError && (
                <div className="mt-3 p-3 rounded bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{qrError}</span>
                </div>
              )}
            </div>

            {/* CAJA DE PRUEBA RÁPIDA */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <Send className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-mono font-bold uppercase text-slate-300">Prueba Inmediata de Mensaje</span>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-[11px] text-slate-400 font-mono mb-1">
                    Número Celular (con o sin indicativo 57)
                  </label>
                  <input
                    type="text"
                    value={testPhone}
                    onChange={(e) => setTestPhone(e.target.value)}
                    placeholder="Ej: 3101234567 o 573101234567"
                    className="w-full bg-[#070b13] border border-slate-700 rounded p-2 text-xs text-white outline-none focus:border-blue-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] text-slate-400 font-mono mb-1">
                    Cuerpo del Mensaje
                  </label>
                  <textarea
                    rows={2}
                    value={testMessage}
                    onChange={(e) => setTestMessage(e.target.value)}
                    className="w-full bg-[#070b13] border border-slate-700 rounded p-2 text-xs text-white outline-none focus:border-blue-500"
                  />
                </div>

                <button
                  onClick={handleSendQuickTest}
                  disabled={testSending || !status.connected}
                  className="w-full py-2 px-3 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all disabled:opacity-40"
                >
                  <Send className="w-3.5 h-3.5" />
                  {testSending ? 'Despachando por WhatsApp...' : 'Enviar Mensaje de Prueba'}
                </button>

                {!status.connected && (
                  <p className="text-[11px] text-amber-400/90 italic text-center">
                    * Debe vincular el WhatsApp escaneando el QR para realizar envíos.
                  </p>
                )}

                {testResult && (
                  <div className={`p-2.5 rounded text-xs flex items-center gap-2 ${testResult.success ? 'bg-emerald-950/40 border border-emerald-500/40 text-emerald-300' : 'bg-rose-950/40 border border-rose-500/40 text-rose-300'}`}>
                    {testResult.success ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
                    <span>{testResult.text}</span>
                  </div>
                )}
              </div>
            </div>

          </div>

          {/* COLUMNA DERECHA: ASIGNACIÓN DE NÚMEROS A DIRECTORES DE TIRO Y PIEZAS */}
          <div className="lg:col-span-7 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Crosshair className="w-4 h-4 text-amber-400" />
                <h3 className="text-xs font-mono font-bold uppercase text-white tracking-wider">
                  Receptores Tácticos (CDT, Piezas de Artillería y Plana Mayor)
                </h3>
              </div>
              <span className="text-[11px] font-mono text-slate-400">
                {tacticalOfficers.length} Oficiales / Puestos Asignados
              </span>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Configure el número de WhatsApp para que cada <strong>Director de Tiro (CDT)</strong> y <strong>Comandante de Pieza</strong> reciba la alerta balística en tiempo real cuando se autorice una misión de fuego en SIMCOP o se firme un movimiento de armamento en SILOGA.
            </p>

            <div className="space-y-3 max-h-[52vh] overflow-y-auto pr-1">
              {tacticalOfficers.map(officer => {
                const assignedPieces = artilleryPieces.filter(p => p.directorTiroId === officer.id || p.commanderId === officer.id);
                const testStatus = testUserStatus[officer.id];
                const isSaving = savingUser[officer.id];

                return (
                  <div key={officer.id} className="bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition-colors rounded-lg p-3.5 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-blue-300">{officer.displayName}</span>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                            {officer.role}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          Usuario: <span className="font-mono text-slate-300">{officer.username}</span>
                        </div>
                      </div>

                      {assignedPieces.length > 0 && (
                        <div className="text-right">
                          <span className="text-[10px] font-mono font-bold text-amber-400 uppercase tracking-wider block">
                            Piezas Asignadas
                          </span>
                          <div className="flex flex-wrap gap-1 justify-end mt-0.5">
                            {assignedPieces.map(p => (
                              <span key={p.id} className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-300 border border-amber-500/30">
                                {p.name}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* INPUT DE TELÉFONO Y ACCIONES */}
                    <div className="flex flex-col sm:flex-row gap-2 pt-1">
                      <div className="relative flex-1">
                        <PhoneCall className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
                        <input
                          type="text"
                          value={phoneMap[officer.id] || ''}
                          onChange={(e) => setPhoneMap(prev => ({ ...prev, [officer.id]: e.target.value }))}
                          placeholder="Número WhatsApp (ej. 3101234567)"
                          className="w-full bg-[#070b13] border border-slate-700 rounded py-1.5 pl-8 pr-2 text-xs text-white outline-none focus:border-blue-500 font-mono"
                        />
                      </div>

                      <div className="flex gap-2 shrink-0">
                        <button
                          onClick={() => handleSavePhone(officer.id)}
                          disabled={isSaving}
                          className="px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all disabled:opacity-50"
                        >
                          {isSaving ? 'Guardando...' : 'Guardar'}
                        </button>
                        <button
                          onClick={() => handleTestUserPhone(officer.id)}
                          disabled={!phoneMap[officer.id] || !status.connected || testStatus === 'sending'}
                          className={`px-3 py-1.5 rounded text-xs font-bold transition-all disabled:opacity-40 flex items-center gap-1 ${
                            testStatus === 'success' ? 'bg-emerald-600 text-white' :
                            testStatus === 'error' ? 'bg-rose-600 text-white' :
                            'bg-slate-800 hover:bg-slate-700 text-slate-300'
                          }`}
                        >
                          {testStatus === 'sending' ? 'Enviando...' : 
                           testStatus === 'success' ? '¡Recibido!' : 
                           testStatus === 'error' ? 'Fallo' : 'Probar'}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>

        {/* PIE DE PÁGINA CON PROTOCOLO DE SEGURIDAD OPERACIONAL */}
        <div className="px-6 py-3 bg-[#070b13] border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-500 font-mono">
          <div className="flex items-center gap-2">
            <Lock className="w-3.5 h-3.5 text-blue-400" />
            <span>Encriptación de extremo a extremo activa. Retardo táctico anti-bloqueo configurado (1200ms).</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-colors"
          >
            Cerrar Panel
          </button>
        </div>

      </div>
    </div>
  );
};
