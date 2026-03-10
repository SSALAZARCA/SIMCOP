export const getApiBaseUrl = () => {
    // If we're in a browser, we can also detect the host if needed
    // But VITE_API_BASE_URL is the preferred way to configure it for production
    const envBaseUrl = import.meta.env.VITE_API_BASE_URL;

    if (envBaseUrl) {
        return envBaseUrl;
    }

    if (typeof window !== 'undefined') {
        const host = window.location.hostname;
        const protocol = window.location.protocol === 'https:' ? 'https:' : 'http:';
        
        // If we are on a production domain like simcop.site but without VITE_API_BASE_URL
        // we should probably try the api. subdomain or the same host with SSL
        if (host === 'simcop.site') {
            return `https://api.simcop.site`;
        }
        
        return `${protocol}//${host}:8080`;
    }

    return 'http://localhost:8080';
};

export const API_BASE_URL = getApiBaseUrl();
