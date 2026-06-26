
import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { User, MilitaryUnit, UnitType as UnitTypeEnum } from '../types';
import { UserRole, UnitType } from '../types';
import { UserPlusIcon } from './icons/UserPlusIcon';

interface AssignCommanderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (unitId: string, userId: string) => void;
  unit: MilitaryUnit;
  allUsers: User[];
}

// Mapping from UnitType to the required UserRole for its commander
const UNIT_TYPE_TO_COMMANDER_ROLE: Partial<Record<UnitTypeEnum, UserRole>> = {
  [UnitType.DIVISION]: UserRole.COMANDANTE_DIVISION,
  [UnitType.BRIGADE]: UserRole.COMANDANTE_BRIGADA,
  [UnitType.BATTALION]: UserRole.COMANDANTE_BATALLON,
  [UnitType.COMPANY]: UserRole.COMANDANTE_COMPANIA,
  // Platoons are typically commanded by Lieutenants or Sublieutenants, roles often managed differently.
  // For organizational structure assignment, we usually focus on Company and above.
};

export const AssignCommanderModal: React.FC<AssignCommanderModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  unit,
  allUsers,
}) => {
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [localError, setLocalError] = useState<string | null>(null);

  const requiredRoleForUnit = UNIT_TYPE_TO_COMMANDER_ROLE[unit.type];

  const eligibleUsers = useMemo(() => {
    if (!requiredRoleForUnit) return [];
    return allUsers
      .filter(user => user.role === requiredRoleForUnit)
      .sort((a, b) => a.displayName.localeCompare(b.displayName));
  }, [allUsers, requiredRoleForUnit]);

  useEffect(() => {
    if (isOpen) {
      setSelectedUserId('');
      setLocalError(null);
    }
  }, [isOpen]);

  const handleSubmit = () => {
    if (!selectedUserId) {
      setLocalError('Por favor, seleccione un usuario para asignar como comandante.');
      return;
    }
    onSubmit(unit.id, selectedUserId);
  };

  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-start justify-center z-[5000] p-4 overflow-y-auto custom-scrollbar"
      aria-modal="true" role="dialog" aria-labelledby="assignCommanderModalTitle"
    >
      <div className="bg-gray-800 my-8 p-6 rounded-lg shadow-xl w-full max-w-md border border-white/10 relative">
        <h2 id="assignCommanderModalTitle" className="text-xl font-semibold text-purple-300 mb-1">
          Asignar Comandante
        </h2>
        <p className="text-sm text-gray-400 mb-1">
          Unidad: <span className="font-semibold">{unit.name} ({unit.type})</span>
        </p>
        <p className="text-sm text-gray-400 mb-4">
          Cmdte. Actual: <span className="font-semibold">{unit.commander?.rank || 'N/A'} {unit.commander?.name || 'N/A'}</span>
        </p>

        <div>
          <label htmlFor="selectCommander" className="block text-sm font-medium text-gray-300 mb-1">
            Seleccionar Nuevo Comandante ({requiredRoleForUnit || 'Rol no definido'}):
          </label>
          <select
            id="selectCommander"
            value={selectedUserId}
            onChange={(e) => setSelectedUserId(e.target.value)}
            className="w-full bg-gray-700 p-2 rounded-md text-sm text-gray-100 border border-gray-600 focus:ring-purple-500 focus:border-purple-500"
            disabled={eligibleUsers.length === 0}
          >
            <option value="">-- Seleccione un Usuario --</option>
            {eligibleUsers.map(user => (
              <option key={user.id} value={user.id}>
                {user.displayName} ({user.username})
              </option>
            ))}
          </select>
          {eligibleUsers.length === 0 && requiredRoleForUnit && (
            <p className="text-xs text-yellow-400 mt-1">
              No hay usuarios con el rol "{requiredRoleForUnit}" disponibles para asignar.
              Cree o actualice usuarios con este rol en "Gestión de Usuarios".
            </p>
          )}
          {!requiredRoleForUnit && (
            <p className="text-xs text-red-400 mt-1">
              No se ha definido un rol de comandante para este tipo de unidad ({unit.type}).
            </p>
          )}
        </div>

        {localError && <p className="text-sm text-red-400 text-center py-2 mt-3">{localError}</p>}

        <div className="flex justify-end space-x-3 pt-5">
          <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded-md text-sm text-gray-200">
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!selectedUserId || !requiredRoleForUnit}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-md text-sm font-semibold flex items-center disabled:opacity-50"
          >
            <UserPlusIcon className="w-4 h-4 mr-2" />
            Asignar Comandante
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
