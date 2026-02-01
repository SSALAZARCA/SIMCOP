import React, { useMemo } from 'react';
import type { Alert, User } from '../../types';
import { AlertType } from '../../types';
import { ApprovalCardComponent } from './ApprovalCardComponent';
import { CheckCircleIcon } from '../icons/CheckCircleIcon';

interface CompanyApprovalsViewProps {
  alerts: Alert[];
  currentUser: User;
  approveAmmoReport: (alertId: string, approverUserId: string) => void;
  rejectAmmoReport: (alertId: string, approverUserId: string, reason: string) => void;
  approvePlatoonNovelty: (alertId: string, approverUserId: string) => void;
  rejectPlatoonNovelty: (alertId: string, approverUserId: string, reason: string) => void;
}

export const CompanyApprovalsView: React.FC<CompanyApprovalsViewProps> = ({
  alerts,
  currentUser,
  approveAmmoReport,
  rejectAmmoReport,
  approvePlatoonNovelty,
  rejectPlatoonNovelty,
}) => {
  const pendingApprovals = useMemo(() => {
    return alerts
      .filter(a => 
        (a.type === AlertType.AMMO_REPORT_PENDING || a.type === AlertType.PLATOON_NOVELTY_PENDING) 
        && !a.acknowledged
      )
      .sort((a, b) => a.timestamp - b.timestamp); // Show oldest first
  }, [alerts]);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold text-gray-200 border-b border-gray-700 pb-2 flex items-center">
        <CheckCircleIcon className="w-7 h-7 mr-3 text-orange-400" />
        Aprobaciones Pendientes
      </h2>

      {pendingApprovals.length === 0 ? (
        <div className="bg-gray-800 p-8 rounded-lg text-center text-gray-400">
          <p className="text-lg">No hay solicitudes pendientes de aprobación.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {pendingApprovals.map(alert => (
            <ApprovalCardComponent
              key={alert.id}
              alertItem={alert}
              currentUser={currentUser}
              approveAmmoReport={approveAmmoReport}
              rejectAmmoReport={rejectAmmoReport}
              approvePlatoonNovelty={approvePlatoonNovelty}
              rejectPlatoonNovelty={rejectPlatoonNovelty}
            />
          ))}
        </div>
      )}
    </div>
  );
};