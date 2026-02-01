import { API_BASE_URL } from '../utils/apiConfig';
import { AfterActionReport } from '../types';
import { apiClient } from '../utils/apiClient';

const API_URL = `${API_BASE_URL}/api/aar`;

export const aarService = {
    getAllReports: async (): Promise<AfterActionReport[]> => {
        const response = await apiClient.fetch(API_URL);
        if (!response.ok) {
            throw new Error('Failed to fetch AARs');
        }
        return response.json();
    },

    createReport: async (report: AfterActionReport): Promise<AfterActionReport> => {
        const response = await apiClient.fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(report),
        });
        if (!response.ok) {
            throw new Error('Failed to create AAR');
        }
        return response.json();
    },
};
