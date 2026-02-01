
import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import type { User, NewUserData, UpdateUserData, ViewType as ViewTypeEnum, MilitaryUnit, UnitType as UnitTypeForFiltering } from '../types';
import { UserRole, UnitType, ViewType, UserRoleLabels } from '../types';

interface UserFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmitUser: (data: NewUserData | UpdateUserData) => void;
  existingUser?: User | null;
  allViewTypes: (keyof typeof ViewTypeEnum)[];
  allUnits: MilitaryUnit[];
  feedback?: string | null;
}

export const UserFormModal: React.FC<UserFormModalProps> = ({
  isOpen,
  onClose,
  onSubmitUser,
  existingUser,
  allViewTypes,
  allUnits,
  feedback
}) => {
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<UserRole>(UserRole.COMANDANTE_PELOTON);
  const [permissions, setPermissions] = useState<(keyof typeof ViewTypeEnum)[]>([]);
  const [assignedUnitId, setAssignedUnitId] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    setLocalError(feedback);
  }, [feedback]);

  const eligibleUnitsForRole = useMemo(() => {
    switch (role) {
      case UserRole.COMANDANTE_DIVISION:
        return allUnits.filter(u => u.type === UnitType.DIVISION);
      case UserRole.COMANDANTE_BRIGADA:
        return allUnits.filter(u => u.type === UnitType.BRIGADE);
      case UserRole.COMANDANTE_BATALLON:
        return allUnits.filter(u => u.type === UnitType.BATTALION);
      case UserRole.COMANDANTE_COMPANIA:
        return allUnits.filter(u => u.type === UnitType.COMPANY);
      case UserRole.COMANDANTE_PELOTON:
        return allUnits.filter(u => u.type === UnitType.PLATOON);
      case UserRole.OFICIAL_INTELIGENCIA:
      case UserRole.GESTOR_REPORTES:
        return allUnits.filter(u =>
          u.type === UnitType.DIVISION ||
          u.type === UnitType.BRIGADE ||
          u.type === UnitType.BATTALION
        );
      default:
        return []; // No unit assignment for Admin, Comandante Ejercito
    }
  }, [role, allUnits]);

  useEffect(() => {
    if (existingUser) {
      setUsername(existingUser.username);
      setDisplayName(existingUser.displayName);
      setRole(existingUser.role);
      // Cast existing permissions to keys if they are strings
      setPermissions([...existingUser.permissions] as (keyof typeof ViewTypeEnum)[]);
      setAssignedUnitId(existingUser.assignedUnitId);
      setPassword('');
      setConfirmPassword('');
    } else {
      setUsername('');
      setDisplayName('');
      setPassword('');
      setConfirmPassword('');
      setRole(UserRole.COMANDANTE_PELOTON);
      setPermissions([]);
      setAssignedUnitId(null);
    }
    if (isOpen) {
      setLocalError(null);
    }
  }, [isOpen, existingUser]);

  // Adjust assignedUnitId if current selection becomes invalid due to role change
  useEffect(() => {
    if (assignedUnitId && !eligibleUnitsForRole.find(u => u.id === assignedUnitId)) {
      setAssignedUnitId(null);
    }
  }, [role, eligibleUnitsForRole, assignedUnitId]);


  const handlePermissionChange = (view: keyof typeof ViewTypeEnum) => {
    setPermissions(prev => {

      return prev.includes(view) ? prev.filter(p => p !== view) : [...prev, view];
    });
  };

  const handleSelectAllPermissions = () => setPermissions([...allViewTypes]);
  const handleDeselectAllPermissions = () => setPermissions([]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    if (!username.trim()) { setLocalError("El nombre de usuario es obligatorio."); return; }
    if (!displayName.trim()) { setLocalError("El nombre completo es obligatorio."); return; }

    const dataPayload: Partial<NewUserData | UpdateUserData> = {
      displayName,
      role,
      permissions: permissions.map(key => ViewType[key]),
      assignedUnitId: (role === UserRole.ADMINISTRATOR || role === UserRole.COMANDANTE_EJERCITO) ? null : assignedUnitId,
    };

    if (!existingUser) {
      if (!password) { setLocalError("La contraseña es obligatoria para nuevos usuarios."); return; }
      if (password !== confirmPassword) { setLocalError("Las contraseñas no coinciden."); return; }
      if (password.length < 8) { setLocalError("La contraseña debe tener al menos 8 caracteres."); return; }
      (dataPayload as NewUserData).username = username;
      (dataPayload as NewUserData).password = password;
      onSubmitUser(dataPayload as NewUserData);
    } else {
      onSubmitUser(dataPayload as UpdateUserData);
    }
  };

  if (!isOpen) return null;

  const permissionColumns = Math.ceil(allViewTypes.length / 8);
  const showUnitAssignment = role !== UserRole.ADMINISTRATOR && role !== UserRole.COMANDANTE_EJERCITO;


  return createPortal(
    <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-start justify-center z-[5000] p-2 md:p-4 overflow-y-auto custom-scrollbar">
      <div className="bg-gray-800 my-4 md:my-8 p-4 md:p-6 rounded-lg shadow-xl w-full max-w-lg border border-white/10 relative">
        <h2 className="text-xl font-semibold text-blue-300 mb-4">
          {existingUser ? 'Editar Usuario' : 'Crear Nuevo Usuario'}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-300">Nombre de Usuario</label>
            <input
              type="text" id="username" value={username} onChange={(e) => setUsername(e.target.value)}
              required disabled={!!existingUser}
              className="mt-1 w-full bg-gray-700 p-2 rounded-md text-sm border border-gray-600 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-600 disabled:text-gray-400"
            />
          </div>
          <div>
            <label htmlFor="displayName" className="block text-sm font-medium text-gray-300">Nombre Completo</label>
            <input
              type="text" id="displayName" value={displayName} onChange={(e) => setDisplayName(e.target.value)}
              required
              className="mt-1 w-full bg-gray-700 p-2 rounded-md text-sm border border-gray-600 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          {!existingUser && (
            <>
              <div>
                <label htmlFor="password_create" className="block text-sm font-medium text-gray-300">Contraseña</label>
                <input
                  type="password" id="password_create" value={password} onChange={(e) => setPassword(e.target.value)}
                  required placeholder="Mínimo 8 caracteres"
                  className="mt-1 w-full bg-gray-700 p-2 rounded-md text-sm border border-gray-600 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-300">Confirmar Contraseña</label>
                <input
                  type="password" id="confirmPassword" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="mt-1 w-full bg-gray-700 p-2 rounded-md text-sm border border-gray-600 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </>
          )}
          <div>
            <label htmlFor="role" className="block text-sm font-medium text-gray-300">Rol</label>
            <select
              id="role" value={role} onChange={(e) => setRole(e.target.value as UserRole)}
              className="mt-1 w-full bg-gray-700 p-2 rounded-md text-sm border border-gray-600 focus:ring-blue-500 focus:border-blue-500"
            >
              {Object.values(UserRole).map(r => <option key={r} value={r}>{UserRoleLabels[r]}</option>)}
            </select>
          </div>

          {showUnitAssignment && (
            <div>
              <label htmlFor="assignedUnit" className="block text-sm font-medium text-gray-300">Asignar a Unidad</label>
              <select
                id="assignedUnit" value={assignedUnitId || ''}
                onChange={(e) => setAssignedUnitId(e.target.value || null)}
                className="mt-1 w-full bg-gray-700 p-2 rounded-md text-sm border border-gray-600 focus:ring-blue-500 focus:border-blue-500"
                disabled={eligibleUnitsForRole.length === 0}
              >
                <option value="">-- No Asignar --</option>
                {eligibleUnitsForRole.map(unit => (
                  <option key={unit.id} value={unit.id}>{unit.name} ({unit.type})</option>
                ))}
              </select>
              {eligibleUnitsForRole.length === 0 &&
                <p className="text-xs text-yellow-400 mt-1">No hay unidades disponibles para asignar a este rol. Cree unidades del tipo adecuado en "Estructura de Fuerza".</p>
              }
            </div>
          )}

          <fieldset className="border border-gray-600 p-3 rounded-md">
            <legend className="text-sm font-medium text-gray-300 px-1">Permisos de Módulo</legend>
            <div className="flex items-center justify-between my-2">
              <button type="button" onClick={handleSelectAllPermissions} className="text-xs px-2 py-1 bg-gray-600 hover:bg-gray-500 rounded">Todos</button>
              <button type="button" onClick={handleDeselectAllPermissions} className="text-xs px-2 py-1 bg-gray-600 hover:bg-gray-500 rounded">Ninguno</button>
            </div>
            <div className={`grid grid-cols-${permissionColumns} gap-x-2 gap-y-1 mt-1`}>
              {allViewTypes.map(view => (
                <label key={view} className="flex items-center space-x-2 text-xs cursor-pointer">
                  <input
                    type="checkbox" checked={permissions.includes(view)}
                    onChange={() => handlePermissionChange(view)}
                    className="h-3.5 w-3.5 text-blue-500 bg-gray-700 border-gray-600 rounded focus:ring-blue-600"
                  />
                  <span className="text-gray-300">{ViewType[view]}</span>
                </label>
              ))}
            </div>
          </fieldset>

          {localError && <p className="text-sm text-red-400 text-center py-1 bg-red-900 bg-opacity-40 rounded">{localError}</p>}

          <div className="flex justify-end space-x-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded-md text-sm text-gray-200">
              Cancelar
            </button>
            <button type="submit" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-semibold">
              {existingUser ? 'Actualizar Usuario' : 'Crear Usuario'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};
