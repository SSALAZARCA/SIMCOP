import { DatabaseStats, AdminAuditLog } from '../types';

const BASE_URL = '/api/admin';
const TWO_FA_URL = '/api/2fa';

const getHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };
};

export const adminService = {
  getStats: async (): Promise<DatabaseStats> => {
    const response = await fetch(`${BASE_URL}/stats`, { headers: getHeaders() });
    if (!response.ok) throw new Error('Failed to fetch stats');
    return response.json();
  },

  getTableData: async (tableName: string): Promise<any[]> => {
    const response = await fetch(`${BASE_URL}/table/${tableName}`, { headers: getHeaders() });
    if (!response.ok) throw new Error(`Failed to fetch data for ${tableName}`);
    return response.json();
  },

  getAuditLogs: async (): Promise<AdminAuditLog[]> => {
    const response = await fetch(`${BASE_URL}/audit-logs`, { headers: getHeaders() });
    if (!response.ok) throw new Error('Failed to fetch audit logs');
    return response.json();
  },

  truncateTable: async (tableName: string, totpCode: string): Promise<string> => {
    const response = await fetch(`${BASE_URL}/table/${tableName}/truncate`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ totpCode })
    });
    
    if (!response.ok) {
        const errText = await response.text();
        throw new Error(errText || 'Failed to truncate table');
    }
    return response.text();
  },

  // 2FA Endpoints
  generate2fa: async (): Promise<{ qrCodeUri: string, manualSecret: string }> => {
    const response = await fetch(`${TWO_FA_URL}/generate`, { headers: getHeaders() });
    if (!response.ok) throw new Error('Failed to generate 2FA secret');
    return response.json();
  },

  enable2fa: async (code: string): Promise<string> => {
    const response = await fetch(`${TWO_FA_URL}/enable`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ code })
    });
    if (!response.ok) throw new Error(await response.text());
    return response.text();
  },

  disable2fa: async (code: string): Promise<string> => {
    const response = await fetch(`${TWO_FA_URL}/disable`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ code })
    });
    if (!response.ok) throw new Error(await response.text());
    return response.text();
  }
};
