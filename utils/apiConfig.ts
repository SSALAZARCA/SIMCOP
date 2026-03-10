export const getApiBaseUrl = () => {
    // VITE_API_BASE_URL is the preferred way via environment variables (Docker/Deploy)
    const envBaseUrl = import.meta.env.VITE_API_BASE_URL;

    if (envBaseUrl && envBaseUrl.trim() !== "") {
        return envBaseUrl;
    }

    if (typeof window !== 'undefined') {
        const host = window.location.hostname;
        const protocol = window.location.protocol;

        // Handle production domain automatically if VITE_API_BASE_URL is missing
        if (host === 'simcop.site' || host.endsWith('.simcop.site')) {
            // Force HTTPS for production subdomains
            return `https://api.simcop.site`;
        }

        // Default for local development or custom network IPs
        return `${protocol}//${host}:8080`;
    }

    return 'http://localhost:8080';
};

export const API_BASE_URL = getApiBaseUrl();
