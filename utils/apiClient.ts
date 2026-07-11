import { API_BASE_URL } from './apiConfig';

// Store token in memory instead of localStorage to prevent XSS theft
let memoryToken: string | null = null;

export const apiClient = {
    setToken: (token: string) => {
        memoryToken = token;
    },
    getToken: () => {
        return memoryToken;
    },
    clearToken: () => {
        memoryToken = null;
    },
    fetch: async (url: string, options: RequestInit = {}) => {
        const token = memoryToken;
        const headers = new Headers(options.headers || {});

        if (token) {
            headers.set('Authorization', `Bearer ${token}`);
        }

        const response = await fetch(url, {
            ...options,
            headers,
        });

        if (response.status === 401) {
            const currentToken = memoryToken;
            
            if (currentToken && !url.includes('/api/config')) {
                memoryToken = null;
                window.dispatchEvent(new Event('simcop-logout'));
            }
        } else if (response.status === 403) {
            // Forbidden: Token is valid but user lacks specific permissions for this resource
            // DO NOT clear session to avoid infinite login/logout loops
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
        const token = memoryToken;
        const formData = new FormData();
        formData.append('file', file);

        const headers = new Headers();
        if (token) {
            headers.set('Authorization', `Bearer ${token}`);
        }
        // Nota: NO establecer 'Content-Type': 'multipart/form-data' manualmente,
        // fetch lo hace automáticamente con el boundary correcto.

        const uploadUrl = `${API_BASE_URL}/api/files/upload`;

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
