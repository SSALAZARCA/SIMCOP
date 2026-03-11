import { API_BASE_URL } from './apiConfig';

const SIMCOP_TOKEN_KEY = 'simcop_auth_token';

export const apiClient = {
    setToken: (token: string) => {
        localStorage.setItem(SIMCOP_TOKEN_KEY, token);
    },
    getToken: () => {
        return localStorage.getItem(SIMCOP_TOKEN_KEY);
    },
    clearToken: () => {
        localStorage.removeItem(SIMCOP_TOKEN_KEY);
    },
    fetch: async (url: string, options: RequestInit = {}) => {
        const token = localStorage.getItem(SIMCOP_TOKEN_KEY);
        const headers = new Headers(options.headers || {});

        if (token) {
            console.log(`📡 [apiClient] Request to ${url} - Token: ${token.substring(0, 10)}...`);
            headers.set('Authorization', `Bearer ${token}`);
        } else {
            console.warn(`📡 [apiClient] Request to ${url} - No token found in localStorage`);
        }

        const startTime = Date.now();
        const response = await fetch(url, {
            ...options,
            headers,
        });
        const duration = Date.now() - startTime;
        
        console.log(`📨 [apiClient] Response from ${url} - Status: ${response.status} (${duration}ms)`);

        if (response.status === 401) {
            // Token is expired or unauthorized
            const currentToken = localStorage.getItem(SIMCOP_TOKEN_KEY);
            
            // Log details before clearing
            try {
                const errorData = await response.clone().json();
                console.error(`❌ [apiClient] 401 Details for ${url}:`, errorData);
            } catch (e) {
                console.warn(`❌ [apiClient] 401 for ${url} (No JSON body)`);
            }

            // Don't clear session for public config endpoints or if no token exists
            if (currentToken && !url.includes('/api/config')) {
                console.warn(`⚠️ [apiClient] Session cleared for ${url}`);
                localStorage.removeItem(SIMCOP_TOKEN_KEY);
                window.dispatchEvent(new Event('simcop-logout'));
            }
        } else if (response.status === 403) {
            // Forbidden: Token is valid but user lacks specific permissions for this resource
            // DO NOT clear session to avoid infinite login/logout loops
            console.error(`Access denied (403 Forbidden) for ${url}. Session preserved.`);
        }

        return response;
    },
    get: async (url: string) => {
        const res = await apiClient.fetch(url, { method: 'GET' });
        if (!res.ok) throw new Error(`GET ${url} failed: ${res.status}`);
        return res.json();
    },
    post: async (url: string, body: any) => {
        const res = await apiClient.fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        if (!res.ok) throw new Error(`POST ${url} failed: ${res.status}`);
        return res.json();
    },
    put: async (url: string, body: any) => {
        const res = await apiClient.fetch(url, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        if (!res.ok) throw new Error(`PUT ${url} failed: ${res.status}`);
        return res.ok;
    },
    delete: async (url: string) => {
        const res = await apiClient.fetch(url, { method: 'DELETE' });
        if (!res.ok) throw new Error(`DELETE ${url} failed: ${res.status}`);
        return res.ok;
    },
    // Método específico para subir archivos (Multipart)
    uploadFile: async (file: File): Promise<{ fileName: string; fileDownloadUri: string; fileType: string; size: string }> => {
        const token = localStorage.getItem(SIMCOP_TOKEN_KEY);
        const formData = new FormData();
        formData.append('file', file);

        const headers = new Headers();
        if (token) {
            headers.set('Authorization', `Bearer ${token}`);
        }
        // Nota: NO establecer 'Content-Type': 'multipart/form-data' manualmente,
        // fetch lo hace automáticamente con el boundary correcto.

        // Usar la URL base centralizada
        const uploadUrl = `${API_BASE_URL}/api/files/upload`;
        // Si no hay VITE_API_BASE_URL, el fallback de fetch manejará la URL relativa si se desea, 
        // pero mejor usar una lógica similar a apiConfig o importar API_BASE_URL
        // Sin embargo, para no crear dependencias circulares complejas, usamos una lógica directa o el env.

        const response = await fetch(uploadUrl, {
            method: 'POST',
            headers: headers,
            body: formData
        });

        if (!response.ok) {
            throw new Error(`Error subiendo archivo: ${response.statusText}`);
        }

        return await response.json();
    }
};
