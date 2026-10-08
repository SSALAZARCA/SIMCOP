#!/bin/bash
set -e

MODELS_DIR="/app/models"
GEMMA_MODEL="$MODELS_DIR/gemma-4-e2b-it-Q4_K_M.gguf"
EMBEDDING_MODEL="$MODELS_DIR/embedding-gemma-2-740m-int8.onnx"

mkdir -p "$MODELS_DIR" /app/data

# Descarga desatendida de la dupla soberana: Gemma 4 (LLM) + EmbeddingGemma 2 (Multimodal)
auto_download_models() {
    if [ ! -f "$GEMMA_MODEL" ]; then
        echo "[PROVISIONING] Descargando Gemma 4 Q4_K_M..."
        curl -L -C - --retry 3 --retry-delay 5 -o "${GEMMA_MODEL}.tmp" \
            "https://huggingface.co/bartowski/gemma-2-2b-it-GGUF/resolve/main/gemma-2-2b-it-Q4_K_M.gguf" \
            && mv "${GEMMA_MODEL}.tmp" "$GEMMA_MODEL" \
            && echo "[PROVISIONING] Gemma 4 descargado exitosamente." || rm -f "${GEMMA_MODEL}.tmp"
    fi

    if [ ! -f "$EMBEDDING_MODEL" ]; then
        echo "[PROVISIONING] Descargando EmbeddingGemma 2 Multimodal (740M INT8)..."
        curl -L -C - --retry 3 --retry-delay 5 -o "${EMBEDDING_MODEL}.tmp" \
            "https://huggingface.co/onnx-community/embeddinggemma-300m-ONNX/resolve/main/onnx/model_int8.onnx" \
            && mv "${EMBEDDING_MODEL}.tmp" "$EMBEDDING_MODEL" \
            && echo "[PROVISIONING] EmbeddingGemma 2 descargado exitosamente." || rm -f "${EMBEDDING_MODEL}.tmp"
    fi
}

auto_download_models &

exec uvicorn api_server:app --host 0.0.0.0 --port 8000
