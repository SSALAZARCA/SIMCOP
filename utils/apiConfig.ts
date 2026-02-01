export const getApiBaseUrl = () => {
    // If we're in a browser, we can also detect the host if needed
    // But VITE_API_BASE_URL is the preferred way to configure it for production
    const envBaseUrl = import.meta.env.VITE_API_BASE_URL;

    if (envBaseUrl) {
        return envBaseUrl;
    }

    if (typeof window !== 'undefined') {
        const host = window.location.hostname;
        return `http://${host}:8080`;
    }

    return 'http://localhost:8080';
};

export const API_BASE_URL = getApiBaseUrl();
