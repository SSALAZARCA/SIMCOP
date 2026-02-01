import React from 'react';
import type { LogisticsRequest, User } from '../types';
import { LogisticsRequestStatus } from '../types';
import { CheckCircleIcon } from './icons/CheckCircleIcon';

interface LogisticsRequestCardProps {
  request: LogisticsRequest;
  onFulfill: (requestId: string, userId: string) => void;
  currentUser: User | null;
}

export const LogisticsRequestCardComponent: React.FC<LogisticsRequestCardProps> = ({ request, onFulfill, currentUser }) => {
  const isPending = request.status === LogisticsRequestStatus.PENDING;
  const requestDate = new Date(request.requestTimestamp).toLocaleString('es-ES');
  const fulfilledDate = request.fulfilledTimestamp ? new Date(request.fulfilledTimestamp).toLocaleString('es-ES') : null;

  const handleFulfill = () => {
    if (currentUser) {
      onFulfill(request.id, currentUser.id);
    }
  };

  return (
    <div className={`p-4 rounded-lg shadow-md border-l-4 ${isPending ? 'bg-gray-750 border-yellow-500' : 'bg-gray-800 border-green-500 opacity-70'}`}>
      <div className="flex justify-between items-start">
        <div>
          <h4 className="text-md font-semibold text-gray-200">
            Requerimiento de: <span className="text-yellow-300">{request.originatingUnitName}</span>
          </h4>
          <p className="text-xs text-gray-400">Solicitado: {requestDate}</p>
          {fulfilledDate && <p className="text-xs text-gray-500">Satisfecho: {fulfilledDate}</p>}
        </div>
        {isPending ? (
          <button
            onClick={handleFulfill}
            className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-xs font-bold rounded"
          >
            Marcar Satisfecho
          </button>
        ) : (
          <div className="flex items-center text-xs font-bold text-green-400">
            <CheckCircleIcon className="w-4 h-4 mr-1"/>
            SATISFECHO
          </div>
        )}
      </div>
      <div className="mt-3 pt-3 border-t border-gray-700">
        <p className="text-sm text-gray-300 whitespace-pre-wrap">{request.details}</p>
      </div>
    </div>
  );
};