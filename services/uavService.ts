import { API_BASE_URL } from '../utils/apiConfig';
import { apiClient } from '../utils/apiClient';
import { MilitaryUnit, GeoLocation } from '../types';

const API_URL = `${API_BASE_URL}/api/uav`;

export const uavService = {
    getAvailableSupport: async (lat: number, lon: number, type: 'STRIKE' | 'RECON'): Promise<MilitaryUnit[]> => {
        const response = await apiClient.fetch(`${API_URL}/available-support?lat=${lat}&lon=${lon}&type=${type}`);
        if (!response.ok) throw new Error('Error al buscar apoyo UAV');
        return response.json();
    },

    requestSupport: async (request: {
        requesterId: string;
        droneUnitId: string;
        type: 'STRIKE' | 'RECON' | 'VIGILANCE';
        target: GeoLocation;
        details: string;
    }): Promise<void> => {
        const response = await apiClient.fetch(`${API_URL}/request-support`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(request)
        });
        if (!response.ok) throw new Error('Error al solicitar misión UAV');
    },

    getActiveMissions: async (): Promise<any[]> => {
        const response = await apiClient.fetch(`${API_URL}/missions`);
        if (!response.ok) throw new Error('Error al obtener misiones activas');
        return response.json();
    },

    assignAsset: async (unitId: string, asset: any): Promise<void> => {
        const response = await apiClient.fetch(`${API_URL}/assign-asset?unitId=${unitId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(asset)
        });
        if (!response.ok) throw new Error('Error al asignar activo UAV');
    },

    deleteAsset: async (unitId: string, assetId: string): Promise<void> => {
        const response = await apiClient.fetch(`${API_URL}/asset?unitId=${unitId}&assetId=${assetId}`, {
            method: 'DELETE'
        });
        if (!response.ok) throw new Error('Error al eliminar activo UAV');
    },

    getTelemetry: async (): Promise<UAVTelemetry[]> => {
        const response = await apiClient.fetch(`${API_URL}/telemetry`);
        if (!response.ok) throw new Error('Error al obtener telemetría UAV');
        return response.json();
    }
};

export interface UAVTelemetry {
    uavId: string;
    batteryLevel: number;
    location: GeoLocation;
    status: string;
    streamUrl?: string;
}

