import { API_BASE_URL } from '../utils/apiConfig';
import { apiClient } from '../utils/apiClient';
import { WeatherInfo } from '../types';

const API_URL = `${API_BASE_URL}/api/weather`;

export const weatherService = {
    getCurrentWeather: async (lat: number, lon: number): Promise<WeatherInfo> => {
        const response = await apiClient.fetch(`${API_URL}/current?lat=${lat}&lon=${lon}`);
        if (!response.ok) throw new Error('Error al obtener el clima');
        return response.json();
    }
};

