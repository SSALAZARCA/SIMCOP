import { API_BASE_URL } from '../utils/apiConfig';
import { apiClient } from '../utils/apiClient';
import { ArtilleryPiece } from '../types';

const API_URL = `${API_BASE_URL}/api/artillery`;

export const artilleryService = {
    getAllPieces: async (): Promise<ArtilleryPiece[]> => {
        const response = await apiClient.fetch(API_URL);
        if (!response.ok) {
            throw new Error('Failed to fetch artillery pieces');
        }
        return response.json();
    },

    createPiece: async (piece: ArtilleryPiece): Promise<ArtilleryPiece> => {
        const response = await apiClient.fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(piece),
        });
        if (!response.ok) {
            throw new Error('Failed to create artillery piece');
        }
        return response.json();
    },

    updatePiece: async (id: string, piece: ArtilleryPiece): Promise<ArtilleryPiece> => {
        const response = await apiClient.fetch(`${API_URL}/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(piece)
        });
        if (!response.ok) throw new Error('Failed to update piece');
        return response.json();
    },

    deletePiece: async (id: string): Promise<void> => {
        const response = await apiClient.fetch(`${API_URL}/${id}`, { method: 'DELETE' });
        if (!response.ok) throw new Error('Failed to delete piece');
    }
};
