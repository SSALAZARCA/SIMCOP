import React, { useState } from 'react';
import { MenuIcon } from './icons/MenuIcon';
import { UserCircleIcon } from './icons/UserCircleIcon';
import { ArrowLeftOnRectangleIcon } from './icons/ArrowLeftOnRectangleIcon';
import type { User } from '../types';
import { MagnifyingGlassIcon } from './icons/MagnifyingGlassIcon';
import { MicrophoneIcon } from './icons/MicrophoneIcon';

interface HeaderProps {
  isMobile: boolean;
  onToggleMobileNav: () => void;
  currentUser: User | null;
  onLogout: () => void;
  onAiCommand?: (command: string) => Promise<void>;
  onToggleVoiceCommand?: () => void;
  isVoiceCommandActive?: boolean;
  isConnectingVoice?: boolean;
}

export const HeaderComponent: React.FC<HeaderProps> = ({
  isMobile,
  onToggleMobileNav,
  currentUser,
  onLogout,
  onAiCommand,
  onToggleVoiceCommand,
  isVoiceCommandActive = false,
  isConnectingVoice = false
}) => {
  const [aiCommand, setAiCommand] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleAiCommandSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiCommand.trim() || isProcessing || !onAiCommand) return;

    setIsProcessing(true);
    await onAiCommand(aiCommand.trim());
    setIsProcessing(false);
    setAiCommand('');
  };

  const getVoiceButtonClass = () => {
    if (isConnectingVoice) {
      return "bg-yellow-500 text-black animate-pulse";
    }
    if (isVoiceCommandActive) {
      return "bg-red-600 text-white";
    }
    return "bg-gray-600 hover:bg-gray-500 text-white";
  }

  return (
    <header className="glass-effect text-white p-3 md:p-4 shadow-xl flex justify-between items-center gap-2 md:gap-4 relative z-50 border-b border-white/5">
      <div className="flex items-center">
        {isMobile && (
          <button
            onClick={onToggleMobileNav}
            className="mr-3 p-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-all focus:outline-none"
            aria-label="Abrir menú"
          >
            <MenuIcon className="w-6 h-6" />
          </button>
        )}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-900/40">
            <span className="text-white font-black text-xl">S</span>
          </div>
          <h1 className="text-xl font-bold tracking-tight hidden sm:block">
            SIM<span className="text-blue-500">COP</span>
          </h1>
        </div>
      </div>

      {onAiCommand && onToggleVoiceCommand ? (
        <div className="flex-1 max-w-xl flex items-center gap-2">
          <form onSubmit={handleAiCommandSubmit} className="flex-grow">
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <MagnifyingGlassIcon className={`w-4 h-4 transition-colors ${isProcessing ? 'text-blue-500' : 'text-gray-500 group-focus-within:text-blue-400'}`} />
              </div>
              <input
                type="text"
                value={aiCommand}
                onChange={(e) => setAiCommand(e.target.value)}
                disabled={isProcessing}
                placeholder={isProcessing ? "PROCESANDO ORDEN TÁCTICA..." : "BARRA DE MANDO IA (EJ: 'DIME ESTADO DE BRAVO')"}
                className={`w-full bg-gray-900/40 backdrop-blur-sm text-gray-200 border border-gray-700/50 rounded-xl py-2 pl-10 pr-4 text-xs font-medium focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all outline-none placeholder-gray-600 uppercase tracking-wider`}
              />
              {isProcessing && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <div className="flex space-x-1">
                    <div className="w-1 h-1 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-1 h-1 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-1 h-1 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  </div>
                </div>
              )}
            </div>
          </form>
          <button
            onClick={onToggleVoiceCommand}
            className={`p-2 rounded-xl shadow-lg transition-all active:scale-95 ${getVoiceButtonClass()}`}
            title={isVoiceCommandActive ? "Detener Mando por Voz" : "Activar Mando por Voz"}
          >
            <MicrophoneIcon className="w-5 h-5" />
          </button>
        </div>
      ) : (
        <div className="flex-1"></div>
      )}

      <div className="flex items-center space-x-3 md:space-x-6">
        {currentUser ? (
          <>
            <div className="flex flex-col items-end">
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold text-gray-100 uppercase tracking-tight">
                  {currentUser.displayName}
                </span>
                <UserCircleIcon className="w-6 h-6 text-blue-500/80" />
              </div>
              <span className="text-[10px] font-bold text-blue-400/70 uppercase tracking-widest -mt-1">
                {currentUser.role}
              </span>
            </div>
            <button
              onClick={onLogout}
              className="p-2 bg-red-900/40 hover:bg-red-600 border border-red-800/30 text-white rounded-xl shadow-lg transition-all group active:scale-95"
              title="Finalizar Sesión"
            >
              <ArrowLeftOnRectangleIcon className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </>
        ) : (
          <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Nivel de Acceso: Ninguno</span>
        )}
      </div>
    </header>
  );
};