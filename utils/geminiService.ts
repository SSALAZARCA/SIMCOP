import { GoogleGenAI, GenerateContentResponse, FunctionDeclaration, Type, Blob as GenaiBlob } from "@google/genai";
import type { MilitaryUnit, IntelligenceReport, GeminiAnalysisResult, GroundingSource, AfterActionReport, Q5ContentPayload, CommanderInfo, Alert, COAPlan, PredictedLogisticsNeed, WeatherInfo } from '../types';
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

// Initialize API key and provider from backend
export const initializeApiKey = async (): Promise<void> => {
  try {
    // Load AI Provider first
    try {
      const providerResp = await apiClient.fetch(`${API_BASE_URL}/api/config/ai-provider`);
      if (providerResp.ok) {
        const providerData = await providerResp.json();
        aiProvider = providerData.provider || 'GEMINI';
        localEndpoint = providerData.localEndpoint || 'http://localhost:1234';
        localModel = providerData.localModel || 'llama3';
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
        console.log('[Gemini] ✅ API key cargada (para voz)');
        ai = new GoogleGenAI({ apiKey: API_KEY });
      } else {
        console.warn('[Gemini] ⚠️ No se encontró API key');
        ai = null;
      }
    } else {
      ai = null;
      console.error('[Gemini] Error al cargar API Key:', response.status);
    }
  } catch (error) {
    ai = null;
    console.error('[Gemini] Excepción al inicializar API Key:', error);
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

  // If using a local provider, bypass the backend and hit the local endpoint directly from the browser!
  // This satisfies the requirement to use the client PC's own LMLink/Ollama connection.
  if (aiProvider === 'LOCAL_OLLAMA' || aiProvider === 'LOCAL_LMLink') {
    try {
      console.log(`[AI] Interceptando llamada para IA Local: ${aiProvider} -> ${localEndpoint}`);
      
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      
      if (aiProvider === 'LOCAL_LMLink' && API_KEY) {
        headers['Authorization'] = `Bearer ${API_KEY}`;
      }

      let messages = [];
      if (systemInstruction) {
        messages.push({ role: 'system', content: systemInstruction });
      }
      messages.push({ role: 'user', content: prompt });

      const response = await fetch(`${localEndpoint.replace(/\/$/, '')}/v1/chat/completions`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: localModel,
          messages,
          temperature: 0.4
        })
      });

      if (!response.ok) {
        throw new Error(`Error en IA Local: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const content = data.choices[0].message.content;

      if (key) {
        updateTaskState(key, { status: 'COMPLETED', result: content, queuePosition: 0 });
      }

      return content;
    } catch (error: any) {
      console.error('[AI] Error ejecutando modelo local:', error);
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
          // Eliminar etiquetas de razonamiento que emiten modelos tipo gemma4/DeepSeek
          // antes de retornar la respuesta a cualquier función consumidora
          let resultText: string = currentTask.result || '';
          resultText = resultText.replace(/<(thought|think|thinking|reasoning)>[\s\S]*?<\/\1>/gi, '').trim();
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
  if (aiProvider === 'LOCAL_OLLAMA') {
    return true; // No need to initialize client-side Gemini SDK for Local AI
  }
  if (ai) {
    return true;
  }

  console.log('[Gemini] ⚠️ Cliente no inicializado, intentando reinicializar...');
  await initializeApiKey();

  if (aiProvider === 'LOCAL_OLLAMA' || ai) {
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

const formatUnitsForPrompt = (units: MilitaryUnit[]): string => {
  if (units.length === 0) return "Actualmente no se reportan unidades amigas.";
  return units.slice(0, 15).map(u => {
    const totalPersonnel = (u.personnelBreakdown?.officers || 0) + (u.personnelBreakdown?.ncos || 0) + (u.personnelBreakdown?.professionalSoldiers || 0) + (u.personnelBreakdown?.slRegulars || 0);
    const translatedType = translateUnitType(u.type);
    const translatedStatus = translateUnitStatus(u.status);
    return `- Unidad: ${escapeTemplateLiteralContent(u.name)} (${translatedType}), Cmdte: ${formatCommander(u.commander)}, Estado: ${translatedStatus}, Ubicación: ${decimalToDMS(u.location)}, Personal Total: ${totalPersonnel}, Últ. Movimiento: ${Math.floor((Date.now() - u.lastMovementTimestamp) / 60000)} mins atrás.`;
  }).join('\n');
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

  if (aiProvider === 'LOCAL_OLLAMA' || aiProvider === 'LOCAL_LMLink' || !ai) {
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

  const unitContext = formatUnitsForPrompt(units);
  const intelContext = formatIntelForPrompt(intelReports);

  let systemInstruction = `Eres un analista militar integrado al sistema SIMCOP. Se te proporciona información en tiempo real: estado de unidades, informes de inteligencia, contexto topográfico (alturas, relieve, escarpadura) y meteorología detallada (vientos, visibilidad, techo de nubes). Analiza de manera obligatoria y rigurosa cómo la topografía y el clima limitan o favorecen las operaciones tácticas descritas en la consulta del usuario (por ejemplo, restricciones de vuelo de UAVs por viento/nubes, oclusión de comunicaciones por el relieve montañoso, y riesgos físicos para las patrullas terrestres). Responde la consulta de forma completa, estructurada y con criterio militar profesional. Las coordenadas geográficas están en formato Grados Minutos Segundos (DMS). Si usas Google Search, cita las fuentes al final.`;

  if (enemyLayerActive && useGoogleSearch) {
    systemInstruction += `\n\nCapa de Amenaza Enemiga ACTIVA: Cuando la consulta involucre áreas de Colombia, complementa tu análisis con información histórica de incidentes de seguridad, tácticas enemigas reportadas y nivel de riesgo para la región. Cita todas las fuentes web utilizadas.`;
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

    geoPrompt = `
ÁREA DE OPERACIONES (AOI) ACTIVA:
- Centroide: ${geoContext.centroid.lat.toFixed(4)}, ${geoContext.centroid.lon.toFixed(4)} (DMS: ${geoContext.centroid.dms})
- Área: ${geoContext.areaKm2.toFixed(2)} km²
- Municipios/Regiones cubiertas: ${municipalitiesStr}
- Condición meteorológica: ${weatherStr}
${weatherHazards}
TOPOGRAFÍA DEL AOI:
- Elevación en centroide: ${geoContext.elevationMeters.toFixed(0)} msnm${geoContext.elevationMin !== undefined ? `
- Elevación mínima (punto más bajo): ${geoContext.elevationMin.toFixed(0)} msnm
- Elevación máxima (punto más alto): ${geoContext.elevationMax!.toFixed(0)} msnm
- Elevación promedio del área: ${geoContext.elevationAvg!.toFixed(0)} msnm
- Rango altitudinal (relieve): ${geoContext.elevationRange!.toFixed(0)} m${geoContext.terrainType ? `
- Clasificación del terreno: ${geoContext.terrainType}` : ''}` : ''}
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

// FIX: Implement and export generateCOAPlan, which was missing.
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

  const unitContext = formatUnitsForPrompt(units);
  const intelContext = formatIntelForPrompt(intelReports);
  
  const systemInstruction = `Eres un oficial de planeamiento experto. Tu tarea es generar un Curso de Acción (COA) militar en formato JSON basado en el objetivo, las unidades amigas disponibles y la inteligencia del enemigo. El COA debe ser lógico y seguir una estructura de fases. Responde ÚNICAMENTE con el objeto JSON.`;

  const prompt = `
REGLA DE ORO: DEBES centrar tu plan estrictamente en la unidad o intención descrita en el OBJETIVO. Es imperativo que la unidad mencionada en el objetivo sea la protagonista de tu respuesta.
El plan debe ser EXTENSAMENTE DETALLADO Y PROFUNDAMENTE TÁCTICO, analizando y aprovechando el terreno, la población civil y el clima reportados en el Entorno Operacional.

OBJETIVO DE LA OPERACIÓN:
${escapeTemplateLiteralContent(objective)}

FUERZAS AMIGAS DISPONIBLES:
${unitContext}

INTELIGENCIA DEL ENEMIGO:
${intelContext}

---
SOLICITUD:
Genera un plan de Curso de Acción (COA) en formato JSON. El plan debe tener un nombre, un concepto de la operación EXHAUSTIVO, y múltiples fases detalladas. Cada fase debe tener un nombre, una descripción MUY ESPECÍFICA (qué hace la unidad, por dónde se mueve, por qué lo hace según el terreno) y una lista de elementos gráficos (graphics) con tipo (PHASE_LINE, AXIS_OF_ADVANCE, OBJECTIVE, ASSEMBLY_AREA, BOUNDARY, CHECKPOINT), etiqueta, y una lista de coordenadas geográficas (locations).
IMPORTANTE PARA LOS GRÁFICOS: Eres un comandante táctico. Dibuja ejes de avance lógicos, áreas de reunión ocultas y límites sectoriales. Para lograr esto, PUEDES inventar o calcular nuevas coordenadas (sumando o restando pequeños valores como 0.01 a la latitud/longitud de las referencias) para crear líneas y polígonos alrededor de las fuerzas enemigas y amigas. ¡Genera un paquete de gráficos tácticos abundante y realista!
`;

  const responseSchema = {
    type: Type.OBJECT,
    properties: {
      planName: { type: Type.STRING, description: 'Nombre del plan de acción.' },
      conceptOfOperations: { type: Type.STRING, description: 'Concepto general de la operación.' },
      phases: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            phaseName: { type: Type.STRING },
            description: { type: Type.STRING },
            graphics: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  type: { type: Type.STRING, description: 'PHASE_LINE, AXIS_OF_ADVANCE, OBJECTIVE, ASSEMBLY_AREA' },
                  label: { type: Type.STRING },
                  locations: {
                    type: Array,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        lat: { type: Type.NUMBER },
                        lon: { type: Type.NUMBER }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  };

  if (aiProvider === 'NATIVE_SIMCOP') {
    try {
      updateTaskState('coaGeneration', { status: 'RUNNING', error: null, result: null });
      const data = await callNativeAI('/wargaming/generate_coa', {
        objetivo: objective,
        unidades_amigas: unitContext,
        inteligencia_enemiga: intelContext
      });
      const coaPlan = data as COAPlan;
      updateTaskState('coaGeneration', { status: 'COMPLETED', result: coaPlan });
      return coaPlan;
    } catch (error: any) {
      console.error("Error en generateCOAPlan Nativa:", error);
      updateTaskState('coaGeneration', { status: 'FAILED', error: error.message });
      throw error;
    }
  }

  if (aiProvider === 'LOCAL_OLLAMA' || aiProvider === 'LOCAL_LMLink' || !ai) {
    try {
      // Prompt simplificado: no se envía el schema serializado (reduce tokens y evita confusión del modelo)
      const localPrompt = `${systemInstruction}\n\n${prompt}\n\nIMPORTANTE: DEBES RESPONDER ÚNICAMENTE CON UN OBJETO JSON VÁLIDO. NO ESCRIBAS TEXTO CONVERSACIONAL NI SALUDOS. Si no usas formato JSON, el sistema fallará.\n\nEstructura exacta requerida:\n{
  "planName": "Nombre de la Operación",
  "conceptOfOperations": "Concepto táctico general...",
  "phases": [
    {
      "phaseName": "Fase 1: Ejemplo",
      "description": "Descripción detallada de la maniobra...",
      "graphics": [
        {
          "type": "PHASE_LINE",
          "label": "PL ALPHA",
          "locations": [{"lat": 0.0, "lon": 0.0}, {"lat": 0.1, "lon": 0.1}]
        },
        {
          "type": "OBJECTIVE",
          "label": "OBJ TIGER",
          "locations": [{"lat": 0.05, "lon": 0.05}]
        }
      ]
    }
  ]
}
(Asegúrate de incluir múltiples medidas tácticas de control en la sección 'graphics' de cada fase para que puedan ser graficadas en el mapa).`;

      const responseText = await generateContentViaBackend(localPrompt, 'coaGeneration');
      let jsonStr = responseText.trim();

      // Eliminar etiquetas de razonamiento interno (solo si están cerradas para no borrar JSON por error)
      jsonStr = jsonStr.replace(/<(?:thought|think|thinking|reasoning)[^>]*>[\s\S]*?<\/(?:thought|think|thinking|reasoning)>/gi, '').trim();

      // Extraer bloque JSON de markdown si viene con fences
      const fenceRegex = /```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/;
      const fenceMatch = jsonStr.match(fenceRegex);
      if (fenceMatch && fenceMatch[1]) {
        jsonStr = fenceMatch[1].trim();
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
        if (repaired.endsWith('"null')) repaired = repaired.replace(/"null$/, 'null'); // edge case
        
        // Cerrar estructuras en orden inverso
        while (stack.length > 0) {
            const char = stack.pop();
            repaired += char === '{' ? '}' : ']';
        }
        
        return repaired;
      };

      jsonStr = extractAndRepairJson(jsonStr);
      
      if (!jsonStr) {
        let snippet = responseText.trim().substring(0, 150);
        if (responseText.length > 150) snippet += "...";
        throw new Error(`La IA no generó un JSON válido. Respondió: "${snippet}". Verifique que el modelo entienda instrucciones de formato JSON.`);
      }
      
      const coaPlan = JSON.parse(jsonStr) as COAPlan;

      // Validar estructura mínima
      if (!coaPlan.planName || !Array.isArray(coaPlan.phases)) {
        throw new Error("El plan generado no tiene la estructura mínima requerida (planName y phases).");
      }

      updateTaskState('coaGeneration', { status: 'COMPLETED', result: coaPlan });
      return coaPlan;
    } catch (error: unknown) {
      console.error("Error generando COA con IA Local:", error);
      let errorMessage = "Fallo al generar el Curso de Acción con IA Local.";
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
        responseSchema,
      },
    });

    let jsonStr = response.text.trim();
    // Remove markdown fences if present
    const fenceRegex = /^```(\w*)?\s*\n?(.*?)\n?\s*```$/s;
    const match = jsonStr.match(fenceRegex);
    if (match && match[2]) {
      jsonStr = match[2].trim();
    }

    const coaPlan = JSON.parse(jsonStr) as COAPlan;
    
    // Validar estructura mínima
    if (!coaPlan.planName || !Array.isArray(coaPlan.phases)) {
      throw new Error("El plan generado no tiene la estructura mínima requerida (planName y phases).");
    }

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
    let cleanedJson = jsonStr.trim();
    const fenceRegex = /^```(\w*)?\s*\n?(.*?)\n?\s*```$/s;
    const match = cleanedJson.match(fenceRegex);
    if (match && match[2]) {
      cleanedJson = match[2].trim();
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
        fuerzas_amigas_enemigas: `Amigas:\n${formatUnitsForPrompt(units)}\n\nInteligencia Enemiga:\n${formatIntelForPrompt(intelReports)}`
      });
      const resultText = typeof data === 'string' ? data : (data.outcome || JSON.stringify(data));
      const result = { text: resultText };
      updateTaskState('coaSimulation', { status: 'COMPLETED', result });
      return result;
    } catch (error: any) {
      console.error("Error en simulateCOAOutcome Nativa:", error);
      updateTaskState('coaSimulation', { status: 'FAILED', error: error.message });
      throw error;
    }
  }

  const unitContext = formatUnitsForPrompt(units);
  const intelContext = formatIntelForPrompt(intelReports);

  const systemInstruction = `Eres un oficial de simulación y wargaming. Tu tarea es analizar un plan de Curso de Acción (COA) propuesto y simular su resultado más probable basándote en la doctrina militar, la superioridad de fuegos, el terreno y la inteligencia enemiga. Proporciona un análisis de riesgos, bajas estimadas y probabilidad de éxito.`;

  const prompt = `
PLAN DE CURSO DE ACCIÓN (COA):
Nombre: ${coaPlan.planName}
Concepto: ${coaPlan.conceptOfOperations}
Fases:
${coaPlan.phases.map((p, i) => `Fase ${i + 1}: ${p.phaseName}\n - Desc: ${p.description}`).join('\n')}

FUERZAS AMIGAS:
${unitContext}

INTELIGENCIA ENEMIGA:
${intelContext}

---
SOLICITUD:
Simula el desarrollo de este plan. ¿Qué resistencia se espera? ¿Cuáles son los puntos críticos de fallo? Proporciona una estimación de bajas y recursos necesarios.
`;

  try {
    const text = await generateContentViaBackend(`${systemInstruction}\n\n${prompt}`, 'coaSimulation');
    const result = { text };
    updateTaskState('coaSimulation', { status: 'COMPLETED', result });
    return result;
  } catch (error: unknown) {
    console.error("Error en simulateCOAOutcome:", error);
    let errorMessage = "Fallo al simular el resultado del COA.";
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    updateTaskState('coaSimulation', { status: 'FAILED', error: errorMessage });
    throw new Error(errorMessage);
  }
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

  if (aiProvider === 'NATIVE_SIMCOP') {
    try {
      updateTaskState('bmaInterception', { status: 'RUNNING', error: null, result: null });
      const data = await callNativeAI('/wargaming/simulate_bma', {
        defensora: JSON.stringify(unit),
        amenaza: JSON.stringify(threat),
        clima: weather ? JSON.stringify(weather) : "Sin reporte"
      });
      const resultText = typeof data === 'string' ? data : (data.simulation || JSON.stringify(data));
      const result = { text: resultText };
      updateTaskState('bmaInterception', { status: 'COMPLETED', result });
      return result;
    } catch (error: any) {
      console.error("Error en simulateBMAInterception Nativa:", error);
      updateTaskState('bmaInterception', { status: 'FAILED', error: error.message });
      throw error;
    }
  }

  const systemInstruction = `Eres un oficial de control de daños y simulación táctica. Tu tarea es simular el resultado de una intercepción entre una unidad amiga y una amenaza de inteligencia. Considera el tipo de unidad vs tipo de amenaza, el clima actual y la doctrina militar. Proporciona: 
1. Probabilidad de éxito (%).
2. Nivel de riesgo estimado.
3. Posibles bajas o daños esperados.
4. Una recomendación táctica final breve.
Responde de forma profesional y concisa.`;

  const prompt = `
SIMULACIÓN DE INTERCEPCIÓN:
- Unidad Amiga: ${unit.name} (${translateUnitType(unit.type)}, Estado: ${translateUnitStatus(unit.status)}, Munición: ${unit.ammoLevel}%)
- Amenaza Enemiga: ${threat.title} (${threat.type}, Riesgo: ${threat.reliability}/${threat.credibility})
- Clima en Zona: ${weather ? `${weather.condition}, Temp: ${weather.temperature}°C, Impacto Operacional: ${weather.operationalImpact}` : 'Normal'}

Simula el encuentro y proporciona el reporte de resultados.
`;

  try {
    const text = await generateContentViaBackend(`${systemInstruction}\n\n${prompt}`, 'bmaInterception');
    const result = { text };
    updateTaskState('bmaInterception', { status: 'COMPLETED', result });
    return result;
  } catch (error: any) {
    console.error("Error en simulateBMAInterception:", error);
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

  const systemInstruction = `Eres SIMCOP BMA-AI, un asistente de análisis de batalla. Tu tarea es generar un "Resumen Ejecutivo de Situación" para un comandante regional. El resumen debe ser extremadamente conciso (máximo 150 palabras), directo y con tono militar profesional. Utiliza viñetas para los puntos clave. Enfócate en la amenaza seleccionada, el impacto del clima y los riesgos logísticos o de hotspots detectados.`;

  const prompt = `
SITUACIÓN ACTUAL BMA:
- Amenaza Seleccionada: ${threat ? `${threat.title} (${threat.type})` : 'Ninguna'}
- Recomendación de Respuesta: ${recommendations.length > 0 ? `${recommendations[0].unitName} (${Math.round(recommendations[0].score)}% idoneidad)` : 'N/A'}
- Clima Regional: ${weather ? `${weather.condition}, Temp: ${Math.round(weather.temperature)}°C, Impacto: ${weather.operationalImpact ? 'ALTO' : 'BAJO'}` : 'Desconocido'}
- Hotspots (POL): ${hotspots.length} detectados.
- Unidades con Riesgo Logístico: ${logistics.length}

Genera el Resumen Ejecutivo de Situación.
Genera el Resumen Ejecutivo de Situación.
`;

  if (aiProvider === 'NATIVE_SIMCOP') {
    try {
      updateTaskState('bmaBrief', { status: 'RUNNING', error: null });
      const data = await callNativeAI('/wargaming/bma_brief', {
        threat: threat ? threat.title : 'Ninguna',
        recommendation: recommendations.length > 0 ? recommendations[0].unitName : 'N/A',
        weather: weather ? weather.condition : 'Desconocido',
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

  try {
    const text = await generateContentViaBackend(`${systemInstruction}\n\n${prompt}`, 'bmaBrief');
    updateTaskState('bmaBrief', { status: 'COMPLETED', result: text });
    return text;
  } catch (error: any) {
    console.error("Error en getBMASituationBrief:", error);
    const errorMessage = error.message || "Error al generar el resumen de situación.";
    updateTaskState('bmaBrief', { status: 'FAILED', error: errorMessage });
    return errorMessage;
  }
};
