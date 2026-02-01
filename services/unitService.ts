import { MilitaryUnit } from '../types';
import { apiClient } from '../utils/apiClient';
import { API_BASE_URL } from '../utils/apiConfig';

const API_URL = `${API_BASE_URL}/api/units`;
// New History API endpoint
const HISTORY_API_URL = `${API_BASE_URL}/api/history`;

export const unitService = {
    getUnitHistory: async (unitId: string): Promise<any[]> => {
        const response = await apiClient.fetch(`${HISTORY_API_URL}/unit/${unitId}`);
        if (!response.ok) {
            throw new Error(`Failed to fetch history for unit ${unitId}`);
        }
        return response.json();
    },
    getAllUnits: async (): Promise<MilitaryUnit[]> => {
        const response = await apiClient.fetch(API_URL);
        if (!response.ok) {
            throw new Error('Failed to fetch units');
        }
        return response.json();
    },

    getUnitById: async (id: string): Promise<MilitaryUnit> => {
        const response = await apiClient.fetch(`${API_URL}/${id}`);
        if (!response.ok) {
            throw new Error(`Failed to fetch unit with id ${id}`);
        }
        return response.json();
    },

    createUnit: async (unit: MilitaryUnit): Promise<MilitaryUnit> => {
        const response = await apiClient.fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(unit),
        });
        if (!response.ok) {
            throw new Error('Failed to create unit');
        }
        return response.json();
    },

    updateUnit: async (id: string, unit: MilitaryUnit): Promise<MilitaryUnit> => {
        const response = await apiClient.fetch(`${API_URL}/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(unit),
        });
        if (!response.ok) {
            throw new Error(`Failed to update unit with id ${id}`);
        }
        return response.json();
    },

    deleteUnit: async (id: string): Promise<void> => {
        const response = await apiClient.fetch(`${API_URL}/${id}`, {
            method: 'DELETE',
        });
        if (!response.ok) {
            throw new Error(`Failed to delete unit with id ${id}`);
        }
    }
};
