import { API_BASE_URL } from '../utils/apiConfig';
import { apiClient } from '../utils/apiClient';
import { GeoLocation } from '../types';

export enum FireMissionStatus {
    PENDING = 'PENDING',
    APPROVED = 'APPROVED',
    REJECTED = 'REJECTED',
    ACTIVE = 'ACTIVE',
    COMPLETED = 'COMPLETED',
    CANCELLED = 'CANCELLED'
}

export interface FireMission {
    id: string;
    requesterId: string;
    targetLocation: GeoLocation;
    status: FireMissionStatus;
    assignedArtilleryId?: string;
    requestTimestamp: number;
    fireTimestamp?: number;
    completedTimestamp?: number;
    rejectionReason?: string;
    projectileType?: string;
    charge?: number;
}

const API_URL = `${API_BASE_URL}/api/fire-missions`;

export const fireMissionService = {
    getAll: async (): Promise<FireMission[]> => {
        const response = await apiClient.fetch(API_URL);
        return await response.json();
    },

    create: async (mission: Partial<FireMission>): Promise<FireMission> => {
        const response = await apiClient.fetch(API_URL, {
            method: 'POST',
            body: JSON.stringify(mission),
            headers: { 'Content-Type': 'application/json' }
        });
        return await response.json();
    },

    updateStatus: async (id: string, status: FireMissionStatus, reason?: string): Promise<FireMission> => {
        const response = await apiClient.fetch(`${API_URL}/${id}/status`, {
            method: 'PUT',
            body: JSON.stringify({ status, reason }),
            headers: { 'Content-Type': 'application/json' }
        });
        return await response.json();
    },

    assignArtillery: async (id: string, artilleryId: string): Promise<FireMission> => {
        const response = await apiClient.fetch(`${API_URL}/${id}/assign`, {
            method: 'PUT',
            body: JSON.stringify({ artilleryId }),
            headers: { 'Content-Type': 'application/json' }
        });
        return await response.json();
    }
};
