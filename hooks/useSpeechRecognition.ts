/**
 * SIMCOP — Hook de Reconocimiento de Voz con Failover de 3 Niveles (Fase 3)
 *
 * Nivel 1: Gemini Live API (cloud, máxima calidad)
 * Nivel 2: Web Speech API nativa del navegador (offline, comandos básicos)
 * Nivel 3: Fallback a texto (sin STT disponible, indicador visual al usuario)
 *
 * El hook detecta automáticamente la disponibilidad de cada nivel y
 * conmuta de forma transparente. El componente recibe el modo activo
 * para mostrar un indicador en la UI.
 */

import { useState, useEffect, useRef, useCallback } from 'react';

export type SpeechMode = 'gemini_live' | 'web_speech' | 'unavailable';

export interface SpeechRecognitionState {
  isListening: boolean;
  transcript: string;
  mode: SpeechMode;
  modeLabel: string;
  error: string | null;
}

export interface UseSpeechRecognitionOptions {
  /** Llamado cuando se obtiene un resultado final de voz */
  onResult: (text: string, mode: SpeechMode) => void;
  /** Idioma de reconocimiento (default: 'es-CO') */
  lang?: string;
  /** Si es true, intenta usar Web Speech API en lugar de Gemini Live */
  preferOffline?: boolean;
}

const MODE_LABELS: Record<SpeechMode, string> = {
  gemini_live: '☁️ Gemini Live',
  web_speech:  '🌐 Navegador',
  unavailable: '🔇 Sin STT',
};

/**
 * Detecta si la Web Speech API está disponible en el navegador actual.
 */
function detectWebSpeechSupport(): boolean {
  return typeof window !== 'undefined' &&
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);
}

/**
 * Hook principal de STT con failover automático.
 * Nivel 1: Gemini Live (gestionado externamente — el caller pasa isGeminiAvailable)
 * Nivel 2: Web Speech API nativa del navegador
 * Nivel 3: unavailable (el llamador muestra entrada manual de texto)
 */
export function useSpeechRecognition({
  onResult,
  lang = 'es-CO',
  preferOffline = false,
}: UseSpeechRecognitionOptions) {
  const [state, setState] = useState<SpeechRecognitionState>({
    isListening: false,
    transcript: '',
    mode: 'unavailable',
    modeLabel: MODE_LABELS.unavailable,
    error: null,
  });

  const recognitionRef = useRef<any>(null);
  const webSpeechSupported = detectWebSpeechSupport();

  /** Determina el mejor modo disponible */
  const detectBestMode = useCallback((geminiAvailable: boolean): SpeechMode => {
    if (!preferOffline && geminiAvailable) return 'gemini_live';
    if (webSpeechSupported) return 'web_speech';
    return 'unavailable';
  }, [preferOffline, webSpeechSupported]);

  /** Inicia el reconocimiento con Web Speech API nativa */
  const startWebSpeech = useCallback(() => {
    if (!webSpeechSupported) {
      setState(s => ({ ...s, error: 'Web Speech API no disponible en este navegador.', mode: 'unavailable', modeLabel: MODE_LABELS.unavailable }));
      return;
    }

    const SpeechRecognitionCtor = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognitionCtor();
    recognitionRef.current = recognition;

    recognition.lang = lang;
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setState(s => ({
        ...s,
        isListening: true,
        mode: 'web_speech',
        modeLabel: MODE_LABELS.web_speech,
        error: null,
      }));
    };

    recognition.onresult = (event: any) => {
      let interimTranscript = '';
      let finalTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscript += result[0].transcript;
        } else {
          interimTranscript += result[0].transcript;
        }
      }
      const currentTranscript = finalTranscript || interimTranscript;
      setState(s => ({ ...s, transcript: currentTranscript }));
      if (finalTranscript) {
        onResult(finalTranscript.trim(), 'web_speech');
      }
    };

    recognition.onerror = (event: any) => {
      const errMsg = `Error STT (Web Speech): ${event.error}`;
      console.warn(errMsg);
      setState(s => ({
        ...s,
        isListening: false,
        error: errMsg,
      }));
    };

    recognition.onend = () => {
      setState(s => ({ ...s, isListening: false }));
      recognitionRef.current = null;
    };

    recognition.start();
  }, [lang, onResult, webSpeechSupported]);

  /** Detiene el reconocimiento activo */
  const stop = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setState(s => ({ ...s, isListening: false, transcript: '' }));
  }, []);

  /**
   * Punto de entrada principal.
   * geminiAvailable: true si el caller tiene una sesión Gemini Live lista.
   * Si gemini_live es el modo elegido, el caller maneja el audio — este hook
   * solo actualiza el estado visible. Para web_speech, el hook lo gestiona completo.
   */
  const start = useCallback((geminiAvailable: boolean = false) => {
    const bestMode = detectBestMode(geminiAvailable);

    if (bestMode === 'gemini_live') {
      // El caller (App.tsx) gestiona la sesión Gemini Live directamente.
      // Solo actualizamos el estado visual del modo.
      setState(s => ({
        ...s,
        mode: 'gemini_live',
        modeLabel: MODE_LABELS.gemini_live,
        error: null,
      }));
      return;
    }

    if (bestMode === 'web_speech') {
      startWebSpeech();
      return;
    }

    // unavailable
    setState(s => ({
      ...s,
      mode: 'unavailable',
      modeLabel: MODE_LABELS.unavailable,
      error: 'No hay motor STT disponible. Active el micrófono y recargue la página.',
    }));
  }, [detectBestMode, startWebSpeech]);

  // Limpieza al desmontar
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  return {
    ...state,
    modeLabel: MODE_LABELS[state.mode],
    start,
    stop,
    webSpeechSupported,
  };
}
