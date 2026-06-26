import { API_BASE_URL } from '../utils/apiConfig';
import { apiClient } from '../utils/apiClient';
import { LogisticsRequest } from '../types';

const API_URL = `${API_BASE_URL}/api/logistics`;

export const logisticsService = {
    getAllRequests: async (): Promise<LogisticsRequest[]> => {
        const response = await apiClient.fetch(API_URL);
        if (!response.ok) {
            throw new Error('Failed to fetch logistics requests');
        }
        return response.json();
    },

    createRequest: async (request: LogisticsRequest): Promise<LogisticsRequest> => {
        const response = await apiClient.fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(request),
        });
        if (!response.ok) {
            throw new Error('Failed to create logistics request');
        }
        return response.json();
    },

    updateRequest: async (id: string, request: Partial<LogisticsRequest>): Promise<LogisticsRequest> => {
        const response = await apiClient.fetch(`${API_URL}/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(request),
        });
        if (!response.ok) {
            throw new Error('Failed to update logistics request');
        }
        return response.json();
    },
};

