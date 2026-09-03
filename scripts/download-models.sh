#!/usr/bin/env bash
# =============================================================================
# SIMCOP AI — Script de Descarga de Modelos Soberanos (Fase 3)
# Ejecutar UNA VEZ antes del primer despliegue en el servidor VPS.
# =============================================================================

set -euo pipefail

MODELS_DIR="$(dirname "$0")/../models"
mkdir -p "$MODELS_DIR"

echo ""
echo "========================================================"
echo "  SIMCOP — Descarga de Modelos IA Soberanos (Fase 3)"
echo "========================================================"
echo ""

# ── MODELO DE LENGUAJE (LLM) — Qwen2.5-3B-Instruct Q4_K_M GGUF ────────────
# Optimizado para VPS KVM 4 vCPU / 8 GB RAM (sin GPU)
# Tamaño: ~2.1 GB | RAM requerida en ejecución: ~2.5 GB
# Tokens/segundo estimado en VPS KVM 4 vCPU: 3–8 t/s

LLM_FILE="$MODELS_DIR/Qwen2.5-3B-Instruct-Q4_K_M.gguf"
LLM_URL="https://huggingface.co/Qwen/Qwen2.5-3B-Instruct-GGUF/resolve/main/qwen2.5-3b-instruct-q4_k_m.gguf"

if [ -f "$LLM_FILE" ]; then
    echo "[SKIP] Modelo LLM ya existe: $LLM_FILE"
else
    echo "[DESCARGANDO] Qwen2.5-3B-Instruct Q4_K_M GGUF (~2.1 GB)..."
    curl -L --progress-bar -o "$LLM_FILE" "$LLM_URL"
    echo "[OK] Modelo LLM descargado: $LLM_FILE"
fi

echo ""
echo "Alternativas para el LLM (editar este script para cambiar):"
echo "  - Llama-3.2-3B-Instruct-Q4_K_M.gguf  (~2.0 GB)"
echo "    URL: https://huggingface.co/bartowski/Llama-3.2-3B-Instruct-GGUF/resolve/main/Llama-3.2-3B-Instruct-Q4_K_M.gguf"
echo "  - Phi-4-mini-instruct-Q4_K_M.gguf     (~2.5 GB, mejor razonamiento)"
echo "    URL: https://huggingface.co/microsoft/Phi-4-mini-instruct-GGUF/resolve/main/Phi-4-mini-instruct-Q4_K_M.gguf"
echo ""

# ── MODELO DE VOZ STT OFFLINE — Vosk (español, ~40 MB) ────────────────────
# Motor de reconocimiento de voz offline para comandos tácticos
# Activado como fallback cuando Gemini Live API no está disponible.

VOSK_DIR="$MODELS_DIR/vosk-model-small-es"
VOSK_URL="https://alphacephei.com/vosk/models/vosk-model-small-es-0.42.zip"
VOSK_ZIP="/tmp/vosk-model-small-es.zip"

if [ -d "$VOSK_DIR" ]; then
    echo "[SKIP] Modelo Vosk STT ya existe: $VOSK_DIR"
else
    echo "[DESCARGANDO] Vosk STT español (~40 MB)..."
    curl -L --progress-bar -o "$VOSK_ZIP" "$VOSK_URL"
    echo "[EXTRAYENDO] $VOSK_ZIP → $MODELS_DIR/"
    unzip -q "$VOSK_ZIP" -d "$MODELS_DIR/"
    mv "$MODELS_DIR/vosk-model-small-es-0.42" "$VOSK_DIR" 2>/dev/null || true
    rm -f "$VOSK_ZIP"
    echo "[OK] Modelo Vosk STT descargado y extraído: $VOSK_DIR"
fi

# ── CONFIGURAR VARIABLES DE ENTORNO ─────────────────────────────────────────
echo ""
echo "========================================================"
echo "  Configuración recomendada para el servidor VPS KVM 4"
echo "========================================================"
echo ""
echo "Añadir al archivo .env o a las variables de entorno Docker:"
echo ""
echo "  # Backend LLM (llama.cpp)"
echo "  SIMCOP_MODEL_PATH=models/Qwen2.5-3B-Instruct-Q4_K_M.gguf"
echo "  SIMCOP_MODEL_BACKEND=auto"
echo "  SIMCOP_MODEL_CTX=2048"
echo "  SIMCOP_MODEL_THREADS=4"
echo ""
echo "  # Instalar dependencia Python del backend GGUF:"
echo "  pip install llama-cpp-python==0.3.4"
echo ""
echo "========================================================"
echo "  Descarga completada. El servidor IA está listo."
echo "========================================================"
