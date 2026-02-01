import { API_BASE_URL } from '../utils/apiConfig';
import { COAPlan } from '../types';
import { apiClient } from '../utils/apiClient';

const getBaseUrl = () => {
    if (typeof window !== 'undefined') {
        const host = window.location.hostname;
        return `http://${host}:8080/api/coa-plans`;
    }
    return `${API_BASE_URL}/api/coa-plans`;
};

const API_URL = getBaseUrl();

/**
 * Transform backend COA plan response to frontend format
 * Parses phasesJson string back to phases array
 */
const transformCOAPlan = (plan: any): COAPlan => {
    if (plan.phasesJson && typeof plan.phasesJson === 'string') {
        plan.phases = JSON.parse(plan.phasesJson);
        delete plan.phasesJson;
    }
    return plan;
};

export const coaPlanService = {
    /**
     * Get all active COA plans
     */
    getAllPlans: async (): Promise<COAPlan[]> => {
        const response = await apiClient.fetch(API_URL);
        if (!response.ok) throw new Error('Failed to fetch COA plans');
        const plans = await response.json();
        return plans.map(transformCOAPlan);
    },

    /**
     * Get COA plans by user ID
     */
    getPlansByUser: async (userId: string): Promise<COAPlan[]> => {
        const response = await apiClient.fetch(`${API_URL}/user/${encodeURIComponent(userId)}`);
        if (!response.ok) throw new Error('Failed to fetch user COA plans');
        const plans = await response.json();
        return plans.map(transformCOAPlan);
    },

    /**
     * Get a specific COA plan by ID
     */
    getPlanById: async (id: string): Promise<COAPlan> => {
        const response = await apiClient.fetch(`${API_URL}/${id}`);
        if (!response.ok) throw new Error('Failed to fetch COA plan');
        const plan = await response.json();
        return transformCOAPlan(plan);
    },

    /**
     * Save a new COA plan
     */
    savePlan: async (plan: Omit<COAPlan, 'id'>): Promise<COAPlan> => {
        const response = await apiClient.fetch(API_URL, {
            method: 'POST',
            body: JSON.stringify({
                planName: plan.planName,
                conceptOfOperations: plan.conceptOfOperations,
                phasesJson: JSON.stringify(plan.phases),
                createdByUserId: plan.createdByUserId || 'system',
            }),
            headers: { 'Content-Type': 'application/json' }
        });
        if (!response.ok) throw new Error('Failed to save COA plan');

        const savedPlan = await response.json();
        return transformCOAPlan(savedPlan);
    },

    /**
     * Update an existing COA plan
     */
    updatePlan: async (id: string, plan: Partial<COAPlan>): Promise<COAPlan> => {
        const response = await apiClient.fetch(`${API_URL}/${id}`, {
            method: 'PUT',
            body: JSON.stringify({
                ...plan,
                phasesJson: plan.phases ? JSON.stringify(plan.phases) : undefined,
            }),
            headers: { 'Content-Type': 'application/json' }
        });
        if (!response.ok) throw new Error('Failed to update COA plan');
        const updatedPlan = await response.json();
        return transformCOAPlan(updatedPlan);
    },

    /**
     * Soft delete a COA plan
     */
    deletePlan: async (id: string): Promise<void> => {
        const response = await apiClient.fetch(`${API_URL}/${id}`, {
            method: 'DELETE'
        });
        if (!response.ok) throw new Error('Failed to delete COA plan');
    },

    /**
     * Permanently delete a COA plan
     */
    hardDeletePlan: async (id: string): Promise<void> => {
        const response = await apiClient.fetch(`${API_URL}/${id}/hard`, {
            method: 'DELETE'
        });
        if (!response.ok) throw new Error('Failed to permanently delete COA plan');
    }
};
