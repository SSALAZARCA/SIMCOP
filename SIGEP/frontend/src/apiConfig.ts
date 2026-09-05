// Configuración centralizada de las APIs para despliegue en VPS
// En desarrollo, usa localhost. En producción (VPS), usa la IP pública o dominio.

const isDev = import.meta.env.DEV;
export const SIMCOP_API_URL = import.meta.env.VITE_SIMCOP_API_URL || 'http://localhost:8080/api';
export const SIGEP_API_URL = import.meta.env.VITE_SIGEP_API_URL || (isDev ? 'http://localhost:4000/api' : '/api');
