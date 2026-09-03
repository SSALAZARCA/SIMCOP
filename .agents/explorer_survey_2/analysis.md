# REPORTE TÉCNICO DE INVESTIGACIÓN: INTEGRACIÓN OMNIROUTE AI, RENDIMIENTO Y ARQUITECTURA (SIMCOP)

**Explorador:** Survey Explorer 2 (OmniRoute AI Integration & Architecture/Performance)  
**Fecha:** Septiembre 2026  
**Repositorio Base:** `c:\DESARROLLOS\SIMCOP-main`  
**Directorio de Trabajo:** `c:\DESARROLLOS\SIMCOP-main\.agents\explorer_survey_2`  

---

## 1. RESUMEN EJECUTIVO

El presente informe consolida el mapeo exhaustivo y el plan de remediación técnica para la integración del proveedor de Inteligencia Artificial **OmniRoute** (OpenAI-compatible) y la resolución de las vulnerabilidades y cuellos de botella de arquitectura y rendimiento documentados en `INFORME_ANALISIS_SIMCOP.md` y `ORIGINAL_REQUEST.md`:

1. **R2 - Integración OmniRoute AI (OpenAI-compatible)**: Mapeo de interfaz en `SettingsView.tsx`, despacho de consultas en `utils/geminiService.ts`, persistencia en `ConfigurationService.java` / `ConfigurationController.java`, y soporte nativo en backend en `GeminiService.java` hacia `/v1/chat/completions` con cabecera `Authorization: Bearer <API_KEY>`, saneamiento de etiquetas de razonamiento (`<think>...</think>`) y conmutación de proveedores.
2. **PERF-01 & ARQ-03 - Optimización de Pools de Hilos y Mitigación de Fugas de Memoria**: Diagnóstico del ejecutor no gestionado y la acumulación de tareas en `AIQueueService.java`, desbordamiento potencial en `GeospatialCache.java`, y diseño del `ThreadPoolTaskExecutor` de Spring Boot con límites TTL/LRU y timeouts de 30 segundos.
3. **ARQ-01 - Eliminación de Bloqueos Artificiales y Cuellos de Botella Síncronos**: Identificación del bloqueo `Thread.sleep(4000)` en `OsintService.java` (invocado en el hilo HTTP del controlador), depuración de retardos en `api_server.py` y transición a patrones asíncronos no bloqueantes.
4. **SEC-12 - Restricción de Orígenes CORS y Cabeceras de Seguridad**: Validación estricta de orígenes en `api_server.py` (FastAPI) y `SecurityConfig.java` (Spring Boot), prohibición de comodines con credenciales y blindaje de cabeceras HTTP (HSTS, CSP, X-Content-Type-Options, X-Frame-Options).

---

## 2. MAPEO DETALLADO DE COMPONENTES E INTERFACES

### 2.1 Matriz de Archivos y Componentes Auditados

| Módulo / Dominio | Archivo / Componente | Líneas Clave | Rol / Propósito en el Sistema |
|---|---|---|---|
| **Frontend UI Settings** | `components/SettingsView.tsx` | 8, 32-37, 65-77, 98-108, 247-270, 449-567 | Selector de proveedor IA, inputs de Base URL, Modelo objetivo, API Key oculta con máscara y persistencia. |
| **Frontend Config Service** | `services/configService.ts` | 47-118, 154-194 | Cliente API para consultar y almacenar claves API y configuración del proveedor de IA. |
| **Frontend AI Engine** | `utils/geminiService.ts` | 10-15, 226-273, 551-1632 | Orquestador multi-proveedor de consultas tácticas (COA, Q5, BMA, Logística, INSITOP, Voz). |
| **Backend AI Service** | `backend/src/main/java/com/simcop/service/GeminiService.java` | 25-135, 137-181 | Despachador backend de inferencia IA (Google Gemini, Ollama, LMLink, OmniRoute). |
| **Backend AI Queue** | `backend/src/main/java/com/simcop/service/AIQueueService.java` | 19-22, 39-77 | Cola FIFO de tareas IA con `ConcurrentHashMap` y `ExecutorService`. |
| **Backend Config Controller** | `backend/src/main/java/com/simcop/controller/ConfigurationController.java` | 40-104, 180-214 | Endpoints REST `/api/config/gemini-api-key` y `/api/config/ai-provider`. |
| **Backend Config Service** | `backend/src/main/java/com/simcop/service/ConfigurationService.java` | 29-121 | Servicio JPA transaccional con cifrado para configuración de IA y tokens. |
| **Backend Cache** | `backend/src/main/java/com/simcop/service/GeospatialCache.java` | 6-7, 14-35 | Caché estático de geocodificación inversa y elevaciones altimétricas. |
| **Backend OSINT Service** | `backend/src/main/java/com/simcop/service/OsintService.java` | 37-65, 131 | Procesamiento síncrono de feeds RSS con `Thread.sleep(4000)` bloqueante. |
| **Backend Security** | `backend/src/main/java/com/simcop/config/SecurityConfig.java` | 34-85 | Configuración Spring Security, cadena de filtros, CORS y cabeceras. |
| **AI Python Microservice** | `api_server.py` | 20-28, 46-120 | Servidor FastAPI con `CORSMiddleware` y endpoints de inferencia local. |
| **Nginx Ingress** | `nginx.conf` | 11-20, 46-52, 58-65 | Proxy inverso Nginx, políticas CSP y cabeceras de seguridad. |

---

## 3. DOMINIO 1: INTEGRACIÓN INTEGRAL DE OMNIROUTE AI (R2)

### 3.1 Arquitectura de Integración OmniRoute

OmniRoute opera como una pasarela (*gateway*) multi-modelo compatible con la API estándar de OpenAI (`/v1/chat/completions`). Permite enrutar peticiones a modelos de frontera y SLMs avanzados (ej. `omni-default`, `deepseek-r1`, `gpt-4o`, `claude-3-5-sonnet`, `llama-3.3-70b`, `qwen-2.5-72b`).

```
                              ┌─────────────────────────────────────────────────────────┐
                              │                    SIMCOP CLIENT / UI                   │
                              │           SettingsView.tsx (aiProvider: OMNIROUTE)      │
                              └───────────────────────────┬─────────────────────────────┘
                                                          │
                                          ┌───────────────┴───────────────┐
                                          ▼                               ▼
                              ┌───────────────────────┐       ┌───────────────────────┐
                              │ Frontend Direct Dispatch│      │  Backend Queue Dispatch│
                              │   geminiService.ts    │       │   AIQueueService.java │
                              └───────────┬───────────┘       └───────────┬───────────┘
                                          │                               │
                                          │                               ▼
                                          │                   ┌───────────────────────┐
                                          │                   │   GeminiService.java  │
                                          │                   └───────────┬───────────┘
                                          │                               │
                                          └───────────────┬───────────────┘
                                                          │ HTTP POST /v1/chat/completions
                                                          │ Authorization: Bearer <API_KEY>
                                                          ▼
                                      ┌───────────────────────────────────────┐
                                      │        OMNIROUTE AI GATEWAY           │
                                      │     https://api.omniroute.ai/v1       │
                                      │                                       │
                                      │  ┌─────────────┐     ┌─────────────┐  │
                                      │  │ omni-default│     │ deepseek-r1 │  │
                                      │  └─────────────┘     └─────────────┘  │
                                      └───────────────────────────────────────┘
```

### 3.2 Frontend: `components/SettingsView.tsx`

#### Estado Actual y Observaciones:
- `SettingsView.tsx` ya incluye la opción `'OMNIROUTE'` en el selector de proveedores (`lines 8, 247-269`).
- Al pulsar el botón OmniRoute, preconfigura:
  * `localEndpoint`: `'https://api.omniroute.ai/v1'`
  * `localModel`: `'omni-default'`
- Muestra el campo de `geminiApiKey` adaptado como `API Key / Token de OmniRoute (Bearer Token)` con soporte de visualización/ocultamiento (`showKey`).
- Guarda la configuración llamando a:
  ```typescript
  await configService.saveGeminiApiKey(geminiApiKey, 'admin');
  await configService.saveAIProviderConfig(aiProvider, localEndpoint, localModel, 'admin');
  ```

#### Mejoras Requeridas para Blindaje:
1. **Validación de URL Base y Modelo**:
   - Asegurar que si el usuario deja el campo vacío, se asigne automáticamente el valor por defecto doctrinal `https://api.omniroute.ai/v1` y `omni-default`.
   - Permitir selección rápida mediante sugerencias de modelos comunes (`omni-default`, `deepseek-r1`, `gpt-4o`, `claude-3-5-sonnet`).
2. **Máscara Segura de Claves**:
   - `maskApiKey` asegura que sólo los primeros 8 caracteres se visualicen al cargar (`lines 155-158`).
   - Evitar almacenar claves no autenticadas en texto plano en la memoria del navegador.

### 3.3 Frontend: Despacho y Saneamiento en `utils/geminiService.ts`

#### Diagnóstico del Flujo Actual:
En `utils/geminiService.ts` (líneas 226–273), la función `generateContentViaBackend` intercepta llamadas para `OMNIROUTE`:
```typescript
if (aiProvider === 'LOCAL_OLLAMA' || aiProvider === 'LOCAL_LMLink' || aiProvider === 'OMNIROUTE') {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  };
  
  if ((aiProvider === 'LOCAL_LMLink' || aiProvider === 'OMNIROUTE') && API_KEY) {
    headers['Authorization'] = API_KEY.startsWith('Bearer ') ? API_KEY : `Bearer ${API_KEY}`;
  }

  let messages = [];
  if (systemInstruction) {
    messages.push({ role: 'system', content: systemInstruction });
  }
  messages.push({ role: 'user', content: prompt });

  const response = await fetch(`${localEndpoint.replace(/\/$/, '')}/v1/chat/completions`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model: localModel,
      messages,
      temperature: 0.4
    })
  });
  ...
```

#### Hallazgo Crítico en la Extracción de Contenido (Modelos de Razonamiento):
Modelos de razonamiento profundo como **DeepSeek-R1** emiten bloques de pensamiento encerrados en `<think>...</think>` o `<thought>...</thought>`.
Si el resultado no se sanea inmediatamente tras recibir la respuesta de `/v1/chat/completions`, funciones que esperan JSON estricto (`generateQ5ReportContentFromAAR`, `generateCOAPlan`, `getPredictiveLogisticsAnalysis`) arrojan un error fatal en `JSON.parse()`.

#### Solución Específica en `utils/geminiService.ts`:
```typescript
const data = await response.json();
let content = data.choices?.[0]?.message?.content || '';

// Saneamiento de bloques de razonamiento (DeepSeek-R1 / QwQ / Gemma)
content = content.replace(/<(thought|think|thinking|reasoning)>[\s\S]*?<\/\1>/gi, '').trim();

// Remoción de delimitadores de código markdown si la respuesta es JSON
if (content.startsWith('```json')) {
  content = content.replace(/^```json\s*/i, '').replace(/\s*```$/, '').trim();
} else if (content.startsWith('```')) {
  content = content.replace(/^```\w*\s*/i, '').replace(/\s*```$/, '').trim();
}
```

### 3.4 Backend: Soporte en `GeminiService.java`

#### Diagnóstico del Fallo Actual:
En `backend/src/main/java/com/simcop/service/GeminiService.java` (líneas 25–135), `generateContent(String prompt)` evalúa `LOCAL_OLLAMA` y `LOCAL_LMLINK`.
Sin embargo, **no existe un bloque condicional explícito para `OMNIROUTE`**.
Si el administrador selecciona `OMNIROUTE` en la interfaz, las peticiones que se procesen a través del backend (como `AIQueueService` o `OsintService`) caen al bloque por defecto de Google Gemini (`lines 137-178`), intentando conectar a Google AI Studio con la clave de OmniRoute, resultando en un error HTTP 400/403.

#### Implementación Propuesta para `GeminiService.java`:
```java
if ("OMNIROUTE".equalsIgnoreCase(provider) || "LOCAL_LMLINK".equalsIgnoreCase(provider)) {
    String endpoint = configService.getLocalAIEndpoint();
    if (endpoint == null || endpoint.trim().isEmpty()) {
        endpoint = "https://api.omniroute.ai/v1";
    }
    String model = configService.getLocalAIModel();
    if (model == null || model.trim().isEmpty()) {
        model = "omni-default";
    }

    // Normalizar URL hacia /v1/chat/completions
    String url = endpoint.endsWith("/v1/chat/completions") ? endpoint :
                 (endpoint.endsWith("/v1") ? endpoint + "/chat/completions" : 
                 (endpoint.endsWith("/") ? endpoint + "v1/chat/completions" : endpoint + "/v1/chat/completions"));

    HttpHeaders headers = new HttpHeaders();
    headers.setContentType(MediaType.APPLICATION_JSON);

    Optional<String> apiKeyOpt = configService.getGeminiApiKey();
    if (apiKeyOpt.isPresent() && !apiKeyOpt.get().trim().isEmpty()) {
        String token = apiKeyOpt.get().trim();
        headers.setBearerAuth(token.startsWith("Bearer ") ? token.substring(7) : token);
    }

    Map<String, Object> requestBody = new HashMap<>();
    requestBody.put("model", model);
    requestBody.put("temperature", 0.4);

    if (prompt != null && (prompt.contains("estructura exacta. REGLAS") || prompt.contains("Responde en formato JSON"))) {
        Map<String, Object> responseFormat = new HashMap<>();
        responseFormat.put("type", "json_object");
        requestBody.put("response_format", responseFormat);
    }

    Map<String, Object> systemMessage = new HashMap<>();
    systemMessage.put("role", "system");
    systemMessage.put("content", "Eres un asistente táctico militar de Estado Mayor de alta precisión para SIMCOP.");

    Map<String, Object> userMessage = new HashMap<>();
    userMessage.put("role", "user");
    userMessage.put("content", prompt);

    requestBody.put("messages", Arrays.asList(systemMessage, userMessage));

    HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);

    try {
        ResponseEntity<Map<String, Object>> response = restTemplate.exchange(
                url, HttpMethod.POST, entity,
                new ParameterizedTypeReference<Map<String, Object>>() {});

        Map<String, Object> body = response.getBody();
        if (response.getStatusCode() == HttpStatus.OK && body != null) {
            List<Map<String, Object>> choices = (List<Map<String, Object>>) body.get("choices");
            if (choices != null && !choices.isEmpty()) {
                Map<String, Object> message = (Map<String, Object>) choices.get(0).get("message");
                if (message != null) {
                    String rawContent = (String) message.get("content");
                    if (rawContent != null) {
                        // Limpiar tags de razonamiento <think>...</think>
                        return rawContent.replaceAll("(?i)<(thought|think|thinking|reasoning)>[\\s\\S]*?</\\1>", "").trim();
                    }
                }
            }
        }
    } catch (Exception e) {
        logger.error("Error llamando a OmniRoute API en {}: {}", url, e.getMessage());
        return "Error llamando a OmniRoute en " + url + ": " + e.getMessage();
    }
    return null;
}
```

---

## 4. DOMINIO 2: RENDIMIENTO Y GESTIÓN ASÍNCRONA (PERF-01 & ARQ-03)

### 4.1 Fuga de Memoria y Colecciones en `AIQueueService.java` (`PERF-01`)

#### Observaciones Técnicas:
1. En `AIQueueService.java` (línea 20):
   ```java
   private final Map<String, TaskInfo> tasks = new ConcurrentHashMap<>();
   ```
2. La limpieza `cleanOldTasks()` (líneas 39–44) solo se ejecuta cuando `tasks.size() > 500`. En sistemas en producción continua o tras semanas de actividad con 100-400 tareas diarias, los objetos `TaskInfo` (que contienen los prompts completos y respuestas de gran tamaño) residen indefinidamente en memoria vieja (*Tenured/Old Gen*), causando degradación progresiva de Garbage Collection.
3. `pendingTaskIds` es un `Collections.synchronizedList(new ArrayList<>())` (`line 19`). Operaciones como `pendingTaskIds.remove(taskId)` y `pendingTaskIds.indexOf(taskId)` requieren escaneo lineal $O(N)$ sobre la lista completa bajo sincronización gruesa.

#### Remediación Arquitectónica:
- Reemplazar el mapa manual por una estructura acotada con política de expiración temporal (TTL de 30 minutos) o un `LinkedHashMap` con acceso por orden de inserción (LRU) limitado a 1,000 entradas máximas.
- Reemplazar `pendingTaskIds` por un `ConcurrentLinkedQueue<String>` o calcular la posición atómicamente.

### 4.2 Fuga de Memoria en `GeospatialCache.java`

#### Observaciones Técnicas:
En `backend/src/main/java/com/simcop/service/GeospatialCache.java` (líneas 6–7):
```java
private static final ConcurrentHashMap<String, String> geocodingCache = new ConcurrentHashMap<>();
private static final ConcurrentHashMap<String, Double> elevationCache = new ConcurrentHashMap<>();
```
- No existe límite superior ni política de desalojo. En un escenario operacional con decenas de drones UAV y tropas emitiendo coordenadas continuas cada segundo, los mapas acumulan cientos de miles de entradas (`lat,lon`).
- **Remediación**: Configurar un tamaño máximo acotado (ej. 5,000 entradas) con política LRU (o `Collections.synchronizedMap(new LinkedHashMap<>(5000, 0.75f, true))`).

### 4.3 Optimización del Pool de Hilos (`ARQ-03`)

#### Observaciones Técnicas:
1. `AIQueueService.java` (línea 21) declara:
   ```java
   private final ExecutorService executor = Executors.newFixedThreadPool(4);
   ```
2. **Deficiencias**:
   - No está registrado como un Bean de Spring; ante un reinicio suave o recarga de contexto, los hilos de fondo quedan huérfanos sin cierre controlado (`@PreDestroy` / `shutdown()`).
   - No existe protección por `Timeout` a nivel de tarea encolada: si la llamada HTTP a Gemini u OmniRoute entra en *socket hang*, el hilo del pool queda bloqueado permanentemente.

#### Remediación: Configuración de `ThreadPoolTaskExecutor`
Crear un componente de configuración de infraestructura (`ThreadPoolConfig.java`):
```java
@Configuration
@EnableAsync
public class ThreadPoolConfig {

    @Bean(name = "aiTaskExecutor")
    public ThreadPoolTaskExecutor aiTaskExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(4);
        executor.setMaxPoolSize(8);
        executor.setQueueCapacity(100);
        executor.setThreadNamePrefix("simcop-ai-worker-");
        executor.setWaitForTasksToCompleteOnShutdown(true);
        executor.setAwaitTerminationSeconds(30);
        executor.setRejectedExecutionHandler(new ThreadPoolExecutor.CallerRunsPolicy());
        executor.initialize();
        return executor;
    }
}
```

---

## 5. DOMINIO 3: ELIMINACIÓN DE BLOQUEOS ARTIFICIALES (ARQ-01)

### 5.1 Bloqueo Síncrono `Thread.sleep(4000)` en `OsintService.java`

#### Diagnóstico del Cuello de Botella:
En `backend/src/main/java/com/simcop/service/OsintService.java` (líneas 47–63):
```java
for (Map<String, String> news : rawNews) {
    ...
    try {
        OsintEvent event = processNewsWithAI(news);
        if (event != null) {
            osintEventRepository.save(event);
            processedCount++;
        }
        // Sleep for 4 seconds to avoid hitting Gemini Free Tier rate limit (15 RPM)
        Thread.sleep(4000);
    } catch (Exception e) { ... }
}
```
- Este método es invocado directamente por el controlador REST `OsintController.refreshEvents()` (`POST /api/osint/refresh`).
- Si se descargan 20 noticias nuevas, el hilo HTTP de Tomcat se bloquea por más de **80 segundos** ($20 \times 4\text{s}$ más latencias de red), ocasionando *timeouts* en el navegador y consumo exhaustivo de hilos de conexión.

#### Remediación:
1. Eliminar el `Thread.sleep(4000)` bloqueante en el flujo directo.
2. Anotar el método con `@Async` o ejecutar el refresco en segundo plano, retornando inmediatamente al cliente una respuesta `202 Accepted` con estado del proceso.
3. Para proveedores con cuota restringida, utilizar un planificador `ScheduledExecutorService` o *token bucket rate limiter* no bloqueante.

### 5.2 Desbloqueo y Rendimiento en `api_server.py`

#### Diagnóstico:
- Los retardos artificiales tipo `time.sleep()` han sido depurados de los endpoints heurísticos en `api_server.py`.
- Se debe asegurar que todos los métodos de ruta en FastAPI estén definidos con `async def` para permitir la concurrencia no bloqueante sobre el *Event Loop* de Uvicorn/AsyncIO.

---

## 6. DOMINIO 4: RESTRICCIÓN DE CORS Y CABECERAS DE SEGURIDAD (SEC-12)

### 6.1 Configuración de CORS en `api_server.py` (FastAPI)

#### Estado Actual y Riesgo (SEC-12):
En `api_server.py` (líneas 20–28):
```python
origins = os.environ.get("CORS_ORIGINS", "http://localhost:5173,http://localhost:8080,http://127.0.0.1:5173,http://localhost:3000,http://127.0.0.1:8080").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```
- **Riesgo**: Si la variable de entorno `CORS_ORIGINS` se configurase inadvertidamente con `*`, FastAPI o el estándar W3C rechazarían la combinación `allow_origins=["*"]` junto con `allow_credentials=True`.
- **Validación Requerida**: Limpiar y normalizar la lista de orígenes, excluyendo entradas vacías o comodines cuando `allow_credentials=True`.

### 6.2 Cabeceras de Seguridad en Spring Boot (`SecurityConfig.java`)

#### Estado Actual:
En `SecurityConfig.java` (líneas 63–85), `corsConfigurationSource()` restringe los orígenes autorizados:
- `https://simcop.site`
- `https://api.simcop.site`
- `http://localhost:5173`, `5174`, `5175`, `3000`, `3005`, `3010`

#### Refuerzo de Cabeceras HTTP:
Añadir configuración explícita de cabeceras seguras en `filterChain`:
```java
http
    .headers(headers -> headers
        .contentTypeOptions(Customizer.withDefaults()) // X-Content-Type-Options: nosniff
        .frameOptions(frame -> frame.deny())           // X-Frame-Options: DENY
        .httpStrictTransportSecurity(hsts -> hsts
            .includeSubDomains(true)
            .maxAgeInSeconds(31536000))                // HSTS
        .referrerPolicy(referrer -> referrer
            .policy(ReferrerPolicy.STRICT_ORIGIN_WHEN_CROSS_ORIGIN))
    )
```

---

## 7. PLAN DE ACCIÓN Y VERIFICACIÓN PASO A PASO

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       HOJA DE RUTA DE IMPLEMENTACIÓN                        │
├─────────────────────────────────────────────────────────────────────────────┤
│ 1. BLINDAJE OMNIROUTE (R2)                                                  │
│    - Actualizar GeminiService.java con branch OMNIROUTE a /v1/chat/...      │
│    - Saneamiento de tags <think> en geminiService.ts (Frontend)             │
│    - Verificación de SettingsView.tsx para persistencia Bearer token        │
│                                                                             │
│ 2. RENDIMIENTO Y MEMORIA (PERF-01 / ARQ-03)                                 │
│    - Crear ThreadPoolConfig en Spring Boot con 4-8 hilos                    │
│    - Refactorizar AIQueueService con caché TTL 30m / max 1000 items          │
│    - Acotar GeospatialCache a 5000 entradas máximas                         │
│                                                                             │
│ 3. ELIMINACIÓN DE BLOQUEOS (ARQ-01)                                         │
│    - Eliminar Thread.sleep(4000) en OsintService.java                       │
│    - Convertir refresco OSINT en operación asíncrona no bloqueante          │
│                                                                             │
│ 4. SEGURIDAD CORS Y CABECERAS (SEC-12)                                      │
│    - Validar orígenes estrictos en api_server.py                            │
│    - Inyectar cabeceras HSTS/Frame-Options en SecurityConfig.java           │
│                                                                             │
│ 5. AUDITORÍA ZERO-ERROR                                                     │
│    - npm run build (0 errores TypeScript)                                   │
│    - mvn test-compile / mvn clean compile                                   │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

*Reporte técnico elaborado por Survey Explorer 2. Documento listo para implementación.*
