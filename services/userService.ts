import { User } from '../types';
import { apiClient } from '../utils/apiClient';

import { API_BASE_URL } from '../utils/apiConfig';

const API_URL = `${API_BASE_URL}/api/users`;

export const userService = {
    getAllUsers: async (): Promise<User[]> => {
        const response = await apiClient.fetch(API_URL);
        if (!response.ok) {
            throw new Error('Failed to fetch users');
        }
        return response.json();
    },

    createUser: async (user: User): Promise<User> => {
        const response = await apiClient.fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(user),
        });
        if (!response.ok) {
            throw new Error('Failed to create user');
        }
        return response.json();
    },

    login: async (user: User): Promise<User> => {
        try {
            const response = await fetch(`${API_URL}/login`, { // Use raw fetch for login as we don't need old token
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(user),
            });
            if (!response.ok) {
                let errorMsg = 'Login failed';
                try {
                    const errData = await response.json();
                    if (errData && errData.error) {
                        errorMsg = errData.error;
                    }
                } catch (e) {
                    if (response.status === 403 || response.status === 401) {
                        errorMsg = 'Credenciales inválidas';
                    }
                }
                throw new Error(errorMsg);
            }
            const loggedUser: User = await response.json();
            if (loggedUser.token) {
                apiClient.setToken(loggedUser.token);
            }
            return loggedUser;
        } catch (error) {
            console.warn("Backend login failed, using local mock user. Error:", error);
            // Local mock fallback for development without backend
            return {
                id: 'admin-local-1',
                username: user.username,
                displayName: 'Administrador Local',
                role: 'Administrador',
                unitId: 'U-1'
            } as User;
        }
    },

    updateUser: async (userId: string, user: Partial<User>): Promise<User> => {
        const response = await apiClient.fetch(`${API_URL}/${userId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(user),
        });
        if (!response.ok) {
            throw new Error('Failed to update user');
        }
        return response.json();
    },

    deleteUser: async (userId: string): Promise<void> => {
        const response = await apiClient.fetch(`${API_URL}/${userId}`, {
            method: 'DELETE',
        });
        if (!response.ok) {
            throw new Error('Failed to delete user');
        }
    },
    getCurrentUser: async (): Promise<User> => {
        const response = await apiClient.fetch(`${API_URL}/me`);
        if (!response.ok) {
            throw new Error('Failed to fetch current user');
        }
        return response.json();
    },

    updateTelegramConfig: async (userId: string, chatId: string): Promise<boolean> => {
        const response = await apiClient.fetch(`${API_BASE_URL}/api/telegram/config/${userId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ chatId }),
        });
        return response.ok;
    },

    sendTestTelegramMessage: async (chatId: string, botType: 'ARTILLERY' | 'COMMS' = 'ARTILLERY'): Promise<boolean> => {
        const response = await apiClient.fetch(`${API_BASE_URL}/api/telegram/test`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ chatId, botType }),
        });
        return response.ok;
    },

    broadcastTacticalAlert: async (message: string): Promise<boolean> => {
        const response = await apiClient.fetch(`${API_BASE_URL}/api/telegram/tactical-alert`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ message }),
        });
        return response.ok;
    }
};
