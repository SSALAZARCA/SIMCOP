import React from 'react';
import type { Alert, User } from '../types';
import { AlertSeverity, AlertType, UserRole } from '../types';
import { BellAlertIcon } from './icons/BellAlertIcon';
import { decimalToDMS } from '../utils/coordinateUtils';

interface AlertItemProps {
  alertItem: Alert;
  acknowledgeAlert: (alertId: string) => void;
  currentUser: User | null;
  approvePlatoonNovelty: (alertId: string, approverUserId: string) => void;
  approveAmmoReport: (alertId: string, approverUserId: string) => void;
  rejectAmmoReport: (alertId: string, approverUserId: string, reason: string) => void;
  rejectPlatoonNovelty: (alertId: string, approverUserId: string, reason: string) => void;
}

const getSeverityStyles = (severity: AlertSeverity): string => {
  switch (severity) {
    case AlertSeverity.CRITICAL:
      return 'border-red-500/50 bg-red-500/10 text-red-400 glow-red';
    case AlertSeverity.HIGH:
      return 'border-orange-500/50 bg-orange-500/10 text-orange-400 glow-orange';
    case AlertSeverity.MEDIUM:
      return 'border-yellow-500/50 bg-yellow-500/10 text-yellow-400 glow-yellow';
    case AlertSeverity.LOW:
      return 'border-blue-500/50 bg-blue-500/10 text-blue-400 glow-blue';
    case AlertSeverity.INFO:
      return 'border-gray-500/50 bg-gray-500/10 text-gray-400';
    default:
      return 'border-gray-700/50 bg-gray-800/10';
  }
};

const _AlertItemComponent: React.FC<AlertItemProps> = ({
  alertItem,
  acknowledgeAlert,
  currentUser,
  approvePlatoonNovelty,
  approveAmmoReport,
  rejectAmmoReport,
  rejectPlatoonNovelty
}) => {
  const alertTime = new Date(alertItem.timestamp).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  const canApproveNovelty = currentUser && currentUser.role === UserRole.COMANDANTE_COMPANIA && alertItem.type === AlertType.PLATOON_NOVELTY_PENDING && !alertItem.acknowledged;
  const canApproveAmmo = currentUser && currentUser.role === UserRole.COMANDANTE_COMPANIA && alertItem.type === AlertType.AMMO_REPORT_PENDING && !alertItem.acknowledged;

  const handleReject = (type: 'novelty' | 'ammo') => {
    if (!currentUser) return;
    const reason = window.prompt("MOTIVO DEL RECHAZO OPERATIVO:");
    if (reason && reason.trim()) {
      if (type === 'novelty') {
        rejectPlatoonNovelty(alertItem.id, currentUser.id, reason.trim());
      } else {
        rejectAmmoReport(alertItem.id, currentUser.id, reason.trim());
      }
    }
  };

  return (
    <div className={`p-4 rounded-xl border soft-transition flex items-start justify-between relative overflow-hidden ${getSeverityStyles(alertItem.severity)} ${alertItem.acknowledged ? 'opacity-40 grayscale' : 'glass-effect animate-in slide-in-from-right-4'}`}>
      <div className="flex items-start gap-4">
        <div className={`p-2 rounded-lg bg-black/20 border border-white/5 ${alertItem.acknowledged ? '' : 'animate-pulse'}`}>
          <BellAlertIcon className="w-5 h-5 flex-shrink-0" />
        </div>
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h4 className="text-[10px] font-black uppercase tracking-[0.2em]">{alertItem.type}</h4>
            <span className="w-1.5 h-1.5 rounded-full bg-current opacity-50"></span>
            <span className="text-[10px] font-bold opacity-70 monospace-tech">{alertTime}</span>
          </div>
          <p className="text-xs font-medium text-gray-100 mb-2 leading-snug">{alertItem.message}</p>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-[9px] font-bold text-gray-400 uppercase tracking-widest">
            {alertItem.location && (
              <span className="flex items-center">
                <span className="text-blue-500 mr-1.5">POS:</span>
                <span className="monospace-tech text-gray-300">{decimalToDMS(alertItem.location)}</span>
              </span>
            )}
            {alertItem.unitId && (
              <span>REF UNIT: <span className="text-gray-300 monospace-tech">{alertItem.unitId.substring(0, 8)}</span></span>
            )}
          </div>
        </div>
      </div>

      {!alertItem.acknowledged && (
        <div className="ml-6 flex-shrink-0 flex flex-col gap-2">
          {canApproveNovelty || canApproveAmmo ? (
            <div className="flex flex-col gap-1.5">
              <button
                onClick={() => canApproveNovelty ? approvePlatoonNovelty(alertItem.id, currentUser!.id) : approveAmmoReport(alertItem.id, currentUser!.id)}
                className="px-4 py-1.5 text-[10px] font-black bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-all uppercase tracking-widest shadow-lg shadow-blue-900/20"
              >
                APROBAR
              </button>
              <button
                onClick={() => handleReject(canApproveNovelty ? 'novelty' : 'ammo')}
                className="px-4 py-1.5 text-[10px] font-black bg-red-900/40 text-red-200 border border-red-800/30 rounded-lg hover:bg-red-600 hover:text-white transition-all uppercase tracking-widest"
              >
                RECHAZAR
              </button>
            </div>
          ) : (
            <button
              onClick={() => acknowledgeAlert(alertItem.id)}
              className="group px-4 py-2 text-[10px] font-black bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10 rounded-lg transition-all uppercase tracking-[0.15em] hover:text-white flex items-center gap-2"
            >
              CONFIRMAR
              <span className="w-1.5 h-1.5 bg-blue-500 rounded-full group-hover:animate-ping"></span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export const AlertItemComponent = React.memo(_AlertItemComponent);
