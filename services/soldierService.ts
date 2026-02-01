import { API_BASE_URL } from '../utils/apiConfig';
import { apiClient } from '../utils/apiClient';
import type { Soldier } from '../types';

const API_URL = `${API_BASE_URL}/api/soldiers`;

export const soldierService = {
    getAll: async (): Promise<Soldier[]> => {
        const response = await apiClient.fetch(API_URL);
        return await response.json();
    },

    getByUnit: async (unitId: string): Promise<Soldier[]> => {
        const response = await apiClient.fetch(`${API_URL}/unit/${unitId}`);
        return await response.json();
    },

    getById: async (id: string): Promise<Soldier> => {
        const response = await apiClient.fetch(`${API_URL}/${id}`);
        return await response.json();
    },

    create: async (soldier: Omit<Soldier, 'id'>, unitId?: string): Promise<Soldier> => {
        const url = unitId ? `${API_URL}?unitId=${unitId}` : API_URL;
        const response = await apiClient.fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(soldier),
        });
        return await response.json();
    },

    update: async (id: string, soldier: Partial<Soldier>): Promise<Soldier> => {
        const response = await apiClient.fetch(`${API_URL}/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(soldier),
        });
        return await response.json();
    },

    delete: async (id: string): Promise<void> => {
        await apiClient.fetch(`${API_URL}/${id}`, {
            method: 'DELETE',
        });
    }
};
