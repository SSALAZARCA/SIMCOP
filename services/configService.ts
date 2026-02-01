import { API_BASE_URL } from '../utils/apiConfig';
import { apiClient } from '../utils/apiClient';
// Service for managing application configuration via backend API

// Rename local variable to avoid conflict with imported constant
const API_CONFIG_URL = `${API_BASE_URL}/api/config`;

export interface GeminiApiKeyStatus {
    configured: boolean;
}

export interface GeminiApiKeyResponse {
    apiKey: string;
}

export interface SaveApiKeyRequest {
    apiKey: string;
    username?: string;
}

export interface ApiResponse {
    message?: string;
    error?: string;
}

export const configService = {
    /**
     * Check if Gemini API key is configured
     */
    async getGeminiApiKeyStatus(): Promise<boolean> {
        try {
            const response = await apiClient.fetch(`${API_CONFIG_URL}/gemini-api-key/status`);
            if (!response.ok) {
                throw new Error('Failed to check API key status');
            }
            const data: GeminiApiKeyStatus = await response.json();
            return data.configured;
        } catch (error) {
            console.error('Error checking API key status:', error);
            return false;
        }
    },

    /**
     * Get Gemini API key from backend
     */
    async getGeminiApiKey(): Promise<string | null> {
        try {
            const response = await apiClient.fetch(`${API_CONFIG_URL}/gemini-api-key`);
            if (response.status === 404) {
                return null;
            }
            if (response.status === 403) {
                // 403 Forbidden - user not authenticated yet, return null silently
                return null;
            }
            if (!response.ok) {
                throw new Error('Failed to get API key');
            }
            const data: GeminiApiKeyResponse = await response.json();
            return data.apiKey;
        } catch (error) {
            // Only log non-403 errors
            if (error instanceof Error && !error.message.includes('403')) {
                console.error('Error getting API key:', error);
            }
            return null;
        }
    },

    /**
     * Save Gemini API key to backend
     */
    async saveGeminiApiKey(apiKey: string, username: string = 'admin'): Promise<void> {
        try {
            console.log('📡 Enviando solicitud POST a:', `${API_CONFIG_URL}/gemini-api-key`);
            console.log('📦 Payload:', { apiKey: apiKey.substring(0, 10) + '...', username });

            const response = await apiClient.fetch(`${API_CONFIG_URL}/gemini-api-key`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ apiKey, username }),
            });

            console.log('📨 Respuesta recibida - Status:', response.status, response.statusText);

            if (!response.ok) {
                let errorMessage = 'Failed to save API key';
                try {
                    const contentType = response.headers.get('content-type');
                    console.log('📄 Content-Type de error:', contentType);

                    if (contentType && contentType.includes('application/json')) {
                        const errorData: ApiResponse = await response.json();
                        console.log('📋 Error JSON:', errorData);
                        errorMessage = errorData.error || errorMessage;
                    } else {
                        const textError = await response.text();
                        console.log('📝 Error texto:', textError);
                        errorMessage = textError || errorMessage;
                    }
                } catch (parseError) {
                    console.error('⚠️ Error parsing error response:', parseError);
                }
                throw new Error(errorMessage);
            }

            console.log('✅ API key guardada exitosamente en backend');
        } catch (error) {
            console.error('🔥 Error en saveGeminiApiKey:', error);
            if (error instanceof Error) {
                throw error;
            }
            throw new Error('Failed to save API key');
        }
    },

    /**
     * Delete Gemini API key from backend
     */
    async deleteGeminiApiKey(): Promise<void> {
        try {
            const response = await apiClient.fetch(`${API_CONFIG_URL}/gemini-api-key`, {
                method: 'DELETE',
            });

            if (!response.ok) {
                let errorMessage = 'Failed to delete API key';
                try {
                    const contentType = response.headers.get('content-type');
                    if (contentType && contentType.includes('application/json')) {
                        const errorData: ApiResponse = await response.json();
                        errorMessage = errorData.error || errorMessage;
                    } else {
                        const textError = await response.text();
                        errorMessage = textError || errorMessage;
                    }
                } catch (parseError) {
                    console.error('Error parsing error response:', parseError);
                }
                throw new Error(errorMessage);
            }
        } catch (error) {
            if (error instanceof Error) {
                throw error;
            }
            throw new Error('Failed to delete API key');
        }
    },
};
