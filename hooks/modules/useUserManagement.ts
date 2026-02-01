
import { useState, useCallback } from 'react';
import type { User, NewUserData, UpdateUserData, Alert, UnitHistoryEvent } from '../../types';
import { UserRole, AlertType, AlertSeverity } from '../../types';
import { userService } from '../../services/userService';
import { generateRandomId } from '../useBackendData';

export const useUserManagement = (
    addUnitHistoryEvent: (event: Omit<UnitHistoryEvent, 'id' | 'timestamp'>) => Promise<void>,
    setAlertsInternal: React.Dispatch<React.SetStateAction<Alert[]>>,
    units: any[]
) => {
    const [usersInternal, setUsersInternal] = useState<User[]>([]);

    const login = useCallback(async (username: string, passwordAttempt: string): Promise<User | null> => {
        try {
            const userToLogin = { username, hashedPassword: passwordAttempt } as User;
            const loggedInUser = await userService.login(userToLogin);

            addUnitHistoryEvent({
                eventType: "Inicio de Sesión Exitoso",
                userId: loggedInUser.id,
                username: loggedInUser.username,
                details: `Usuario ${loggedInUser.username} inició sesión.`
            });
            return loggedInUser;
        } catch (error) {
            console.error("Login failed:", error);
            addUnitHistoryEvent({
                eventType: "Intento de Inicio de Sesión Fallido",
                username: username,
                details: `Intento fallido de inicio de sesión para el usuario: ${username}.`
            });
            setAlertsInternal(prev => [{
                id: generateRandomId(), type: AlertType.USER_LOGIN_FAILED,
                message: `Intento de inicio de sesión fallido para ${username}.`,
                timestamp: Date.now(), severity: AlertSeverity.MEDIUM, acknowledged: false,
            }, ...prev].sort((a, b) => b.timestamp - a.timestamp).slice(0, 50));
            return null;
        }
    }, [addUnitHistoryEvent, setAlertsInternal]);

    const addUser = useCallback(async (userData: NewUserData): Promise<{ success: boolean, message?: string }> => {
        try {
            const newUser: User = {
                id: generateRandomId(),
                username: userData.username,
                displayName: userData.displayName,
                hashedPassword: userData.password,
                role: userData.role,
                permissions: userData.permissions,
                assignedUnitId: userData.assignedUnitId || null,
            };

            const createdUser = await userService.createUser(newUser);
            setUsersInternal(prev => [...prev, createdUser]);

            const assignedUnit = createdUser.assignedUnitId ? units.find(u => u.id === createdUser.assignedUnitId) : null;
            const assignedUnitInfo = assignedUnit ? ` Asignado a: ${assignedUnit.name} (${assignedUnit.type})` : '';

            addUnitHistoryEvent({
                eventType: "Usuario Creado",
                userId: createdUser.id,
                username: createdUser.username,
                details: `Usuario ${createdUser.username} (${createdUser.displayName}) creado con rol ${createdUser.role}.${assignedUnitInfo} Permisos: ${createdUser.permissions.join(', ') || 'Ninguno'}.`
            });
            setAlertsInternal(prev => [{
                id: generateRandomId(), type: AlertType.USER_CREATED, userId: createdUser.id,
                message: `Usuario ${createdUser.username} creado exitosamente.${assignedUnitInfo}`,
                timestamp: Date.now(), severity: AlertSeverity.INFO, acknowledged: false,
            }, ...prev].sort((a, b) => b.timestamp - a.timestamp).slice(0, 50));
            return { success: true };
        } catch (error) {
            const message = `Error creando usuario: ${error}`;
            setAlertsInternal(prev => [{ id: generateRandomId(), type: AlertType.USER_ACTION_FAILED, message, timestamp: Date.now(), severity: AlertSeverity.MEDIUM, acknowledged: false }, ...prev]);
            return { success: false, message };
        }
    }, [units, addUnitHistoryEvent, setAlertsInternal]);

    const updateUser = useCallback(async (userId: string, userData: UpdateUserData): Promise<{ success: boolean, message?: string }> => {
        const userIndex = usersInternal.findIndex(u => u.id === userId);
        if (userIndex === -1) {
            const message = `Error: Usuario con ID ${userId} no encontrado para actualizar.`;
            setAlertsInternal(prev => [{ id: generateRandomId(), type: AlertType.USER_ACTION_FAILED, message, timestamp: Date.now(), severity: AlertSeverity.MEDIUM, acknowledged: false }, ...prev]);
            return { success: false, message };
        }

        const oldUser = usersInternal[userIndex];
        const updatedUserFull: User = {
            ...oldUser,
            displayName: userData.displayName ?? oldUser.displayName,
            role: userData.role ?? oldUser.role,
            permissions: userData.permissions ?? oldUser.permissions,
            assignedUnitId: userData.assignedUnitId !== undefined ? userData.assignedUnitId : oldUser.assignedUnitId,
        };

        if (oldUser.role === UserRole.ADMINISTRATOR && updatedUserFull.role !== UserRole.ADMINISTRATOR) {
            const adminCount = usersInternal.filter(u => u.role === UserRole.ADMINISTRATOR).length;
            if (adminCount <= 1) {
                const message = `Error: No se puede cambiar el rol del último administrador. Debe haber al menos un administrador.`;
                setAlertsInternal(prev => [{ id: generateRandomId(), type: AlertType.USER_ACTION_FAILED, userId: oldUser.id, message, timestamp: Date.now(), severity: AlertSeverity.MEDIUM, acknowledged: false }, ...prev]);
                return { success: false, message };
            }
        }

        try {
            await userService.updateUser(userId, updatedUserFull);
            setUsersInternal(prev => prev.map(u => u.id === userId ? updatedUserFull : u));

            const oldAssignedUnit = oldUser.assignedUnitId ? units.find(u => u.id === oldUser.assignedUnitId) : null;
            const newAssignedUnit = updatedUserFull.assignedUnitId ? units.find(u => u.id === updatedUserFull.assignedUnitId) : null;
            const oldAssignedUnitInfo = oldAssignedUnit ? `${oldAssignedUnit.name} (${oldAssignedUnit.type})` : 'Ninguna';
            const newAssignedUnitInfo = newAssignedUnit ? `${newAssignedUnit.name} (${newAssignedUnit.type})` : 'Ninguna';

            addUnitHistoryEvent({
                eventType: "Usuario Actualizado",
                userId: updatedUserFull.id,
                username: updatedUserFull.username,
                details: `Usuario ${updatedUserFull.username} actualizado. Nombre: ${updatedUserFull.displayName}, Rol: ${updatedUserFull.role}, Asignado a: ${newAssignedUnitInfo}, Permisos: ${updatedUserFull.permissions.join(', ') || 'Ninguno'}.`,
                oldValue: `Rol: ${oldUser.role}, Asignado a: ${oldAssignedUnitInfo}, Permisos: ${oldUser.permissions.join(', ') || 'Ninguno'}`,
                newValue: `Rol: ${updatedUserFull.role}, Asignado a: ${newAssignedUnitInfo}, Permisos: ${updatedUserFull.permissions.join(', ') || 'Ninguno'}`,
            });
            setAlertsInternal(prev => [{
                id: generateRandomId(), type: AlertType.USER_UPDATED, userId: updatedUserFull.id,
                message: `Usuario ${updatedUserFull.username} actualizado exitosamente.`,
                timestamp: Date.now(), severity: AlertSeverity.INFO, acknowledged: false,
            }, ...prev].sort((a, b) => b.timestamp - a.timestamp).slice(0, 50));
            return { success: true };
        } catch (error) {
            const message = `Error actualizando usuario: ${error}`;
            setAlertsInternal(prev => [{ id: generateRandomId(), type: AlertType.USER_ACTION_FAILED, message, timestamp: Date.now(), severity: AlertSeverity.MEDIUM, acknowledged: false }, ...prev]);
            return { success: false, message };
        }
    }, [usersInternal, units, addUnitHistoryEvent, setAlertsInternal]);

    const deleteUser = useCallback(async (userIdToDelete: string, currentAdminUserId: string): Promise<{ success: boolean, message?: string }> => {
        if (userIdToDelete === currentAdminUserId) {
            const message = "Error: No puede eliminar su propia cuenta de administrador.";
            setAlertsInternal(prev => [{ id: generateRandomId(), type: AlertType.USER_ACTION_FAILED, userId: currentAdminUserId, message, timestamp: Date.now(), severity: AlertSeverity.MEDIUM, acknowledged: false }, ...prev]);
            return { success: false, message };
        }

        const userToDelete = usersInternal.find(u => u.id === userIdToDelete);
        if (!userToDelete) {
            const message = `Error: Usuario con ID ${userIdToDelete} no encontrado para eliminar.`;
            setAlertsInternal(prev => [{ id: generateRandomId(), type: AlertType.USER_ACTION_FAILED, message, timestamp: Date.now(), severity: AlertSeverity.MEDIUM, acknowledged: false }, ...prev]);
            return { success: false, message };
        }

        if (userToDelete.role === UserRole.ADMINISTRATOR) {
            const adminCount = usersInternal.filter(u => u.role === UserRole.ADMINISTRATOR).length;
            if (adminCount <= 1) {
                const message = "Error: No se puede eliminar al último administrador. Debe haber al menos un administrador.";
                setAlertsInternal(prev => [{ id: generateRandomId(), type: AlertType.USER_ACTION_FAILED, userId: userToDelete.id, message, timestamp: Date.now(), severity: AlertSeverity.MEDIUM, acknowledged: false }, ...prev]);
                return { success: false, message };
            }
        }

        try {
            await userService.deleteUser(userIdToDelete);
            setUsersInternal(prev => prev.filter(u => u.id !== userIdToDelete));
            addUnitHistoryEvent({
                eventType: "Usuario Eliminado",
                userId: userToDelete.id,
                username: userToDelete.username,
                details: `Usuario ${userToDelete.username} (${userToDelete.displayName}) ha sido eliminado por el administrador (ID: ${currentAdminUserId.substring(0, 6)}...).`
            });
            setAlertsInternal(prev => [{
                id: generateRandomId(), type: AlertType.USER_DELETED, userId: userToDelete.id,
                message: `Usuario ${userToDelete.username} eliminado exitosamente.`,
                timestamp: Date.now(), severity: AlertSeverity.INFO, acknowledged: false,
            }, ...prev].sort((a, b) => b.timestamp - a.timestamp).slice(0, 50));
            return { success: true };
        } catch (error) {
            const message = `Error eliminando usuario: ${error}`;
            setAlertsInternal(prev => [{ id: generateRandomId(), type: AlertType.USER_ACTION_FAILED, message, timestamp: Date.now(), severity: AlertSeverity.MEDIUM, acknowledged: false }, ...prev]);
            return { success: false, message };
        }
    }, [usersInternal, addUnitHistoryEvent, setAlertsInternal]);

    const sendTestTelegramAlert = useCallback(async (chatId?: string) => {
        if (!chatId) {
            setAlertsInternal(prev => [{
                id: generateRandomId(),
                type: AlertType.USER_ACTION_FAILED,
                message: "No se proporcionó Chat ID para la prueba.",
                timestamp: Date.now(),
                severity: AlertSeverity.MEDIUM,
                acknowledged: false
            }, ...prev]);
            return false;
        }

        try {
            const success = await userService.sendTestTelegramMessage(chatId);
            if (success) {
                setAlertsInternal(prev => [{
                    id: generateRandomId(),
                    type: AlertType.INFO,
                    message: "Prueba de Telegram enviada exitosamente.",
                    timestamp: Date.now(),
                    severity: AlertSeverity.INFO,
                    acknowledged: false
                }, ...prev]);
                return true;
            } else {
                throw new Error("El servicio devolvió falso");
            }
        } catch (e) {
            setAlertsInternal(prev => [{
                id: generateRandomId(),
                type: AlertType.USER_ACTION_FAILED,
                message: "Error al enviar prueba de Telegram. Verifique el Chat ID y el Token del los logs.",
                timestamp: Date.now(),
                severity: AlertSeverity.MEDIUM,
                acknowledged: false
            }, ...prev]);
            return false;
        }
    }, [setAlertsInternal]);

    const updateUserTelegramConfig = useCallback(async (userId: string, chatId: string) => {
        try {
            const success = await userService.updateTelegramConfig(userId, chatId);
            if (success) {
                // Update local state
                setUsersInternal(prev => prev.map(u => u.id === userId ? { ...u, telegramChatId: chatId } : u));
                setAlertsInternal(prev => [{
                    id: generateRandomId(),
                    type: AlertType.USER_UPDATED,
                    message: "Configuración de Telegram actualizada.",
                    timestamp: Date.now(),
                    severity: AlertSeverity.INFO,
                    acknowledged: false
                }, ...prev]);
                return { success: true };
            } else {
                return { success: false, message: "Error al guardar en backend" };
            }
        } catch (e: any) {
            return { success: false, message: e.message || "Error de conexión" };
        }
    }, []);

    return {
        usersInternal,
        setUsersInternal,
        login,
        addUser,
        updateUser,
        deleteUser,
        sendTestTelegramAlert,
        updateUserTelegramConfig
    };
};
