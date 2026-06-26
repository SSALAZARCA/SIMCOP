import React from 'react';
import type { Alert, User } from '../types';
import { AlertItemComponent } from './AlertItemComponent';

interface AlertPanelProps {
  alerts: Alert[];
  acknowledgeAlert: (alertId: string) => void;
  title?: string;
  maxItems?: number;
  filterAcknowledged?: boolean;
  currentUser: User | null;
  approvePlatoonNovelty: (alertId: string, approverUserId: string) => void;
  approveAmmoReport: (alertId: string, approverUserId: string) => void;
  rejectAmmoReport: (alertId: string, approverUserId: string, reason: string) => void;
  rejectPlatoonNovelty: (alertId: string, approverUserId: string, reason: string) => void;
}

export const AlertPanelComponent: React.FC<AlertPanelProps> = ({
  alerts,
  acknowledgeAlert,
  title = "COMANDOS Y ALERTAS ACTIVAS",
  maxItems,
  filterAcknowledged = false,
  currentUser,
  approvePlatoonNovelty,
  approveAmmoReport,
  rejectAmmoReport,
  rejectPlatoonNovelty,
}) => {
  const filteredAlerts = alerts
    .filter(alert => filterAcknowledged ? !alert.acknowledged : true)
    .sort((a, b) => b.timestamp - a.timestamp);

  const displayAlerts = maxItems ? filteredAlerts.slice(0, maxItems) : filteredAlerts;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between border-l-2 border-blue-500 pl-4 py-1">
        <h3 className="text-xs font-black text-white uppercase tracking-[0.25em]">{title}</h3>
        <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest bg-white/5 px-2 py-0.5 rounded-full border border-white/5">
          {filteredAlerts.length} TOTAL
        </span>
      </div>

      {displayAlerts.length === 0 ? (
        <div className="bg-gray-900/40 border border-gray-800 rounded-2xl p-8 text-center border-dashed">
          <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest italic">Silencio Operacional - Sin Novedades</p>
        </div>
      ) : (
        <div className="space-y-3 custom-scrollbar max-h-[600px] overflow-y-auto pr-2">
          {displayAlerts.map(alert => (
            <AlertItemComponent
              key={alert.id}
              alertItem={alert}
              acknowledgeAlert={acknowledgeAlert}
              currentUser={currentUser}
              approvePlatoonNovelty={approvePlatoonNovelty}
              approveAmmoReport={approveAmmoReport}
              rejectAmmoReport={rejectAmmoReport}
              rejectPlatoonNovelty={rejectPlatoonNovelty}
            />
          ))}
        </div>
      )}
    </div>
  );
};
