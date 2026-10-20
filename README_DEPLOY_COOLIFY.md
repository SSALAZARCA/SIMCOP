# SIMCOP - Sistema de Inteligencia Artificial para Operaciones Militares

## 🚀 Deploy en Coolify (Fully Automated)

SIMCOP está fully configured para deploy en Coolify. Solo sigue estos pasos:

### Paso 1: Clonar Repositorio
```bash
git clone https://github.com/tu-repo/simcop-ai-sovereign.git
cd simcop-ai-sovereign
```

### Paso 2: Importar en Coolify
1. Ve a tu panel de Coolify
2. Click en **"Add Service"** → **"Import from Git"**
3. Peга la URL del repositorio: `https://github.com/tu-repo/simcop-ai-sovereign`
4. Coolify automaticamente detectará:
   - ✅ 6 servicios (frontend, backend, ai_engine, mysql, sigep_backend, sigep_frontend)
   - ✅ Variables de entorno configuradas
   - ✅ Recursos de CPU/RAM optimizados
   - ✅ Networks y volumes correctos

### Paso 3: Configurar Domain y SSL
1. En el servicio **frontend**, agrega tu domain
2. Coolify automaticamente generará certificates SSL con Let's Encrypt
3. Configura DNS para apuntar a tu servidor

### Paso 4: Deploy Automat
Coolify automatizará:
- ✅ Build de todos los containers Docker
- ✅ Descarga de modelos AI (Gemma 4 E2B + EmbeddingGemma 2)
- ✅ Configuración de bases de datos
- ✅ Setup de networks y volumes
- ✅ Health checks y restart policies

### Paso 5: Verificar Deploy
```bash
# Verificar estado de containers
docker-compose ps

# Verificar logs del AI engine
docker-compose logs -f ai_engine

# Testear endpoints
curl http://tu-domain/health
curl http://tu-domain/api/ai/status
```

## 📋 Recursos Automáticos de Coolify

| Recurso | Configuração |
|---------|------------|
| **Frontend** | Nginx reverse proxy, SSL auto |
| **Backend Java** | Spring Boot, MySQL connector |
| **AI Engine** | Python/FastAPI, 4GB RAM limit |
| **Database** | MySQL 8.0, persistent volumes |
| **SIGEP** | Spring Boot H2/MySQL |
| **Networks** | Bridge isolation |

## 🔐 Variables de Entorno Críticas

### Backend (Java/Spring)
- `SPRING_DATASOURCE_URL` - Connection string MySQL
- `JWT_SECRET` - Secret para tokens JWT
- `SIMCOP_SERVICE_TOKEN` - Token de servicio entre microservicios

### AI Engine (Python/FastAPI)
- `SIMCOP_MODEL_PATH` - Path a Gemma 4 E2B
- `SIMCOP_EMBEDDING_PATH` - Path a EmbeddingGemma 2
- `SIMCOP_MODEL_THREADS` - Threads del modelo (2)

### SIGEP Backend
- `AI_PROVIDER` - `NATIVE_SIMCOP` (default)
- `AI_API_URL` - `http://ai_engine:8000/v1`

## 📦 Modelos AI Soberanos

Los modelos se descargarán automaticamente en el primer deploy:

1. **Gemma 4 E2B Instruct** (3.4 GB GGUF)
   - Source: `https://huggingface.co/unsloth/gemma-4-E2B-it-GGUF/resolve/main/gemma-4-E2B-it-Q4_K_M.gguf`
   - Quantization: Q4_K_M (4-bit)
   - Purpose: LLM principal para analisis táctico

2. **EmbeddingGemma 2** (740 MB ONNX)
   - Source: `https://huggingface.co/onnx-community/embeddinggemma-2-ONNX/`
   - Format: Quantized INT8
   - Purpose: Embeddings y semantic search

## 🔄 Updates y Recargas

### Actualizar Repositorio
```bash
# En Coolify → Service → Updates
# Coolify automaticamente:
1. Pulls nuevos commits
2. Rebuilds containers
3. Zero-downtime deployments
4. Rolls back si health checks fallan
```

### Recargar Models AI
```bash
# Coolify → Service → AI Engine → Advanced
# Click "Restart Service" para:
1. Liberar memoria de models viejos
2. Descargar versions actualizadas
3. Reiniciar servicios dependientes
```

## 📊 Monitoreo en Coolify

### Dashboard Integrado
- ✅ CPU/Memory usage por container
- ✅ Log aggregation en tiempo real
- ✅ Health check endpoints
- ✅ Database queries monitoring

### Alerts y Notificaciones
Configura en Coolify:
- ✅ Memory > 85% → Alerta
- ✅ CPU > 90% → Alerta
- ✅ Service down → Notificación
- ✅ Database errors → Alerta

## 🛠️ Maintenance y Troubleshooting

### Verificar Status de Models
```bash
# En Coolify → Service → AI Engine → Logs
# Busca:
[PROVISIONING] Descargando Gemma 4 E2B...
[PROVISIONING] Gemma 4 E2B descargado exitosamente.
[PROVISIONING] Descargando EmbeddingGemma 2...
```

### Liberar Memoria
```bash
# Coolify → Service → AI Engine → Advanced
# Click "Restart Service" para liberar memoria
```

### Debug Mode
```bash
# Acceder al container en tiempo de execution
coolify exec <service-name> -- bash
```

## ✅ Checkliste de Deploy Exitoso

- [ ] Todos los 6 services están en status "Running"
- [ ] Frontend accessible en https://tu-domain
- [ ] AI engine responsive (endpoint `/api/ai/status` devuelve 200)
- [ ] Models AI presentes en `/app/models/`
- [ ] Database accessible (MySQL puerto 3306)
- [ ] SIGEP backend responsive (puerto 4000)
- [ ] SSL certificates validos (Let's Encrypt)
- [ ] Health checks passing en Coolify

## 🎯 Features Clave Implementados

| Feature | Status | Tecnología |
|---------|--------|----------|
| **IA Soberana Local** | ✅ | Gemma 4 E2B + ONNX |
| **100% Offline** | ✅ | Sin APIs external |
| **Multi-provider** | ✅ | NATIVE_SIMCOP, GEMINI, OMNIROUTE |
| **COA Generation** | ✅ | JSON structured output |
| **Tactical Graphics** | ✅ | GeoJSON integration |
| **Wargaming Sim** | ✅ | Monte Carlo simulations |
| **Auto-repair JSON** | ✅ | Stack-based parser |
| **Geo Validation** | ✅ | Coordinate range checks |
| **Error Handling** | ✅ | Retry + fallbacks |
| **Caching** | ✅ | 50s TTL for queries |

## 📞 Soporte

Para issues de deploy:
1. Revisa logs en Coolify (Service → Logs)
2. Verifica memory limits (Service → Resources)
3. ValidОО variables de entorno (Service → Environment Variables)
4. Revisa health check endpoints

**El sistema está ready para producción después del primer deploy en Coolify.**