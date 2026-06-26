import { API_BASE_URL } from '../utils/apiConfig';
import { apiClient } from '../utils/apiClient';
import { Alert } from '../types';

const API_URL = `${API_BASE_URL}/api/alerts`;

export const alertService = {
    getAllAlerts: async (): Promise<Alert[]> => {
        const response = await apiClient.fetch(API_URL);
        if (!response.ok) {
            throw new Error('Failed to fetch alerts');
        }
        return response.json();
    },

    createAlert: async (alert: Alert): Promise<Alert> => {
        const response = await apiClient.fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(alert),
        });
        if (!response.ok) {
            throw new Error('Failed to create alert');
        }
        return response.json();
    },

    acknowledgeAlert: async (id: string): Promise<Alert> => {
        const response = await apiClient.fetch(`${API_URL}/${id}/acknowledge`, {
            method: 'PUT',
        });
        if (!response.ok) {
            throw new Error(`Failed to acknowledge alert with id ${id}`);
        }
        return response.json();
    }
};

