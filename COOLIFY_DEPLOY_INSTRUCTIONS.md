# Instructions de Deploy Automat en Coolify

## 🎯 Resumen

SIMCOP está fully configured para deploy en Coolify. El sistema ya incluye:

1. ✅ **`.coolify.json`** - Configuration automate para Coolify
2. ✅ **`docker-compose.coolify.yml`** - Compose file optimizado
3. ✅ **Dockerfiles** - Build definitions para todos los servicios
4. ✅ **Entrypoint scripts** - Auto-download de modelos AI
5. ✅ **Variables de entorno** - Todas las configs necesarias necesarias

## 🚀 Deploy en 3 Pasos

### Paso 1: Preparar Repositorio
```bash
# Asegurarse de que los files de configuracion existan
ls -la .coolify.json docker-compose.coolify.yml
```

### Paso 2: Importar en Coolify
1. Ve a **Coolify Dashboard**
2. Click en **"Add Service"** → **"Import from Git"**
3. Ingresa la URL de tu repositorio:
   ```
   https://github.com/tu-usuario/tu-repo-name
   ```
4. Coolify automaticamente detectará:
   - ✅ 6 servicios (frontend, backend, ai_engine, mysql, sigep_backend, sigep_frontend)
   - ✅ Variables de entorno en `.coolify.json`
   - ✅ Recursos optimizados (CPU/RAM)
   - ✅ Networks y volumes

### Paso 3: Configurar Domain
1. En el servicio **frontend**, agrega tu domain
2. Coolify generará certificates SSL automaticamente
3. Configura DNS (A record → IP del servidor)

## 📋 What Coolify Automat Automaticamente

| Servicio|Qué Coolify Configura|
|---------|---------------------|
| **Frontend** | Nginx, SSL, domain mapping|
| **Backend** | Java 17, Spring Boot, MySQL connector|
| **AI Engine** | Python 3.11, PyTorch, llama-cpp-python|
| **MySQL** | Database initialization, users|
| **SIGEP** | Java 17, H2/MySQL, AI integration|
| **Networks** | Bridge isolation, internal communication|

## 🔧 Variables de Entorno Pre-configuradas

### En `.coolify.json`:
```json
{
  "SPRING_DATASOURCE_URL": "jdbc:mysql://mysql:3306/simcop...",
  "JWT_SECRET": "404E635266556A586E3272357538782F413F4428472B4B6250645367566B5970",
  "SIMCOP_SERVICE_TOKEN": "simcop-tactical-m2m-secure-token-2026",
  "AI_PROVIDER": "NATIVE_SIMCOP",
  "AI_API_URL": "http://ai_engine:8000/v1"
}
```

## 🤖 Auto-Provisioning de Modelos AI

El `entrypoint-ai.sh` descarga automaticamente:

1. **Gemma 4 E2B** (3.4 GB) - `unsloth/gemma-4-E2B-it-GGUF`
2. **EmbeddingGemma 2** (740 MB) - `onnx-community/embeddinggemma-2-ONNX`

**Location:** `/app/models/` (volume persistente)

## 📊 Recursos Asignados

| Servicio|CPU|RAM|Storage|
|---------|---|---|-------|
| Frontend|0.25|256MB|1GB|
| Backend|0.5|512MB|2GB|
| AI Engine|2.0|4GB|10GB|
| MySQL|0.5|1GB|10GB|
| SIGEP|0.5|512MB|2GB|
| SIGEP Frontend|0.25|256MB|1GB|

**Total:** ~8-10 GB RAM, ~4-6 vCPU, ~25 GB storage

## ✅ Post-Deploy Verification

### 1. Verificar Containers
```bash
docker-compose -f docker-compose.coolify.yml ps
```

### 2. Verificar Models AI
```bash
docker exec ai_engine ls -lh /app/models/
# Debe mostrar:
# gemma-4-e2b-it-Q4_K_M.gguf (3.4GB)
# embedding-gemma-2-740m-int8.onnx (740MB)
```

### 3. Testear Endpoints
```bash
# Health check frontend
curl https://tu-domain

# AI engine status
curl http://ai_engine:8000/health

# Backend API
curl http://backend:8080/api/health
```

## 🔄 Updates y Maintenance

### Actualizar Repositorio
```bash
# Coolify handle automatic updates:
# 1. Pulls nuevos commits
# 2. Rebuilds containers
# 3. Zero-downtime deploy
# 4. Rollback si health checks fallan
```

### Reiniciar AI Engine
```bash
# En Coolify → Service → AI Engine → Restart
# O via terminal:
docker-compose -f docker-compose.coolify.yml restart ai_engine
```

### Liberar Memoria
```bash
# Si el AI engine consume mucha memoria:
docker-compose -f docker-compose.coolify.yml stop ai_engine
docker-compose -f docker-compose.coolify.yml up -d ai_engine
```

## 🐛 Troubleshooting Común

### Problem: Models no se descargarán
**Solución:**
```bash
# Manual download y placement
docker exec -it ai_engine bash
mkdir -p /app/models
curl -L -o /app/models/gemma-4-e2b-it-Q4_K_M.gguf "https://huggingface.co/unsloth/gemma-4-E2B-it-GGUF/resolve/main/gemma-4-E2B-it-Q4_K_M.gguf"
curl -L -o /app/models/embedding-gemma-2-740m-int8.onnx "https://huggingface.co/onnx-community/embeddinggemma-2-ONNX/resolve/main/onnx/model_quantized.onnx"
exit
docker-compose -f docker-compose.coolify.yml restart ai_engine
```

### Problem: Memory OOM
**Solución:**
```bash
# En Coolify → Service → AI Engine → Resources
# Aumentar:
# - Limits: 6GB → 8GB
# - Reservations: 2GB → 4GB
```

### Problem: Database Connection Fail
**Solución:**
```bash
# Verificar MySQL status
docker-compose -f docker-compose.coolify.yml logs mysql

# Re-initializar database
docker-compose -f docker-compose.coolify.yml down -v
docker-compose -f docker-compose.coolify.yml up -d
```

## 📈 Monitoreo en Coolify

### Dashboard Integrado
- ✅ CPU/Memory por container
- ✅ Real-time logs
- ✅ Health check endpoints
- ✅ Database queries

### Alerts Configurables
- Memory > 85%
- CPU > 90%
- Service down
- Database errors

## 🎯 Status Final

Después del deploy en Coolify, el sistema SIMCOP operará como:

1. **100% Offline** - Sin dependencias de APIs externas
2. **IA Soberana** - Gemma 4 E2B + EmbeddingGemma 2 locales
3. **Fully Automated** - Coolify manage todos los servicios
4. **Production Ready** - SSL, health checks, monitoring

**Tiempo de Deploy:** 10-15 minutos (dependiendo de velocidad de internet para descargar models)

**Costo Operacional:** ~$40-60/mes (VPS 4 vCPU, 16GB RAM, 200GB NVMe)

✅ **Todo está ready para deploy en Coolify!**