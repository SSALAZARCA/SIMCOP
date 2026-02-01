import React, { useState } from 'react';
import { DocumentArrowUpIcon } from './icons/DocumentArrowUpIcon';
import type { OperationsOrder, NewOperationsOrderData, UpdateOperationsOrderData, User, MilitaryUnit } from '../types';
import { ORDOPCreationModal } from './ORDOPCreationModal';
import { ORDOPListComponent } from './ORDOPListComponent';
import { ORDOPDetailsPanel } from './ORDOPDetailsPanel';

interface ORDOPViewProps {
  operationsOrders: OperationsOrder[];
  addOperationsOrder: (orderData: NewOperationsOrderData) => Promise<OperationsOrder | null>;
  updateOperationsOrder: (orderId: string, orderData: UpdateOperationsOrderData) => Promise<{ success: boolean, message?: string }>;
  selectedORDOP: OperationsOrder | null;
  onSelectORDOP: (ordop: OperationsOrder) => void;
  publishOperationsOrder: (orderId: string, selectedUserIds: string[]) => Promise<{ success: boolean, message?: string }>;
  allUsers: User[];
  allUnits: MilitaryUnit[];
}

export const ORDOPViewComponent: React.FC<ORDOPViewProps> = ({
  operationsOrders,
  addOperationsOrder,
  updateOperationsOrder,
  selectedORDOP,
  onSelectORDOP,
  publishOperationsOrder,
  allUsers,
  allUnits,
}) => {
  const [showORDOPModal, setShowORDOPModal] = useState(false);
  const [ordopToEdit, setOrdopToEdit] = useState<OperationsOrder | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'error', message: string } | null>(null);


  const handleOpenORDOPModal = (ordop?: OperationsOrder) => {
    setOrdopToEdit(ordop || null);
    setShowORDOPModal(true);
    setFeedbackMessage(null);
  };

  const handleCloseORDOPModal = () => {
    setShowORDOPModal(false);
    setOrdopToEdit(null);
  };

  const handleSaveORDOP = async (data: NewOperationsOrderData) => {
    let result: { success: boolean, message?: string };
    if (ordopToEdit) {
      result = await updateOperationsOrder(ordopToEdit.id, data as UpdateOperationsOrderData);
    } else {
      const created = await addOperationsOrder(data);
      result = created ? { success: true, message: 'Orden de Operaciones creada como borrador.' } : { success: false, message: 'Error al crear la orden.' };
    }

    if (result.success) {
      setFeedbackMessage({ type: 'success', message: result.message || (ordopToEdit ? 'Orden actualizada.' : 'Orden creada.') });
    } else {
      setFeedbackMessage({ type: 'error', message: result.message || 'Ocurrió un error.' });
    }
    handleCloseORDOPModal();
  };

  return (
    <>
      <div className="flex flex-col space-y-4 p-1">
        <div className="flex flex-col sm:flex-row justify-between items-center border-b border-gray-700 pb-3 gap-2">
          <h2 className="text-xl md:text-2xl font-semibold text-gray-200 flex items-center">
            <DocumentArrowUpIcon className="w-6 h-6 md:w-7 md:h-7 mr-2 md:mr-3 text-emerald-400" />
            Módulo de Órdenes de Operaciones (ORDOP)
          </h2>
          <button
            onClick={() => handleOpenORDOPModal()}
            className="px-3 py-1.5 md:px-4 md:py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-xs sm:text-sm font-medium transition-colors"
            aria-label="Crear Nueva Orden de Operaciones"
          >
            Crear Nueva ORDEN DE OPERACIONES
          </button>
        </div>

        {feedbackMessage && (
          <div className={`my-2 p-2 text-xs rounded-md text-center ${feedbackMessage.type === 'success' ? 'bg-green-700 text-green-100' : 'bg-red-700 text-red-100'}`}>
            {feedbackMessage.message}
          </div>
        )}


        <div className="flex flex-col md:flex-row flex-1 space-y-4 md:space-y-0 md:space-x-4">
          {/* List Panel */}
          <div className="w-full md:w-2/5 bg-gray-800 p-3 md:p-4 rounded-lg shadow-inner pr-0 md:pr-2">
            <ORDOPListComponent
              operationsOrders={operationsOrders}
              onSelectORDOP={onSelectORDOP}
              selectedORDOP={selectedORDOP}
            />
          </div>

          {/* Details Panel */}
          <div className="w-full md:w-3/5 bg-gray-800 p-0.5 rounded-lg shadow-inner">
            {selectedORDOP ? (
              <ORDOPDetailsPanel
                ordop={selectedORDOP}
                onEditORDOP={() => handleOpenORDOPModal(selectedORDOP)}
                publishOperationsOrder={publishOperationsOrder}
                allUsers={allUsers}
                allUnits={allUnits}
              />
            ) : (
              <div className="flex items-center justify-center h-full bg-gray-850 rounded-lg">
                <p className="text-gray-400 text-center">
                  {showORDOPModal ? (ordopToEdit ? 'Editando orden...' : 'Creando nueva orden...') : 'Seleccione una Orden de Operaciones para ver detalles o cree una nueva.'}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {showORDOPModal && (
        <ORDOPCreationModal
          isOpen={showORDOPModal}
          onClose={handleCloseORDOPModal}
          onSave={handleSaveORDOP}
          existingOrder={ordopToEdit}
        />
      )}
    </>
  );
};
