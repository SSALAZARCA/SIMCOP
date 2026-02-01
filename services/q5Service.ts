import { API_BASE_URL } from '../utils/apiConfig';
import { apiClient } from '../utils/apiClient';
import { Q5Report } from '../types';

const API_URL = `${API_BASE_URL}/api/q5`;

export const q5Service = {
    getAllReports: async (): Promise<Q5Report[]> => {
        const response = await apiClient.fetch(API_URL);
        if (!response.ok) {
            throw new Error('Failed to fetch Q5 reports');
        }
        return response.json();
    },

    createReport: async (report: Q5Report): Promise<Q5Report> => {
        const response = await apiClient.fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(report),
        });
        if (!response.ok) {
            throw new Error('Failed to create Q5 report');
        }
        return response.json();
    },
};

