import { API_BASE_URL } from '../utils/apiConfig';
import { apiClient } from '../utils/apiClient';
import { OsintEvent } from '../types';

const API_URL = `${API_BASE_URL}/api/osint`;

export const osintService = {
    getAllEvents: async (): Promise<OsintEvent[]> => {
        const response = await apiClient.fetch(`${API_URL}/events`);
        if (!response.ok) {
            throw new Error('Failed to fetch OSINT events');
        }
        return response.json();
    },

    refreshEvents: async (): Promise<{ processed: number; message: string }> => {
        const response = await apiClient.fetch(`${API_URL}/refresh`, {
            method: 'POST'
        });
        if (!response.ok) {
            throw new Error('Failed to refresh OSINT events');
        }
        return response.json();
    },

    verifyEvent: async (id: string, verified: boolean): Promise<OsintEvent> => {
        const response = await apiClient.fetch(`${API_URL}/events/${id}/verify`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ verified }),
        });
        if (!response.ok) {
            throw new Error('Failed to verify OSINT event');
        }
        return response.json();
    }
};
