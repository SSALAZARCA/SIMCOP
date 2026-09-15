import React from 'react';
import type { Alert, User } from '../types';
import { AlertSeverity, AlertType, UserRole } from '../types';
import { BellAlertIcon } from './icons/BellAlertIcon';
import { ShieldExclamationIcon } from './icons/ShieldExclamationIcon';
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

  const isCyberAlert = alertItem.type === AlertType.CYBER_INTRUSION_DETECTED || (alertItem.type as any) === 'CYBER_INTRUSION_DETECTED';

  let parsedData: { ip?: string; vector?: string; event?: string; action?: string; details?: string } | null = null;
  if (isCyberAlert && alertItem.data) {
    try {
      parsedData = typeof alertItem.data === 'string' ? JSON.parse(alertItem.data) : alertItem.data;
    } catch {
      parsedData = null;
    }
  }

  const containerStyle = isCyberAlert
    ? 'border-red-600/80 bg-red-950/40 text-red-400 glow-red ring-1 ring-red-500/50 shadow-lg shadow-red-950/50'
    : getSeverityStyles(alertItem.severity);

  return (
    <div className={`p-4 rounded-xl border soft-transition flex items-start justify-between relative overflow-hidden ${containerStyle} ${alertItem.acknowledged ? 'opacity-40 grayscale' : 'glass-effect animate-in slide-in-from-right-4'}`}>
      <div className="flex items-start gap-4 flex-1">
        <div className={`p-2 rounded-lg bg-black/30 border border-white/10 ${alertItem.acknowledged ? '' : 'animate-pulse'}`}>
          {isCyberAlert ? (
            <ShieldExclamationIcon className="w-5 h-5 flex-shrink-0 text-red-400" />
          ) : (
            <BellAlertIcon className="w-5 h-5 flex-shrink-0" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            {isCyberAlert ? (
              <span className="px-2 py-0.5 rounded bg-red-600/30 text-red-400 border border-red-500/50 text-[9px] font-black uppercase tracking-widest shadow-sm">
                [ACD // CIBERDEFENSA]
              </span>
            ) : (
              <h4 className="text-[10px] font-black uppercase tracking-[0.2em]">{alertItem.type}</h4>
            )}
            <span className="w-1.5 h-1.5 rounded-full bg-current opacity-50"></span>
            <span className="text-[10px] font-bold opacity-70 monospace-tech">{alertTime}</span>
          </div>
          <p className="text-xs font-medium text-gray-100 mb-2 leading-snug">{alertItem.message}</p>

          {isCyberAlert && parsedData && (
            <div className="mt-2 mb-2 p-2.5 rounded-lg bg-black/60 border border-red-500/40 text-[9px] space-y-1 font-mono">
              <div className="flex flex-wrap gap-x-4 gap-y-1">
                {parsedData.ip && (
                  <span className="text-gray-300">
                    <span className="text-red-400 font-bold">IP ORIGEN:</span> <span className="text-white font-bold">{parsedData.ip}</span>
                  </span>
                )}
                {(parsedData.vector || parsedData.event) && (
                  <span className="text-gray-300">
                    <span className="text-red-400 font-bold">VECTOR:</span> <span className="text-amber-300 font-bold">{parsedData.vector || parsedData.event}</span>
                  </span>
                )}
                {parsedData.action && (
                  <span className="text-gray-300">
                    <span className="text-red-400 font-bold">ACCIÓN:</span> <span className="text-emerald-400 font-bold">{parsedData.action}</span>
                  </span>
                )}
              </div>
              {parsedData.details && (
                <div className="text-gray-400 text-[8px] truncate">
                  <span className="text-red-400 font-bold">DETALLE:</span> {parsedData.details}
                </div>
              )}
            </div>
          )}

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
                className="min-h-[44px] min-w-[44px] px-4 py-2 text-xs font-black bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-all uppercase tracking-widest shadow-lg shadow-blue-900/20 flex items-center justify-center"
              >
                APROBAR
              </button>
              <button
                onClick={() => handleReject(canApproveNovelty ? 'novelty' : 'ammo')}
                className="min-h-[44px] min-w-[44px] px-4 py-2 text-xs font-black bg-red-900/40 text-red-200 border border-red-800/30 rounded-lg hover:bg-red-600 hover:text-white transition-all uppercase tracking-widest flex items-center justify-center"
              >
                RECHAZAR
              </button>
            </div>
          ) : (
            <button
              onClick={() => acknowledgeAlert(alertItem.id)}
              className="group min-h-[44px] min-w-[44px] px-4 py-2.5 text-xs font-black bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10 rounded-lg transition-all uppercase tracking-[0.15em] hover:text-white flex items-center justify-center gap-2"
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
