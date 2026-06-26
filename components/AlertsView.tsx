import React, { useState, useMemo } from 'react';
import type { Alert, User } from '../types';
import { AlertSeverity } from '../types';
import { AlertPanelComponent } from './AlertPanelComponent';

interface AlertsViewProps {
  alerts: Alert[];
  acknowledgeAlert: (alertId: string) => void;
  currentUser: User | null;
  approvePlatoonNovelty: (alertId: string, approverUserId: string) => void;
  approveAmmoReport: (alertId: string, approverUserId: string) => void;
  rejectAmmoReport: (alertId: string, approverUserId: string, reason: string) => void;
  rejectPlatoonNovelty: (alertId: string, approverUserId: string, reason: string) => void;
}

export const AlertsView: React.FC<AlertsViewProps> = ({ 
  alerts, 
  acknowledgeAlert, 
  currentUser, 
  approvePlatoonNovelty,
  approveAmmoReport,
  rejectAmmoReport,
  rejectPlatoonNovelty
}) => {
  const [showAcknowledged, setShowAcknowledged] = useState(false);
  const [filterSeverity, setFilterSeverity] = useState<AlertSeverity | 'ALL'>('ALL');

  const filteredAlerts = useMemo(() => {
    return alerts
      .filter(alert => showAcknowledged ? true : !alert.acknowledged)
      .filter(alert => filterSeverity === 'ALL' ? true : alert.severity === filterSeverity)
      .sort((a,b) => b.timestamp - a.timestamp);
  }, [alerts, showAcknowledged, filterSeverity]);

  return (
    <div className="flex flex-col space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-center border-b border-gray-700 pb-2 gap-2">
        <h2 className="text-2xl font-semibold text-gray-200">Registro de Alertas del Sistema</h2>
        <div className="flex items-center space-x-3">
            <select 
                value={filterSeverity} 
                onChange={(e) => setFilterSeverity(e.target.value as AlertSeverity | 'ALL')}
                className="bg-gray-700 text-gray-200 p-2 rounded-md text-sm"
                aria-label="Filtrar por gravedad de alerta"
            >
                <option value="ALL">Todas las Gravedades</option>
                {Object.values(AlertSeverity).map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <label className="flex items-center space-x-2 text-sm text-gray-300">
                <input 
                type="checkbox" 
                checked={showAcknowledged} 
                onChange={(e) => setShowAcknowledged(e.target.checked)}
                className="form-checkbox h-4 w-4 bg-gray-700 border-gray-600 text-blue-500 focus:ring-blue-500"
                />
                <span>Mostrar Confirmadas</span>
            </label>
        </div>
      </div>
      
      <div className="flex-1">
        <AlertPanelComponent 
          alerts={filteredAlerts} 
          acknowledgeAlert={acknowledgeAlert} 
          title="Alertas Filtradas"
          filterAcknowledged={false}
          currentUser={currentUser}
          approvePlatoonNovelty={approvePlatoonNovelty}
          approveAmmoReport={approveAmmoReport}
          rejectAmmoReport={rejectAmmoReport}
          rejectPlatoonNovelty={rejectPlatoonNovelty}
        />
      </div>
    </div>
  );
};
