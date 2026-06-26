import { API_BASE_URL } from '../utils/apiConfig';
import { apiClient } from '../utils/apiClient';
import { OperationsOrder } from '../types';

const API_URL = `${API_BASE_URL}/api/ordop`;

export const orderService = {
    getAllOrders: async (): Promise<OperationsOrder[]> => {
        const response = await apiClient.fetch(API_URL);
        if (!response.ok) {
            throw new Error('Failed to fetch operations orders');
        }
        return response.json();
    },

    createOrder: async (order: OperationsOrder): Promise<OperationsOrder> => {
        const response = await apiClient.fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(order),
        });
        if (!response.ok) {
            throw new Error('Failed to create operations order');
        }
        return response.json();
    }
};

