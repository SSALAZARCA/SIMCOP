
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
            headers.set('Authorization', `Bearer ${token}`);
        }

        const response = await fetch(url, {
            ...options,
            headers,
        });

        if (response.status === 403 || response.status === 401) {
            // Token might be expired or invalid
            console.warn(`Access denied (${response.status}) for ${url}. Clearing session.`);

            // Only clear if we actually had a token (to avoid loops on public endpoints failing)
            if (token) {
                localStorage.removeItem(SIMCOP_TOKEN_KEY);
                // Dispatch event to notify App to logout
                window.dispatchEvent(new Event('simcop-logout'));
            }
        }

        return response;
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

        // Determinar URL base (asumiendo backend en puerto 8080)
        const host = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
        const uploadUrl = `http://${host}:8080/api/files/upload`;

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
