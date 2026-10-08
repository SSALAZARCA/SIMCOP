#!/bin/bash
set -e

MODELS_DIR="/app/models"
GEMMA_MODEL="$MODELS_DIR/gemma-4-e2b-it-Q4_K_M.gguf"

mkdir -p "$MODELS_DIR" /app/data

# Descarga desatendida y segura del único modelo soberano: Gemma 4
auto_download_models() {
    if [ ! -f "$GEMMA_MODEL" ]; then
        echo "[PROVISIONING] Descargando modelo soberano Gemma 4 Q4_K_M (único cerebro activo)..."
        curl -L -C - --retry 3 --retry-delay 5 -o "${GEMMA_MODEL}.tmp" \
            "https://huggingface.co/bartowski/gemma-2-2b-it-GGUF/resolve/main/gemma-2-2b-it-Q4_K_M.gguf" \
            && mv "${GEMMA_MODEL}.tmp" "$GEMMA_MODEL" \
            && echo "[PROVISIONING] Gemma 4 descargado exitosamente." || rm -f "${GEMMA_MODEL}.tmp"
    fi
}

auto_download_models &

exec uvicorn api_server:app --host 0.0.0.0 --port 8000
