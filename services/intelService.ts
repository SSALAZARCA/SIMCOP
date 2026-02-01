import { API_BASE_URL } from '../utils/apiConfig';
import { apiClient } from '../utils/apiClient';
import { IntelligenceReport } from '../types';

const API_URL = `${API_BASE_URL}/api/intel`;

export const intelService = {
    getAllReports: async (): Promise<IntelligenceReport[]> => {
        const response = await apiClient.fetch(API_URL);
        if (!response.ok) {
            throw new Error('Failed to fetch intelligence reports');
        }
        return response.json();
    },

    createReport: async (report: IntelligenceReport): Promise<IntelligenceReport> => {
        const response = await apiClient.fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(report),
        });
        if (!response.ok) {
            throw new Error('Failed to create intelligence report');
        }
        return response.json();
    }
};

