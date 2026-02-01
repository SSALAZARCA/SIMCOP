import { API_BASE_URL } from '../utils/apiConfig';
import { apiClient } from '../utils/apiClient';
import { BMARecommendation, LogisticsPrediction, Hotspot } from '../types';

const getBaseUrl = () => {
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    return `http://${host}:8080/api/bma`;
  }
  return `${API_BASE_URL}/api/bma`;
};

const API_URL = getBaseUrl();

export const bmaService = {
  getRecommendations: async (threatId: string): Promise<BMARecommendation[]> => {
    const response = await apiClient.fetch(`${API_URL}/recommendations/${threatId}`);
    if (!response.ok) throw new Error('Error al obtener recomendaciones del BMA');
    return response.json();
  },

  getLogisticsPredictions: async (): Promise<LogisticsPrediction[]> => {
    const response = await apiClient.fetch(`${API_URL}/logistics`);
    if (!response.ok) throw new Error('Error al obtener predicciones logísticas del BMA');
    return response.json();
  },

  requestResupply: async (unitId: string): Promise<void> => {
    const response = await apiClient.fetch(`${API_URL}/logistics/request/${unitId}`, {
      method: 'POST',
    });
    if (!response.ok) throw new Error('Error al solicitar reabastecimiento');
  },

  getHotspots: async (): Promise<Hotspot[]> => {
    const response = await apiClient.fetch(`${API_URL}/hotspots`);
    if (!response.ok) throw new Error('Error al obtener hotspots del BMA');
    return response.json();
  },

  getHistoricalHotspots: async (hours: number = 48): Promise<Hotspot[]> => {
    const response = await apiClient.fetch(`${API_URL}/hotspots/historical?hours=${hours}`);
    if (!response.ok) throw new Error('Error al obtener hotspots históricos');
    return response.json();
  },

  getDoctrinalChecklist: async (missionType: string): Promise<string[]> => {
    const response = await apiClient.fetch(`${API_URL}/doctrine/checklist?missionType=${missionType}`);
    if (!response.ok) throw new Error('Error al obtener checklist doctrinal');
    return response.json();
  },
};

