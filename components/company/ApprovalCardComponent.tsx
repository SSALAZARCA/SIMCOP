import React from 'react';
import type { Alert, User } from '../../types';
import { AlertType } from '../../types';

interface ApprovalCardProps {
  alertItem: Alert;
  currentUser: User;
  approveAmmoReport: (alertId: string, approverUserId: string) => void;
  rejectAmmoReport: (alertId: string, approverUserId: string, reason: string) => void;
  approvePlatoonNovelty: (alertId: string, approverUserId: string) => void;
  rejectPlatoonNovelty: (alertId: string, approverUserId: string, reason: string) => void;
}

export const ApprovalCardComponent: React.FC<ApprovalCardProps> = ({
  alertItem,
  currentUser,
  approveAmmoReport,
  rejectAmmoReport,
  approvePlatoonNovelty,
  rejectPlatoonNovelty,
}) => {
  const isAmmoReport = alertItem.type === AlertType.AMMO_REPORT_PENDING;
  const isNoveltyReport = alertItem.type === AlertType.PLATOON_NOVELTY_PENDING;
  const reportData = alertItem.data;

  const handleReject = () => {
    const reason = window.prompt("Por favor, ingrese un motivo para el rechazo:");
    if (reason && reason.trim()) {
      if (isAmmoReport) {
        rejectAmmoReport(alertItem.id, currentUser.id, reason.trim());
      } else if (isNoveltyReport) {
        rejectPlatoonNovelty(alertItem.id, currentUser.id, reason.trim());
      }
    } else if (reason !== null) { // User didn't cancel, but entered empty string
      window.alert("El motivo del rechazo no puede estar vacío.");
    }
  };
  
  const handleApprove = () => {
    if (isAmmoReport) {
        approveAmmoReport(alertItem.id, currentUser.id);
    } else if (isNoveltyReport) {
        approvePlatoonNovelty(alertItem.id, currentUser.id);
    }
  };

  if (!reportData) {
    return (
        <div className="bg-red-900 p-4 rounded-lg shadow-md border-l-4 border-red-500">
            <p className="font-semibold text-red-200">Error de Datos</p>
            <p className="text-sm text-red-300">No se pudo cargar la información para la alerta ID: {alertItem.id}.</p>
        </div>
    );
  }

  return (
    <div className="bg-gray-800 p-4 rounded-lg shadow-md border-l-4 border-orange-500">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-lg font-semibold text-orange-300">
            {isAmmoReport ? 'Solicitud de Gasto de Munición' : 'Registro de Novedad'}
          </h3>
          <p className="text-sm text-gray-400">
            De: {reportData.unitName}
          </p>
           <p className="text-xs text-gray-500">
            Reportado: {new Date(alertItem.timestamp).toLocaleString('es-ES')}
          </p>
        </div>
        <div className="flex space-x-2">
            <button onClick={handleApprove} className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-xs font-bold rounded">APROBAR</button>
            <button onClick={handleReject} className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded">RECHAZAR</button>
        </div>
      </div>
      <div className="mt-3 pt-3 border-t border-gray-700">
        {isAmmoReport && (
            <>
                <p><strong className="text-gray-300">Porcentaje de Gasto:</strong> {reportData.amount}%</p>
                <p className="mt-1"><strong className="text-gray-300">Justificación:</strong></p>
                <p className="text-sm bg-gray-750 p-2 rounded mt-1 whitespace-pre-wrap">{reportData.justification}</p>
            </>
        )}
        {isNoveltyReport && (
            <>
                <p className="mt-1"><strong className="text-gray-300">Detalle de la Novedad:</strong></p>
                <p className="text-sm bg-gray-750 p-2 rounded mt-1 whitespace-pre-wrap">{reportData.details}</p>
            </>
        )}
      </div>
    </div>
  );
};