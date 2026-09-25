export const getApiBaseUrl = () => {
    // 1. If running in browser and hostname is simcop.site (or any subdomain like www.simcop.site),
    // always use relative paths ('') so requests go through Nginx reverse proxy (/api/ -> backend:8080).
    if (typeof window !== 'undefined') {
        const host = window.location.hostname;
        if (host === 'simcop.site' || host.endsWith('.simcop.site')) {
            return '';
        }
    }

    // 2. VITE_API_BASE_URL is evaluated for external/custom setups
    const envBaseUrl = import.meta.env.VITE_API_BASE_URL;

    if (envBaseUrl && envBaseUrl.trim() !== "") {
        const trimmed = envBaseUrl.trim();
        // If the env var mistakenly points to api.simcop.site, ignore it and return ''
        if (trimmed.includes("api.simcop.site")) {
            return '';
        }
        return trimmed;
    }

    if (typeof window !== 'undefined') {
        const host = window.location.hostname;
        const protocol = window.location.protocol;
        const port = window.location.port;

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
