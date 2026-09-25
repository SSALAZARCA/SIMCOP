export const getApiBaseUrl = () => {
    // In any browser environment (whether simcop.site, custom domain, or VPS IP):
    if (typeof window !== 'undefined') {
        const host = window.location.hostname;
        const protocol = window.location.protocol;
        const port = window.location.port;

        // Local development special cases
        if (host === 'localhost' || host === '127.0.0.1') {
            if (port === '5006') return `${protocol}//${host}:5005`;
            return '';
        }

        // In ANY production deployment (simcop.site, Coolify, VPS):
        // Nginx reverse-proxies /api/ directly to backend:8080.
        // Returning '' guarantees all requests use relative paths on the same origin,
        // preventing any 403, DNS failure, or CORS issues completely.
        return '';
    }

    return '';
};

export const API_BASE_URL = getApiBaseUrl();
