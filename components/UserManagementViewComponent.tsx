

import React, { useState } from 'react';
import { UsersIcon } from './icons/UsersIcon';
import { PencilIcon } from './icons/PencilIcon';
import { TrashIcon } from './icons/TrashIcon';
import { UserPlusIcon } from './icons/UserPlusIcon';
import type { User, NewUserData, UpdateUserData, MilitaryUnit } from '../types';
import { UserRole, ViewType, UserRoleLabels } from '../types';
import { UserFormModal } from './UserFormModal';

interface UserManagementViewProps {
  users: User[];
  addUser: (userData: NewUserData) => Promise<{ success: boolean, message?: string }>;
  updateUser: (userId: string, userData: UpdateUserData) => Promise<{ success: boolean, message?: string }>;
  deleteUser: (userId: string, currentAdminUserId: string) => Promise<{ success: boolean, message?: string }>;
  currentUser: User | null;
  allUnits: MilitaryUnit[]; // Added to pass to modal for unit assignment
}

export const UserManagementViewComponent: React.FC<UserManagementViewProps> = ({
  users,
  addUser,
  updateUser,
  deleteUser,
  currentUser,
  allUnits
}) => {
  const [showUserFormModal, setShowUserFormModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [actionFeedback, setActionFeedback] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  const handleOpenCreateModal = () => {
    setEditingUser(null);
    setShowUserFormModal(true);
    setActionFeedback(null);
  };

  const handleOpenEditModal = (user: User) => {
    setEditingUser(user);
    setShowUserFormModal(true);
    setActionFeedback(null);
  };

  const handleCloseModal = () => {
    setShowUserFormModal(false);
    setEditingUser(null);
  };

  const handleSubmitUser = async (userData: NewUserData | UpdateUserData) => {
    let result: { success: boolean, message?: string };
    if (editingUser) {
      result = await updateUser(editingUser.id, userData as UpdateUserData);
    } else {
      result = await addUser(userData as NewUserData);
    }

    if (result.success) {
      setActionFeedback({ type: 'success', message: result.message || (editingUser ? 'Usuario actualizado exitosamente.' : 'Usuario creado exitosamente.') });
      handleCloseModal();
    } else {
      setActionFeedback({ type: 'error', message: result.message || 'Ocurrió un error.' });
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!currentUser) {
      setActionFeedback({ type: 'error', message: 'Error: Usuario actual no identificado.' });
      return;
    }
    if (window.confirm('¿Está seguro de que desea eliminar este usuario? Esta acción no se puede deshacer.')) {
      const result = await deleteUser(userId, currentUser.id);
      if (result.success) {
        setActionFeedback({ type: 'success', message: result.message || 'Usuario eliminado exitosamente.' });
      } else {
        setActionFeedback({ type: 'error', message: result.message || 'Error al eliminar el usuario.' });
      }
    }
  };

  const availablePermissions = (Object.keys(ViewType) as Array<keyof typeof ViewType>).filter(key =>
    ViewType[key] !== ViewType.MAP && ViewType[key] !== ViewType.SETTINGS
  );

  const getAssignedUnitName = (unitId: string | null): string => {
    if (!unitId) return 'N/A';
    const unit = allUnits.find(u => u.id === unitId);
    return unit ? `${unit.name} (${unit.type})` : 'Unidad Desconocida';
  };

  return (
    <>
      <div className="h-full flex flex-col space-y-4 p-2 md:p-4">
        <div className="flex flex-col sm:flex-row justify-between items-center border-b border-gray-700 pb-3 gap-2">
          <h2 className="text-xl md:text-2xl font-semibold text-gray-200 flex items-center">
            <UsersIcon className="w-6 h-6 md:w-7 md:h-7 mr-2 md:mr-3 text-blue-400" />
            Gestión de Usuarios del Sistema
          </h2>
          <button
            onClick={handleOpenCreateModal}
            className="px-3 py-1.5 md:px-4 md:py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-xs sm:text-sm font-medium transition-colors flex items-center"
          >
            <UserPlusIcon className="w-4 h-4 md:w-5 md:h-5 mr-2" />
            Crear Nuevo Usuario
          </button>
        </div>

        {actionFeedback && (
          <div className={`p-3 rounded-md text-sm text-center ${actionFeedback.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
            {actionFeedback.message}
          </div>
        )}

        <div className="flex-1 overflow-x-auto bg-gray-800 p-2 md:p-4 rounded-lg shadow-inner">
          {users.length === 0 ? (
            <p className="text-gray-400 text-center py-10">No hay usuarios registrados (aparte del administrador inicial si es el único).</p>
          ) : (
            <table className="min-w-full divide-y divide-gray-700 text-xs md:text-sm">
              <thead className="bg-gray-750">
                <tr>
                  <th className="px-3 py-2 md:px-4 md:py-3 text-left font-medium text-gray-300">Usuario</th>
                  <th className="px-3 py-2 md:px-4 md:py-3 text-left font-medium text-gray-300">Nombre Completo</th>
                  <th className="px-3 py-2 md:px-4 md:py-3 text-left font-medium text-gray-300">Rol</th>
                  <th className="px-3 py-2 md:px-4 md:py-3 text-left font-medium text-gray-300">Unidad Asignada</th>
                  <th className="px-3 py-2 md:px-4 md:py-3 text-left font-medium text-gray-300 hidden lg:table-cell">Permisos</th>
                  <th className="px-3 py-2 md:px-4 md:py-3 text-left font-medium text-gray-300">Acciones</th>
                </tr>
              </thead>
              <tbody className="bg-gray-800 divide-y divide-gray-700">
                {users.map(user => (
                  <tr key={user.id}>
                    <td className="px-3 py-2 md:px-4 md:py-3 whitespace-nowrap text-gray-200">{user.username}</td>
                    <td className="px-3 py-2 md:px-4 md:py-3 whitespace-nowrap text-gray-300">{user.displayName}</td>
                    <td className="px-3 py-2 md:px-4 md:py-3 whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${user.role === UserRole.ADMINISTRATOR ? 'bg-red-500 text-red-100' : 'bg-sky-500 text-sky-100'}`}>
                        {UserRoleLabels[user.role] || user.role}
                      </span>
                    </td>
                    <td className="px-3 py-2 md:px-4 md:py-3 whitespace-nowrap text-gray-300">
                      {getAssignedUnitName(user.assignedUnitId)}
                    </td>
                    <td className="px-3 py-2 md:px-4 md:py-3 text-gray-400 hidden lg:table-cell">
                      {user.permissions.length === availablePermissions.length && user.role !== UserRole.ADMINISTRATOR ? 'Todos (Operador)' :
                        user.role === UserRole.ADMINISTRATOR ? 'Todos (Admin)' :
                          user.permissions.length > 3 ?
                            `${user.permissions.slice(0, 3).map(p => ViewType[p as keyof typeof ViewType] || p).join(', ')}, ... (${user.permissions.length - 3} más)` :
                            user.permissions.map(p => ViewType[p as keyof typeof ViewType] || p).join(', ') || 'Ninguno'}
                    </td>
                    <td className="px-3 py-2 md:px-4 md:py-3 whitespace-nowrap">
                      <button
                        onClick={() => handleOpenEditModal(user)}
                        className="p-1.5 text-yellow-400 hover:text-yellow-300 transition-colors mr-1 md:mr-2"
                        title="Editar Usuario"
                        aria-label={`Editar usuario ${user.displayName}`}
                      >
                        <PencilIcon className="w-4 h-4 md:w-5 md:h-5" />
                      </button>
                      <button
                        onClick={() => handleDeleteUser(user.id)}
                        className="p-1.5 text-red-500 hover:text-red-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Eliminar Usuario"
                        aria-label={`Eliminar usuario ${user.displayName}`}
                        disabled={user.id === currentUser?.id || (user.role === UserRole.ADMINISTRATOR && users.filter(u => u.role === UserRole.ADMINISTRATOR).length <= 1)}
                      >
                        <TrashIcon className="w-4 h-4 md:w-5 md:h-5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
      {showUserFormModal && (
        <UserFormModal
          isOpen={showUserFormModal}
          onClose={handleCloseModal}
          onSubmitUser={handleSubmitUser}
          existingUser={editingUser}
          allViewTypes={availablePermissions}
          allUnits={allUnits}
          feedback={actionFeedback?.type === 'error' ? actionFeedback.message : null}
        />
      )}
    </>
  );
};