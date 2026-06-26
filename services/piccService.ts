import { API_BASE_URL } from '../utils/apiConfig';
import { OperationalGraphic } from '../types';
import { apiClient } from '../utils/apiClient';

const API_URL = `${API_BASE_URL}/api/graphics`;

export const piccService = {
    getAllGraphics: async (): Promise<OperationalGraphic[]> => {
        const response = await apiClient.fetch(API_URL);
        if (!response.ok) throw new Error('Failed to fetch graphics');
        return response.json();
    },

    getGraphicsByPlantilla: async (plantillaType: string): Promise<OperationalGraphic[]> => {
        const response = await apiClient.fetch(`${API_URL}/plantilla/${encodeURIComponent(plantillaType)}`);
        if (!response.ok) throw new Error('Failed to fetch graphics for plantilla');
        return response.json();
    },

    saveGraphic: async (graphic: OperationalGraphic): Promise<OperationalGraphic> => {
        const response = await apiClient.fetch(API_URL, {
            method: 'POST',
            body: JSON.stringify(graphic),
            headers: { 'Content-Type': 'application/json' }
        });
        if (!response.ok) throw new Error('Failed to save graphic');
        return response.json();
    },

    deleteGraphic: async (id: string): Promise<void> => {
        const response = await apiClient.fetch(`${API_URL}/${id}`, {
            method: 'DELETE'
        });
        if (!response.ok) throw new Error('Failed to delete graphic');
    }
};
