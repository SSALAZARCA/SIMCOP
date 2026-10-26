import React from 'react';
import { silogService } from '../services/silogService';

interface PazYSalvoModalProps {
  soldierId: string | null;
  onClose: () => void;
}

export const PazYSalvoModal: React.FC<PazYSalvoModalProps> = ({ soldierId, onClose }) => {
  if (!soldierId) return null;

  const profile = silogService.getSoldierKardex(soldierId);
  const result = silogService.generatePazYSalvo(soldierId);

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-[#0b0f17] border border-amber-500/50 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden text-slate-200">
        <div className="bg-slate-900 border-b border-slate-800 p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">📜</span>
            <h3 className="text-sm font-black text-white uppercase tracking-wider">
              Certificado de Paz y Salvo Logístico
            </h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white font-bold">
            ✕
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-1">
            <p className="text-xs text-slate-400">Militar Auditado (Sincronizado de SIGEP):</p>
            <p className="text-sm font-bold text-white">{profile?.fullName || soldierId}</p>
            <p className="text-xs text-amber-400 font-mono">Grado: {profile?.rank || 'SLP'} | ID: {soldierId}</p>
          </div>

          <div className={`p-4 rounded-xl border text-xs leading-relaxed space-y-2 ${
            result.pazYSalvo
              ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-200'
              : 'bg-red-950/40 border-red-500/50 text-red-200'
          }`}>
            <div className="flex items-center gap-2 font-bold text-sm">
              <span>{result.pazYSalvo ? '✅' : '⚠️'}</span>
              <span>{result.pazYSalvo ? 'PAZ Y SALVO CONCEDIDO' : 'DEVOLUCIÓN DE MATERIAL PENDIENTE'}</span>
            </div>
            <p>{result.message}</p>

            {result.pendingItems.length > 0 && (
              <div className="mt-2 pt-2 border-t border-red-500/30 space-y-1">
                <span className="font-bold block text-[11px] text-red-300">Elementos pendientes por ingresar al Armerillo:</span>
                {result.pendingItems.map((item, idx) => (
                  <p key={idx} className="font-mono text-[11px]">• {item}</p>
                ))}
              </div>
            )}

            {result.certificateNumber && (
              <p className="text-[10px] font-mono font-bold text-emerald-400 pt-1">
                N° Certificado Digital: {result.certificateNumber}
              </p>
            )}
          </div>
        </div>

        <div className="bg-slate-900 border-t border-slate-800 p-4 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
