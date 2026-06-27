import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { QRCodeSVG } from 'qrcode.react';
import { adminService } from '../services/adminService';
import { XMarkIcon, ShieldCheckIcon } from '@heroicons/react/24/outline';
import type { User } from '../types';

interface Props {
  onClose: () => void;
  currentUser: User;
  onSuccess: () => void;
  forceSetup?: boolean;
}

export const TwoFactorSetupModal: React.FC<Props> = ({ onClose, currentUser, onSuccess, forceSetup = false }) => {
  const [step, setStep] = useState<1 | 2>(currentUser.isTwoFactorEnabled ? 2 : 1);
  const [qrUri, setQrUri] = useState('');
  const [manualSecret, setManualSecret] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleGenerate = async () => {
    setIsLoading(true);
    setError('');
    try {
      const res = await adminService.generate2fa();
      setQrUri(res.qrCodeUri);
      setManualSecret(res.manualSecret);
    } catch (err: any) {
      setError(err.message || 'Error al generar 2FA');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEnable = async () => {
    if (!code || code.length !== 6) {
      setError('Ingrese un código válido de 6 dígitos');
      return;
    }
    setIsLoading(true);
    setError('');
    try {
      const res = await adminService.enable2fa(code);
      setSuccess(res);
      setTimeout(() => {
        onSuccess();
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Código inválido');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisable = async () => {
    if (!code || code.length !== 6) {
      setError('Ingrese su código actual de 6 dígitos para deshabilitar');
      return;
    }
    setIsLoading(true);
    setError('');
    try {
      const res = await adminService.disable2fa(code);
      setSuccess(res);
      setTimeout(() => {
        onSuccess();
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Código inválido');
    } finally {
      setIsLoading(false);
    }
  };

  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-gray-800 border border-gray-700 rounded-xl shadow-2xl p-6 w-full max-w-md relative animate-in fade-in zoom-in-95">
        {!forceSetup && (
          <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors">
            <XMarkIcon className="w-6 h-6" />
          </button>
        )}

        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-blue-500/20 text-blue-400 rounded-lg">
            <ShieldCheckIcon className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-white">Configuración 2FA</h2>
        </div>

        {error && <div className="mb-4 p-3 bg-red-900/50 border border-red-800 text-red-200 rounded-lg text-sm">{error}</div>}
        {success && <div className="mb-4 p-3 bg-green-900/50 border border-green-800 text-green-200 rounded-lg text-sm">{success}</div>}

        {!currentUser.isTwoFactorEnabled ? (
          <div className="space-y-4">
            {!qrUri ? (
              <div className="text-center py-4">
                <p className="text-gray-300 mb-6 text-sm">
                  Proteja su cuenta configurando la Autenticación de Doble Factor con Google Authenticator o Microsoft Authenticator.
                </p>
                <button 
                  onClick={handleGenerate}
                  disabled={isLoading}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-lg transition-colors w-full"
                >
                  {isLoading ? 'Generando...' : 'Comenzar Configuración'}
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center space-y-4">
                <p className="text-gray-300 text-sm text-center">
                  1. Escanee este código QR con su aplicación de autenticación.
                </p>
                <div className="bg-white p-4 rounded-lg">
                  <QRCodeSVG value={qrUri} size={200} />
                </div>
                <p className="text-gray-400 text-xs">
                  O ingrese este código manualmente: <br />
                  <span className="font-mono text-blue-400 font-bold select-all">{manualSecret}</span>
                </p>

                <div className="w-full mt-4">
                  <p className="text-gray-300 text-sm mb-2">2. Ingrese el código de 6 dígitos generado:</p>
                  <input
                    type="text"
                    value={code}
                    onChange={e => setCode(e.target.value)}
                    placeholder="Ej. 123456"
                    maxLength={6}
                    className="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-2 text-white text-center tracking-widest text-lg font-mono focus:outline-none focus:border-blue-500 mb-4"
                  />
                  <button 
                    onClick={handleEnable}
                    disabled={isLoading}
                    className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-6 rounded-lg transition-colors w-full"
                  >
                    {isLoading ? 'Verificando...' : 'Activar 2FA'}
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-4 space-y-4">
            <div className="flex justify-center mb-4">
              <ShieldCheckIcon className="w-16 h-16 text-green-500" />
            </div>
            <h3 className="text-lg font-semibold text-white">2FA está Activado</h3>
            <p className="text-gray-400 text-sm">
              Su cuenta está protegida. Si desea deshabilitarlo, ingrese su código actual.
            </p>
            
            <input
              type="text"
              value={code}
              onChange={e => setCode(e.target.value)}
              placeholder="Código actual..."
              maxLength={6}
              className="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-2 text-white text-center tracking-widest text-lg font-mono focus:outline-none focus:border-red-500 mt-4 mb-2"
            />
            <button 
              onClick={handleDisable}
              disabled={isLoading}
              className="bg-red-600/20 text-red-400 border border-red-800 hover:bg-red-600 hover:text-white font-semibold py-2 px-6 rounded-lg transition-colors w-full"
            >
              {isLoading ? 'Deshabilitando...' : 'Deshabilitar 2FA'}
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};
