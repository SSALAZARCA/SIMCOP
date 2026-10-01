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

        // In production on simcop.site:
        // Point directly to https://api.simcop.site where Traefik routes directly to Spring Boot
        if (host === 'simcop.site' || host.endsWith('.simcop.site')) {
            return 'https://api.simcop.site';
        }

        return '';
    }

    return '';
};

export const API_BASE_URL = getApiBaseUrl();
