import { GoogleGenAI, GenerateContentResponse, FunctionDeclaration, Type, Blob as GenaiBlob } from "@google/genai";
import { COAGraphicType } from '../types';
import type { MilitaryUnit, IntelligenceReport, GeminiAnalysisResult, GroundingSource, AfterActionReport, Q5ContentPayload, CommanderInfo, Alert, COAPlan, COAPhase, COAGraphicElement, GeoLocation, PredictedLogisticsNeed, WeatherInfo, WargameSimulationResult, BMAInterceptionSimulationResult } from '../types';
import { decimalToDMS } from './coordinateUtils';
import { API_BASE_URL } from './apiConfig';
import { useState, useEffect } from 'react';

import { apiClient } from './apiClient';

// Get API key from backend API
let API_KEY: string | undefined = undefined;
let ai: GoogleGenAI | null = null;
let aiProvider: string = 'GEMINI';
let localEndpoint: string = 'http://localhost:1234';
let localModel: string = 'llama3';

// Runtime cache to persist AI query results across component unmounts
export const aiCache = {
  proactiveAnalysis: null as { text: string; timestamp: number } | null,
  predictiveLogistics: null as { data: PredictedLogisticsNeed[]; timestamp: number } | null,
};

// --- Task Registry and State tracking for Real-time FIFO Queue ---
export interface AITaskState {
  taskId: string | null;
  status: 'IDLE' | 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  queuePosition: number;
  result: any | null;
  error: string | null;
}

const initialTaskState: AITaskState = {
  taskId: null,
  status: 'IDLE',
  queuePosition: 0,
  result: null,
  error: null
};

const getStoredTaskResult = (key: string): any | null => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const stored = localStorage.getItem(`simcop_last_result_${key}`);
      return stored ? JSON.parse(stored) : null;
    }
  } catch (e) {
    console.error(`Error loading stored result for ${key}:`, e);
  }
  return null;
};

const storedProactive = getStoredTaskResult('proactiveAnalysis');
const storedLogistics = getStoredTaskResult('predictiveLogistics');

const taskRegistry: Record<string, AITaskState> = {
  generalAnalysis: { ...initialTaskState },
  coaGeneration: { ...initialTaskState },
  coaSimulation: { ...initialTaskState },
  doctrinalAssistant: { ...initialTaskState },
  proactiveAnalysis: storedProactive 
    ? { ...initialTaskState, status: 'COMPLETED', result: storedProactive } 
    : { ...initialTaskState },
  predictiveLogistics: storedLogistics 
    ? { ...initialTaskState, status: 'COMPLETED', result: storedLogistics } 
    : { ...initialTaskState },
  bmaInterception: { ...initialTaskState },
  bmaBrief: { ...initialTaskState },
  q5Generation: { ...initialTaskState }
};

const taskListeners: Record<string, Set<(state: AITaskState) => void>> = {
  generalAnalysis: new Set(),
  coaGeneration: new Set(),
  coaSimulation: new Set(),
  doctrinalAssistant: new Set(),
  proactiveAnalysis: new Set(),
  predictiveLogistics: new Set(),
  bmaInterception: new Set(),
  bmaBrief: new Set(),
  q5Generation: new Set()
};

export const getTaskState = (key: string): AITaskState => {
  return taskRegistry[key] || { ...initialTaskState };
};

export const subscribeToTask = (key: string, listener: (state: AITaskState) => void) => {
  if (!taskListeners[key]) {
    taskListeners[key] = new Set();
  }
  taskListeners[key].add(listener);
  return () => {
    taskListeners[key].delete(listener);
  };
};

export const updateTaskState = (key: string, updates: Partial<AITaskState>) => {
  if (!taskRegistry[key]) {
    taskRegistry[key] = { ...initialTaskState };
  }
  taskRegistry[key] = { ...taskRegistry[key], ...updates };

  // Persist successful results for automatic AI views
  if ((key === 'proactiveAnalysis' || key === 'predictiveLogistics') && updates.status === 'COMPLETED' && updates.result) {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem(`simcop_last_result_${key}`, JSON.stringify(updates.result));
      }
    } catch (e) {
      console.error(`Error saving ${key} result to localStorage:`, e);
    }
  }

  taskListeners[key]?.forEach(listener => listener(taskRegistry[key]));
};

// React hook to subscribe to global AI Task state
export const useAITask = (key: string): AITaskState => {
  const [state, setState] = useState<AITaskState>(() => getTaskState(key));

  useEffect(() => {
    return subscribeToTask(key, (newState) => {
      setState(newState);
    });
  }, [key]);

  return state;
};

// Strategic hours scheduler helper (runs at 06:00, 14:00, 22:00)
export const shouldTriggerAutoAI = (key: string): boolean => {
  const now = new Date();
  const currentHour = now.getHours();
  const strategicHours = [6, 14, 22];
  if (!strategicHours.includes(currentHour)) {
    return false;
  }
  
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hourStr = String(currentHour).padStart(2, '0');
  
  const runKey = `simcop_autorun_${key}_${year}-${month}-${day}-${hourStr}`;
  const alreadyRun = localStorage.getItem(runKey);
  if (alreadyRun) {
    return false;
  }
  
  localStorage.setItem(runKey, 'true');
  return true;
};

/**
 * Thoroughly strips reasoning and deep thinking tags (<think>...</think>, <thought>...</thought>,
 * <thinking>...</thinking>, <reasoning>...</reasoning>) from model outputs, including nested,
 * unclosed, and multiline tokens, preventing downstream JSON parse crashes.
 */
export const stripReasoningTags = (rawResponse: string | null | undefined): string => {
  if (!rawResponse || typeof rawResponse !== 'string') return '';
  let result = rawResponse;

  // Iteratively strip think/thought/thinking/reasoning tags to handle nested or consecutive blocks
  while (/<(think|thought|thinking|reasoning)>[\s\S]*?<\/\1>/i.test(result)) {
    result = result.replace(/<(think|thought|thinking|reasoning)>[\s\S]*?<\/\1>/gi, '');
  }

  // Handle unclosed tags at beginning or mid-text, and orphaned closing tags
  result = result.replace(/<(think|thought|thinking|reasoning)>[\s\S]*$/gi, '');
  result = result.replace(/^[\s\S]*?<\/(?:think|thought|thinking|reasoning)>/gi, '');
  result = result.replace(/<\/(?:think|thought|thinking|reasoning)>/gi, '');

  return result.trim();
};

// Initialize API key and provider from backend
export const initializeApiKey = async (): Promise<void> => {
  try {
    // Load AI Provider first
    try {
      const providerResp = await apiClient.fetch(`${API_BASE_URL}/api/config/ai-provider`);
      if (providerResp.ok) {
        const providerData = await providerResp.json();
        aiProvider = providerData.provider || 'GEMINI';
        if (aiProvider === 'OMNIROUTE') {
          localEndpoint = providerData.localEndpoint || 'https://api.omniroute.ai/v1';
          localModel = providerData.localModel || 'omni-default';
        } else if (aiProvider === 'LOCAL_LMLink') {
          localEndpoint = providerData.localEndpoint || 'http://localhost:1234';
          localModel = providerData.localModel || 'gemma4-damasco';
        } else if (aiProvider === 'NATIVE_SIMCOP') {
          localEndpoint = providerData.localEndpoint || '/ai_api';
          localModel = providerData.localModel || 'simcop_nlp_weights_quantized_int8.pth';
        } else {
          localEndpoint = providerData.localEndpoint || 'http://localhost:11434';
          localModel = providerData.localModel || 'llama3';
        }
        console.log(`[AI] Provider loaded: ${aiProvider}`);
      }
    } catch (e) {
      console.warn('[AI] Could not load AI provider config, defaulting to GEMINI');
    }

    const response = await apiClient.fetch(`${API_BASE_URL}/api/config/gemini-api-key`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (response.ok) {
      const data = await response.json();
      API_KEY = data.apiKey;
      if (API_KEY) {
        console.log('[AI] ✅ API key / Token cargado');
        ai = new GoogleGenAI({ apiKey: API_KEY });
      } else {
        console.warn('[AI] ⚠️ No se encontró API key');
        ai = null;
      }
    } else {
      ai = null;
      console.error('[AI] Error al cargar API Key:', response.status);
    }
  } catch (error) {
    ai = null;
    console.error('[AI] Excepción al inicializar API Key:', error);
  }
};

/**
 * Helper to call Native PyTorch SIMCOP AI
 */
const callNativeAI = async (endpointPath: string, body: any): Promise<any> => {
  const baseUrl = localEndpoint.endsWith('/') ? localEndpoint.slice(0, -1) : localEndpoint;
  const url = `${baseUrl}/api/v1${endpointPath}`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  
  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Error en IA Nativa SIMCOP: ${response.statusText} - ${errText}`);
  }
  return await response.json();
};

/**
 * Proxy function to call Gemini through our backend (supports enqueuing and polling)
 */
const generateContentViaBackend = async (prompt: string, key?: string, systemInstruction?: string): Promise<string> => {
  if (key) {
    updateTaskState(key, { status: 'RUNNING', error: null, result: null });
  }

  // If using a local or router provider (Ollama, LMLink, OmniRoute), bypass the backend and hit the endpoint directly!
  if (aiProvider === 'LOCAL_OLLAMA' || aiProvider === 'LOCAL_LMLink' || aiProvider === 'OMNIROUTE') {
    try {
      console.log(`[AI] Interceptando llamada para IA: ${aiProvider} -> ${localEndpoint}`);
      
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      
      if ((aiProvider === 'LOCAL_LMLink' || aiProvider === 'OMNIROUTE') && API_KEY) {
        headers['Authorization'] = API_KEY.startsWith('Bearer ') ? API_KEY : `Bearer ${API_KEY}`;
      }

      let messages = [];
      if (systemInstruction) {
        messages.push({ role: 'system', content: systemInstruction });
      }
      messages.push({ role: 'user', content: prompt });

      const baseUrl = localEndpoint.replace(/\/+$/, '');
      const completionsUrl = baseUrl.endsWith('/v1') ? `${baseUrl}/chat/completions` : `${baseUrl}/v1/chat/completions`;

      const response = await fetch(completionsUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: localModel,
          messages,
          temperature: 0.4
        })
      });

      if (!response.ok) {
        throw new Error(`Error en ${aiProvider}: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const rawContent = data.choices && data.choices[0] && data.choices[0].message ? data.choices[0].message.content : '';
      
      // Strip reasoning tokens (<think>...</think>, <thought>...</thought>) for deep reasoning models (e.g. DeepSeek-R1 / OmniRoute)
      const content = stripReasoningTags(rawContent);

      if (key) {
        updateTaskState(key, { status: 'COMPLETED', result: content, queuePosition: 0 });
      }

      return content;
    } catch (error: any) {
      console.error(`[AI] Error ejecutando modelo ${aiProvider}:`, error);
      if (key) {
        updateTaskState(key, { status: 'FAILED', error: error.message });
      }
      throw error;
    }
  }

  // GEMINI fallback: Go through the backend to use the server's credentials
  const combinedPrompt = systemInstruction ? `${systemInstruction}\n\n${prompt}` : prompt;
  const response = await apiClient.fetch(`${API_BASE_URL}/api/ai/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ prompt: combinedPrompt })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Error desconocido' }));
    const errMsg = errorData.error || `Backend AI Error: ${response.status}`;
    if (key) {
      updateTaskState(key, { status: 'FAILED', error: errMsg });
    }
    throw new Error(errMsg);
  }

  const taskInfo = await response.json();
  const taskId = taskInfo.taskId;

  if (key) {
    updateTaskState(key, {
      taskId,
      status: taskInfo.status as any,
      queuePosition: taskInfo.queuePosition
    });
  }

  // Start polling
  return new Promise<string>((resolve, reject) => {
    const pollInterval = setInterval(async () => {
      try {
        const pollResp = await apiClient.fetch(`${API_BASE_URL}/api/ai/queue/${taskId}`);
        if (!pollResp.ok) {
          throw new Error(`Error en sondeo de cola: ${pollResp.status}`);
        }
        const currentTask = await pollResp.json();
        
        if (key) {
          updateTaskState(key, {
            status: currentTask.status,
            queuePosition: currentTask.queuePosition,
            error: currentTask.error
          });
        }

        if (currentTask.status === 'COMPLETED') {
          clearInterval(pollInterval);
          // Strip reasoning tokens before resolving
          const resultText = stripReasoningTags(currentTask.result || '');
          resolve(resultText);
        } else if (currentTask.status === 'FAILED') {
          clearInterval(pollInterval);
          reject(new Error(currentTask.error || 'La consulta de IA falló.'));
        }
      } catch (pollErr: any) {
        clearInterval(pollInterval);
        if (key) {
          updateTaskState(key, { status: 'FAILED', error: pollErr.message });
        }
        reject(pollErr);
      }
    }, 2000);
  });
};

// Initialize on module load
// initializeApiKey(); // Auto-initialization removed to prevent redundant calls

/**
 * Ensures the AI client is initialized, attempting to reinitialize if needed
 */
const ensureInitialized = async (): Promise<boolean> => {
  if (aiProvider === 'LOCAL_OLLAMA' || aiProvider === 'LOCAL_LMLink' || aiProvider === 'NATIVE_SIMCOP' || aiProvider === 'OMNIROUTE') {
    return true; // No need to initialize client-side Gemini SDK for Local/Router/Native AI
  }
  if (ai) {
    return true;
  }

  console.log('[Gemini] ⚠️ Cliente no inicializado, intentando reinicializar...');
  await initializeApiKey();

  if (aiProvider !== 'GEMINI' || ai) {
    console.log('[Gemini] ✅ Inicialización exitosa');
    return true;
  }

  console.error('[Gemini] ❌ No se pudo inicializar el cliente. Verifica que la API key esté configurada.');
  return false;
};


// --- Audio Helper Functions for Gemini Live ---
export function encode(bytes: Uint8Array) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

export async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

export function createBlob(data: Float32Array): GenaiBlob {
  const l = data.length;
  const int16 = new Int16Array(l);
  for (let i = 0; i < l; i++) {
    int16[i] = data[i] * 32768;
  }
  return {
    data: encode(new Uint8Array(int16.buffer)),
    mimeType: 'audio/pcm;rate=16000',
  };
}


// Helper function to escape special characters for template literals
const escapeTemplateLiteralContent = (str: string | undefined | null): string => {
  if (str === undefined || str === null) return '';
  return String(str).replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${');
};

const formatCommander = (commander: CommanderInfo | undefined): string => {
  if (!commander) return "Cmdte. Desconocido";
  return `${escapeTemplateLiteralContent(commander.rank)} ${escapeTemplateLiteralContent(commander.name)}`;
};

export const translateUnitType = (type: string): string => {
  switch (type) {
    case 'DIVISION': return 'División';
    case 'BRIGADE': return 'Brigada';
    case 'BATTALION': return 'Batallón';
    case 'COMPANY': return 'Compañía';
    case 'PLATOON': return 'Pelotón';
    case 'TEAM': return 'Equipo';
    case 'SQUAD': return 'Escuadra';
    case 'COMMAND_POST': return 'Puesto de Mando';
    case 'UAV_ATTACK_TEAM': return 'Equipo de UAV de Ataque';
    case 'UAV_INTEL_TEAM': return 'Equipo de UAV de Inteligencia';
    default: return type;
  }
};

export const translateUnitStatus = (status: string): string => {
  switch (status) {
    case 'OPERATIONAL': return 'Operacional';
    case 'MOVING': return 'En Movimiento';
    case 'STATIC': return 'Estática';
    case 'ENGAGED': return 'En Combate';
    case 'LOW_SUPPLIES': return 'Suministros Bajos';
    case 'NO_COMMUNICATION': return 'Sin Comunicación';
    case 'MAINTENANCE': return 'En Mantenimiento';
    case 'AAR_PENDING': return 'Reporte AAR Pendiente';
    case 'ON_LEAVE_RETRAINING': return 'Licencia / Reentrenamiento';
    default: return status;
  }
};

const calculateDistanceKm = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const getBearingCardinal = (lat1: number, lon1: number, lat2: number, lon2: number): string => {
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const y = Math.sin(dLon) * Math.cos(lat2 * Math.PI / 180);
  const x = Math.cos(lat1 * Math.PI / 180) * Math.sin(lat2 * Math.PI / 180) -
            Math.sin(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.cos(dLon);
  let brng = Math.atan2(y, x) * 180 / Math.PI;
  brng = (brng + 360) % 360;
  const directions = ['Norte', 'Noreste', 'Este', 'Sureste', 'Sur', 'Suroeste', 'Oeste', 'Noroeste'];
  return directions[Math.round(brng / 45) % 8];
};

const formatUnitsForPrompt = (units: MilitaryUnit[], intelReports: IntelligenceReport[] = []): string => {
  if (units.length === 0) return "Actualmente no se reportan unidades amigas.";
  return units.slice(0, 15).map(u => {
    const totalPersonnel = (u.personnelBreakdown?.officers || 0) + (u.personnelBreakdown?.ncos || 0) + (u.personnelBreakdown?.professionalSoldiers || 0) + (u.personnelBreakdown?.slRegulars || 0);
    const translatedType = translateUnitType(u.type);
    const translatedStatus = translateUnitStatus(u.status);

    // Conciencia Situacional: Apoyo Mutuo (Unidades amigas a menos de 3.5 km)
    const friendlySupport: string[] = [];
    if (u.location && u.location.lat && u.location.lon) {
      units.forEach(other => {
        if (other.id !== u.id && other.location && other.location.lat && other.location.lon) {
          const dist = calculateDistanceKm(u.location.lat, u.location.lon, other.location.lat, other.location.lon);
          if (dist < 3.5) {
            friendlySupport.push(`${escapeTemplateLiteralContent(other.name)} (a ${dist.toFixed(1)} km)`);
          }
        }
      });
    }
    const supportStr = friendlySupport.length > 0 ? `Apoyo Amigo Cercano: [${friendlySupport.join(', ')}]` : 'Apoyo Amigo: Aislada (> 3.5 km de otras fuerzas)';

    // Conciencia Situacional: Amenaza de Inteligencia más cercana
    let closestIntelStr = 'Amenaza Cercana: Sin focos enemigos directos reportados en radio de 5 km';
    if (u.location && u.location.lat && u.location.lon && intelReports.length > 0) {
      let minDist = 999;
      let closestReport: IntelligenceReport | null = null;
      intelReports.forEach(r => {
        if (r.location && r.location.lat && r.location.lon) {
          const dist = calculateDistanceKm(u.location.lat, u.location.lon, r.location.lat, r.location.lon);
          if (dist < minDist) {
            minDist = dist;
            closestReport = r;
          }
        }
      });

      if (closestReport && minDist < 15) {
        const reportObj = closestReport as IntelligenceReport;
        const azimuth = getBearingCardinal(u.location.lat, u.location.lon, reportObj.location.lat, reportObj.location.lon);
        closestIntelStr = `Amenaza Enemiga Más Cercana: "${escapeTemplateLiteralContent(reportObj.title)}" a ${minDist.toFixed(1)} km en azimut ${azimuth}`;
      }
    }

    const equipmentStr = (u.equipment && u.equipment.length > 0) ? u.equipment.join(', ') : 'Orgánico estándar de infantería';
    const capabilitiesStr = (u.capabilities && u.capabilities.length > 0) ? u.capabilities.join(', ') : 'Infantería convencional';
    const uasStr = (u.uavAssets && u.uavAssets.length > 0) ? u.uavAssets.map(a => `${(a as any).model || a.id} (${a.type})`).join(', ') : 'Sin medios UAS orgánicos';
    const coordsDecimal = u.location ? `[Lat: ${u.location.lat.toFixed(5)}°, Lon: ${u.location.lon.toFixed(5)}°]` : '[Sin telemetría GPS]';
    const ammoStr = u.ammoLevel !== undefined ? `${u.ammoLevel}%` : '100%';
    const fuelStr = u.fuelLevel !== undefined ? `${u.fuelLevel}%` : '100%';
    const supplyStr = u.daysOfSupply !== undefined ? `${u.daysOfSupply} días` : 'Adecuado';

    return `- Unidad: "${escapeTemplateLiteralContent(u.name)}" (${translatedType}) | Cmdte: ${formatCommander(u.commander)} | Estado: ${translatedStatus} | Misión: ${u.currentMission || 'En dispositivo asignado'}\n` +
           `  • Ubicación Real en Mapa: ${coordsDecimal} (DMS: ${decimalToDMS(u.location)})\n` +
           `  • Efectivos: ${totalPersonnel} orgánicos (${u.personnelBreakdown?.officers || 0} Of, ${u.personnelBreakdown?.ncos || 0} SubOf, ${(u.personnelBreakdown?.professionalSoldiers || 0) + (u.personnelBreakdown?.slRegulars || 0)} Soldados)\n` +
           `  • Armamento y Equipo: ${equipmentStr}\n` +
           `  • Capacidades y Entrenamiento: ${capabilitiesStr}\n` +
           `  • Medios UAS/Drones: ${uasStr}\n` +
           `  • Nivel Logístico: Munición ${ammoStr} | Combustible ${fuelStr} | Suministros: ${supplyStr}\n` +
           `  • Conciencia Situacional en Mapa: ${supportStr} | ${closestIntelStr}\n` +
           `  • Última Telemetría: hace ${Math.floor((Date.now() - u.lastMovementTimestamp) / 60000)} mins.`;
  }).join('\n\n');
};

const formatIntelForPrompt = (intelReports: IntelligenceReport[]): string => {
  if (intelReports.length === 0) return "No hay informes de inteligencia disponibles actualmente.";
  return intelReports.slice(0, 15).map(r => {
    const eventTime = new Date(r.eventTimestamp).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' });
    const keywordsString = r.keywords.length > 0 ? `Palabras Clave: [${r.keywords.map(escapeTemplateLiteralContent).join(', ')}]. ` : '';
    return `- Intel: "${escapeTemplateLiteralContent(r.title)}" (Tipo: ${escapeTemplateLiteralContent(r.type)}, Fuente: ${escapeTemplateLiteralContent(r.sourceDetails)}). Ubic: ${decimalToDMS(r.location)}. Hora Evento: ${eventTime}. Fiabilidad: ${escapeTemplateLiteralContent(r.reliability)}, Credibilidad: ${escapeTemplateLiteralContent(r.credibility)}. ${keywordsString}Resumen: ${escapeTemplateLiteralContent(r.details.substring(0, 100))}...`
  }).join('\n');
};

const formatAlertsForPrompt = (alerts: Alert[]): string => {
  if (alerts.length === 0) return "No hay alertas activas de alta prioridad.";
  return alerts.filter(a => !a.acknowledged && (a.severity === 'Crítica' || a.severity === 'Alta')).slice(0, 10).map(a => {
    return `- Alerta: "${escapeTemplateLiteralContent(a.message)}" (Tipo: ${escapeTemplateLiteralContent(a.type)}, Gravedad: ${escapeTemplateLiteralContent(a.severity)}).`;
  }).join('\n');
};

export const getCommandFromGemini = async (command: string, unitNames: string[]): Promise<{ name: string, args: any } | null> => {
  const isInitialized = await ensureInitialized();
  if (aiProvider === 'GEMINI' && (!isInitialized || !ai)) {
    throw new Error("Gemini AI client no inicializado. Verifique la configuración de API_KEY.");
  }

  if (aiProvider === 'NATIVE_SIMCOP') {
    try {
      const data = await callNativeAI('/system/translate_command', {
        command: command,
        unitNames: unitNames
      });
      if (data && data.name) return { name: data.name, args: data.args };
      return null;
    } catch (e) {
      console.error("Error processing native AI command:", e);
      return null;
    }
  }

  if (aiProvider === 'LOCAL_OLLAMA' || aiProvider === 'LOCAL_LMLink' || aiProvider === 'OMNIROUTE' || !ai) {
    try {
      const systemInstruction = `Eres un asistente de comando y control. Tu única función es interpretar los comandos del usuario y traducirlos a un objeto JSON. Si el usuario pide enfocar en una unidad, responde con: {"name": "focusOnUnit", "args": {"unitName": "nombre_unidad"}}. Si no coincide con ninguna unidad, responde null. Unidades disponibles: ${unitNames.join(', ')}. Responde ÚNICAMENTE con el JSON, sin bloques de código ni texto adicional.`;
      const responseText = await generateContentViaBackend(`${systemInstruction}\n\nComando: ${command}`);
      let jsonStr = responseText.trim();
      const fenceRegex = /^```(\w*)?\s*\n?(.*?)\n?\s*```$/s;
      const match = jsonStr.match(fenceRegex);
      if (match && match[2]) {
        jsonStr = match[2].trim();
      }
      if (jsonStr === 'null') return null;
      return JSON.parse(jsonStr);
    } catch (e) {
      console.error("Error processing local AI command:", e);
      return null;
    }
  }

  const focusOnUnitDeclaration: FunctionDeclaration = {
    name: 'focusOnUnit',
    description: 'Enfoca el mapa en una unidad militar específica por su nombre.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        unitName: {
          type: Type.STRING,
          description: `El nombre de la unidad en la que enfocarse. Unidades disponibles: ${unitNames.join(', ')}`,
        },
      },
      required: ['unitName'],
    },
  };

  const systemInstruction = `Eres un asistente de comando y control. Tu única función es interpretar los comandos del usuario y traducirlos a una llamada de función. Dada la lista de unidades disponibles, encuentra la más relevante para el comando del usuario. Si el usuario pide enfocar en una unidad, llama a la función 'focusOnUnit' con el nombre de esa unidad. No respondas con texto conversacional, solo con la llamada a la función.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: command,
      config: {
        systemInstruction,
        tools: [{ functionDeclarations: [focusOnUnitDeclaration] }],
      },
    });

    const functionCalls = response.functionCalls;
    if (functionCalls && functionCalls.length > 0) {
      const firstCall = functionCalls[0];
      if (firstCall.name === 'focusOnUnit') {
        return { name: firstCall.name, args: firstCall.args };
      }
    }
    return null;
  } catch (error) {
    console.error("Error llamando a Gemini para comando AI:", error);
    return null;
  }
};

export const getProactiveAnalysis = async (
  units: MilitaryUnit[],
  alerts: Alert[],
  intelligenceReports: IntelligenceReport[],
  bypassCache = false
): Promise<GeminiAnalysisResult> => {
  // Check cache first (valid for 50 seconds to prevent double calls)
  if (!bypassCache && aiCache.proactiveAnalysis && (Date.now() - aiCache.proactiveAnalysis.timestamp < 50000)) {
    console.log("📡 [aiCache] Returning cached proactive analysis");
    return { text: aiCache.proactiveAnalysis.text };
  }

  await ensureInitialized();

  const unitContext = formatUnitsForPrompt(units);
  const intelContext = formatIntelForPrompt(intelligenceReports);
  const alertContext = formatAlertsForPrompt(alerts);

  if (aiProvider === 'NATIVE_SIMCOP') {
    try {
      updateTaskState('proactiveAnalysis', { status: 'RUNNING', error: null });
      const data = await callNativeAI('/intelligence/proactive', {
        unidades: unitContext,
        osint: intelContext,
        alertas: alertContext
      });
      // La API devuelve un array JSON o un texto con las alertas. 
      // Si devuelve un objeto con un campo 'analysis' o similar (según la guía):
      const analysisText = typeof data === 'string' ? data : (data.analysis || JSON.stringify(data));
      const result = { text: analysisText };
      aiCache.proactiveAnalysis = { text: analysisText, timestamp: Date.now() };
      updateTaskState('proactiveAnalysis', { status: 'COMPLETED', result });
      return result;
    } catch (error: any) {
      console.error("Error en getProactiveAnalysis Nativa:", error);
      updateTaskState('proactiveAnalysis', { status: 'FAILED', error: error.message });
      throw error;
    }
  }

  const systemInstruction = `Eres SIMCOP AI, un analista militar táctico proactivo. Tu misión es analizar la situación operacional actual (unidades, inteligencia, alertas) e identificar los 3 a 5 puntos más críticos, riesgos inminentes u oportunidades tácticas. Presenta tus hallazgos como una lista de puntos concisos y accionables en formato markdown (usando '-'). No uses encabezados ni introducciones, solo la lista.`;

  const fullPrompt = `
DATOS OPERACIONALES:
Unidades Amigas:
${unitContext}

Inteligencia Reciente:
${intelContext}

Alertas de Alta Prioridad:
${alertContext}

---
SOLICITUD DE ANÁLISIS:
Identifica los puntos más críticos de la situación actual.
`;

  try {
    const text = await generateContentViaBackend(`${systemInstruction}\n\n${fullPrompt}`, 'proactiveAnalysis');
    const result = { text };
    // Save to cache
    aiCache.proactiveAnalysis = { text, timestamp: Date.now() };
    updateTaskState('proactiveAnalysis', { status: 'COMPLETED', result });
    return result;
  } catch (error: unknown) {
    console.error("Error en getProactiveAnalysis:", error);
    let errorMessage = "Fallo al obtener análisis proactivo.";
    if (error instanceof Error) {
      errorMessage += ` Detalles: ${error.message}`;
    }
    updateTaskState('proactiveAnalysis', { status: 'FAILED', error: errorMessage });
    throw new Error(errorMessage);
  }
};

export interface AoiGeoContext {
  areaKm2: number;
  centroid: { lat: number; lon: number; dms: string };
  municipalities: string[];
  elevationMeters: number;   // centroid elevation (legacy)
  weather?: WeatherInfo;
  // Topography
  elevationMin?: number;     // lowest point in the AOI (msnm)
  elevationMax?: number;     // highest point in the AOI (msnm)
  elevationAvg?: number;     // average elevation across sampled points
  elevationRange?: number;   // max - min (relief)
  terrainType?: string;      // classified terrain description
  elevationGrid?: {lat: number, lon: number, elev: number}[]; // Full point cloud matrix
}

export const getGeminiAnalysis = async (
  query: string,
  units: MilitaryUnit[],
  intelReports: IntelligenceReport[],
  useGoogleSearch: boolean,
  enemyLayerActive: boolean,
  geoContext?: AoiGeoContext
): Promise<GeminiAnalysisResult> => {
  await ensureInitialized();

  const unitContext = formatUnitsForPrompt(units, intelReports);
  const intelContext = formatIntelForPrompt(intelReports);

  let systemInstruction = `Eres el Asistente Táctico y de Estado Mayor integrado a la plataforma SIMCOP. Tu función es asesorar directamente al Comandante resolviendo consultas operacionales mediante el análisis de la telemetría del sistema, el cuadro de unidades propias en el mapa, la capa de inteligencia y las condiciones del entorno geoespacial.

REGLAS DE ACTUACIÓN OBLIGATORIAS:
1. ANCLAJE ESTRICTO AL CONTEXTO DEL MAPA (PROHIBIDO ALUCINAR O INVENTAR):
   - Actúa como si estuvieras observando directamente la pantalla y el mapa táctico de SIMCOP en tiempo real: utiliza ÚNICAMENTE las unidades, ubicaciones geográficas exactas, coordenadas GPS/DMS, reportes de inteligencia/OSINT y variables de clima/terreno provistas en este contexto.
   - NUNCA inventes unidades que no figuren en la sección "UNIDADES AMIGAS", ni sitúes unidades en lugares, municipios o sectores distintos a los registrados en su telemetría real del mapa. Si una unidad está en una coordenada específica, esa es su única posición verídica.
   - Si se requiere evaluar una unidad, cruza rigurosamente sus datos reales provistos: efectivos orgánicos, armamento/equipo (visión nocturna, tiradores de alta precisión, medios UAS), capacidades de entrenamiento, estado logístico (munición/combustible) y su distancia y tiempo real de aproximación al objetivo o sector.

2. ADAPTABILIDAD AL TIPO DE REQUERIMIENTO:
   Detecta la intención de la orden o pregunta del Comandante y responde con la estructura correspondiente:

   A. SI LA CONSULTA ES DE SELECCIÓN O IDONEIDAD DE UNIDAD (ej. "¿Qué pelotón está más preparado para X objetivo?"):
      - Determina la UNIDAD RECOMENDADA de forma explícita y contundente en el primer párrafo.
      - Justificación por Matriz de Capacidades: compara alcance, movilidad, armamento/equipo y entrenamiento frente al perfil de la amenaza o blanco.
      - Factor Terreno/Clima/Tiempo: calcula la viabilidad de aproximación, fricción del relieve, fatiga y tiempo estimado de reacción (ETA) desde su posición actual en el mapa hasta el objetivo.
      - Evaluación de Riesgo de la Misión: impacto y vulnerabilidad en el sector que esa unidad desatiende si se mueve de su dispositivo actual.
      - Curso de Acción Inmediato: propuesta concreta de orden preparatoria o de movimiento (ejes de avance y medidas de coordinación).

   B. SI LA CONSULTA ES DE APRECIACIÓN GENERAL, ANÁLISIS DE SECTOR O RECONFIGURACIÓN DE AOI:
      - Diagnóstico de la Amenaza (según reportes de inteligencia y OSINT inyectados en el área).
      - Análisis de Capacidades y Brechas del dispositivo propio en el terreno.
      - Prioridades de optimización del AOI (alturas dominantes, ejes de movilidad, avenidas de aproximación).
      - Maniobra y movimientos sugeridos por unidad (especificando unidad y posición actual en el mapa).
      - Conclusión y COA recomendado para el Comandante.

3. ESTILO Y DOCTRINA MILITAR:
   - Redacción militar sobria, directa, asertiva y orientada a la toma de decisiones ejecutivas.
   - Cero teoría académica o definiciones de manual; ve directo a la asignación de recursos, ventajas tácticas en el terreno y mitigación de amenazas.
   - Las coordenadas geográficas deben mantenerse fieles a los formatos provistos (grados decimales y DMS).`;

  if (enemyLayerActive && useGoogleSearch) {
    systemInstruction += `\n\nCapa de Amenaza Enemiga ACTIVA: Complementa tu análisis con información histórica y de inteligencia sobre incidentes de seguridad y tácticas enemigas reportadas en el sector geográfico donde operan las unidades. Cita todas las fuentes web utilizadas al final.`;
  }

  let geoPrompt = '';
  if (geoContext) {
    let weatherStr = 'Clima actual: No disponible.';
    let weatherHazards = '';

    if (geoContext.weather) {
      const w = geoContext.weather;
      const details: string[] = [
        `Condición: ${w.condition}`,
        `Temp: ${w.temperature.toFixed(1)}°C`,
        `Humedad: ${w.humidity}%`,
        `Viento: ${w.windSpeed.toFixed(1)} km/h (Dir: ${w.windDirection}°)`
      ];

      if (w.visibility !== undefined) {
        details.push(`Visibilidad: ${(w.visibility / 1000).toFixed(1)} km`);
      }
      if (w.cloudCeiling !== undefined) {
        details.push(`Techo de nubes (base): ${w.cloudCeiling.toFixed(0)}m`);
      }
      if (w.cloudCover !== undefined) {
        details.push(`Nubosidad: ${w.cloudCover.toFixed(0)}%`);
      }

      weatherStr = details.join(', ') + `. Impacto Operacional: ${w.operationalImpact ? 'Desfavorable/Restringido' : 'Favorable (Sin alertas críticas)'}.`;

      // Generar alertas meteorológicas explícitas para la IA
      const hazards: string[] = [];
      if (w.windSpeed > 30) {
        hazards.push(`Vientos fuertes (${w.windSpeed.toFixed(1)} km/h) que superan el límite operacional estándar para despegue/vuelo de UAVs tácticos.`);
      }
      if (w.visibility !== undefined && w.visibility < 3000) {
        hazards.push(`Visibilidad reducida (${(w.visibility / 1000).toFixed(1)} km) que restringe el reconocimiento aéreo y la observación terrestre.`);
      }
      if (w.cloudCeiling !== undefined && w.cloudCeiling < 150) {
        hazards.push(`Techo de nubes crítico (${w.cloudCeiling.toFixed(0)}m) que obstruye el vuelo visual (VFR) y eleva el riesgo de colisión.`);
      }
      if (w.isThunderstorm || w.condition.toLowerCase().includes('tormenta')) {
        hazards.push(`Tormenta eléctrica activa en el área. Riesgo extremo para patrullas terrestres (rayos/deslizamientos) y aeronaves.`);
      }

      if (hazards.length > 0) {
        weatherHazards = `\nALERTAS METEOROLÓGICAS CRÍTICAS:\n` + hazards.map(h => `- [HAZARD] ${h}`).join('\n') + '\n';
      }
    }

    const municipalitiesStr = geoContext.municipalities.length > 0
      ? geoContext.municipalities.join(', ')
      : 'No determinado';

    // Cálculo de la Geometría General del AOI (Bounding Box y Gradientes Espaciales)
    let geometryPrompt = '';
    if (geoContext.elevationGrid && geoContext.elevationGrid.length > 0) {
      const lats = geoContext.elevationGrid.map(p => p.lat);
      const lons = geoContext.elevationGrid.map(p => p.lon);
      const minLat = Math.min(...lats);
      const maxLat = Math.max(...lats);
      const minLon = Math.min(...lons);
      const maxLon = Math.max(...lons);

      const nsDistKm = calculateDistanceKm(minLat, geoContext.centroid.lon, maxLat, geoContext.centroid.lon);
      const ewDistKm = calculateDistanceKm(geoContext.centroid.lat, minLon, geoContext.centroid.lat, maxLon);

      // Estimación de Gradientes de Pendiente (Slope Geometry)
      let maxSlope = 0;
      let totalSlope = 0;
      let countSlope = 0;
      const grid = geoContext.elevationGrid;
      for (let i = 0; i < grid.length - 1; i++) {
        for (let j = i + 1; j < Math.min(grid.length, i + 5); j++) {
          const dKm = calculateDistanceKm(grid[i].lat, grid[i].lon, grid[j].lat, grid[j].lon);
          if (dKm > 0.05 && dKm < 2.0) {
            const elevDiff = Math.abs(grid[i].elev - grid[j].elev);
            const slopePct = (elevDiff / (dKm * 1000)) * 100;
            if (slopePct > maxSlope) maxSlope = slopePct;
            totalSlope += slopePct;
            countSlope++;
          }
        }
      }
      const avgSlope = countSlope > 0 ? totalSlope / countSlope : 0;
      // Análisis de Micro-Relieve Quebrado Colombiano (Cañadas, Cuchillas, Farallones)
      let microReliefHazards: string[] = [];
      for (let i = 0; i < grid.length; i++) {
        const neighbors = grid.filter((p, idx) => idx !== i && calculateDistanceKm(grid[i].lat, grid[i].lon, p.lat, p.lon) < 0.6);
        if (neighbors.length >= 2) {
          const maxNeighborElev = Math.max(...neighbors.map(n => n.elev));
          const minNeighborElev = Math.min(...neighbors.map(n => n.elev));
          const localDrop = maxNeighborElev - grid[i].elev;
          const localRise = grid[i].elev - minNeighborElev;

          if (localDrop > 180) {
            microReliefHazards.push(`Cañada/Vaguada Encajonada de Alta Fricción en [${grid[i].lat.toFixed(4)}°, ${grid[i].lon.toFixed(4)}°] (Depresión de ${localDrop}m respecto a las cumbres vecinas -> Alto Riesgo de Emboscada y Pérdida de Comunicaciones).`);
          } else if (localRise > 200 && grid[i].elev > 2000) {
            microReliefHazards.push(`Cuchilla/Fila de Montaña Estrecha en [${grid[i].lat.toFixed(4)}°, ${grid[i].lon.toFixed(4)}°] (Elevación de ${grid[i].elev} msnm -> Eje Táctico de Observación Directa).`);
          }
        }
      }
      const microReliefStr = microReliefHazards.length > 0
        ? `\nANÁLISIS DE MICRO-RELIEVE QUEBRADO COLOMBIANO:\n` + microReliefHazards.slice(0, 4).map(h => `- [MICRO-RELIEVE] ${h}`).join('\n')
        : '';

      geometryPrompt = `
GEOMETRÍA GENERAL DEL TERRENO (MARCO ESPACIAL Y BOUNDING BOX):
- Polígono Bounding Box: [Sur: ${minLat.toFixed(4)}°, Norte: ${maxLat.toFixed(4)}°, Oeste: ${minLon.toFixed(4)}°, Este: ${maxLon.toFixed(4)}°]
- Dimensiones del Cuadrante: ${nsDistKm.toFixed(2)} km (Eje Norte-Sur) x ${ewDistKm.toFixed(2)} km (Eje Este-Oeste)
- Geometría de Pendientes (Gradientes de Fricción): Pendiente Máxima Registrada: ${maxSlope.toFixed(1)}% | Pendiente Promedio: ${avgSlope.toFixed(1)}%
- Perfil Topográfico General: ${maxSlope > 35 ? 'Terreno de alta escarpadura y barreras naturales infranqueables para vehículos' : maxSlope > 15 ? 'Terreno accidentado con laderas de pendiente moderada' : 'Terreno relativamente llano con ondulaciones suaves'}.${microReliefStr}`;
    }

    // Cálculo de la Distribución Altimétrica por Cuadrantes Tácticos
    let quadrantPrompt = '';
    if (geoContext.elevationGrid && geoContext.elevationGrid.length > 0) {
      const grid = geoContext.elevationGrid;
      const cLat = geoContext.centroid.lat;
      const cLon = geoContext.centroid.lon;

      const nwNodes = grid.filter(p => p.lat >= cLat && p.lon <= cLon);
      const neNodes = grid.filter(p => p.lat >= cLat && p.lon > cLon);
      const swNodes = grid.filter(p => p.lat < cLat && p.lon <= cLon);
      const seNodes = grid.filter(p => p.lat < cLat && p.lon > cLon);

      const getAvg = (nodes: typeof grid) => nodes.length > 0 ? (nodes.reduce((a, b) => a + b.elev, 0) / nodes.length) : geoContext.elevationMeters;
      const getMaxNode = (nodes: typeof grid) => nodes.length > 0 ? nodes.reduce((a, b) => a.elev > b.elev ? a : b) : null;

      const maxNodeGlobal = grid.reduce((a, b) => a.elev > b.elev ? a : b);
      const minNodeGlobal = grid.reduce((a, b) => a.elev < b.elev ? a : b);

      const nwMax = getMaxNode(nwNodes);
      const neMax = getMaxNode(neNodes);

      quadrantPrompt = `
PERFIL ALTIMÉTRICO DISTRIBUIDO Y COTAS CRÍTICAS DEL AOI:
- Cota Dominante Máxima (Punto Más Alto): ${maxNodeGlobal.elev} msnm [Ubicación: ${maxNodeGlobal.lat.toFixed(4)}°, ${maxNodeGlobal.lon.toFixed(4)}°]
- Depresión Mínima (Fondo de Valle): ${minNodeGlobal.elev} msnm [Ubicación: ${minNodeGlobal.lat.toFixed(4)}°, ${minNodeGlobal.lon.toFixed(4)}°]
- Desnivel Altitudinal Total (Relieve): ${(maxNodeGlobal.elev - minNodeGlobal.elev)} metros
- Distribución Altimétrica por Cuadrantes Tácticos:
  • Sector Noroeste (NW): Promedio ${getAvg(nwNodes).toFixed(0)} msnm ${nwMax ? `(Cota Max: ${nwMax.elev} msnm)` : ''}
  • Sector Noreste (NE): Promedio ${getAvg(neNodes).toFixed(0)} msnm ${neMax ? `(Cota Max: ${neMax.elev} msnm)` : ''}
  • Sector Suroeste (SW): Promedio ${getAvg(swNodes).toFixed(0)} msnm
  • Sector Sureste (SE): Promedio ${getAvg(seNodes).toFixed(0)} msnm`;
    }

    geoPrompt = `
ÁREA DE OPERACIONES (AOI) ACTIVA:
- Centroide Geométrico del Sector: ${geoContext.centroid.lat.toFixed(4)}°, ${geoContext.centroid.lon.toFixed(4)} (DMS: ${geoContext.centroid.dms})
- Área Total del Cuadrante: ${geoContext.areaKm2.toFixed(2)} km²
- Municipios/Regiones cubiertas: ${municipalitiesStr}
- Condición meteorológica: ${weatherStr}
${weatherHazards}
TOPOGRAFÍA Y GEOMETRÍA GENERAL DEL AOI:${geometryPrompt}
${quadrantPrompt}
${geoContext.elevationGrid && geoContext.elevationGrid.length > 0 ? `MATRIZ TOPOGRÁFICA DE PUNTOS SAMPLING (POINT CLOUD):
${geoContext.elevationGrid.map(p => `[Lat:${p.lat.toFixed(5)}, Lon:${p.lon.toFixed(5)} -> ${p.elev} msnm]`).join(' | ')}` : ''}
---`;
  }

  const fullPrompt = `INFORMACIÓN OPERACIONAL DEL SISTEMA SIMCOP:${geoPrompt}

UNIDADES AMIGAS:
${unitContext}

INTELIGENCIA DISPONIBLE:
${intelContext}

---
CONSULTA:
${escapeTemplateLiteralContent(query)}`;

  if (aiProvider === 'NATIVE_SIMCOP') {
    try {
      updateTaskState('generalAnalysis', { status: 'RUNNING', error: null });
      const data = await callNativeAI('/intelligence/terrain_weather', {
        query: query,
        unidades_amigas: unitContext,
        inteligencia: intelContext,
        geoContext: geoPrompt,
        enemyLayerActive: enemyLayerActive
      });
      const analysisText = typeof data === 'string' ? data : (data.analysis || JSON.stringify(data));
      const result = { text: analysisText };
      updateTaskState('generalAnalysis', { status: 'COMPLETED', result });
      return result;
    } catch (error: any) {
      console.error("Error en getGeminiAnalysis Nativa:", error);
      updateTaskState('generalAnalysis', { status: 'FAILED', error: error.message });
      throw error;
    }
  }


  try {
    const text = await generateContentViaBackend(`${fullPrompt}${useGoogleSearch ? '\n(Usar Google Search para este análisis)' : ''}`, 'generalAnalysis', systemInstruction);
    const result = { text };
    updateTaskState('generalAnalysis', { status: 'COMPLETED', result });
    return result;
  } catch (error: unknown) {
    console.error("Error llamando a la API Gemini:", error);
    let errorMessage = "Fallo al obtener análisis de la IA.";
    if (error instanceof Error) {
      errorMessage += ` Detalles: ${error.message}`;
    }
    updateTaskState('generalAnalysis', { status: 'FAILED', error: errorMessage });
    throw new Error(errorMessage);
  }
};

export const normalizeCOAPlan = (raw: any): COAPlan => {
  if (!raw || typeof raw !== 'object') {
    return {
      planName: "Plan de Maniobra Táctica COA",
      conceptOfOperations: "",
      phases: []
    };
  }

  const planName = raw.nombre_operacion || raw.planName || "Plan de Maniobra Táctica COA";
  const conceptOfOperations = raw.intencion_comandante || raw.conceptOfOperations || "";
  
  const rawPhases = Array.isArray(raw.fases) ? raw.fases : (Array.isArray(raw.phases) ? raw.phases : []);
  const phases: COAPhase[] = rawPhases.map((phase: any, pIdx: number) => {
    if (!phase || typeof phase !== 'object') {
      return {
        phaseName: `Fase ${pIdx + 1}`,
        description: "",
        graphics: [],
        fase_numero: pIdx + 1,
        nombre: `Fase ${pIdx + 1}`,
        descripcion: "",
        medidas_control_graficacion: []
      };
    }

    const phaseName = phase.nombre || phase.phaseName || `Fase ${phase.fase_numero || (pIdx + 1)}`;
    const description = phase.descripcion || phase.description || "";
    
    // Normalizar medidas de control / graphics
    const rawGraphics = Array.isArray(phase.medidas_control_graficacion)
      ? phase.medidas_control_graficacion
      : (Array.isArray(phase.graphics) ? phase.graphics : []);

    const graphics: COAGraphicElement[] = rawGraphics.map((item: any) => {
      if (!item || typeof item !== 'object') {
        return {
          type: COAGraphicType.PHASE_LINE,
          label: 'Control Táctico',
          locations: []
        };
      }

      let gType: COAGraphicType = COAGraphicType.PHASE_LINE;
      const cat = (item.categoria || item.type || item.tipo || item.label || item.etiqueta || item.nombre || "").toUpperCase();
      const tipo = (item.tipo || "").toUpperCase();
      
      if (cat.includes('LINEA_FASE') || cat.includes('PHASE_LINE')) gType = COAGraphicType.PHASE_LINE;
      else if (cat.includes('EJE_AVANCE') || cat.includes('AXIS')) gType = COAGraphicType.AXIS_OF_ADVANCE;
      else if (cat.includes('AREA_OBJETIVO') || cat.includes('OBJECTIVE')) gType = COAGraphicType.OBJECTIVE;
      else if (cat.includes('ZONA_REUNION') || cat.includes('ASSEMBLY')) gType = COAGraphicType.ASSEMBLY_AREA;
      else if (cat.includes('POSICION_BLOQUEO') || cat.includes('BOUNDARY')) gType = COAGraphicType.BOUNDARY;
      else if (cat.includes('PUNTO_CONTROL') || cat.includes('PUNTO_INSERCION') || cat.includes('CHECKPOINT') || cat.includes('PZ') || cat.includes('LZ') || tipo === 'PUNTO') gType = COAGraphicType.CHECKPOINT;
      else if (tipo === 'LINEA') gType = COAGraphicType.PHASE_LINE;
      else if (tipo === 'POLIGONO') gType = COAGraphicType.OBJECTIVE;
      
      const parseCoordPair = (c0: any, c1: any): GeoLocation => {
        const v0 = typeof c0 === 'number' ? c0 : parseFloat(c0);
        const v1 = typeof c1 === 'number' ? c1 : parseFloat(c1);
        const safe0 = isNaN(v0) ? 0 : v0;
        const safe1 = isNaN(v1) ? 0 : v1;
        // In South America / Colombia, longitude is negative (-66 to -82 W)
        // If c0 is longitude (< -20 or |c0| > 20), it is GeoJSON [lon, lat]
        if (safe0 < -20 || Math.abs(safe0) > 20) {
          return { lat: safe1, lon: safe0 };
        } else if (safe1 < -20 || Math.abs(safe1) > 20) {
          return { lat: safe0, lon: safe1 };
        }
        return { lat: safe0, lon: safe1 };
      };

      const coords = item.coordenadas || item.locations || [];
      let locations: GeoLocation[] = [];
      if (Array.isArray(coords)) {
        if (coords.length >= 2 && (typeof coords[0] === 'number' || typeof coords[0] === 'string') && (typeof coords[1] === 'number' || typeof coords[1] === 'string')) {
          // Coordenada individual [lat, lon] o [lon, lat]
          locations = [parseCoordPair(coords[0], coords[1])];
        } else if (coords.length > 0 && Array.isArray(coords[0])) {
          // Array de coordenadas [[c0, c1], ...]
          locations = coords.map((c: any) => {
            if (Array.isArray(c) && c.length >= 2) {
              return parseCoordPair(c[0], c[1]);
            }
            return { lat: 0, lon: 0 };
          }).filter(loc => !(loc.lat === 0 && loc.lon === 0));
        } else if (coords.length > 0 && typeof coords[0] === 'object') {
          locations = coords.map((c: any) => {
            if (Array.isArray(c) && c.length >= 2) {
              return parseCoordPair(c[0], c[1]);
            }
            if (c && typeof c === 'object') {
              let lat = typeof c.lat === 'number' ? c.lat : (c.latitude !== undefined ? parseFloat(c.latitude) : parseFloat(c.lat || 0));
              let lon = typeof c.lon === 'number' ? c.lon : (c.lng !== undefined ? parseFloat(c.lng) : (c.longitude !== undefined ? parseFloat(c.longitude) : parseFloat(c.lon || 0)));
              lat = isNaN(lat) ? 0 : lat;
              lon = isNaN(lon) ? 0 : lon;
              if (lat < -20 && lon > -20) {
                const tmp = lat;
                lat = lon;
                lon = tmp;
              }
              return { lat, lon };
            }
            return { lat: 0, lon: 0 };
          });
        }
      }
      
      return {
        type: gType,
        label: item.etiqueta || item.label || 'Control Táctico',
        locations
      };
    });
    
    return {
      phaseName,
      description,
      graphics,
      fase_numero: phase.fase_numero || (pIdx + 1),
      nombre: phaseName,
      descripcion: description,
      medidas_control_graficacion: rawGraphics
    };
  });
  
  return {
    ...raw,
    planName,
    conceptOfOperations,
    phases
  };
};

export const generateCOAPlan = async (
  objective: string,
  units: MilitaryUnit[],
  intelReports: IntelligenceReport[]
): Promise<COAPlan> => {
  // Ensure AI client is initialized
  const isInitialized = await ensureInitialized();
  if (aiProvider === 'GEMINI' && (!isInitialized || !ai)) {
    throw new Error("Gemini AI client no inicializado. Por favor, configure la API key en Configuración.");
  }

  const unitContext = formatUnitsForPrompt(units, intelReports);
  const intelContext = formatIntelForPrompt(intelReports);
  
  const systemInstruction = `Eres el Oficial de Planeamiento y Operaciones (G3) del sistema SIMCOP. Tu tarea es diseñar un Curso de Acción (COA) táctico completo y generar simultáneamente su CALCO TÁCTICO DE GRAFICACIÓN sobre el mapa.

REGLAS OBLIGATORIAS:
1. ANCLAJE ESPACIAL: Prohibido inventar coordenadas. Emplea exclusivamente las coordenadas y posiciones de las unidades amigas e informes de inteligencia inyectados en la consulta.
2. INTEGRACIÓN DE GRAFICACIÓN: Cada fase de la maniobra debe incluir obligatoriamente sus capas geométricas de control táctico para ser renderizadas en el mapa (puntos de control, líneas de fase, vectores de avance, zonas de reunión y áreas de objetivo).
3. FORMATO DE COORDENADAS: Formato estándar [latitud, longitud] en decimales o [longitud, latitud] según GeoJSON. Valida que los vértices sean consistentes con el terreno real del área.
4. SALIDA: Responde ÚNICAMENTE con un objeto JSON válido, sin bloques de texto introductorio ni explicaciones fuera del JSON.

ESQUEMA JSON OBLIGATORIO:
{
  "coa_id": "COA-1",
  "nombre_operacion": "Nombre táctico de la operación",
  "intencion_comandante": "Propósito militar claro, método y estado final deseado.",
  "unidades_asignadas": [
    {
      "indicativo": "ASTRO 1",
      "rol_tactico": "Esfuerzo Principal | Esfuerzo Secundario | Reserva",
      "mision": "Tarea táctica asignada (ej. Aislar, Destruir, Bloquear, Fijar)"
    }
  ],
  "fases": [
    {
      "fase_numero": 1,
      "nombre": "Fase I: Infiltración y Aislamiento",
      "descripcion": "Detalle de maniobra táctica de las unidades en esta fase.",
      "medidas_control_graficacion": [
        {
          "id": "MC-01",
          "tipo": "PUNTO",
          "categoria": "PUNTO_CONTROL",
          "etiqueta": "PZ Alfa",
          "coordenadas": [3.1234, -76.5678],
          "unidad_responsable": "ASTRO 1",
          "estilo": {
            "color": "#0055FF",
            "tipo_linea": "solida"
          }
        },
        {
          "id": "MC-02",
          "tipo": "LINEA",
          "categoria": "EJE_AVANCE",
          "etiqueta": "Eje Halcón",
          "coordenadas": [
            [3.1234, -76.5678],
            [3.1280, -76.5710],
            [3.1350, -76.5800]
          ],
          "unidad_responsable": "ASTRO 1",
          "estilo": {
            "color": "#0055FF",
            "tipo_linea": "discontinua"
          }
        },
        {
          "id": "MC-03",
          "tipo": "POLIGONO",
          "categoria": "AREA_OBJETIVO",
          "etiqueta": "OBJ Águila",
          "coordenadas": [
            [3.1350, -76.5800],
            [3.1380, -76.5800],
            [3.1380, -76.5850],
            [3.1350, -76.5850]
          ],
          "unidad_responsable": "ASTRO 1",
          "estilo": {
            "color": "#FF0000",
            "tipo_linea": "solida"
          }
        }
      ]
    }
  ],
  "sincronizacion_fuegos_y_uav": {
    "reconocimiento_aereo": "Ventanas de vuelo y sectores de vigilancia sensor UAS",
    "apoyo_fuego": "Líneas restrictivas de fuego o posiciones de armas de apoyo"
  },
  "riesgo_y_mitigacion": [
    {
      "riesgo": "Descripción del riesgo táctico o amenaza de IED",
      "mitigacion": "Acción preventiva requerida"
    }
  ]
}`;

  const prompt = `INFORMACIÓN OPERACIONAL DE SIMCOP:

OBJETIVO Y PROPÓSITO DE LA OPERACIÓN:
${escapeTemplateLiteralContent(objective)}

FUERZAS AMIGAS DISPONIBLES EN EL MAPA:
${unitContext}

INTELIGENCIA Y AMENAZAS EN EL MAPA:
${intelContext}

---
SOLICITUD G3:
Diseña el Curso de Acción (COA) táctico completo y genera simultáneamente las medidas de control gráfico táctico (puntos, líneas y polígonos) para su renderizado y calco directo en el mapa 3D de SIMCOP.
Responde ÚNICAMENTE con el objeto JSON según el esquema obligatorio.`;

  if (aiProvider === 'NATIVE_SIMCOP') {
    try {
      updateTaskState('coaGeneration', { status: 'RUNNING', error: null, result: null });
      const data = await callNativeAI('/wargaming/generate_coa', {
        objetivo: objective,
        unidades_amigas: unitContext,
        inteligencia_enemiga: intelContext
      });
      const coaPlan = normalizeCOAPlan(data);
      updateTaskState('coaGeneration', { status: 'COMPLETED', result: coaPlan });
      return coaPlan;
    } catch (error: any) {
      console.error("Error en generateCOAPlan Nativa:", error);
      updateTaskState('coaGeneration', { status: 'FAILED', error: error.message });
      throw error;
    }
  }

  // Extraer y reparar JSON truncado usando un stack para mantener balance
  const extractAndRepairJson = (text: string): string => {
    const start = text.indexOf('{');
    if (start === -1) return "";
    
    const stack: ('{' | '[')[] = [];
    let inString = false;
    let escape = false;
    
    for (let i = start; i < text.length; i++) {
      const ch = text[i];
      if (escape) { escape = false; continue; }
      if (ch === '\\' && inString) { escape = true; continue; }
      if (ch === '"') { inString = !inString; continue; }
      if (inString) continue;
      
      if (ch === '{') stack.push('{');
      else if (ch === '[') stack.push('[');
      else if (ch === '}') {
        if (stack[stack.length - 1] === '{') stack.pop();
        if (stack.length === 0) return text.slice(start, i + 1);
      }
      else if (ch === ']') {
        if (stack[stack.length - 1] === '[') stack.pop();
      }
    }
    
    // JSON Truncado: Reparación
    let repaired = text.slice(start);
    if (inString) repaired += '"';
    
    // Limpiar última coma o dos puntos si la cadena quedó cortada a medias
    repaired = repaired.replace(/[,:]\s*$/, '');
    if (repaired.endsWith('"null')) repaired = repaired.replace(/"null$/, 'null');
    
    // Cerrar estructuras en orden inverso
    while (stack.length > 0) {
        const char = stack.pop();
        repaired += char === '{' ? '}' : ']';
    }
    
    return repaired;
  };

  if (aiProvider === 'LOCAL_OLLAMA' || aiProvider === 'LOCAL_LMLink' || aiProvider === 'OMNIROUTE' || !ai) {
    try {
      const responseText = await generateContentViaBackend(prompt, 'coaGeneration', systemInstruction);
      let jsonStr = responseText.trim();

      // Eliminar etiquetas de razonamiento interno (<think>...</think>)
      jsonStr = jsonStr.replace(/<(?:thought|think|thinking|reasoning)[^>]*>[\s\S]*?<\/(?:thought|think|thinking|reasoning)>/gi, '').trim();

      // Extraer bloque JSON de markdown si viene con fences
      const fenceRegex = /```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/;
      const fenceMatch = jsonStr.match(fenceRegex);
      if (fenceMatch && fenceMatch[1]) {
        jsonStr = fenceMatch[1].trim();
      }

      jsonStr = extractAndRepairJson(jsonStr);
      
      if (!jsonStr) {
        let snippet = responseText.trim().substring(0, 150);
        if (responseText.length > 150) snippet += "...";
        throw new Error(`La IA no generó un JSON válido. Respondió: "${snippet}".`);
      }
      
      const rawPlan = JSON.parse(jsonStr);
      const coaPlan = normalizeCOAPlan(rawPlan);

      updateTaskState('coaGeneration', { status: 'COMPLETED', result: coaPlan });
      return coaPlan;
    } catch (error: unknown) {
      console.error("Error generando COA con IA Local/OmniRoute:", error);
      let errorMessage = "Fallo al generar el Curso de Acción con IA.";
      if (error instanceof Error) {
        errorMessage += ` Detalles: ${error.message}`;
      }
      updateTaskState('coaGeneration', { status: 'FAILED', error: errorMessage });
      throw new Error(errorMessage);
    }
  }

  try {
    updateTaskState('coaGeneration', { status: 'RUNNING', error: null, result: null });
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
      },
    });

    let jsonStr = response.text.trim();
    // Remove markdown fences if present
    const fenceRegex = /^```(\w*)?\s*\n?(.*?)\n?\s*```$/s;
    const match = jsonStr.match(fenceRegex);
    if (match && match[2]) {
      jsonStr = match[2].trim();
    }

    jsonStr = extractAndRepairJson(jsonStr);
    const rawPlan = JSON.parse(jsonStr);
    const coaPlan = normalizeCOAPlan(rawPlan);

    updateTaskState('coaGeneration', { status: 'COMPLETED', result: coaPlan });
    return coaPlan;
  } catch (error: unknown) {
    console.error("Error generando COA con Gemini:", error);
    let errorMessage = "Fallo al generar el Curso de Acción.";
    if (error instanceof Error) {
      errorMessage += ` Detalles: ${error.message}`;
    }
    updateTaskState('coaGeneration', { status: 'FAILED', error: errorMessage });
    throw new Error(errorMessage);
  }
};


export const generateQ5ReportContentFromAAR = async (aar: AfterActionReport): Promise<Q5ContentPayload> => {
  const isInitialized = await ensureInitialized();
  if (aiProvider === 'GEMINI' && (!isInitialized || !ai)) {
    throw new Error("Gemini AI client no inicializado. Configure la API key en Configuración.");
  }

  if (aiProvider === 'NATIVE_SIMCOP') {
    try {
      updateTaskState('q5Generation', { status: 'RUNNING', error: null, result: null });
      const data = await callNativeAI('/intelligence/generate_q5', {
        aar: JSON.stringify(aar)
      });
      updateTaskState('q5Generation', { status: 'COMPLETED', result: data });
      return data as Q5ContentPayload;
    } catch (error: any) {
      console.error("Error en generateQ5ReportContentFromAAR Nativa:", error);
      updateTaskState('q5Generation', { status: 'FAILED', error: error.message });
      throw error;
    }
  }

  const systemInstruction = `Eres un oficial de estado mayor experto en la redacción de reportes militares concisos y precisos. Tu tarea es analizar el Reporte Post-Combate (AAR) proporcionado y generar el contenido para un reporte Q5. El reporte Q5 debe ser breve, directo y basado estrictamente en la información del AAR. Responde únicamente con un objeto JSON que contenga los campos 'que', 'quien', 'cuando', 'donde', 'hechos', y 'accionesSubsiguientes'.`;

  const prompt = `
Analiza el siguiente Reporte Post-Combate (AAR) y genera el contenido para un reporte Q5.

AAR Data:
- Unidad: ${escapeTemplateLiteralContent(aar.unitName)}
- Fecha y Hora de Fin de Combate: ${new Date(aar.combatEndTimestamp).toLocaleString('es-CO', { timeZone: 'America/Bogota' })}
- Ubicación del Combate: ${decimalToDMS(aar.location)}
- Bajas Propias (KIA): ${aar.casualtiesKia}
- Bajas Propias (WIA): ${aar.casualtiesWia}
- Bajas Propias (MIA): ${aar.casualtiesMia}
- Pérdidas de Equipo Propio: ${escapeTemplateLiteralContent(aar.equipmentLosses) || 'No reportadas'}
- Porcentaje de Munición Gastada: ${aar.ammunitionExpendedPercent}%
- Moral de la Unidad: ${escapeTemplateLiteralContent(aar.morale)}
- Resumen General de la Acción: ${escapeTemplateLiteralContent(aar.summary)}
- Bajas Enemigas (KIA): ${aar.enemyCasualtiesKia !== undefined ? aar.enemyCasualtiesKia : 'No reportadas'}
- Bajas Enemigas (WIA): ${aar.enemyCasualtiesWia !== undefined ? aar.enemyCasualtiesWia : 'No reportadas'}
- Equipo Enemigo Destruido/Capturado: ${escapeTemplateLiteralContent(aar.enemyEquipmentDestroyedOrCaptured) || 'No reportado'}
- Objetivos Cumplidos: ${escapeTemplateLiteralContent(aar.objectivesAchieved) || 'No reportados'}
- Observaciones Positivas/Lecciones Aprendidas: ${escapeTemplateLiteralContent(aar.positiveObservations) || 'No reportadas'}

Instrucciones para cada campo del Q5 (sé directo y conciso):
- que: Describe el evento principal y su resultado de forma muy breve. (Ej: 'Combate contra GAO en sector X, resultando en Y.')
- quien: Unidad(es) principal(es) involucrada(s). (Ej: 'BADRA32', 'Compañía Alfa del BATOT XX')
- cuando: Fecha y hora del evento principal. (Ej: '${new Date(aar.combatEndTimestamp).toLocaleDateString('es-CO', { timeZone: 'America/Bogota' })} ${new Date(aar.combatEndTimestamp).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Bogota' })} horas.')
- donde: Ubicación precisa del evento. (Ej: 'Vereda La Esperanza, coordenadas ${decimalToDMS(aar.location)}')
- hechos: Proporcione un resumen de la acción. Incluya los siguientes puntos de forma estructurada y concisa, si la información está disponible en el AAR:
    1. Breve descripción cronológica de los eventos principales del combate (basado en el resumen del AAR).
    2. Estado Propio y Logística al finalizar:
        - Bajas Propias: KIA: ${aar.casualtiesKia}, WIA: ${aar.casualtiesWia}, MIA: ${aar.casualtiesMia}.
        - Pérdidas/Daños de Equipo Propio: ${escapeTemplateLiteralContent(aar.equipmentLosses) || 'No se reportaron pérdidas significativas de equipo.'}
        - Munición Gastada: ${aar.ammunitionExpendedPercent}%.
        - Moral de la Unidad: ${escapeTemplateLiteralContent(aar.morale)}.
    3. Resultados del Enfrentamiento e Impacto en el Enemigo:
        - Bajas Enemigas: KIA: ${aar.enemyCasualtiesKia !== undefined ? aar.enemyCasualtiesKia : 'N/R'}, WIA: ${aar.enemyCasualtiesWia !== undefined ? aar.enemyCasualtiesWia : 'N/R'}.
        - Equipo Enemigo Destruido/Capturado: ${escapeTemplateLiteralContent(aar.enemyEquipmentDestroyedOrCaptured) || 'No reportado.'}
        - Objetivos Cumplidos: ${escapeTemplateLiteralContent(aar.objectivesAchieved) || 'Evaluación pendiente o no especificada.'}
- accionesSubsiguientes: Acciones inmediatas tomadas o recomendadas post-evento, si se mencionan o infieren claramente del AAR (Ej: 'Reorganización de la unidad.', 'Se solicitó EVASAN.', 'Se aseguró el área.')

Responde SOLAMENTE con el objeto JSON. No incluyas explicaciones adicionales.
`;

  try {
    const jsonStr = await generateContentViaBackend(`${systemInstruction}\n\n${prompt}`, 'q5Generation');
    let cleanedJson = stripReasoningTags(jsonStr);
    const fenceRegex = /^```(\w*)?\s*\n?(.*?)\n?\s*```$/s;
    const match = cleanedJson.match(fenceRegex);
    if (match && match[2]) {
      cleanedJson = match[2].trim();
    }
    const startIdx = cleanedJson.indexOf('{');
    const endIdx = cleanedJson.lastIndexOf('}');
    if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
      cleanedJson = cleanedJson.substring(startIdx, endIdx + 1);
    }

    const parsedData = JSON.parse(cleanedJson) as Q5ContentPayload;
    updateTaskState('q5Generation', { status: 'COMPLETED', result: parsedData });
    return parsedData;

  } catch (error: any) {
    console.error("Error generando contenido Q5 con Gemini:", error);
    let errorMessage = "Fallo al generar contenido Q5 desde AAR.";
    if (error instanceof Error) {
      errorMessage += ` Detalles: ${error.message}`;
    }
    updateTaskState('q5Generation', { status: 'FAILED', error: errorMessage });
    return {
      que: `Error: ${errorMessage}`,
      quien: "Error",
      cuando: "Error",
      donde: "Error",
      hechos: `Error al procesar AAR: ${errorMessage}. Verifique el formato del AAR y la respuesta del servicio.`,
      accionesSubsiguientes: "Error"
    };
  }
};

// FIX: Implement and export getDoctrinalAssistantResponse, which was missing.
export const getDoctrinalAssistantResponse = async (query: string): Promise<GeminiAnalysisResult> => {
  const isInitialized = await ensureInitialized();
  if (aiProvider === 'GEMINI' && (!isInitialized || !ai)) {
    throw new Error("Gemini AI client no inicializado. Verifique la configuración.");
  }

  const systemInstruction = `Eres un asistente experto en la doctrina militar del Ejército Nacional de Colombia (EJC). Tu propósito es responder preguntas y proporcionar resúmenes basados en los manuales de doctrina, regulaciones y tácticas del EJC. Basa tus respuestas en la información disponible y utiliza Google Search para encontrar documentos y referencias doctrinales relevantes. Si usas fuentes externas, cítalas.`;

  if (aiProvider === 'NATIVE_SIMCOP') {
    try {
      updateTaskState('doctrinalAssistant', { status: 'RUNNING', error: null });
      const data = await callNativeAI('/intelligence/query', {
        texto: query,
        unidades_disponibles: []
      });
      const analysisText = typeof data === 'string' ? data : (data.analisis_doctrinal || data.analisis || JSON.stringify(data));
      const result = { text: analysisText };
      updateTaskState('doctrinalAssistant', { status: 'COMPLETED', result });
      return result;
    } catch (error: any) {
      console.error("Error en getDoctrinalAssistantResponse Nativa:", error);
      updateTaskState('doctrinalAssistant', { status: 'FAILED', error: error.message });
      throw error;
    }
  }

  try {
    const text = await generateContentViaBackend(`${systemInstruction}\n\n${query}\n(Usar Google Search para referencias doctrinales EJC)`, 'doctrinalAssistant');
    const result = { text };
    updateTaskState('doctrinalAssistant', { status: 'COMPLETED', result });
    return result;
  } catch (error: unknown) {
    console.error("Error llamando a Gemini para asistente doctrinal:", error);
    let errorMessage = "Fallo al obtener respuesta doctrinal.";
    if (error instanceof Error) {
      errorMessage += ` Detalles: ${error.message}`;
    }
    updateTaskState('doctrinalAssistant', { status: 'FAILED', error: errorMessage });
    throw new Error(errorMessage);
  }
};

const formatUnitsForLogisticsPrompt = (units: MilitaryUnit[]): string => {
  if (units.length === 0) return "No hay unidades para analizar.";
  return units.map(u => {
    return `- Unidad: ${escapeTemplateLiteralContent(u.name)} (ID: ${u.id}), Estado: ${translateUnitStatus(u.status)}, Munición: ${u.ammoLevel}%, Combustible: ${u.fuelLevel ?? 'N/A'}%, Suministros: ${u.daysOfSupply} días.`;
  }).join('\n');
};

export const getPredictiveLogisticsAnalysis = async (units: MilitaryUnit[], bypassCache = false): Promise<PredictedLogisticsNeed[]> => {
  const isInitialized = await ensureInitialized();
  if (aiProvider === 'GEMINI' && (!isInitialized || !ai)) {
    throw new Error("Gemini AI client no inicializado.");
  }

  // Check cache first
  if (!bypassCache && aiCache.predictiveLogistics) {
    const age = Date.now() - aiCache.predictiveLogistics.timestamp;
    if (age < 5 * 60 * 1000) {
      console.log("[AI Cache] Hit para Predictive Logistics");
      return aiCache.predictiveLogistics.data;
    }
  }

  if (aiProvider === 'NATIVE_SIMCOP') {
    try {
      updateTaskState('predictiveLogistics', { status: 'RUNNING', error: null });
      const data = await callNativeAI('/logistics/predictive', {
        inventario: formatUnitsForPrompt(units)
      });
      aiCache.predictiveLogistics = { data, timestamp: Date.now() };
      updateTaskState('predictiveLogistics', { status: 'COMPLETED', result: data });
      return data as PredictedLogisticsNeed[];
    } catch (error: any) {
      console.error("Error en getPredictiveLogisticsAnalysis Nativa:", error);
      updateTaskState('predictiveLogistics', { status: 'FAILED', error: error.message });
      throw error;
    }
  }

  const unitContext = formatUnitsForLogisticsPrompt(units);

  const systemInstruction = "Eres un oficial de logística (S4/G4). Analiza el estado logístico de las unidades proporcionadas y predice las 3 necesidades logísticas más urgentes. Considera niveles de munición, combustible y días de suministro en relación con el estado operacional de la unidad (ej. 'En Combate' consume más). Responde únicamente con un array JSON de objetos. Los items deben ser 'Clase I (Raciones)', 'Clase III (Combustible)', o 'Clase V (Munición)'. La urgencia debe ser 'ALTA', 'MEDIA', o 'BAJA'.";

  const prompt = `
DATOS LOGÍSTICOS DE UNIDADES:
${unitContext}

---
SOLICITUD:
Basado en los datos, genera un array JSON con las 3 predicciones de necesidades logísticas más críticas.
`;

  const responseSchema = {
    type: Type.ARRAY,
    items: {
      type: Type.OBJECT,
      properties: {
        unitName: { type: Type.STRING },
        unitId: { type: Type.STRING },
        item: { type: Type.STRING, description: "Clase I (Raciones), Clase III (Combustible), o Clase V (Munición)" },
        urgency: { type: Type.STRING, description: "ALTA, MEDIA, o BAJA" },
        justification: { type: Type.STRING },
        predictedTimeframe: { type: Type.STRING, description: "Ej: 'Dentro de 24 horas', 'Próximos 3 días'" },
      },
      required: ["unitName", "unitId", "item", "urgency", "justification", "predictedTimeframe"]
    }
  };

  try {
    const jsonStr = await generateContentViaBackend(`${systemInstruction}\n\n${prompt}\nResponder en formato JSON siguiendo este esquema: ${JSON.stringify(responseSchema)}`, 'predictiveLogistics');
    let cleanedJson = jsonStr.trim();
    // Eliminar etiquetas de razonamiento interno
    cleanedJson = cleanedJson.replace(/<(?:thought|think|thinking|reasoning)[^>]*>[\s\S]*?<\/(?:thought|think|thinking|reasoning)>/gi, '').trim();

    const fenceRegex = /^```(?:json)?\s*\n?(.*?)\n?\s*```$/is;
    const match = cleanedJson.match(fenceRegex);
    if (match && match[1]) {
      cleanedJson = match[1].trim();
    }

    // Try extracting JSON block if still malformed
    const startIdx = cleanedJson.indexOf('[');
    const endIdx = cleanedJson.lastIndexOf(']');
    if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
        cleanedJson = cleanedJson.substring(startIdx, endIdx + 1);
    } else {
        // Si no encontró corchetes y no parece ser un arreglo JSON válido, forzamos cadena vacía
        if (cleanedJson.indexOf('[') === -1) {
            cleanedJson = "";
        }
    }

    if (!cleanedJson || cleanedJson.trim() === "") {
        let snippet = jsonStr.trim().substring(0, 150);
        if (jsonStr.length > 150) snippet += "...";
        throw new Error(`La IA no generó un arreglo JSON válido. Respondió: "${snippet}"`);
    }

    const predictions = JSON.parse(cleanedJson) as PredictedLogisticsNeed[];
    
    if (!Array.isArray(predictions)) {
      throw new Error("El modelo no devolvió un arreglo de predicciones logísticas.");
    }

    // Save to cache
    aiCache.predictiveLogistics = { data: predictions, timestamp: Date.now() };
    try { localStorage.setItem('aiCache_predictiveLogistics', JSON.stringify({ data: predictions, timestamp: Date.now() })); } catch (e) {}
    updateTaskState('predictiveLogistics', { status: 'COMPLETED', result: predictions });
    return predictions;

  } catch (error: unknown) {
    console.error("Error en getPredictiveLogisticsAnalysis:", error);
    let errorMessage = "Fallo al obtener análisis predictivo de logística.";
    if (error instanceof Error) {
      errorMessage += ` Detalles: ${error.message}`;
    }
    updateTaskState('predictiveLogistics', { status: 'FAILED', error: errorMessage });
    throw new Error(errorMessage);
  }
};

export const normalizeWargameResult = (raw: any): WargameSimulationResult => {
  if (!raw || typeof raw !== 'object') {
    return {
      simulacion_id: `WARGAME-${Date.now().toString().slice(-4)}`,
      resultado_global: {
        probabilidad_exito_porcentaje: 75,
        veredicto_operacional: "VIABLE CON ADVERTENCIAS",
        justificacion_resumida: "Simulación procesada conforme a doctrina militar."
      },
      atricion_estimada: {
        fuerzas_propias: { estimado_bajas_totales: 0, heridos: 0, muertos_en_combate: 0, perdida_medios: "Sin pérdidas materiales críticas estimadas" },
        fuerzas_enemigas: { estimado_neutralizaciones: 0, capturas_estimadas: 0, material_incautado_esperado: "Armamento y material de intendencia" }
      },
      fases_wargaming: [],
      puntos_falla_criticos: []
    };
  }

  const heridos = Math.max(0, Number(raw.atricion_estimada?.fuerzas_propias?.heridos ?? 0));
  const muertos_en_combate = Math.max(0, Number(raw.atricion_estimada?.fuerzas_propias?.muertos_en_combate ?? 0));
  const estimado_bajas_totales = Math.max(Number(raw.atricion_estimada?.fuerzas_propias?.estimado_bajas_totales ?? 0), heridos + muertos_en_combate);

  const estimado_neutralizaciones = Math.max(0, Number(raw.atricion_estimada?.fuerzas_enemigas?.estimado_neutralizaciones ?? 0));
  const capturas_estimadas = Math.max(0, Number(raw.atricion_estimada?.fuerzas_enemigas?.capturas_estimadas ?? 0));

  return {
    simulacion_id: raw.simulacion_id || `WARGAME-${Date.now().toString().slice(-4)}`,
    resultado_global: {
      probabilidad_exito_porcentaje: Math.min(100, Math.max(0, Number(raw.resultado_global?.probabilidad_exito_porcentaje ?? 75))),
      veredicto_operacional: raw.resultado_global?.veredicto_operacional || "VIABLE CON ADVERTENCIAS",
      justificacion_resumida: raw.resultado_global?.justificacion_resumida || "Simulación procesada conforme a doctrina militar."
    },
    atricion_estimada: {
      fuerzas_propias: {
        estimado_bajas_totales,
        heridos,
        muertos_en_combate,
        perdida_medios: raw.atricion_estimada?.fuerzas_propias?.perdida_medios || "Sin pérdidas materiales críticas estimadas"
      },
      fuerzas_enemigas: {
        estimado_neutralizaciones,
        capturas_estimadas,
        material_incautado_esperado: raw.atricion_estimada?.fuerzas_enemigas?.material_incautado_esperado || "Armamento y material de intendencia"
      }
    },
    fases_wargaming: Array.isArray(raw.fases_wargaming) ? raw.fases_wargaming.map((f: any, idx: number) => ({
      fase_numero: Number(f?.fase_numero ?? (idx + 1)),
      nombre_fase: f?.nombre_fase || `Fase ${idx + 1}`,
      accion_propia: f?.accion_propia || "",
      reaccion_enemiga_probable: f?.reaccion_enemiga_probable || "",
      contraaccion_y_efecto: f?.contraaccion_y_efecto || "",
      evento_critico: f?.evento_critico || "",
      tasa_exito_fase_porcentaje: Math.min(100, Math.max(0, Number(f?.tasa_exito_fase_porcentaje ?? 75)))
    })) : [],
    puntos_falla_criticos: Array.isArray(raw.puntos_falla_criticos) ? raw.puntos_falla_criticos.map((p: any) => ({
      factor: p?.factor || "Factor Crítico",
      impacto: p?.impacto || "",
      medida_mitigacion: p?.medida_mitigacion || ""
    })) : []
  };
};

export const formatWargameMarkdown = (wg: WargameSimulationResult): string => {
  let md = `### ⚔️ INFORME DE SIMULACIÓN Y JUEGOS DE GUERRA (WARGAMING)\n\n`;
  md += `**ID Simulación:** \`${wg.simulacion_id}\`  \n`;
  md += `**Veredicto Operacional:** **${wg.resultado_global.veredicto_operacional}**  \n`;
  md += `**Probabilidad Global de Éxito:** **${wg.resultado_global.probabilidad_exito_porcentaje}%**  \n\n`;
  md += `> **Síntesis del Combate:** ${wg.resultado_global.justificacion_resumida}\n\n`;

  md += `#### 📊 Evaluación Cuantitativa de Atrición\n\n`;
  md += `| Fuerza | Bajas Totales | Heridos | Muertos (K.I.A) | Pérdida / Incautación de Medios |\n`;
  md += `| :--- | :---: | :---: | :---: | :--- |\n`;
  md += `| **Fuerzas Propias** | ${wg.atricion_estimada.fuerzas_propias.estimado_bajas_totales} | ${wg.atricion_estimada.fuerzas_propias.heridos} | ${wg.atricion_estimada.fuerzas_propias.muertos_en_combate} | ${wg.atricion_estimada.fuerzas_propias.perdida_medios || 'Ninguna'} |\n`;
  md += `| **Fuerzas Adversarias (GANE/GAO)** | ${wg.atricion_estimada.fuerzas_enemigas.estimado_neutralizaciones} | - | ${wg.atricion_estimada.fuerzas_enemigas.capturas_estimadas} (Capturas) | ${wg.atricion_estimada.fuerzas_enemigas.material_incautado_esperado || 'N/A'} |\n\n`;

  if (wg.fases_wargaming.length > 0) {
    md += `#### 🔄 Dinámica de Combate por Fases (Acción - Reacción - Contraacción)\n\n`;
    wg.fases_wargaming.forEach(f => {
      md += `##### Fase ${f.fase_numero}: ${f.nombre_fase} *(Tasa de éxito: ${f.tasa_exito_fase_porcentaje}%)*\n`;
      md += `- **Acción Propia:** ${f.accion_propia}\n`;
      md += `- **Reacción Enemiga Probable:** ${f.reaccion_enemiga_probable}\n`;
      md += `- **Contraacción y Efecto:** ${f.contraaccion_y_efecto}\n`;
      md += `- **⚠️ Evento Crítico:** ${f.evento_critico}\n\n`;
    });
  }

  if (wg.puntos_falla_criticos && wg.puntos_falla_criticos.length > 0) {
    md += `#### ⚠️ Puntos Críticos de Falla y Medidas de Mitigación\n\n`;
    wg.puntos_falla_criticos.forEach((p, idx) => {
      md += `${idx + 1}. **${p.factor}**: ${p.impacto}\n`;
      md += `   - **Mitigación Táctica:** ${p.medida_mitigacion}\n`;
    });
  }

  return md;
};

export const simulateCOAOutcome = async (
  coaPlan: COAPlan,
  units: MilitaryUnit[],
  intelReports: IntelligenceReport[]
): Promise<GeminiAnalysisResult> => {
  const isInitialized = await ensureInitialized();
  if (aiProvider === 'GEMINI' && (!isInitialized || !ai)) {
    throw new Error("Gemini AI client no inicializado. Verifique la configuración.");
  }

  if (aiProvider === 'NATIVE_SIMCOP') {
    try {
      updateTaskState('coaSimulation', { status: 'RUNNING', error: null, result: null });
      const data = await callNativeAI('/wargaming/simulate_outcome', {
        coa: JSON.stringify(coaPlan),
        fuerzas_amigas_enemigas: `Amigas:\n${formatUnitsForPrompt(units, intelReports)}\n\nInteligencia Enemiga:\n${formatIntelForPrompt(intelReports)}`
      });
      let parsedWargame: WargameSimulationResult | undefined = undefined;
      let resultText = "";
      if (typeof data === 'object' && data !== null) {
        parsedWargame = normalizeWargameResult(data);
        resultText = formatWargameMarkdown(parsedWargame);
      } else {
        resultText = typeof data === 'string' ? data : JSON.stringify(data);
      }
      const result: GeminiAnalysisResult = { text: resultText, wargameResult: parsedWargame };
      updateTaskState('coaSimulation', { status: 'COMPLETED', result });
      return result;
    } catch (error: any) {
      console.error("Error en simulateCOAOutcome Nativa:", error);
      updateTaskState('coaSimulation', { status: 'FAILED', error: error.message });
      throw error;
    }
  }

  const unitContext = formatUnitsForPrompt(units, intelReports);
  const intelContext = formatIntelForPrompt(intelReports);

  const systemInstruction = `Eres el Oficial de Simulación, Juegos de Guerra (Wargaming) y Modelado Táctico del sistema SIMCOP. Tu tarea es someter el Curso de Acción (COA) propuesto a una simulación de combate rigurosa contra las capacidades reales del adversario, aplicando doctrina militar y evaluación cuantitativa de atrición.

MÉTODO DE SIMULACIÓN OBLIGATORIO:
1. DINÁMICA DE COMBATE (ACCIÓN - REACCIÓN - CONTRAACCIÓN):
   - Evalúa cada fase del plan enfrentando la Maniobra Propia (Acción) con la Táctica más probable y peligrosa del GANE/GAO (Reacción), y la capacidad de ajuste de la unidad (Contraacción).
2. MODELADO DE CAPACIDADES Y FACTORES DEL TERRENO:
   - Cruza correlación de fuegos, línea de vista (LOS), fatiga por pendiente, cobertura vegetal y vulnerabilidad en puntos de estrangulamiento o corredores de movilidad obligados.
   - Pondera amenazas asimétricas: empleo hostil de IED/AEI, francotiradores y ataques con micro-UAVs comerciales adaptados.
3. ESTIMACIONES REALISTAS:
   - Probabilidad de éxito calculada en porcentaje (0-100%).
   - Atrición y bajas segregadas (Propias vs. Enemigas) expresadas en números enteros realistas según el escalón empeñado.
4. SALIDA: Responde EXCLUSIVAMENTE con el siguiente esquema JSON válido, sin texto introductorio ni conclusiones fuera de la estructura.

ESQUEMA JSON OBLIGATORIO:
{
  "simulacion_id": "WARGAME-COA-01",
  "resultado_global": {
    "probabilidad_exito_porcentaje": 78,
    "veredicto_operacional": "VIABLE CON ALTO RIESGO EN FASE II | VIABLE | NO RECOMENDADO",
    "justificacion_resumida": "Síntesis operativa del resultado de la confrontación."
  },
  "atricion_estimada": {
    "fuerzas_propias": {
      "estimado_bajas_totales": 3,
      "heridos": 2,
      "muertos_en_combate": 1,
      "perdida_medios": "1 micro-UAV por fuego de fusilería"
    },
    "fuerzas_enemigas": {
      "estimado_neutralizaciones": 7,
      "capturas_estimadas": 4,
      "material_incautado_esperado": "Armamento ligero, precursores y munición"
    }
  },
  "fases_wargaming": [
    {
      "fase_numero": 1,
      "nombre_fase": "Infiltración y Aproximación",
      "accion_propia": "Avance de ASTRO 1 por el eje desenfilado.",
      "reaccion_enemiga_probable": "Detección temprana por red de alerta local (campanillas / informantes).",
      "contraaccion_y_efecto": "Empleo de micro-UAS para fijar posición de tiradores enemigos y reorientar el eje.",
      "evento_critico": "Cruce del río o paso obligado bajo posible campo de tiro enemigo.",
      "tasa_exito_fase_porcentaje": 85
    }
  ],
  "puntos_falla_criticos": [
    {
      "factor": "Interrupción de Enlace C2",
      "impacto": "Pérdida de comunicaciones VHF en el fondo del cañón durante el asalto.",
      "medida_mitigacion": "Despliegue de repetidor táctico en cota dominante previo al asalto."
    },
    {
      "factor": "Alerta Temprana de IED",
      "impacto": "Ralentización de la columna y riesgo de emboscada coordinada.",
      "medida_mitigacion": "Avance con equipo EXDE a la vanguardia y reconocimiento visual por drone."
    }
  ]
}`;

  const phasesDetails = (coaPlan.phases || []).map((p, i) => {
    const graphicsSummary = (p.graphics || []).map(g => `[${g.type} - ${g.label}]`).join(', ');
    return `Fase ${p.fase_numero || (i + 1)}: ${p.phaseName || p.nombre}
- Concepto/Descripción: ${p.description || p.descripcion}
- Medidas de Control/Calco: ${graphicsSummary || 'Sin calco explícito'}`;
  }).join('\n\n');

  const unitsAssignedSummary = (coaPlan.unidades_asignadas || []).map(u => 
    `- ${u.indicativo}: Rol: ${u.rol_tactico} | Misión: ${u.mision}`
  ).join('\n');

  const prompt = `
PLAN DE CURSO DE ACCIÓN (COA) A EVALUAR:
- ID Operación: ${coaPlan.coa_id || 'COA-ACTUAL'}
- Nombre de la Operación: ${coaPlan.planName || coaPlan.nombre_operacion || 'Operación Táctica'}
- Intención del Comandante: ${coaPlan.conceptOfOperations || coaPlan.intencion_comandante || 'N/A'}

UNIDADES ASIGNADAS AL PLAN:
${unitsAssignedSummary || 'Unidades orgánicas disponibles en el TO.'}

FASES Y MEDIDAS DE CONTROL DE LA MANIOBRA:
${phasesDetails}

SINCRONIZACIÓN DE FUEGOS Y MEDIOS UAS:
- Reconocimiento Aéreo / UAS: ${coaPlan.sincronizacion_fuegos_y_uav?.reconocimiento_aereo || 'Reconocimiento táctico estándar'}
- Apoyo de Fuegos: ${coaPlan.sincronizacion_fuegos_y_uav?.apoyo_fuego || 'Fuegos orgánicos de mortero y artillería a solicitud'}

GESTIÓN DE RIESGOS PREVIA:
${(coaPlan.riesgo_y_mitigacion || []).map(r => `- Riesgo: ${r.riesgo} -> Mitigación: ${r.mitigacion}`).join('\n') || 'Evaluación estándar de riesgos.'}

---
FUERZAS AMIGAS DISPONIBLES EN EL TEATRO (TELEMETRÍA, ARMAS Y POSICIONES REALES):
${unitContext}

---
INTELIGENCIA ADVERSARIA Y AMENAZA GANE/GAO (HISTÓRICO Y CONTACTOS RECIENTES):
${intelContext}

---
INSTRUCCIÓN FINAL:
Ejecuta el wargaming aplicando Acción - Reacción - Contraacción en cada fase, cuantifica la atrición propia vs enemiga y emite el veredicto operacional.
Responde ÚNICAMENTE con el objeto JSON según el esquema obligatorio.`;

  // Extractor y reparador de JSON robusto
  const extractAndRepairJson = (text: string): string => {
    const start = text.indexOf('{');
    if (start === -1) return "";
    
    const stack: ('{' | '[')[] = [];
    let inString = false;
    let escape = false;
    
    for (let i = start; i < text.length; i++) {
      const ch = text[i];
      if (escape) { escape = false; continue; }
      if (ch === '\\' && inString) { escape = true; continue; }
      if (ch === '"') { inString = !inString; continue; }
      if (inString) continue;
      
      if (ch === '{') stack.push('{');
      else if (ch === '[') stack.push('[');
      else if (ch === '}') {
        if (stack[stack.length - 1] === '{') stack.pop();
        if (stack.length === 0) return text.slice(start, i + 1);
      }
      else if (ch === ']') {
        if (stack[stack.length - 1] === '[') stack.pop();
      }
    }
    
    let repaired = text.slice(start);
    if (inString) repaired += '"';
    repaired = repaired.replace(/[,:]\s*$/, '');
    if (repaired.endsWith('"null')) repaired = repaired.replace(/"null$/, 'null');
    
    while (stack.length > 0) {
      const char = stack.pop();
      repaired += char === '{' ? '}' : ']';
    }
    return repaired;
  };

  if (aiProvider === 'LOCAL_OLLAMA' || aiProvider === 'LOCAL_LMLink' || aiProvider === 'OMNIROUTE' || !ai) {
    try {
      const responseText = await generateContentViaBackend(prompt, 'coaSimulation', systemInstruction);
      let jsonStr = responseText.trim();
      jsonStr = jsonStr.replace(/<(?:thought|think|thinking|reasoning)[^>]*>[\s\S]*?<\/(?:thought|think|thinking|reasoning)>/gi, '').trim();

      const fenceRegex = /```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/;
      const fenceMatch = jsonStr.match(fenceRegex);
      if (fenceMatch && fenceMatch[1]) {
        jsonStr = fenceMatch[1].trim();
      }

      jsonStr = extractAndRepairJson(jsonStr);
      let parsedResult: WargameSimulationResult | undefined = undefined;
      let finalMarkdown = responseText;

      if (jsonStr) {
        try {
          const rawWargame = JSON.parse(jsonStr);
          parsedResult = normalizeWargameResult(rawWargame);
          finalMarkdown = formatWargameMarkdown(parsedResult);
        } catch (parseErr) {
          console.warn("No se pudo parsear JSON directo de wargaming, usando texto en crudo:", parseErr);
        }
      }

      const result: GeminiAnalysisResult = { text: finalMarkdown, wargameResult: parsedResult };
      updateTaskState('coaSimulation', { status: 'COMPLETED', result });
      return result;
    } catch (error: unknown) {
      console.error("Error en simulateCOAOutcome Backend/OmniRoute:", error);
      let errorMessage = "Fallo al simular el Curso de Acción con IA.";
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      updateTaskState('coaSimulation', { status: 'FAILED', error: errorMessage });
      throw new Error(errorMessage);
    }
  }

  try {
    updateTaskState('coaSimulation', { status: 'RUNNING', error: null, result: null });
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
      },
    });

    let jsonStr = (response.text || "").trim();
    const fenceRegex = /^```(\w*)?\s*\n?(.*?)\n?\s*```$/s;
    const match = jsonStr.match(fenceRegex);
    if (match && match[2]) {
      jsonStr = match[2].trim();
    }
    jsonStr = extractAndRepairJson(jsonStr);

    let parsedResult: WargameSimulationResult | undefined = undefined;
    let finalMarkdown = response.text || "";

    if (jsonStr) {
      try {
        const rawWargame = JSON.parse(jsonStr);
        parsedResult = normalizeWargameResult(rawWargame);
        finalMarkdown = formatWargameMarkdown(parsedResult);
      } catch (parseErr) {
        console.warn("No se pudo parsear JSON directo de Gemini para wargaming:", parseErr);
      }
    }

    const result: GeminiAnalysisResult = { text: finalMarkdown, wargameResult: parsedResult };
    updateTaskState('coaSimulation', { status: 'COMPLETED', result });
    return result;
  } catch (error: unknown) {
    console.error("Error en simulateCOAOutcome Gemini:", error);
    let errorMessage = "Fallo al simular el resultado del COA.";
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    updateTaskState('coaSimulation', { status: 'FAILED', error: errorMessage });
    throw new Error(errorMessage);
  }
};

export const normalizeBMAInterceptionResult = (raw: any): BMAInterceptionSimulationResult => {
  if (!raw || typeof raw !== 'object') {
    return {
      intercepcion_id: `BMA-INT-${Date.now().toString().slice(-4)}`,
      unidad_amiga: "Unidad Amiga",
      amenaza_objetivo: "Vector Hostil",
      metricas_clave: {
        probabilidad_intercepcion_porcentaje: 75,
        probabilidad_neutralizacion_porcentaje: 70,
        tiempo_estimado_contacto_minutos: 30,
        nivel_riesgo_general: "MEDIO"
      },
      control_danos_y_bajas: {
        propias: {
          estimado_bajas_totales: 0,
          heridos_wia: 0,
          muertos_kia: 0,
          requiere_medevac: false,
          danos_material_equipo: "Ninguno reportado"
        },
        amenaza: {
          neutralizados_kia: 0,
          capturados_pow: 0,
          dispersos_huidos: 0
        }
      },
      gasto_logistico_estimado: {
        municion_clase_v: {
          porcentaje_consumo_unidad: 25,
          desglose: "Consumo estimado de munición"
        },
        combustible_clase_iii: {
          porcentaje_consumo: 10,
          observacion: "Consumo táctico en desplazamiento"
        },
        autonomia_remanente_horas: 48
      },
      evaluacion_operacional: "Contacto táctico completado."
    };
  }

  const heridosWia = Math.max(0, Number(raw.control_danos_y_bajas?.propias?.heridos_wia ?? 0));
  const muertosKia = Math.max(0, Number(raw.control_danos_y_bajas?.propias?.muertos_kia ?? 0));
  const estimadoBajasPropias = Math.max(Number(raw.control_danos_y_bajas?.propias?.estimado_bajas_totales ?? 0), heridosWia + muertosKia);
  const requiereMedevac = heridosWia > 0 ? true : Boolean(raw.control_danos_y_bajas?.propias?.requiere_medevac);

  const neutralizadosKia = Math.max(0, Number(raw.control_danos_y_bajas?.amenaza?.neutralizados_kia ?? 0));
  const capturadosPow = Math.max(0, Number(raw.control_danos_y_bajas?.amenaza?.capturados_pow ?? 0));
  const dispersosHuidos = Math.max(0, Number(raw.control_danos_y_bajas?.amenaza?.dispersos_huidos ?? 0));

  const probInt = Number(raw.metricas_clave?.probabilidad_intercepcion_porcentaje ?? 75);
  const probNeut = Number(raw.metricas_clave?.probabilidad_neutralizacion_porcentaje ?? 70);

  return {
    intercepcion_id: raw.intercepcion_id || `BMA-INT-${Date.now().toString().slice(-4)}`,
    unidad_amiga: raw.unidad_amiga || "Unidad Amiga",
    amenaza_objetivo: raw.amenaza_objetivo || "Vector Hostil",
    metricas_clave: {
      probabilidad_intercepcion_porcentaje: Math.min(100, Math.max(0, isNaN(probInt) ? 75 : probInt)),
      probabilidad_neutralizacion_porcentaje: Math.min(100, Math.max(0, isNaN(probNeut) ? 70 : probNeut)),
      tiempo_estimado_contacto_minutos: Math.max(0, Number(raw.metricas_clave?.tiempo_estimado_contacto_minutos ?? 30)),
      nivel_riesgo_general: (raw.metricas_clave?.nivel_riesgo_general || "MEDIO").toUpperCase()
    },
    control_danos_y_bajas: {
      propias: {
        estimado_bajas_totales: estimadoBajasPropias,
        heridos_wia: heridosWia,
        muertos_kia: muertosKia,
        requiere_medevac: requiereMedevac,
        danos_material_equipo: raw.control_danos_y_bajas?.propias?.danos_material_equipo || "Ninguno reportado"
      },
      amenaza: {
        neutralizados_kia: neutralizadosKia,
        capturados_pow: capturadosPow,
        dispersos_huidos: dispersosHuidos
      }
    },
    gasto_logistico_estimado: {
      municion_clase_v: {
        porcentaje_consumo_unidad: Math.min(100, Math.max(0, Number(raw.gasto_logistico_estimado?.municion_clase_v?.porcentaje_consumo_unidad ?? 25))),
        desglose: raw.gasto_logistico_estimado?.municion_clase_v?.desglose || "Consumo estimado de munición"
      },
      combustible_clase_iii: {
        porcentaje_consumo: Math.min(100, Math.max(0, Number(raw.gasto_logistico_estimado?.combustible_clase_iii?.porcentaje_consumo ?? 10))),
        observacion: raw.gasto_logistico_estimado?.combustible_clase_iii?.observacion || "Consumo táctico en desplazamiento"
      },
      autonomia_remanente_horas: Math.max(0, Number(raw.gasto_logistico_estimado?.autonomia_remanente_horas ?? 48))
    },
    evaluacion_operacional: raw.evaluacion_operacional || "Contacto táctico completado."
  };
};

export const formatBMAMarkdown = (bma: BMAInterceptionSimulationResult): string => {
  let md = `### 🎯 INFORME DE CONTROL DE DAÑOS Y SIMULACIÓN TÁCTICA (BMA)\n\n`;
  md += `**ID Intercepción:** \`${bma.intercepcion_id}\`  \n`;
  md += `**Unidad Amiga:** **${bma.unidad_amiga}** | **Amenaza Objetivo:** **${bma.amenaza_objetivo}**  \n`;
  md += `**Nivel de Riesgo General:** **${bma.metricas_clave.nivel_riesgo_general}** | **Contacto Estimado:** **${bma.metricas_clave.tiempo_estimado_contacto_minutos} min**  \n\n`;

  md += `#### 📈 Métricas Clave de Enfrentamiento\n`;
  md += `- **Probabilidad de Intercepción:** ${bma.metricas_clave.probabilidad_intercepcion_porcentaje}%\n`;
  md += `- **Probabilidad de Neutralización:** ${bma.metricas_clave.probabilidad_neutralizacion_porcentaje}%\n\n`;

  md += `#### 🛡️ Control de Daños y Bajas Estimadas\n`;
  md += `| Fuerza | Bajas Totales | Heridos (W.I.A) | Muertos (K.I.A) | Daños a Material / Estado |\n`;
  md += `| :--- | :---: | :---: | :---: | :--- |\n`;
  md += `| **Fuerzas Propias** | ${bma.control_danos_y_bajas.propias.estimado_bajas_totales} | ${bma.control_danos_y_bajas.propias.heridos_wia} | ${bma.control_danos_y_bajas.propias.muertos_kia} | ${bma.control_danos_y_bajas.propias.danos_material_equipo} ${bma.control_danos_y_bajas.propias.requiere_medevac ? '(🚨 REQUIERE MEDEVAC)' : '(Sin MEDEVAC)'} |\n`;
  md += `| **Amenaza Hostil** | ${bma.control_danos_y_bajas.amenaza.neutralizados_kia + bma.control_danos_y_bajas.amenaza.capturados_pow} | - | ${bma.control_danos_y_bajas.amenaza.neutralizados_kia} (Neutralizados) | ${bma.control_danos_y_bajas.amenaza.capturados_pow} Capturados, ${bma.control_danos_y_bajas.amenaza.dispersos_huidos} Dispersos |\n\n`;

  md += `#### 📦 Gasto Logístico Proyectado\n`;
  md += `- **Clase V (Munición):** ${bma.gasto_logistico_estimado.municion_clase_v.porcentaje_consumo_unidad}% de dotación (${bma.gasto_logistico_estimado.municion_clase_v.desglose})\n`;
  md += `- **Clase III (Combustible):** ${bma.gasto_logistico_estimado.combustible_clase_iii.porcentaje_consumo}% de reserva (${bma.gasto_logistico_estimado.combustible_clase_iii.observacion})\n`;
  md += `- **Autonomía Remanente:** ${bma.gasto_logistico_estimado.autonomia_remanente_horas} horas operacionales\n\n`;

  md += `> **Evaluación Operacional:** ${bma.evaluacion_operacional}\n`;
  return md;
};

export const simulateBMAInterception = async (
  unit: MilitaryUnit,
  threat: IntelligenceReport,
  weather: WeatherInfo | null
): Promise<GeminiAnalysisResult> => {
  const isInitialized = await ensureInitialized();
  if (aiProvider === 'GEMINI' && (!isInitialized || !ai)) {
    throw new Error("Gemini AI client no inicializado. Verifique la configuración.");
  }

  const systemInstruction = `Eres el Oficial de Control de Daños, Evaluación de Bajas y Simulación Táctica (BMA) del sistema SIMCOP. Tu misión es simular el resultado de una intercepción directa entre una unidad amiga y un vector de amenaza reportado, calculando atrición, probabilidad de éxito y gasto logístico.

REGLAS DE EVALUACIÓN TÁCTICA:
1. ANCLAJE DE DATOS: Utiliza exclusivamente las capacidades orgánicas de la unidad amiga, la naturaleza de la amenaza inyectada y el clima/terreno del punto de contacto.
2. MODELADO LOGÍSTICO Y ATRICIÓN:
   - Cuantifica bajas (WIA/KIA) de forma realista para el escalón involucrado (escuadra/pelotón).
   - Estima gasto logístico por clases: Clase V (munición de fusilería, ametralladora, mortero en porcentaje o tiros), Clase III (galones de combustible consumidos por desplazamiento/patrulla) y requerimientos de soporte médico (MEDEVAC/CASEVAC).
3. FORMATO DE SALIDA: Responde EXCLUSIVAMENTE con el siguiente esquema JSON válido, sin bloques de texto conversacional ni explicaciones adicionales.

ESQUEMA JSON REQUERIDO:
{
  "intercepcion_id": "BMA-INT-01",
  "unidad_amiga": "Indicativo de la unidad",
  "amenaza_objetivo": "Identificación de la amenaza",
  "metricas_clave": {
    "probabilidad_intercepcion_porcentaje": 82,
    "probabilidad_neutralizacion_porcentaje": 74,
    "tiempo_estimado_contacto_minutos": 35,
    "nivel_riesgo_general": "BAJO | MEDIO | ALTO | CRÍTICO"
  },
  "control_danos_y_bajas": {
    "propias": {
      "estimado_bajas_totales": 1,
      "heridos_wia": 1,
      "muertos_kia": 0,
      "requiere_medevac": true,
      "danos_material_equipo": "Ninguno | Leve en comunicaciones | Pérdida de material"
    },
    "amenaza": {
      "neutralizados_kia": 3,
      "capturados_pow": 2,
      "dispersos_huidos": 2
    }
  },
  "gasto_logistico_estimado": {
    "municion_clase_v": {
      "porcentaje_consumo_unidad": 35,
      "desglose": "Gasto estimado de 5.56mm y granadas 40mm"
    },
    "combustible_clase_iii": {
      "porcentaje_consumo": 15,
      "observacion": "Consumo de vehículos tácticos / generadores"
    },
    "autonomia_remanente_horas": 48
  },
  "evaluacion_operacional": "Conclusión concisa sobre la ventaja táctica lograda tras el contacto."
}`;

  if (aiProvider === 'NATIVE_SIMCOP') {
    try {
      updateTaskState('bmaInterception', { status: 'RUNNING', error: null, result: null });
      const data = await callNativeAI('/wargaming/simulate_bma', {
        defensora: JSON.stringify(unit),
        amenaza: JSON.stringify(threat),
        clima: weather ? JSON.stringify(weather) : "Sin reporte"
      });
      let parsedBma: BMAInterceptionSimulationResult | undefined = undefined;
      let resultText = "";
      if (typeof data === 'object' && data !== null) {
        parsedBma = normalizeBMAInterceptionResult(data);
        resultText = formatBMAMarkdown(parsedBma);
      } else {
        resultText = typeof data === 'string' ? data : JSON.stringify(data);
      }
      const result: GeminiAnalysisResult = { text: resultText, bmaSimulationResult: parsedBma };
      updateTaskState('bmaInterception', { status: 'COMPLETED', result });
      return result;
    } catch (error: any) {
      console.error("Error en simulateBMAInterception Nativa:", error);
      updateTaskState('bmaInterception', { status: 'FAILED', error: error.message });
      throw error;
    }
  }

  const unitTotalPersonnel = (unit.personnelBreakdown?.officers || 0) + 
                             (unit.personnelBreakdown?.ncos || 0) + 
                             (unit.personnelBreakdown?.professionalSoldiers || 0) +
                             (unit.personnelBreakdown?.slRegulars || 0);

  const unitEquipmentStr = (unit.equipment && unit.equipment.length > 0) 
    ? unit.equipment.join(', ') 
    : 'Fusilería 5.56mm Galil/Tavor, ametralladora M249/M60';

  const unitCapabilitiesStr = (unit.capabilities && unit.capabilities.length > 0)
    ? unit.capabilities.join(', ')
    : 'Infiltración, asalto táctico, combate cercano';

  const unitCoordinates = unit.location 
    ? `${decimalToDMS(unit.location)} [${unit.location.lat.toFixed(4)}, ${unit.location.lon.toFixed(4)}]`
    : 'No disponibles';

  const threatCoordinates = threat.location
    ? `${decimalToDMS(threat.location)} [${threat.location.lat.toFixed(4)}, ${threat.location.lon.toFixed(4)}]`
    : 'Coordenadas no fijadas';

  let distanceKm = 0;
  if (unit.location && threat.location) {
    distanceKm = calculateDistanceKm(unit.location.lat, unit.location.lon, threat.location.lat, threat.location.lon);
  }

  const weatherStr = weather ? `
- Condición: ${weather.condition}
- Temperatura: ${weather.temperature}°C
- Viento: ${weather.windSpeed || 0} km/h (${weather.windDirection || 'N/D'})
- Techo de Nubes: ${weather.cloudCover ?? weather.cloudCeiling ?? 0}%
- Impacto Operacional: ${weather.operationalImpact ? 'ALTO IMPACTO / RESTRINGIDO' : 'FAVORABLE / SIN RESTRICCIÓN'}` : 'Clima estándar en el teatro de operaciones.';

  const prompt = `
VECTOR DE ENFRENTAMIENTO DIRECTO (BMA INTERCEPTION):

1. UNIDAD DEFENSORA / AMIGA:
- Indicativo: ${unit.name}
- Tipo y Escalón: ${translateUnitType(unit.type)} (Comandante: ${unit.commander?.rank || ''} ${unit.commander?.name || 'Oficial al mando'})
- Efectivos Totales: ${unitTotalPersonnel > 0 ? `${unitTotalPersonnel} efectivos` : 'Pelotón reglamentario (~32 hombres)'}
- Estado Operacional: ${translateUnitStatus(unit.status)}
- Ubicación Táctica: ${unitCoordinates}
- Armamento Orgánico: ${unitEquipmentStr}
- Capacidades de Combate: ${unitCapabilitiesStr}
- Estado Logístico: Munición Clase V: ${unit.ammoLevel ?? 100}%, Combustible Clase III: ${unit.fuelLevel ?? 100}%, Raciones / Suministros: ${unit.daysOfSupply !== undefined ? `${unit.daysOfSupply} días` : 'Adecuado'}

2. AMENAZA HOSTIL OBJETIVO:
- Identificación: ${threat.title}
- Clasificación INT: ${threat.type} (Confiabilidad: ${threat.reliability}, Credibilidad: ${threat.credibility})
- Ubicación Reportada: ${threatCoordinates}
- Distancia Táctica de Contacto: ~${distanceKm > 0 ? distanceKm.toFixed(2) : '5.0'} km
- Resumen de Inteligencia: ${threat.details || 'Elementos armados hostiles en movimiento o punto de acecho.'}

3. CONDICIONES METEOROLÓGICAS Y DEL TERRENO EN EL PUNTO:
${weatherStr}

---
INSTRUCCIÓN:
Somete el vector a simulación física y táctica. Calcula la atrición bilateral realista, consumo logístico por clases (Clase V y Clase III) y emite el informe estricto en el formato JSON requerido.`;

  // Extractor y reparador de JSON robusto
  const extractAndRepairJson = (text: string): string => {
    const start = text.indexOf('{');
    if (start === -1) return "";
    
    const stack: ('{' | '[')[] = [];
    let inString = false;
    let escape = false;
    
    for (let i = start; i < text.length; i++) {
      const ch = text[i];
      if (escape) { escape = false; continue; }
      if (ch === '\\' && inString) { escape = true; continue; }
      if (ch === '"') { inString = !inString; continue; }
      if (inString) continue;
      
      if (ch === '{') stack.push('{');
      else if (ch === '[') stack.push('[');
      else if (ch === '}') {
        if (stack[stack.length - 1] === '{') stack.pop();
        if (stack.length === 0) return text.slice(start, i + 1);
      }
      else if (ch === ']') {
        if (stack[stack.length - 1] === '[') stack.pop();
      }
    }
    
    let repaired = text.slice(start);
    if (inString) repaired += '"';
    repaired = repaired.replace(/[,:]\s*$/, '');
    if (repaired.endsWith('"null')) repaired = repaired.replace(/"null$/, 'null');
    
    while (stack.length > 0) {
      const char = stack.pop();
      repaired += char === '{' ? '}' : ']';
    }
    return repaired;
  };

  if (aiProvider === 'LOCAL_OLLAMA' || aiProvider === 'LOCAL_LMLink' || aiProvider === 'OMNIROUTE' || !ai) {
    try {
      const responseText = await generateContentViaBackend(prompt, 'bmaInterception', systemInstruction);
      let jsonStr = responseText.trim();
      jsonStr = jsonStr.replace(/<(?:thought|think|thinking|reasoning)[^>]*>[\s\S]*?<\/(?:thought|think|thinking|reasoning)>/gi, '').trim();

      const fenceRegex = /```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/;
      const fenceMatch = jsonStr.match(fenceRegex);
      if (fenceMatch && fenceMatch[1]) {
        jsonStr = fenceMatch[1].trim();
      }

      jsonStr = extractAndRepairJson(jsonStr);
      let parsedResult: BMAInterceptionSimulationResult | undefined = undefined;
      let finalMarkdown = responseText;

      if (jsonStr) {
        try {
          const rawBma = JSON.parse(jsonStr);
          parsedResult = normalizeBMAInterceptionResult(rawBma);
          finalMarkdown = formatBMAMarkdown(parsedResult);
        } catch (parseErr) {
          console.warn("No se pudo parsear JSON directo de BMA, usando texto en crudo:", parseErr);
        }
      }

      const result: GeminiAnalysisResult = { text: finalMarkdown, bmaSimulationResult: parsedResult };
      updateTaskState('bmaInterception', { status: 'COMPLETED', result });
      return result;
    } catch (error: any) {
      console.error("Error en simulateBMAInterception Backend/OmniRoute:", error);
      const errorMessage = error.message || "Fallo la simulación de intercepción.";
      updateTaskState('bmaInterception', { status: 'FAILED', error: errorMessage });
      throw new Error(errorMessage);
    }
  }

  try {
    updateTaskState('bmaInterception', { status: 'RUNNING', error: null, result: null });
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
      },
    });

    let jsonStr = (response.text || "").trim();
    const fenceRegex = /^```(\w*)?\s*\n?(.*?)\n?\s*```$/s;
    const match = jsonStr.match(fenceRegex);
    if (match && match[2]) {
      jsonStr = match[2].trim();
    }
    jsonStr = extractAndRepairJson(jsonStr);

    let parsedResult: BMAInterceptionSimulationResult | undefined = undefined;
    let finalMarkdown = response.text || "";

    if (jsonStr) {
      try {
        const rawBma = JSON.parse(jsonStr);
        parsedResult = normalizeBMAInterceptionResult(rawBma);
        finalMarkdown = formatBMAMarkdown(parsedResult);
      } catch (parseErr) {
        console.warn("No se pudo parsear JSON directo de Gemini para BMA:", parseErr);
      }
    }

    const result: GeminiAnalysisResult = { text: finalMarkdown, bmaSimulationResult: parsedResult };
    updateTaskState('bmaInterception', { status: 'COMPLETED', result });
    return result;
  } catch (error: any) {
    console.error("Error en simulateBMAInterception Gemini:", error);
    const errorMessage = error.message || "Fallo la simulación de intercepción.";
    updateTaskState('bmaInterception', { status: 'FAILED', error: errorMessage });
    throw new Error(errorMessage);
  }
};

export const getBMASituationBrief = async (
  threat: IntelligenceReport | null,
  recommendations: any[],
  weather: any | null,
  hotspots: any[],
  logistics: any[]
): Promise<string> => {
  const isInitialized = await ensureInitialized();
  if (aiProvider === 'GEMINI' && (!isInitialized || !ai)) {
    return "Análisis de IA no disponible. Verifique la configuración.";
  }

  const systemInstruction = `Eres SIMCOP BMA-AI, el asistente de inteligencia y operaciones tácticas. Tu función es generar un "Resumen Ejecutivo de Situación" para el Comandante Regional.

REGLAS DE REDACCIÓN:
1. CONCISIÓN OPERACIONAL: Máximo 150 palabras. Sin introducciones, formalismos ni despedidas.
2. ANCLAJE ESTRICTO: Basa el resumen ÚNICAMENTE en la amenaza seleccionada, coordenadas/sectores y datos reales de clima/hotspots inyectados por la plataforma. Prohibido inventar eventos o ubicaciones no provistos.
3. ESTRUCTURA OBLIGATORIA (Usa viñetas):
   - • AMENAZA: Identificación del blanco/GANE, sector crítico y vector de movimiento probable.
   - • FACTOR CLIMA/TERRENO: Impacto directo en movilidad terrestre, visibilidad y empleo de plataformas UAS.
   - • HOTSPOTS Y RIESGO LOGÍSTICO: Puntos de estrangulamiento activos, riesgo de IEDs y estado de líneas de abastecimiento.
   - • DECISIÓN RECOMENDADA: Acción táctica inmediata para el escalón de mando.`;

  const threatLocationStr = threat?.location 
    ? `${decimalToDMS(threat.location)} [${threat.location.lat.toFixed(4)}, ${threat.location.lon.toFixed(4)}]` 
    : 'No precisadas';

  const recommendationsStr = recommendations.length > 0 
    ? recommendations.map(r => `${r.unitName} (${Math.round(r.score)}% idoneidad - Rol: ${r.reasoning})`).slice(0, 3).join('; ')
    : 'Sin unidades con asignación directa asignada';

  const weatherStr = weather 
    ? `${weather.condition}, Temp: ${Math.round(weather.temperature)}°C, Viento: ${weather.windSpeed || 0} km/h ${weather.windDirection || ''}, Nubosidad: ${weather.cloudCover ?? weather.cloudCeiling ?? 0}%, Impacto: ${weather.operationalImpact ? 'ALTO / ADVERSO' : 'FAVORABLE'}`
    : 'Condiciones meteorológicas estándar';

  const hotspotsStr = hotspots.length > 0 
    ? hotspots.slice(0, 5).map(h => `${h.name || 'Hotspot'} [${h.riskLevel || 'Riesgo activo'} en lat ${h.location?.lat?.toFixed(3) || '0'}, lon ${h.location?.lon?.toFixed(3) || '0'}]`).join('; ')
    : 'Sin puntos de estrangulamiento ni hotspots críticos reportados';

  const logisticsStr = logistics.length > 0
    ? logistics.slice(0, 4).map(l => `${l.unitName || 'Unidad'}: ${l.predictionText || l.resourceType || 'Riesgo logístico activo'}`).join('; ')
    : 'Líneas de abastecimiento y niveles en umbrales operacionales seguros';

  const prompt = `
DATOS TÁCTICOS DE SITUACIÓN EN EL TEATRO DE OPERACIONES:

AMENAZA SELECCIONADA:
- Identificación / Blanco: ${threat ? `${threat.title} (${threat.type})` : 'Sin amenaza activa seleccionada'}
- Confiabilidad / Credibilidad: ${threat ? `${threat.reliability}/${threat.credibility}` : 'N/A'}
- Coordenadas: ${threatLocationStr}
- Inteligencia Reportada: ${threat?.details || 'Alerta temprana de hostiles'}

RECOMENDACIÓN DE FUERZAS / RESPUESTA:
${recommendationsStr}

METEOROLOGÍA Y CONDICIONES DEL TERRENO:
${weatherStr}

HOTSPOTS Y PUNTOS CRÍTICOS:
${hotspotsStr}

ESTADO LOGÍSTICO Y SUMINISTROS:
${logisticsStr}

---
INSTRUCCIÓN:
Genera el Resumen Ejecutivo de Situación para el Comandante Regional cumpliendo rigurosamente las 4 viñetas y el límite de 150 palabras.`;

  if (aiProvider === 'NATIVE_SIMCOP') {
    try {
      updateTaskState('bmaBrief', { status: 'RUNNING', error: null });
      const data = await callNativeAI('/wargaming/bma_brief', {
        threat: threat ? threat.title : 'Ninguna',
        threat_location: threatLocationStr,
        recommendation: recommendationsStr,
        weather: weatherStr,
        hotspots_count: hotspots.length,
        logistics_count: logistics.length
      });
      const text = typeof data === 'string' ? data : (data.brief || JSON.stringify(data));
      updateTaskState('bmaBrief', { status: 'COMPLETED', result: text });
      return text;
    } catch (error: any) {
      console.error("Error en getBMASituationBrief Nativa:", error);
      const errorMessage = error.message || "Error al generar el resumen de situación nativo.";
      updateTaskState('bmaBrief', { status: 'FAILED', error: errorMessage });
      return errorMessage;
    }
  }

  if (aiProvider === 'GEMINI' && ai) {
    try {
      updateTaskState('bmaBrief', { status: 'RUNNING', error: null });
      const response = await ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: prompt,
        config: {
          systemInstruction,
        },
      });
      const text = response.text || "";
      updateTaskState('bmaBrief', { status: 'COMPLETED', result: text });
      return text;
    } catch (error: any) {
      console.error("Error en getBMASituationBrief Gemini:", error);
      const errorMessage = error.message || "Error al generar el resumen de situación.";
      updateTaskState('bmaBrief', { status: 'FAILED', error: errorMessage });
      return errorMessage;
    }
  }

  try {
    const text = await generateContentViaBackend(prompt, 'bmaBrief', systemInstruction);
    updateTaskState('bmaBrief', { status: 'COMPLETED', result: text });
    return text;
  } catch (error: any) {
    console.error("Error en getBMASituationBrief:", error);
    const errorMessage = error.message || "Error al generar el resumen de situación.";
    updateTaskState('bmaBrief', { status: 'FAILED', error: errorMessage });
    return errorMessage;
  }
};
