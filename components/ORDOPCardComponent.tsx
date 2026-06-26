import React from 'react';
import type { OperationsOrder } from '../types';
import { OperationsOrderStatus } from '../types';
import { DocumentArrowUpIcon } from './icons/DocumentArrowUpIcon';

interface ORDOPCardProps {
  ordop: OperationsOrder;
  onSelectORDOP: (ordop: OperationsOrder) => void;
  isSelected: boolean;
}

const getStatusColor = (status: OperationsOrderStatus): string => {
  switch (status) {
    case OperationsOrderStatus.PUBLICADA:
      return 'bg-green-600 text-green-100';
    case OperationsOrderStatus.ARCHIVADA:
      return 'bg-gray-600 text-gray-200';
    case OperationsOrderStatus.BORRADOR:
    default:
      return 'bg-yellow-500 text-yellow-900';
  }
};

const _ORDOPCardComponent: React.FC<ORDOPCardProps> = ({ ordop, onSelectORDOP, isSelected }) => {
  const issuedDate = new Date(ordop.issuedTimestamp).toLocaleDateString('es-ES', {
    day: '2-digit', month: 'short', year: 'numeric'
  });

  return (
    <div
      className={`bg-gray-750 p-3 rounded-md shadow-md cursor-pointer hover:bg-gray-700 transition-colors
                  ${isSelected ? 'ring-2 ring-emerald-500' : 'border border-gray-700 hover:border-gray-600'}`}
      onClick={() => onSelectORDOP(ordop)}
      aria-label={`Orden de Operaciones: ${ordop.title}, Estado: ${ordop.status}`}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onSelectORDOP(ordop)}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0"> {/* Added min-w-0 for better truncation */}
          <h3 className="text-md font-semibold text-emerald-300 truncate" title={ordop.title}>
            {ordop.title}
          </h3>
          <p className="text-xs text-gray-400">
            Emitida: {issuedDate}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">
            Clasificación: {ordop.classification}
          </p>
        </div>
        <DocumentArrowUpIcon className="w-5 h-5 text-emerald-400 flex-shrink-0 ml-2 mt-1" />
      </div>
      <div className="mt-2 flex justify-end">
        <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${getStatusColor(ordop.status)}`}>
          {ordop.status}
        </span>
      </div>
    </div>
  );
};

export const ORDOPCardComponent = React.memo(_ORDOPCardComponent);
