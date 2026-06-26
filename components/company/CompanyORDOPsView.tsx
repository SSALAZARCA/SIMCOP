import React, { useMemo } from 'react';
import type { OperationsOrder, User } from '../../types';
import { OperationsOrderStatus } from '../../types';
import { DocumentArrowUpIcon } from '../icons/DocumentArrowUpIcon';
import { CheckCircleIcon } from '../icons/CheckCircleIcon';

interface CompanyORDOPsViewProps {
  orders: OperationsOrder[];
  currentUser: User;
  acknowledgeOrder: (orderId: string, userId: string) => void;
}

export const CompanyORDOPsView: React.FC<CompanyORDOPsViewProps> = ({ orders, currentUser, acknowledgeOrder }) => {

  const assignedOrders = useMemo(() => {
    return orders
      .filter(order => order.status === OperationsOrderStatus.PUBLICADA && order.recipientUserIds.includes(currentUser.id))
      .sort((a, b) => b.issuedTimestamp - a.issuedTimestamp);
  }, [orders, currentUser.id]);

  return (
    <div className="h-full flex flex-col space-y-4">
      <h2 className="text-2xl font-semibold text-gray-200 border-b border-gray-700 pb-2">
        Órdenes de Operaciones Recibidas
      </h2>

      {assignedOrders.length === 0 ? (
        <div className="flex-1 flex items-center justify-center bg-gray-800 rounded-lg">
          <p className="text-gray-400">No tiene órdenes de operaciones publicadas asignadas.</p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto space-y-4 pr-2">
          {assignedOrders.map(order => {
            const isAcknowledged = order.acknowledgements.some(ack => ack.userId === currentUser.id);
            const issuedDate = new Date(order.issuedTimestamp).toLocaleString('es-ES');

            return (
              <div key={order.id} className="bg-gray-800 p-4 rounded-lg shadow-md">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-bold text-emerald-300">{order.title}</h3>
                    <p className="text-sm text-gray-400">De: {order.issuingAuthority}</p>
                    <p className="text-xs text-gray-500">Emitida: {issuedDate}</p>
                  </div>
                  <DocumentArrowUpIcon className="w-6 h-6 text-emerald-400" />
                </div>
                <div className="mt-3 pt-3 border-t border-gray-700">
                  <h4 className="font-semibold text-gray-300">II. MISIÓN:</h4>
                  <p className="text-sm mt-1 whitespace-pre-wrap bg-gray-750 p-2 rounded">{order.mission}</p>
                </div>
                <div className="mt-4 flex justify-end">
                  <button
                    onClick={() => acknowledgeOrder(order.id, currentUser.id)}
                    disabled={isAcknowledged}
                    className={`px-4 py-2 text-sm font-semibold rounded-md transition-colors flex items-center
                                ${isAcknowledged
                                ? 'bg-gray-600 text-gray-300 cursor-not-allowed'
                                : 'bg-green-600 hover:bg-green-700 text-white'}`}
                  >
                    {isAcknowledged ? (
                      <>
                        <CheckCircleIcon className="w-5 h-5 mr-2" />
                        Recibido Confirmado
                      </>
                    ) : (
                      'Confirmar Recibo de Orden'
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
