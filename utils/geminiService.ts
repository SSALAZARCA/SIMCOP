import { GoogleGenAI, GenerateContentResponse, FunctionDeclaration, Type, Blob as GenaiBlob } from "@google/genai";
import type { MilitaryUnit, IntelligenceReport, GeminiAnalysisResult, GroundingSource, AfterActionReport, Q5ContentPayload, CommanderInfo, Alert, COAPlan, PredictedLogisticsNeed, WeatherInfo } from '../types';
import { decimalToDMS } from './coordinateUtils';

// Get API key from backend API
let API_KEY: string | undefined = undefined;
let ai: GoogleGenAI | null = null;

// Initialize API key from backend
export const initializeApiKey = async (): Promise<void> => {
  try {
    const host = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
    const response = await fetch(`http://${host}:8080/api/config/gemini-api-key`, {
      method: 'GET',
      credentials: 'omit',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (response.ok) {
      const data = await response.json();
      API_KEY = data.apiKey;
      if (API_KEY) {
        console.log('[Gemini] ✅ API key cargada desde backend');
        console.log('[Gemini] 🔑 API key:', API_KEY.substring(0, 10) + '...');
        ai = new GoogleGenAI({ apiKey: API_KEY });
        console.log('[Gemini] ✅ Cliente GoogleGenAI inicializado');
      } else {
        console.warn('[Gemini] ⚠️ No se encontró API key en la respuesta del backend');
        ai = null;
      }
    } else if (response.status === 404) {
      console.warn('[Gemini] ⚠️ No hay API key configurada en el backend (404)');
      ai = null;
    } else if (response.status === 403) {
      // 403 Forbidden - usuario no autenticado aún, no mostrar error
      ai = null;
    } else {
      console.error('[Gemini] ❌ Error al obtener API key del backend. Status:', response.status);
      ai = null;
    }
  } catch (error) {
    console.error('[Gemini] ❌ Error al conectar con el backend:', error);
    ai = null;
  }
};

// Initialize on module load
// initializeApiKey(); // Auto-initialization removed to prevent redundant calls

/**
 * Ensures the AI client is initialized, attempting to reinitialize if needed
 */
const ensureInitialized = async (): Promise<boolean> => {
  if (ai) {
    return true;
  }

  console.log('[Gemini] ⚠️ Cliente no inicializado, intentando reinicializar...');
  await initializeApiKey();

  if (ai) {
    console.log('[Gemini] ✅ Reinicialización exitosa');
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

const formatUnitsForPrompt = (units: MilitaryUnit[]): string => {
  if (units.length === 0) return "Actualmente no se reportan unidades amigas.";
  return units.slice(0, 15).map(u => {
    const totalPersonnel = (u.personnelBreakdown?.officers || 0) + (u.personnelBreakdown?.ncos || 0) + (u.personnelBreakdown?.professionalSoldiers || 0) + (u.personnelBreakdown?.slRegulars || 0);
    return `- Unidad: ${escapeTemplateLiteralContent(u.name)} (${escapeTemplateLiteralContent(u.type)}), Cmdte: ${formatCommander(u.commander)}, Estado: ${escapeTemplateLiteralContent(u.status)}, Ubicación: ${decimalToDMS(u.location)}, Personal Total: ${totalPersonnel}, Últ. Movimiento: ${Math.floor((Date.now() - u.lastMovementTimestamp) / 60000)} mins atrás.`;
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

// FIX: Implement and export getCommandFromGemini, which was missing.
export const getCommandFromGemini = async (command: string, unitNames: string[]): Promise<{ name: string, args: any } | null> => {
  if (!ai) {
    throw new Error("Gemini AI client no inicializado. Verifique la configuración de API_KEY.");
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
      model: 'gemini-2.5-flash',
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

// FIX: Implement and export getProactiveAnalysis, which was missing.
export const getProactiveAnalysis = async (
  units: MilitaryUnit[],
  alerts: Alert[],
  intelligenceReports: IntelligenceReport[]
): Promise<GeminiAnalysisResult> => {
  if (!ai) {
    return Promise.reject(new Error("Gemini AI client no inicializado."));
  }

  const unitContext = formatUnitsForPrompt(units);
  const intelContext = formatIntelForPrompt(intelligenceReports);
  const alertContext = formatAlertsForPrompt(alerts);

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
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: fullPrompt,
      config: {
        systemInstruction,
        thinkingConfig: { thinkingBudget: 0 },
      },
    });

    return { text: response.text };
  } catch (error: unknown) {
    console.error("Error en getProactiveAnalysis:", error);
    let errorMessage = "Fallo al obtener análisis proactivo.";
    if (error instanceof Error) {
      errorMessage += ` Detalles: ${error.message}`;
    }
    throw new Error(errorMessage);
  }
};

export const getGeminiAnalysis = async (
  query: string,
  units: MilitaryUnit[],
  intelReports: IntelligenceReport[],
  useGoogleSearch: boolean,
  enemyLayerActive: boolean
): Promise<GeminiAnalysisResult> => {
  // Ensure AI client is initialized
  const isInitialized = await ensureInitialized();
  if (!isInitialized || !ai) {
    throw new Error("Gemini AI client no inicializado. Por favor, configure la API key en Configuración.");
  }

  const unitContext = formatUnitsForPrompt(units);
  const intelContext = formatIntelForPrompt(intelReports);

  let systemInstruction = `Eres SIMCOP AI, un asistente avanzado de análisis operacional militar. Tu misión es proveer análisis claros, concisos y tácticamente relevantes basados en el estado de unidades amigas, informes de inteligencia proporcionados, y la consulta específica del usuario. Enfócate en identificar amenazas, oportunidades y proveer perspectivas accionables. Si se utiliza Google Search para aumentar tu conocimiento, cita tus fuentes web claramente listando sus títulos y URIs después de tu análisis principal bajo el encabezado "Fuentes Recuperadas:". Las coordenadas geográficas se proporcionan en formato Grados Minutos Segundos (DMS).`;

  if (enemyLayerActive && useGoogleSearch) {
    systemInstruction += `\n\nCRÍTICO - Capa de Amenaza Enemiga y Riesgo Histórico ACTIVA: Si la consulta del usuario se refiere a un área geográfica específica dentro de Colombia, DEBES usar Google Search para investigar y resumir:
1.  Incidentes históricos de seguridad significativos en esa municipalidad/departamento colombiano (últimos 5-10 años).
2.  Tácticas enemigas comunes reportadas para esa región.
3.  Nivel de riesgo general percibido para esa área específica.
Esta información es VITAL para el análisis. Sea específico y CITE TODAS LAS FUENTES web utilizadas.`;
  }

  const fullPrompt = `
Actualización de Datos Operacionales:
Disposiciones Actuales de Unidades Amigas:
${unitContext}

Panorama Actual de Inteligencia:
${intelContext}

---
Consulta del Usuario:
"${escapeTemplateLiteralContent(query)}"
---

Solicitud de Análisis AI: Proporcione su evaluación y perspectivas. Si la capa de Amenaza Enemiga está activa y la consulta implica un área en Colombia, incluya el análisis histórico/de riesgo solicitado en las instrucciones del sistema.`;

  const model = 'gemini-2.5-flash';

  const genAIConfig: {
    systemInstruction: string;
    tools?: any[];
    thinkingConfig?: { thinkingBudget: number };
    responseMimeType?: string;
  } = { systemInstruction };

  if (useGoogleSearch) {
    genAIConfig.tools = [{ googleSearch: {} }];
  } else {
    if (model === 'gemini-2.5-flash') {
      genAIConfig.thinkingConfig = { thinkingBudget: 0 };
    }
  }

  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model,
      contents: fullPrompt,
      config: genAIConfig,
    });

    const analysisText = response.text;
    let sources: GroundingSource[] | undefined;

    if (useGoogleSearch && response.candidates?.[0]?.groundingMetadata?.groundingChunks) {
      sources = response.candidates[0].groundingMetadata.groundingChunks
        .filter(chunk => chunk.web && chunk.web.uri)
        .map(chunk => ({
          uri: chunk.web!.uri!,
          title: chunk.web!.title || chunk.web!.uri!
        }));
    }

    return { text: analysisText, sources };

  } catch (error: unknown) {
    console.error("Error llamando a la API Gemini:", error);
    let errorMessage = "Fallo al obtener análisis de Gemini.";
    if (error instanceof Error) {
      if (error.message.includes("API key not valid") || error.message.includes("API_KEY_INVALID")) {
        errorMessage = "Solicitud API Gemini falló: La clave API es inválida o faltante. Por favor, asegúrese que el entorno del servidor esté configurado correctamente.";
      } else if (error.message.includes("permission")) {
        errorMessage = "Solicitud API Gemini falló: Permiso denegado. Verifique los permisos de la clave API.";
      } else {
        errorMessage += ` Detalles: ${error.message}`;
      }
    }
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
  if (!isInitialized || !ai) {
    throw new Error("Gemini AI client no inicializado. Por favor, configure la API key en Configuración.");
  }

  const unitContext = formatUnitsForPrompt(units);
  const intelContext = formatIntelForPrompt(intelReports);

  const systemInstruction = `Eres un oficial de planeamiento experto. Tu tarea es generar un Curso de Acción (COA) militar en formato JSON basado en el objetivo, las unidades amigas disponibles y la inteligencia del enemigo. El COA debe ser lógico y seguir una estructura de fases. Responde ÚNICAMENTE con el objeto JSON.`;

  const prompt = `
OBJETIVO DE LA OPERACIÓN:
${escapeTemplateLiteralContent(objective)}

FUERZAS AMIGAS DISPONIBLES:
${unitContext}

INTELIGENCIA DEL ENEMIGO:
${intelContext}

---
SOLICITUD:
Genera un plan de Curso de Acción (COA) en formato JSON. El plan debe tener un nombre, un concepto de la operación, y al menos dos fases. Cada fase debe tener un nombre, una descripción y una lista de elementos gráficos (graphics) con tipo (PHASE_LINE, AXIS_OF_ADVANCE, OBJECTIVE, ASSEMBLY_AREA), etiqueta, y una lista de 1 a 2 coordenadas geográficas aproximadas (locations) basadas en las ubicaciones de unidades/intel.
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
                    type: Type.ARRAY,
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

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
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
    return coaPlan;
  } catch (error: unknown) {
    console.error("Error generando COA con Gemini:", error);
    let errorMessage = "Fallo al generar el Curso de Acción.";
    if (error instanceof Error) {
      errorMessage += ` Detalles: ${error.message}`;
    }
    throw new Error(errorMessage);
  }
};


export const generateQ5ReportContentFromAAR = async (aar: AfterActionReport): Promise<Q5ContentPayload> => {
  if (!ai) {
    return Promise.resolve({ // Return a structured error if AI client isn't available
      que: `Error: Gemini AI client no inicializado. No se puede generar Q5.`,
      quien: "Error",
      cuando: "Error",
      donde: "Error",
      hechos: "Error: Cliente AI no disponible.",
      accionesSubsiguientes: "Error"
    });
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
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        thinkingConfig: { thinkingBudget: 0 }
      },
    });

    let jsonStr = response.text.trim();
    const fenceRegex = /^```(\w*)?\s*\n?(.*?)\n?\s*```$/s;
    const match = jsonStr.match(fenceRegex);
    if (match && match[2]) {
      jsonStr = match[2].trim();
    }

    const parsedData = JSON.parse(jsonStr) as Q5ContentPayload;
    return parsedData;

  } catch (error) {
    console.error("Error generando contenido Q5 con Gemini:", error);
    let errorMessage = "Fallo al generar contenido Q5 desde AAR.";
    if (error instanceof Error) {
      errorMessage += ` Detalles: ${error.message}`;
    }
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
  if (!ai) {
    throw new Error("Gemini AI client no inicializado.");
  }

  const systemInstruction = `Eres un asistente experto en la doctrina militar del Ejército Nacional de Colombia (EJC). Tu propósito es responder preguntas y proporcionar resúmenes basados en los manuales de doctrina, regulaciones y tácticas del EJC. Basa tus respuestas en la información disponible y utiliza Google Search para encontrar documentos y referencias doctrinales relevantes. Si usas fuentes externas, cítalas.`;

  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: query,
      config: {
        systemInstruction,
        tools: [{ googleSearch: {} }],
      },
    });

    const analysisText = response.text;
    let sources: GroundingSource[] | undefined;

    if (response.candidates?.[0]?.groundingMetadata?.groundingChunks) {
      sources = response.candidates[0].groundingMetadata.groundingChunks
        .filter(chunk => chunk.web && chunk.web.uri)
        .map(chunk => ({
          uri: chunk.web!.uri!,
          title: chunk.web!.title || chunk.web!.uri!
        }));
    }

    return { text: analysisText, sources };
  } catch (error: unknown) {
    console.error("Error llamando a Gemini para asistente doctrinal:", error);
    let errorMessage = "Fallo al obtener respuesta doctrinal.";
    if (error instanceof Error) {
      errorMessage += ` Detalles: ${error.message}`;
    }
    throw new Error(errorMessage);
  }
};

const formatUnitsForLogisticsPrompt = (units: MilitaryUnit[]): string => {
  if (units.length === 0) return "No hay unidades para analizar.";
  return units.map(u => {
    return `- Unidad: ${escapeTemplateLiteralContent(u.name)} (ID: ${u.id}), Estado: ${escapeTemplateLiteralContent(u.status)}, Munición: ${u.ammoLevel}%, Combustible: ${u.fuelLevel ?? 'N/A'}%, Suministros: ${u.daysOfSupply} días.`;
  }).join('\n');
};

// FIX: Implement and export getPredictiveLogisticsAnalysis, which was missing.
export const getPredictiveLogisticsAnalysis = async (units: MilitaryUnit[]): Promise<PredictedLogisticsNeed[]> => {
  if (!ai) {
    throw new Error("Gemini AI client no inicializado.");
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
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema,
      },
    });

    let jsonStr = response.text.trim();
    const fenceRegex = /^```(\w*)?\s*\n?(.*?)\n?\s*```$/s;
    const match = jsonStr.match(fenceRegex);
    if (match && match[2]) {
      jsonStr = match[2].trim();
    }

    const predictions = JSON.parse(jsonStr) as PredictedLogisticsNeed[];
    return predictions;

  } catch (error: unknown) {
    console.error("Error en getPredictiveLogisticsAnalysis:", error);
    let errorMessage = "Fallo al obtener análisis predictivo de logística.";
    if (error instanceof Error) {
      errorMessage += ` Detalles: ${error.message}`;
    }
    throw new Error(errorMessage);
  }
};

export const simulateCOAOutcome = async (
  coaPlan: COAPlan,
  units: MilitaryUnit[],
  intelReports: IntelligenceReport[]
): Promise<GeminiAnalysisResult> => {
  if (!ai) {
    throw new Error("Gemini AI client no inicializado.");
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
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        systemInstruction,
        thinkingConfig: { thinkingBudget: 0 },
      },
    });

    return { text: response.text };
  } catch (error: unknown) {
    console.error("Error en simulateCOAOutcome:", error);
    throw new Error("Fallo al simular el resultado del COA.");
  }
};

export const simulateBMAInterception = async (
  unit: MilitaryUnit,
  threat: IntelligenceReport,
  weather: WeatherInfo | null
): Promise<GeminiAnalysisResult> => {
  if (!ai) throw new Error("Gemini AI client no inicializado.");

  const systemInstruction = `Eres un oficial de control de daños y simulación táctica. Tu tarea es simular el resultado de una intercepción entre una unidad amiga y una amenaza de inteligencia. Considera el tipo de unidad vs tipo de amenaza, el clima actual y la doctrina militar. Proporciona: 
1. Probabilidad de éxito (%).
2. Nivel de riesgo estimado.
3. Posibles bajas o daños esperados.
4. Una recomendación táctica final breve.
Responde de forma profesional y concisa.`;

  const prompt = `
SIMULACIÓN DE INTERCEPCIÓN:
- Unidad Amiga: ${unit.name} (${unit.type}, Estado: ${unit.status}, Munición: ${unit.ammoLevel}%)
- Amenaza Enemiga: ${threat.title} (${threat.type}, Riesgo: ${threat.reliability}/${threat.credibility})
- Clima en Zona: ${weather ? `${weather.condition}, Temp: ${weather.temperature}°C, Impacto Operacional: ${weather.operationalImpact}` : 'Normal'}

Simula el encuentro y proporciona el reporte de resultados.
`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: { systemInstruction },
    });
    return { text: response.text };
  } catch (error) {
    console.error("Error en simulateBMAInterception:", error);
    throw new Error("Fallo la simulación de intercepción.");
  }
};

export const getBMASituationBrief = async (
  threat: IntelligenceReport | null,
  recommendations: any[],
  weather: any | null,
  hotspots: any[],
  logistics: any[]
): Promise<string> => {
  if (!ai) return "Análisis de IA no disponible.";

  const systemInstruction = `Eres SIMCOP BMA-AI, un asistente de análisis de batalla. Tu tarea es generar un "Resumen Ejecutivo de Situación" para un comandante regional. El resumen debe ser extremadamente conciso (máximo 150 palabras), directo y con tono militar profesional. Utiliza viñetas para los puntos clave. Enfócate en la amenaza seleccionada, el impacto del clima y los riesgos logísticos o de hotspots detectados.`;

  const prompt = `
SITUACIÓN ACTUAL BMA:
- Amenaza Seleccionada: ${threat ? `${threat.title} (${threat.type})` : 'Ninguna'}
- Recomendación de Respuesta: ${recommendations.length > 0 ? `${recommendations[0].unitName} (${Math.round(recommendations[0].score)}% idoneidad)` : 'N/A'}
- Clima Regional: ${weather ? `${weather.condition}, Temp: ${Math.round(weather.temperature)}°C, Impacto: ${weather.operationalImpact ? 'ALTO' : 'BAJO'}` : 'Desconocido'}
- Hotspots (POL): ${hotspots.length} detectados.
- Unidades con Riesgo Logístico: ${logistics.length}

Genera el Resumen Ejecutivo de Situación.
`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: { systemInstruction },
    });
    return response.text;
  } catch (error) {
    console.error("Error en getBMASituationBrief:", error);
    return "Error al generar el resumen de situación.";
  }
};