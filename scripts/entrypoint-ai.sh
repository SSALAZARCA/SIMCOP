#!/bin/bash
set -e

MODELS_DIR="/app/models"
GEMMA_MODEL="$MODELS_DIR/gemma-4-e2b-it-Q4_K_M.gguf"
EMBEDDING_MODEL="$MODELS_DIR/embedding-gemma-2-740m-int8.onnx"
EMBEDDING_DATA="$MODELS_DIR/model_quantized.onnx_data"
EMBEDDING_TOKENIZER="$MODELS_DIR/tokenizer.json"

mkdir -p "$MODELS_DIR" /app/data

# Descarga desatendida de la dupla soberana: Gemma 4 E2B (LLM) + EmbeddingGemma 2 (Multimodal ONNX)
auto_download_models() {
    if [ ! -f "$GEMMA_MODEL" ]; then
        echo "[PROVISIONING] Descargando Gemma 4 E2B Q4_K_M (Sovereign LLM)..."
        curl -L -C - --retry 3 --retry-delay 5 -o "${GEMMA_MODEL}.tmp" \
            "https://huggingface.co/unsloth/gemma-4-E2B-it-GGUF/resolve/main/gemma-4-E2B-it-Q4_K_M.gguf" \
            && mv "${GEMMA_MODEL}.tmp" "$GEMMA_MODEL" \
            && echo "[PROVISIONING] Gemma 4 E2B descargado exitosamente." || rm -f "${GEMMA_MODEL}.tmp"
    fi

    if [ ! -f "$EMBEDDING_MODEL" ]; then
        echo "[PROVISIONING] Descargando EmbeddingGemma 2 Multimodal (740M INT8 ONNX)..."
        curl -L -C - --retry 3 --retry-delay 5 -o "${EMBEDDING_MODEL}.tmp" \
            "https://huggingface.co/onnx-community/embeddinggemma-2-ONNX/resolve/main/onnx/model_quantized.onnx" \
            && mv "${EMBEDDING_MODEL}.tmp" "$EMBEDDING_MODEL" \
            && echo "[PROVISIONING] Grafo ONNX de EmbeddingGemma 2 descargado." || rm -f "${EMBEDDING_MODEL}.tmp"
    fi

    if [ ! -f "$EMBEDDING_DATA" ]; then
        echo "[PROVISIONING] Descargando tensores externos de EmbeddingGemma 2 (model_quantized.onnx_data)..."
        curl -L -C - --retry 3 --retry-delay 5 -o "${EMBEDDING_DATA}.tmp" \
            "https://huggingface.co/onnx-community/embeddinggemma-2-ONNX/resolve/main/onnx/model_quantized.onnx_data" \
            && mv "${EMBEDDING_DATA}.tmp" "$EMBEDDING_DATA" \
            && echo "[PROVISIONING] Tensores de EmbeddingGemma 2 descargados exitosamente." || rm -f "${EMBEDDING_DATA}.tmp"
    fi

    if [ ! -f "$EMBEDDING_TOKENIZER" ]; then
        echo "[PROVISIONING] Descargando Tokenizer de EmbeddingGemma 2..."
        curl -L -C - --retry 3 --retry-delay 5 -o "${EMBEDDING_TOKENIZER}.tmp" \
            "https://huggingface.co/onnx-community/embeddinggemma-2-ONNX/resolve/main/tokenizer.json" \
            && mv "${EMBEDDING_TOKENIZER}.tmp" "$EMBEDDING_TOKENIZER" \
            && echo "[PROVISIONING] Tokenizer de EmbeddingGemma 2 descargado exitosamente." || rm -f "${EMBEDDING_TOKENIZER}.tmp"
    fi
}

auto_download_models &

exec uvicorn api_server:app --host 0.0.0.0 --port 8000
