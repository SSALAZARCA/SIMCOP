import { API_BASE_URL } from '../utils/apiConfig';
import { apiClient } from '../utils/apiClient';
import { UnitHistoryEvent } from '../types';

const API_URL = `${API_BASE_URL}/api/history`;

export const historyService = {
    getAllEvents: async (): Promise<UnitHistoryEvent[]> => {
        const response = await apiClient.fetch(API_URL);
        if (!response.ok) {
            throw new Error('Failed to fetch history events');
        }
        return response.json();
    },

    createEvent: async (event: Omit<UnitHistoryEvent, 'id'>): Promise<UnitHistoryEvent> => {
        const response = await apiClient.fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(event),
        });
        if (!response.ok) {
            throw new Error('Failed to create history event');
        }
        return response.json();
    },
};

