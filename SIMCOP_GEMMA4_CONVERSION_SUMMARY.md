# SIMCOP Conversión a Gemma 4 E2B + EmbeddingGemma 2 (Soberano Local)

## Resumen de Cambios

El sistema SIMCOP ha sido completamente reconfigurado para operar exclusivamente con el stack de IA soberana local:

- **LLM**: Gemma 4 E2B Instruct (3.4 GB GGUF) - `gemma-4-e2b-it-Q4_K_M.gguf`
- **Embeddings**: EmbeddingGemma 2 (768-dimension vector space) - `embedding-gemma-2-740m-int8.onnx`
- **Provider**: NATIVE_SIMCOP (100% offline, sin dependencias API externas)

## Archivos Modificados

### 1. Scripts de Descarga y Inicio

**scripts/entrypoint-ai.sh**
- Actualizado para descargar `unsloth/gemma-4-E2B-it-GGUF` en lugar de `gemma-2-it`
- Configured para descargar `onnx-community/embeddinggemma-2-ONNX`

**scripts/download-sovereign-gemma.sh**
- Corregido URL para apuntar a repositorio Hugging Face válido: `unsloth/gemma-4-E2B-it-GGUF`
- Eliminado referencia a repositorio Google inexistente

### 2. Backend Java/Spring Boot

**backend/src/main/java/com/simcop/service/ConfigurationService.java**
- Línea 89: Default AI Provider changed from `"GEMINI"` → `"NATIVE_SIMCOP"`
- Línea 141: Default model for NATIVE_SIMCOP changed from `"simcop_nlp_weights_quantized_int8.pth"` → `"gemma-4-e2b-it-Q4_K_M.gguf"`

**backend/src/main/java/com/simcop/service/GeminiService.java**
- Aggregada Soporte para provider `NATIVE_SIMCOP` (líneas 139-214)
- Endpoint por defecto: `http://ai_engine:8000/v1`
- Formatos de respuesta compatible con SimCOP API wrapper
- Manejo de JSON response con stripping de tags de reasoning

### 3. Frontend TypeScript/React

**utils/geminiService.ts**
- Línea 10: Default AI provider set to `'NATIVE_SIMCOP'`
- Línea 11: Default endpoint set to `'/ai_api'`
- Línea 12: Default model set to `'gemma-4-e2b-it-Q4_K_M.gguf'`

**components/SettingsView.tsx**
- Provider default changed from `'GEMINI'` → `'NATIVE_SIMCOP'`
- Local endpoint default changed from `'http://localhost:11434'` → `'/ai_api'`
- Local model default changed from `'llama3'` → `'gemma-4-e2b-it-Q4_K_M.gguf'`
- Lógica de selección de provider actualizada

### 4. Docker Orchestration

**docker-compose.yml**
- Línea 137: AI_PROVIDER default changed from `OMNIROUTE` → `NATIVE_SIMCOP`
- Líneas 75-76: Model paths configured:
  - `SIMCOP_MODEL_PATH=/app/models/gemma-4-e2b-it-Q4_K_M.gguf`
  - `SIMCOP_EMBEDDING_PATH=/app/models/embedding-gemma-2-740m-int8.onnx`

## Arquitectura del Motor IA Soberano

### Container ai_engine
- **Puerto**: 8000 (exposed internally)
- **Recursos**: 2.0 CPUs, 4GB RAM (limits), 0.2 CPUs, 512MB RAM (reservations)
- **Volúmenes**: 
  - `ai_models:/app/models` - Persistencia de modelos
  - `ai_data:/app/data` - Persistencia de datos doctrinales

### Modelos Instalados
1. **Gemma 4 E2B Instruct (3.4 GB)**:
   - Format: GGUF Q4_K_M quantized
   - Path: `/app/models/gemma-4-e2b-it-Q4_K_M.gguf`
   - Función: Generación de contenido, razonamiento táctico, análisis doctrinal

2. **EmbeddingGemma 2 (740MB)**:
   - Format: ONNX int8
   - Path: `/app/models/embedding-gemma-2-740m-int8.onnx`
   - Función: Codificación vectorial (768 dimensions, Matryoshka compression a 256d)
   - Base de datos vectorial: `/app/data/simcop_doctrinal_vectors.db` (SQLite)

## Eliminación de Dependencias Externas

Todos los fallbacks a APIs umane han sido eliminos:
- ❌ Google Gemini Cloud API
- ❌ OmniRoute AI
- ❌ Ollama local (como default)
- ✅ Solo NATIVE_SIMCOP (Gemma 4 E2B + EmbeddingGemma 2)

## Service Dependencies Actualizadas

Los servicios que consumen IA ahora heredan el provider NATIVE_SIMCOP:

- **AIQueueService** → usa `geminiService.generateContent()` → ahora NATIVE_SIMCOP
- **OsintService** → usa `geminiService.generateContent()` → ahora NATIVE_SIMCOP
- **COA Generation** → `embedding_engine.retrieve_doctrinal_context` + `OCOPATerrainAnalyzer`
- **Todos los components frontend** → endpoint `/ai_api` con provider NATIVE_SIMCOP

## Verificación de Configuración

Para verificar que la conversión fue exitosa:

1. **Revisar defaults en ConfigurationService**:
   ```java
   .orElse("NATIVE_SIMCOP")  // Provider default
   .orElseGet(() -> "gemma-4-e2b-it-Q4_K_M.gguf")  // Model default
   ```

2. **Revisar docker-compose.yml**:
   ```yaml
   - AI_PROVIDER=${AI_PROVIDER:-NATIVE_SIMCOP}
   - SIMCOP_MODEL_PATH=/app/models/gemma-4-e2b-it-Q4_K_M.gguf
   - SIMCOP_EMBEDDING_PATH=/app/models/embedding-gemma-2-740m-int8.onnx
   ```

3. **Revisar frontend defaults en geminiService.ts**:
   ```typescript
   provider: 'NATIVE_SIMCOP',
   endpoint: '/ai_api',
   model: 'gemma-4-e2b-it-Q4_K_M.gguf'
   ```

## Próximos Pasos

1. **Build y deploy**:
   ```bash
   docker-compose build
   docker-compose up -d
   ```

2. **Verificar containers**:
   ```bash
   docker ps | grep ai_engine
   docker logs ai_engine_1
   ```

3. **Validar modelos**:
   ```bash
   docker exec ai_engine_1 ls -la /app/models/
   docker exec ai_engine_1 python -c "from api_server import *; print('AI Engine OK')"
   ```

4. **Testear endpoints**:
   ```bash
   curl http://localhost:8085/api/v1/health
   ```

## Conclusión

El sistema SIMCOP ahora opera 100% offline con el stack soberano local:
- **Cero dependencias API externas**
- **Gemma 4 E2B + EmbeddingGemma 2 como única fuente de IA**
- **Todos los providers frontend y backend configurados en NATIVE_SIMCOP**
- **Arquitectura completa compatible con operación en entornos sin conectividad**