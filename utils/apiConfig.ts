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

        // Handle production domain automatically if VITE_API_BASE_URL is missing
        if (host === 'simcop.site' || host.endsWith('.simcop.site')) {
            // Force HTTPS for production subdomains
            return `https://api.simcop.site`;
        }

        // Si estamos en localhost y no hay URL definida, intentar usar el puerto 8080 (dev estándar) 
        // o 5005 (Docker default) si el puerto actual es el del frontend docker (5006)
        if (host === 'localhost' || host === '127.0.0.1') {
            if (port === '5006') return `${protocol}//${host}:5005`;
            if (port === '3000' || port === '5173') return `${protocol}//${host}:8080`;
        }

        // Default fallback: usar el host actual con el puerto 8080
        return `${protocol}//${host}:8080`;
    }

    return 'http://localhost:8080';
};

export const API_BASE_URL = getApiBaseUrl();
