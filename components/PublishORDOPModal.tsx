
import React, { useState, useMemo, useEffect } from 'react';
import type { User, MilitaryUnit } from '../types';
import { UserRole } from '../types';
import { ShareIcon } from './icons/ShareIcon'; // Assuming ShareIcon is suitable for "Publish"

interface PublishORDOPModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (selectedUserIds: string[]) => void;
  allUsers: User[];
  allUnits: MilitaryUnit[];
  ordopTitle: string;
}

const ELIGIBLE_ROLES_FOR_ORDOP = [
  UserRole.COMANDANTE_BRIGADA,
  UserRole.COMANDANTE_BATALLON,
  UserRole.COMANDANTE_COMPANIA,
  UserRole.COMANDANTE_PELOTON,
];

export const PublishORDOPModal: React.FC<PublishORDOPModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  allUsers,
  allUnits,
  ordopTitle,
}) => {
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);

  const eligibleUsers = useMemo(() => {
    return allUsers
      .filter(user => ELIGIBLE_ROLES_FOR_ORDOP.includes(user.role))
      .map(user => {
        const assignedUnit = user.assignedUnitId ? allUnits.find(u => u.id === user.assignedUnitId) : null;
        return {
          ...user,
          assignedUnitName: assignedUnit ? `${assignedUnit.name} (${assignedUnit.type})` : 'N/A',
        };
      })
      .sort((a, b) => a.displayName.localeCompare(b.displayName));
  }, [allUsers, allUnits]);

  useEffect(() => {
    if (isOpen) {
      setSelectedUserIds([]); // Reset selection when modal opens
    }
  }, [isOpen]);

  const handleToggleUserSelection = (userId: string) => {
    setSelectedUserIds(prev =>
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  const handleSelectAll = () => {
    setSelectedUserIds(eligibleUsers.map(user => user.id));
  };

  const handleDeselectAll = () => {
    setSelectedUserIds([]);
  };

  const handleSubmit = () => {
    if (selectedUserIds.length === 0) {
        if(window.confirm("No ha seleccionado ningún destinatario. ¿Desea publicar la orden sin enviarla a usuarios específicos? (La orden se marcará como publicada globalmente).")) {
            onSubmit([]);
        }
        return;
    }
    onSubmit(selectedUserIds);
  };

  if (!isOpen) return null;

  return (
    <div 
        className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center z-[4000] p-4"
        aria-modal="true" role="dialog" aria-labelledby="publishOrdopModalTitle"
    >
      <div className="bg-gray-800 p-6 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <h2 id="publishOrdopModalTitle" className="text-xl font-semibold text-emerald-300 mb-1">
          Publicar Orden de Operaciones
        </h2>
        <p className="text-sm text-gray-400 mb-4 truncate" title={ordopTitle}>ORDOP: {ordopTitle}</p>

        <div className="mb-3 flex justify-between items-center">
          <p className="text-sm text-gray-300">Seleccione destinatarios (Comandantes de Brigada a Pelotón):</p>
          <div className="space-x-2">
            <button onClick={handleSelectAll} className="text-xs px-2 py-1 bg-gray-600 hover:bg-gray-500 rounded">Todos</button>
            <button onClick={handleDeselectAll} className="text-xs px-2 py-1 bg-gray-600 hover:bg-gray-500 rounded">Ninguno</button>
          </div>
        </div>

        <div className="flex-grow overflow-y-auto border border-gray-700 rounded-md p-2 space-y-2 bg-gray-850 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-850 mb-4">
          {eligibleUsers.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">No hay usuarios elegibles (Comandantes de Brigada a Pelotón) para seleccionar.</p>
          ) : (
            eligibleUsers.map(user => (
              <label
                key={user.id}
                className={`flex items-center space-x-3 p-2 rounded-md cursor-pointer transition-colors ${selectedUserIds.includes(user.id) ? 'bg-blue-700' : 'hover:bg-gray-700'}`}
              >
                <input
                  type="checkbox"
                  checked={selectedUserIds.includes(user.id)}
                  onChange={() => handleToggleUserSelection(user.id)}
                  className="h-4 w-4 text-blue-500 bg-gray-700 border-gray-600 rounded focus:ring-blue-600"
                />
                <div className="flex-1">
                  <span className="text-sm font-medium text-gray-100">{user.displayName}</span>
                  <span className="block text-xs text-gray-400">{user.role} - Unidad: {user.assignedUnitName}</span>
                </div>
              </label>
            ))
          )}
        </div>

        <div className="flex justify-end space-x-3 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded-md text-sm text-gray-200">
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md text-sm font-semibold flex items-center"
          >
            <ShareIcon className="w-4 h-4 mr-2"/>
            Confirmar Publicación ({selectedUserIds.length} Seleccionados)
          </button>
        </div>
      </div>
    </div>
  );
};
