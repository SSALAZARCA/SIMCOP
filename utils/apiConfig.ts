export const getApiBaseUrl = () => {
    // VITE_API_BASE_URL is the preferred way via environment variables (Docker/Deploy)
    const envBaseUrl = import.meta.env.VITE_API_BASE_URL;

    if (envBaseUrl && envBaseUrl.trim() !== "") {
        return envBaseUrl;
    }

    if (typeof window !== 'undefined') {
        const host = window.location.hostname;
        const protocol = window.location.protocol;
        const port = window.location.port;

        // In production (simcop.site, Coolify, or any custom domain), Nginx reverse-proxies /api/
        // directly to http://backend:8080/api/.
        // Returning '' (relative path) ensures all API requests go to the same origin without CORS or 403 errors.
        if (host === 'simcop.site' || host.endsWith('.simcop.site')) {
            return '';
        }

        // Si estamos en localhost bajo Nginx (puerto 80 o standard) o en Docker o Vite
        if (host === 'localhost' || host === '127.0.0.1') {
            if (port === '5006') return `${protocol}//${host}:5005`;
            if (port === '3010' || port === '5173' || port === '3000') {
                // Vite dev server proxy handles /api and /ai_api seamlessly
                return '';
            }
            if (port === '80' || port === '') return '';
        }

        // Default fallback: relative URL '' so Nginx/server proxies /api correctly
        return '';
    }

    return '';
};

export const API_BASE_URL = getApiBaseUrl();
