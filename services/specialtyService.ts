import { API_BASE_URL } from '../utils/apiConfig';
import { apiClient } from '../utils/apiClient';
import type { SpecialtyCatalogEntry } from '../types';

const API_URL = `${API_BASE_URL}/api/specialty-catalog`;

/**
 * Service for managing military specialty catalog
 * Provides CRUD operations for the specialty catalog from the Personnel module
 */
export const specialtyService = {
    /**
     * Get all specialties from catalog
     */
    getAll: async (): Promise<SpecialtyCatalogEntry[]> => {
        try {
            const response = await apiClient.fetch(API_URL);
            if (!response.ok) {
                throw new Error('Failed to fetch specialties');
            }
            return response.json();
        } catch (error) {
            console.error('Error fetching specialties:', error);
            throw error;
        }
    },

    /**
     * Get specialties by category
     * @param category Category filter (officers, ncos, professionalSoldiers, regularSoldiers, civilians)
     */
    getByCategory: async (category: string): Promise<SpecialtyCatalogEntry[]> => {
        try {
            const response = await apiClient.fetch(`${API_URL}/category/${category}`);
            if (!response.ok) {
                throw new Error(`Failed to fetch specialties for category: ${category}`);
            }
            return response.json();
        } catch (error) {
            console.error(`Error fetching specialties for category ${category}:`, error);
            throw error;
        }
    },

    /**
     * Get specialty by ID
     */
    getById: async (id: string): Promise<SpecialtyCatalogEntry> => {
        try {
            const response = await apiClient.fetch(`${API_URL}/${id}`);
            if (!response.ok) {
                throw new Error(`Failed to fetch specialty: ${id}`);
            }
            return response.json();
        } catch (error) {
            console.error(`Error fetching specialty ${id}:`, error);
            throw error;
        }
    },

    /**
     * Create new specialty in catalog
     */
    create: async (specialty: Omit<SpecialtyCatalogEntry, 'id'>): Promise<SpecialtyCatalogEntry> => {
        try {
            const response = await apiClient.fetch(API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(specialty),
            });
            if (!response.ok) {
                throw new Error('Failed to create specialty');
            }
            return response.json();
        } catch (error) {
            console.error('Error creating specialty:', error);
            throw error;
        }
    },

    /**
     * Update existing specialty
     */
    update: async (id: string, specialty: Partial<SpecialtyCatalogEntry>): Promise<SpecialtyCatalogEntry> => {
        try {
            const response = await apiClient.fetch(`${API_URL}/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ ...specialty, id }),
            });
            if (!response.ok) {
                throw new Error(`Failed to update specialty: ${id}`);
            }
            return response.json();
        } catch (error) {
            console.error(`Error updating specialty ${id}:`, error);
            throw error;
        }
    },

    /**
     * Delete specialty from catalog
     */
    delete: async (id: string): Promise<void> => {
        try {
            const response = await apiClient.fetch(`${API_URL}/${id}`, {
                method: 'DELETE',
            });
            if (!response.ok) {
                throw new Error(`Failed to delete specialty: ${id}`);
            }
        } catch (error) {
            console.error(`Error deleting specialty ${id}:`, error);
            throw error;
        }
    },
};

