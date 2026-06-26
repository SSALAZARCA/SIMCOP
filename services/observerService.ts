import { API_BASE_URL } from '../utils/apiConfig';
import { apiClient } from '../utils/apiClient';
import { ForwardObserver } from '../types';

const API_URL = `${API_BASE_URL}/api/observers`;

export const observerService = {
    getAllObservers: async (): Promise<ForwardObserver[]> => {
        const response = await apiClient.fetch(API_URL);
        if (!response.ok) {
            throw new Error('Failed to fetch forward observers');
        }
        return response.json();
    },

    createObserver: async (observer: ForwardObserver): Promise<ForwardObserver> => {
        const response = await apiClient.fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(observer),
        });
        if (!response.ok) {
            throw new Error('Failed to create forward observer');
        }
        return response.json();
    },

    updateObserver: async (id: string, observer: ForwardObserver): Promise<ForwardObserver> => {
        const response = await apiClient.fetch(`${API_URL}/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(observer)
        });
        if (!response.ok) throw new Error('Failed to update observer');
        return response.json();
    },

    deleteObserver: async (id: string): Promise<void> => {
        const response = await apiClient.fetch(`${API_URL}/${id}`, { method: 'DELETE' });
        if (!response.ok) throw new Error('Failed to delete observer');
    }
};
