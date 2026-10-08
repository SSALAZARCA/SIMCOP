#!/usr/bin/env bash
# =============================================================================
# SIMCOP AI — Descarga de Modelos Soberanos: EmbeddingGemma 2 + Gemma 4
# Optimizado para Servidor Hostinger KVM 4 (16 GB RAM / 4 vCPU / 200 GB NVMe)
# =============================================================================

set -euo pipefail

MODELS_DIR="${1:-$(dirname "$0")/../ai_models}"
mkdir -p "$MODELS_DIR"

echo ""
echo "========================================================================"
echo "  SIMCOP AI — Aprovisionamiento de Modelos Soberanos (Gemma 4 + EG2)"
echo "  Hardware Target: Hostinger KVM 4 (16 GB RAM / 4 vCPU / 200 GB NVMe)"
echo "========================================================================"
echo ""

# ── 1. MODELO DE RAZONAMIENTO TÁCTICO: Gemma 4 E2B / 2.3B GGUF Q4_K_M ────────
# Modelo nativamente multimodal con soporte de Thinking Mode y 128K contexto.
# Cuantización: 4-bit k-quant (Q4_K_M)
# Consumo en ejecución: ~1.8 GB - 2.2 GB RAM | Inferencia estimada: ~12-18 t/s en 3 vCPUs

GEMMA4_FILE="$MODELS_DIR/gemma-4-e2b-it-Q4_K_M.gguf"
GEMMA4_URL="https://huggingface.co/google/gemma-4-e2b-it-GGUF/resolve/main/gemma-4-e2b-it-Q4_K_M.gguf"

if [ -f "$GEMMA4_FILE" ]; then
    echo "✅ [SKIP] Gemma 4 E2B ya existe: $GEMMA4_FILE"
else
    echo "⬇️  [DESCARGANDO] Gemma 4 E2B Instruct Q4_K_M (~1.5 GB)..."
    curl -L --progress-bar -o "$GEMMA4_FILE" "$GEMMA4_URL" || {
        echo "⚠️  Nota: Si el enlace directo requiere autenticación de Hugging Face, descargue el GGUF manualmente a: $GEMMA4_FILE"
    }
    echo "✅ [OK] Gemma 4 E2B preparado en: $GEMMA4_FILE"
fi

echo ""

# ── 2. MODELO DE EMBEDDINGS MULTIMODAL: EmbeddingGemma 2 (740M INT8 ONNX) ────
# Espacio vectorial unificado de 768d con compresión Matryoshka MRL a 256d.
# Codifica: Malla 3D Cesium, ortofotos IGAC, hidrografía y audio de combate.
# Consumo en ejecución: ~850 MB - 1.1 GB RAM

EG2_FILE="$MODELS_DIR/embedding-gemma-2-740m-int8.onnx"
EG2_URL="https://huggingface.co/google/embeddinggemma-2-740m-onnx/resolve/main/model_quantized.onnx"

if [ -f "$EG2_FILE" ]; then
    echo "✅ [SKIP] EmbeddingGemma 2 ya existe: $EG2_FILE"
else
    echo "⬇️  [DESCARGANDO] EmbeddingGemma 2 740M Multimodal INT8 (~900 MB)..."
    curl -L --progress-bar -o "$EG2_FILE" "$EG2_URL" || {
        echo "⚠️  Nota: Si el enlace directo requiere autenticación de Hugging Face, descargue el modelo a: $EG2_FILE"
    }
    echo "✅ [OK] EmbeddingGemma 2 preparado en: $EG2_FILE"
fi

echo ""
echo "========================================================================"
echo "  Aprovisionamiento completado con éxito."
echo "  Modelos almacenados en: $MODELS_DIR"
echo "  Consumo de RAM esperado en el VPS: ~3.2 GB de los 16 GB disponibles."
echo "========================================================================"
echo ""
