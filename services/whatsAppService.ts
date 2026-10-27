import { API_BASE_URL } from '../utils/apiConfig';
import { apiClient } from '../utils/apiClient';

export interface WhatsAppStatus {
  instanceName: string;
  status: 'open' | 'close' | 'connecting' | 'disconnected';
  connected: boolean;
  phoneNumber?: string;
  error?: string;
}

export interface WhatsAppQrResponse {
  success: boolean;
  instanceName?: string;
  qrcode?: string; // Base64 image
  code?: string;
  pairingCode?: string;
  error?: string;
}

const WHATSAPP_API_URL = `${API_BASE_URL}/api/whatsapp`;

export const whatsAppService = {
  /**
   * Obtiene el estado actual de la conexión de WhatsApp
   */
  async getStatus(): Promise<WhatsAppStatus> {
    try {
      const response = await apiClient.fetch(`${WHATSAPP_API_URL}/status`);
      if (!response.ok) {
        return { instanceName: 'SIMCOP_CENTRAL', status: 'disconnected', connected: false };
      }
      return await response.json();
    } catch (error) {
      console.error('Error al consultar estado de WhatsApp:', error);
      return { instanceName: 'SIMCOP_CENTRAL', status: 'disconnected', connected: false };
    }
  },

  /**
   * Solicita o refresca el código QR para escanear con la app de WhatsApp
   */
  async getQrCode(): Promise<WhatsAppQrResponse> {
    try {
      const response = await apiClient.fetch(`${WHATSAPP_API_URL}/qr`);
      if (!response.ok) {
        throw new Error('No se pudo generar el código QR');
      }
      return await response.json();
    } catch (error: any) {
      console.error('Error al obtener QR de WhatsApp:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Desconecta o cierra la sesión de WhatsApp
   */
  async disconnect(): Promise<boolean> {
    try {
      const response = await apiClient.fetch(`${WHATSAPP_API_URL}/disconnect`, {
        method: 'POST'
      });
      return response.ok;
    } catch (error) {
      console.error('Error al desconectar WhatsApp:', error);
      return false;
    }
  },

  /**
   * Envía un mensaje de prueba a un número específico
   */
  async sendTestMessage(phoneNumber: string, message?: string): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
      const response = await apiClient.fetch(`${WHATSAPP_API_URL}/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber, message })
      });
      const data = await response.json();
      if (response.ok) {
        return { success: true, message: data.message };
      } else {
        return { success: false, error: data.error || 'Fallo en envío de prueba' };
      }
    } catch (error: any) {
      return { success: false, error: error.message || 'Error de red' };
    }
  },

  /**
   * Actualiza el número de WhatsApp de un usuario militar / CDT
   */
  async updateUserPhoneNumber(userId: string, phoneNumber: string): Promise<boolean> {
    try {
      const response = await apiClient.fetch(`${WHATSAPP_API_URL}/config/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber })
      });
      return response.ok;
    } catch (error) {
      console.error('Error al guardar número de WhatsApp:', error);
      return false;
    }
  },

  /**
   * Difunde una alerta táctica general a comandantes
   */
  async broadcastTacticalAlert(title: string, message: string, urgency: string = 'ALTA'): Promise<boolean> {
    try {
      const response = await apiClient.fetch(`${WHATSAPP_API_URL}/tactical-alert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, message, urgency })
      });
      return response.ok;
    } catch (error) {
      console.error('Error al transmitir alerta táctica:', error);
      return false;
    }
  }
};
