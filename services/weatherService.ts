import { API_BASE_URL } from '../utils/apiConfig';
import { apiClient } from '../utils/apiClient';
import { WeatherInfo } from '../types';

const API_URL = `${API_BASE_URL}/api/weather`;

export const weatherService = {
    getCurrentWeather: async (lat: number, lon: number): Promise<WeatherInfo> => {
        const response = await apiClient.fetch(`${API_URL}/current?lat=${lat}&lon=${lon}`);
        if (!response.ok) throw new Error('Error al obtener el clima');
        return response.json();
    },
    getElevation: async (lat: number, lon: number): Promise<number> => {
        const response = await apiClient.fetch(`${API_URL}/elevation?lat=${lat}&lon=${lon}`);
        if (!response.ok) return 0;
        const data = await response.json();
        return data.elevation || 0;
    },
    getElevationGrid: async (points: { lat: number; lon: number }[]): Promise<{ lat: number; lon: number; elev: number }[]> => {
        try {
            if (!points || points.length === 0) return [];
            const lats = points.map(p => p.lat.toFixed(5)).join(',');
            const lons = points.map(p => p.lon.toFixed(5)).join(',');
            const response = await fetch(`https://api.open-meteo.com/v1/elevation?latitude=${lats}&longitude=${lons}`);
            if (response.ok) {
                const data = await response.json();
                if (Array.isArray(data.elevation)) {
                    return points.map((p, idx) => ({
                        lat: p.lat,
                        lon: p.lon,
                        elev: Math.round(data.elevation[idx] || 0)
                    }));
                }
            }
        } catch (e) {
            console.warn("Fallo consultando matriz de elevación Open-Meteo:", e);
        }
        return [];
    }
};
