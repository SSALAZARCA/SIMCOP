# INFORME DE AUDITORÍA Y ESPECIFICACIÓN DE SEGURIDAD Y BLINDAJE
**Módulo:** Seguridad Táctica, Hardening de Superadministrador y Remediación de Vulnerabilidades (SIMCOP)  
**Agente:** Survey Explorer 1 (Security & Superadmin Hardening)  
**Fecha:** Septiembre 2026  
**Clasificación:** Auditoría Técnica y Especificación de Ingeniería de Seguridad  

---

## 1. RESUMEN EJECUTIVO DE SEGURIDAD

Se ha completado la investigación exhaustiva del código fuente de **SIMCOP** (`c:/DESARROLLOS/SIMCOP-main/`) y sus submódulos de integración (`SIGEP`), cubriendo todos los vectores de ataque, brechas de autenticación/autorización, gestión de secretos, deserialización insegura y preservación de cuentas administrativas.

Se auditaron en profundidad los 10 componentes requeridos:
1. **R1: Blindaje y Preservación Inmutable del Superadministrador** (`santiago.salazar` / `admin`)
2. **SEC-01: Mitigación de RCE y Deserialización en PyTorch / Motor IA** (`api_server.py`)
3. **SEC-03: Erradicación de Secretos y Tokens Codificados en Duro** (`OsintController.java`, `WeatherService.java`, etc.)
4. **SEC-04: Exposición de Claves API, Criptografía Débil y Firma JWT** (`application.properties`, `ConfigurationService.java`)
5. **SEC-06: Verificación de Middleware y Eliminación de Bypasses de Autenticación** (`MilitaryUnitController.java`, `SecurityConfig.java`)
6. **SEC-07: Saneamiento de Path Traversal y Seguridad en Manejo de Archivos** (`FileStorageService.java`, `FileController.java`)
7. **SEC-08: Prevención de BOLA / IDOR en Todos los Endpoints REST** (`COAPlanController.java`, `TelegramController.java`, etc.)
8. **SEC-09: Ofuscación y Enmascaramiento de Datos Sensibles en Vistas Administrativas** (`AdminController.java`, `AdminDashboardComponent.tsx`)
9. **SEC-10: Extracción Segura de Contexto de Usuario Autenticado** (`ConfigurationController.java`, `LogisticsRequestController.java`, etc.)
10. **SEC-11: Transmisión Segura de Claves de API e Integración OmniRoute** (`GeminiService.java`, `geminiService.ts`, `SettingsView.tsx`)

---

## 2. MATRIZ CONSOLIDADA DE VULNERABILIDADES Y ESPECIFICACIÓN TÉCNICA

| ID | Severidad | Categoría | Archivo(s) Afectado(s) | Líneas | Resumen del Fallo | Remediacón Requerida |
|---|---|---|---|---|---|---|
| **R1** | 🔴 **Crítica** | Superadmin / Inmutabilidad | `DataInitializer.java`<br>`UserController.java`<br>`AdminController.java`<br>`AuthController.java` (SIGEP) | `DataInit:25,50-79`<br>`UserCtrl:110-139`<br>`AdminCtrl:127-131`<br>`AuthCtrl:44` | Cuenta `santiago.salazar`/`admin` sujeta a fallback débil (`change-me-immediately`), mutable/eliminable por cualquier admin (`deleteUser`, `updateUser`), expuesta a `TRUNCATE TABLE users` y backdoor `"ssc841209"` en SIGEP. | 1. Requerir `SIMCOP_SUPERADMIN_PASSWORD`.<br>2. Bloquear `deleteUser` y cambio de rol a `santiago.salazar`/`admin`.<br>3. Prohibir `truncateTable` en `users`.<br>4. Remover backdoor en SIGEP. |
| **SEC-01** | 🔴 **Crítica** | RCE / Deserialización | `api_server.py`<br>`simcop_nlp_weights_quantized_int8.pth` | `api:49-58` | Uso de formato Pickle `.pth` propenso a RCE si se altera `weights_only`. Archivo `.pth` de 296MB lleno de `\x00` que dispara `UnpicklingError` ignorado en runtime. | 1. Forzar `weights_only=True` en PyTorch.<br>2. Migrar a Safetensors (`safetensors.torch.load_file`) o motor GGUF cuantizado (`llama-cpp-python`).<br>3. Validación de integridad SHA-256 previa a carga. |
| **SEC-03** | 🔴 **Crítica** | Secretos en Duro | `OsintController.java`<br>`WeatherService.java`<br>`docker-compose.yml` | `Osint:73,81-83`<br>`Weather:48`<br>`dc:11,50` | Fallback de webhook OSINT `"simcop-osint-secret-2026"`, token comparado con `.equals()` no seguro contra timing attacks, API key de Windy `"yyPzfp5tCyd3PkkJgykYf7tffTSYVUCy"` y passwords MySQL `"password"` quemadas. | 1. Mover secretos a `${OSINT_WEBHOOK_SECRET}` y `${WINDY_API_KEY}`.<br>2. Usar `MessageDigest.isEqual()` para tiempo constante.<br>3. Eliminar credenciales por defecto. |
| **SEC-04** | 🔴 **Crítica** | Criptografía / JWT / Storage | `application.properties`<br>`ConfigurationService.java`<br>`ConfigurationController.java` | `prop:28`<br>`ConfigServ:198-208`<br>`ConfigCtrl:41-49` | Fallback JWT secret público (`404E6352...`), almacenamiento de secretos con simple Base64 en BD (falso cifrado), y endpoint `/api/config/gemini-api-key` expone clave en texto claro a roles no admin. | 1. Exigir `JWT_SECRET` obligatorio en runtime.<br>2. Cifrado simétrico AES-256-GCM en `ConfigurationService`.<br>3. Restringir `/api/config/gemini-api-key` a `ADMINISTRATOR` o no enviar raw key al cliente. |
| **SEC-06** | 🔴 **Crítica** | Bypass Autenticación | `MilitaryUnitController.java`<br>`SecurityConfig.java`<br>`TelegramController.java`<br>`SIGEP/SecurityConfig.java` | `UnitCtrl:33-37`<br>`SecConfig:50-54`<br>`TelegCtrl:53-74`<br>`SIGEP:33-34` | Manejo manual de token `@RequestHeader("Authorization")` en vez de filtro Spring Security. Endpoints no autenticados en `SecurityConfig`: `/api/telegram/test` (open spam relay), `/api/weather/**`, `/api/simcop/**`, `/h2-console/**`. | 1. Proteger `/api/telegram/test` con `@PreAuthorize("hasRole('ADMINISTRATOR')")`.<br>2. Autenticar `/api/weather/**` y `/api/simcop/**`.<br>3. Eliminar acceso anónimo a h2-console.<br>4. Usar `SecurityContextHolder`. |
| **SEC-07** | 🔴 **Crítica** | Path Traversal / XSS | `FileStorageService.java`<br>`FileController.java` | `Storage:38-68`<br>`FileCtrl:25-63` | No se valida lista blanca de extensiones (posible subida de `.exe`, `.html`, `.svg` con scripts maliciosos), y `downloadFile` sirve archivos con `Content-Disposition: inline` (Stored XSS). | 1. Validar lista blanca de extensiones (`.jpg`, `.png`, `.pdf`, `.kml`, `.geojson`).<br>2. Establecer `Content-Disposition: attachment; filename=...`.<br>3. Agregar cabecera `X-Content-Type-Options: nosniff`. |
| **SEC-08** | 🟡 **Media** | BOLA / IDOR | `COAPlanController.java`<br>`LogisticsRequestController.java`<br>`OperationalGraphicController.java`<br>`BMAController.java`<br>`ForwardObserverController.java`<br>`SpecialtyCatalogController.java`<br>`UnitHistoryEventController.java` | `COA:41-58`<br>`Logist:41-52`<br>`Graph:33-37`<br>`BMA:56-66`<br>`Obs:29-52`<br>`Spec:34-69`<br>`Hist:29-40` | Múltiples endpoints permiten mutación/eliminación arbitraria de entidades creadas por otros usuarios (Planes COA, Gráficos Militares, Reabastecimiento, Observadores, Especialidades MOS, inyección de eventos en Caja Negra). | 1. Verificar propiedad (`createdBy.equals(username)`) o rol `ADMINISTRATOR`.<br>2. Prohibir `POST /api/history` desde clientes (restringir a eventos internos del servidor).<br>3. Agregar `@PreAuthorize` en controladores desprotegidos. |
| **SEC-09** | 🟡 **Media** | SQL Injection / Data Leak | `AdminController.java`<br>`AdminDashboardComponent.tsx` | `AdminCtrl:63-94, 101-146`<br>`AdminDash:6-85` | Consulta SQL directa `SELECT * FROM " + tableName` sin lista blanca explícita de tablas. Volcado de `app_configuration` expone tokens Base64. `truncateTable` permite borrar tablas nucleares del sistema. | 1. Implementar `TABLE_WHITELIST` estricto.<br>2. Ocultar valores de `config_value` y PII sensible.<br>3. Prohibir truncado de `users`, `app_configuration`, `admin_audit_logs`. |
| **SEC-10** | 🟡 **Media** | Suplantación / Contexto Auth | `ConfigurationController.java`<br>`LogisticsRequestController.java`<br>`UAVController.java`<br>`configService.ts` | `ConfigCtrl:60,132`<br>`LogistCtrl:48`<br>`UAVCtrl:34`<br>`configServ:74,172` | El frontend envía `{ username: 'admin' }` en el cuerpo JSON, y controladores de backend confían en `fulfilledByUserId` o `requesterId` del payload en lugar del token JWT autenticado. | 1. Extraer siempre el usuario activo desde `SecurityContextHolder.getContext().getAuthentication().getName()`.<br>2. Eliminar campos `username`/`userId` del cuerpo JSON en clientes. |
| **SEC-11** | 🟡 **Media** | Transmisión de Claves API / OmniRoute | `GeminiService.java`<br>`geminiService.ts`<br>`SettingsView.tsx` | `GeminiServ:140-145`<br>`geminiTs:170-190, 225-260` | Transmisión de API Keys: el frontend descarga la clave completa en memoria. Integración del proveedor OmniRoute requiere cabecera estándar `Authorization: Bearer <API_KEY>` y URL base `https://api.omniroute.ai/v1`. | 1. Transmitir clave Gemini vía cabecera `x-goog-api-key` (nunca query param `?key=`).<br>2. Transmitir clave OmniRoute vía `Authorization: Bearer <API_KEY>`.<br>3. Configuración integral en `SettingsView.tsx` y `geminiService.ts`. |

---

## 3. INVESTIGACIÓN DETALLADA POR COMPONENTE Y REQUERIMIENTO

### 3.1 R1: Blindaje y Preservación Inmutable del Superadministrador

#### Observaciones de Código:
- **`backend/src/main/java/com/simcop/config/DataInitializer.java` (Líneas 25, 50-79)**:
  ```java
  @Value("${app.admin.default-password:change-me-immediately}")
  private String defaultAdminPassword;
  ...
  String envSuperAdminPass = System.getenv("SIMCOP_SUPERADMIN_PASSWORD");
  if (envSuperAdminPass == null || envSuperAdminPass.trim().isEmpty()) {
      envSuperAdminPass = System.getenv("SIMCOP_ADMIN_PASSWORD");
  }
  String initialSecurePassword = (envSuperAdminPass != null && !envSuperAdminPass.trim().isEmpty())
          ? envSuperAdminPass
          : defaultAdminPassword;
  ```
  Si no se define la variable de entorno, el sistema utiliza `"change-me-immediately"`.
- **`backend/src/main/java/com/simcop/controller/UserController.java` (Líneas 110-139)**:
  ```java
  @PutMapping("/{id}")
  @PreAuthorize("hasRole('ADMINISTRATOR')")
  public ResponseEntity<?> updateUser(@PathVariable String id, @RequestBody User userDetails) { ... }

  @DeleteMapping("/{id}")
  @PreAuthorize("hasRole('ADMINISTRATOR')")
  public ResponseEntity<Void> deleteUser(@PathVariable String id) { ... }
  ```
  Cualquier usuario con rol `ADMINISTRATOR` puede llamar a `DELETE /api/users/{id}` o `PUT /api/users/{id}` y eliminar la cuenta de `santiago.salazar` o degradar su rol, destruyendo el acceso al sistema.
- **`backend/src/main/java/com/simcop/controller/AdminController.java` (Líneas 101-146)**:
  `POST /api/admin/table/users/truncate` ejecuta `TRUNCATE TABLE users;`, eliminando permanentemente al SuperAdmin.
- **`SIGEP/backend/src/main/java/com/sigep/controller/AuthController.java` (Líneas 44-53)**:
  ```java
  } else if ("santiago.salazar".equals(username) && "ssc841209".equals(password)) {
      // Fallback sólo para emergencias (SuperAdmin Local)
      String jwt = jwtUtils.generateJwtToken(username, "ROLE_ADMINISTRATOR", "NATIONAL");
      ...
  ```
  Contiene una contraseña en texto claro quemada en el código (`"ssc841209"`).

#### Requisitos Exactos de Remediación:
1. **Inmutabilidad en `UserController.java`**:
   - Agregar comprobación antes de actualizar o eliminar:
     ```java
     User targetUser = repository.findById(id).orElseThrow(...);
     if ("santiago.salazar".equalsIgnoreCase(targetUser.getUsername()) || "admin".equalsIgnoreCase(targetUser.getUsername())) {
         if (isDeleteOperation || !userDetails.getRole().equals(UserRole.ADMINISTRATOR)) {
             return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Protected superadmin account is immutable.");
         }
     }
     ```
2. **Protección en `DataInitializer.java`**:
   - Mantener la condición de no sobrescritura si el usuario ya existe en base de datos (`userRepository.findByUsername("santiago.salazar").isEmpty()`).
   - Requerir `SIMCOP_SUPERADMIN_PASSWORD` y jamás imprimir contraseñas en los logs.
3. **Protección en `AdminController.java`**:
   - Bloquear truncado de la tabla `users`.
4. **Erradicación de Backdoor en `SIGEP/.../AuthController.java`**:
   - Eliminar por completo el bloque `else if ("santiago.salazar".equals(username) && "ssc841209".equals(password))` y forzar hashing BCrypt.

---

### 3.2 SEC-01: Mitigación de RCE y Deserialización en PyTorch / Motor IA

#### Observaciones de Código:
- **`api_server.py` (Líneas 43-58)**:
  ```python
  MODEL_PATH = "simcop_nlp_weights_quantized_int8.pth"
  ...
  if os.path.exists(MODEL_PATH):
      try:
          self.weights = torch.load(MODEL_PATH, map_location=self.device, weights_only=True)
          print("[OK] Pesajes de la red neuronal (.pth) cargados NATIVAMENTE en la VRAM de forma segura.")
      except Exception as e:
          print(f"[ADVERTENCIA] Error o formato no compatible en .pth, operando en modo heurístico seguro. Detalle: {e}")
          self.weights = None
  ```
- **`simcop_nlp_weights_quantized_int8.pth`**: Archivo de 295.98 MiB compuesto 100% por bytes nulos (`0x00`).
- **Riesgo**: Aunque actualmente cuenta con `weights_only=True`, el uso de la arquitectura pickle `.pth` es susceptible a manipulaciones si algún script o entorno de testing desactiva este flag.

#### Requisitos Exactos de Remediación:
1. Asegurar que `weights_only=True` sea una restricción inmutable en `torch.load()`.
2. Implementar soporte para `safetensors.torch.load_file` como estándar moderno libre de ejecución de código arbitrario.
3. Incorporar validación de cabecera mágica (evitar intentar deserializar archivos corruptos de bytes nulos que generen advertencias espurias en tiempo de arranque).

---

### 3.3 SEC-03: Erradicación de Secretos y Tokens Codificados en Duro

#### Observaciones de Código:
- **`backend/src/main/java/com/simcop/controller/OsintController.java` (Líneas 73-86)**:
  ```java
  @Value("${app.osint.webhook-secret:simcop-osint-secret-2026}")
  private String configuredWebhookSecret;
  ...
  String envSecret = System.getenv("OSINT_WEBHOOK_SECRET");
  String expectedToken = (envSecret != null && !envSecret.trim().isEmpty()) ? envSecret : configuredWebhookSecret;
  if (token == null || !token.equals(expectedToken)) { ... }
  ```
  - Contiene el valor por defecto `"simcop-osint-secret-2026"`.
  - La comparación `!token.equals(expectedToken)` es vulnerable a ataques de tiempo (Timing Attacks).
- **`backend/src/main/java/com/simcop/service/WeatherService.java` (Línea 48)**:
  ```java
  body.put("key", "yyPzfp5tCyd3PkkJgykYf7tffTSYVUCy");
  ```
  Clave de API de Windy quemada directamente en el cuerpo de la petición.
- **`docker-compose.yml` (Líneas 11, 50)**:
  `MYSQL_ROOT_PASSWORD=${DATABASE_PASSWORD:-password}`.

#### Requisitos Exactos de Remediación:
1. En `OsintController.java`:
   - Eliminar el valor por defecto en `@Value` (`@Value("${app.osint.webhook-secret}")` o inyección directa sin fallback estático inseguro).
   - Reemplazar la comparación por `java.security.MessageDigest.isEqual(token.getBytes(StandardCharsets.UTF_8), expectedToken.getBytes(StandardCharsets.UTF_8))`.
2. En `WeatherService.java`:
   - Reemplazar la clave en duro por `@Value("${windy.api.key:${WINDY_API_KEY:}}")`. Si no está configurada, usar el fallback determinista local sin emitir la llamada externa.

---

### 3.4 SEC-04: Exposición de Claves API, Criptografía Débil y Firma JWT

#### Observaciones de Código:
- **`backend/src/main/resources/application.properties` (Línea 28)**:
  ```properties
  jwt.secret=${JWT_SECRET:404E635266556A586E3272357538782F413F4428472B4B6250645367566B5970}
  ```
  Secreto JWT conocido y público por defecto.
- **`backend/src/main/java/com/simcop/service/ConfigurationService.java` (Líneas 198-208)**:
  ```java
  private String encrypt(String value) {
      return Base64.getEncoder().encodeToString(value.getBytes(StandardCharsets.UTF_8));
  }
  private String decrypt(String encryptedValue) {
      byte[] decodedBytes = Base64.getDecoder().decode(encryptedValue);
      return new String(decodedBytes, StandardCharsets.UTF_8);
  }
  ```
  Falso cifrado: Base64 es una simple codificación de caracteres, no ofrece confidencialidad.
- **`backend/src/main/java/com/simcop/controller/ConfigurationController.java` (Líneas 40-50)**:
  `GET /api/config/gemini-api-key` está abierto a `COMANDANTE_EJERCITO`, `COMANDANTE_DIVISION`, `COMANDANTE_BRIGADA`, `COMANDANTE_BATALLON`, `OFICIAL_INTELIGENCIA`, enviando la clave API de Gemini en texto claro a navegadores de clientes no administrativos.

#### Requisitos Exactos de Remediación:
1. En `application.properties`: Exigir `jwt.secret=${JWT_SECRET}` sin fallback débil en producción, o validar en `JwtUtil.java` que si la clave es la por defecto, emita una alerta crítica en log.
2. En `ConfigurationService.java`: Implementar cifrado simétrico AES-256-GCM (`javax.crypto.Cipher`) utilizando una clave de cifrado derivada del entorno (`APP_ENCRYPTION_KEY` o `JWT_SECRET`).
3. En `ConfigurationController.java`: Restringir `GET /api/config/gemini-api-key` exclusivamente a `hasRole('ADMINISTRATOR')`.

---

### 3.5 SEC-06: Verificación de Middleware y Eliminación de Bypasses de Autenticación

#### Observaciones de Código:
- **`backend/src/main/java/com/simcop/controller/MilitaryUnitController.java` (Líneas 33-37)**:
  ```java
  @GetMapping
  public List<MilitaryUnit> getAllUnits(@RequestHeader(value = "Authorization", required = false) String token) {
      if (token == null || token.isEmpty()) {
          logger.warn("⛔ Intento de acceso a catálogo de unidades sin token de autorización.");
          return new ArrayList<>();
      }
      com.simcop.model.User user = visibilityService.getUserFromToken(token);
  ```
  La autorización se realiza inspeccionando manualmente la cabecera HTTP en lugar de apoyarse en Spring Security.
- **`backend/src/main/java/com/simcop/config/SecurityConfig.java` (Líneas 46-57)**:
  ```java
  .requestMatchers("/api/weather/**").permitAll()
  .requestMatchers("/api/telegram/test").permitAll()
  ```
  - `/api/telegram/test` permite a cualquier atacante no autenticado enviar mensajes spam a través de los bots de Telegram de la brigada.
  - `/api/weather/**` permite consultas proxy anónimas.
- **`SIGEP/backend/src/main/java/com/sigep/security/SecurityConfig.java` (Líneas 33-34)**:
  `/h2-console/**` y `/api/simcop/**` configurados como `permitAll()`.

#### Requisitos Exactos de Remediación:
1. En `SecurityConfig.java`:
   - Eliminar `permitAll()` para `/api/telegram/test`. Exigir `authenticated()` o rol `ADMINISTRATOR`.
   - Exigir `authenticated()` para `/api/weather/**`.
2. En `MilitaryUnitController.java`:
   - Refactorizar para recibir `Authentication authentication` inyectado por Spring Security.
3. En SIGEP `SecurityConfig.java`:
   - Desactivar `/h2-console/**` en producción y proteger `/api/simcop/**` mediante API Key de servicio o token JWT inter-sistema.

---

### 3.6 SEC-07: Saneamiento de Path Traversal y Seguridad en Manejo de Archivos

#### Observaciones de Código:
- **`backend/src/main/java/com/simcop/service/FileStorageService.java` (Líneas 37-55, 57-73)**:
  ```java
  public String storeFile(MultipartFile file) {
      String originalFileName = StringUtils.cleanPath(file.getOriginalFilename());
      originalFileName = originalFileName.replaceAll("[^a-zA-Z0-9.-]", "_");
      String fileName = UUID.randomUUID().toString() + "_" + originalFileName;
      ...
  }
  ```
  - `file.getOriginalFilename()` puede ser `null`.
  - No se valida el tipo de archivo (MIME type) ni la extensión contra una lista blanca.
- **`backend/src/main/java/com/simcop/controller/FileController.java` (Líneas 59-63)**:
  ```java
  return ResponseEntity.ok()
          .contentType(MediaType.parseMediaType(contentType))
          .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + resource.getFilename() + "\"")
          .body(resource);
  ```
  Servir archivos adjuntos como `inline` permite la ejecución de scripts en el navegador si un usuario sube un archivo `.html` o `.svg` con código JavaScript (Stored XSS).

#### Requisitos Exactos de Remediación:
1. Validar lista blanca estricta de extensiones permitidas: `.jpg`, `.jpeg`, `.png`, `.pdf`, `.kml`, `.kmz`, `.geojson`, `.doc`, `.docx`.
2. Rechazar nombres con dobles extensiones ejecutables (`.php.jpg`, `.sh.png`).
3. En `FileController.java`: Cambiar la cabecera a `Content-Disposition: attachment; filename="..."` y forzar `X-Content-Type-Options: nosniff`.

---

### 3.7 SEC-08: Prevención de BOLA / IDOR en Todos los Endpoints REST

#### Observaciones de Código:
Se identificaron múltiples controladores REST que reciben identificadores `{id}` en rutas `PUT` o `DELETE` sin validar si el usuario autenticado es el propietario de la entidad o un comandante del escalón superior:
- **`COAPlanController.java` (Líneas 41-58)**:
  `PUT /api/coa-plans/{id}`, `DELETE /api/coa-plans/{id}` y `DELETE /api/coa-plans/{id}/hard` permiten a cualquier usuario autenticado modificar o destruir planes operacionales de otros estados mayores.
- **`LogisticsRequestController.java` (Líneas 41-52)**:
  `PUT /api/logistics/{id}` permite a cualquier operador aprobar o alterar pedidos logísticos.
- **`OperationalGraphicController.java` (Líneas 33-37)**:
  `DELETE /api/graphics/{id}` permite eliminar capas militares de otros usuarios.
- **`BMAController.java` (Líneas 56-66)**:
  `POST /api/bma/logistics/request/{unitId}` permite solicitar reabastecimiento para cualquier unidad del país.
- **`SpecialtyCatalogController.java` (Líneas 34-70)**:
  `POST`, `PUT`, `DELETE` en `/api/specialty-catalog` carecen de `@PreAuthorize("hasRole('ADMINISTRATOR')")`.
- **`ForwardObserverController.java` (Líneas 29-53)**:
  `POST`, `PUT`, `DELETE` en `/api/observers` carecen de `@PreAuthorize`.
- **`UnitHistoryEventController.java` (Líneas 29-40)**:
  `POST /api/history` expone un endpoint abierto para inyectar eventos falsos en la "Caja Negra".

#### Requisitos Exactos de Remediación:
1. Agregar anotaciones `@PreAuthorize` con roles explícitos en todos los métodos de mutación.
2. En `COAPlanController`: Comprobar que el plan pertenezca al usuario (`plan.getCreatedBy().equals(auth.getName())`) antes de permitir actualización o borrado, salvo que el rol sea `ADMINISTRATOR`.
3. En `UnitHistoryEventController`: Eliminar el `POST` público y permitir la creación de eventos únicamente a través de servicios internos del backend (`UnitHistoryEventService`).

---

### 3.8 SEC-09: Ofuscación y Enmascaramiento de Datos Sensibles en Vistas Administrativas

#### Observaciones de Código:
- **`backend/src/main/java/com/simcop/controller/AdminController.java` (Líneas 60-94)**:
  ```java
  @GetMapping("/table/{tableName}")
  public ResponseEntity<?> getTableData(@PathVariable String tableName) {
      if (!tableName.matches("^[a-zA-Z0-9_]+$")) { ... }
      List<Map<String, Object>> data = jdbcTemplate.queryForList("SELECT * FROM " + tableName + " LIMIT 1000");
  ```
  - La expresión regular no impide que un atacante consulte tablas internas como `information_schema` o tablas de auditoría de contraseñas.
  - El enmascaramiento solo cubre nombres específicos de columna (`password`, `two_factor_secret`), pero si se consulta la tabla `app_configuration`, la columna `config_value` muestra todas las claves API y tokens de Telegram.
- **`components/AdminDashboardComponent.tsx` (Líneas 6-12, 70-86)**:
  Permite seleccionar la tabla `users` y ejecutar `TRUNCATE`, lo que destruiría la base de datos de usuarios.

#### Requisitos Exactos de Remediación:
1. En `AdminController.java`:
   - Definir una lista blanca estricta e inmutable de tablas consultables:
     ```java
     private static final Set<String> ALLOWED_TABLES = Set.of(
         "users", "military_units", "alerts", "osint_events", 
         "fire_missions", "intelligence_reports", "operations_orders", 
         "specialty_catalog", "soldiers", "admin_audit_logs"
     );
     ```
   - Si `tableName.equals("app_configuration")`, ofuscar `config_value` (`***REDACTED***`).
   - Prohibir terminantemente el truncado de tablas críticas: `users`, `app_configuration`, `admin_audit_logs`.

---

### 3.9 SEC-10: Extracción Segura de Contexto de Usuario Autenticado

#### Observaciones de Código:
- **`services/configService.ts` (Líneas 74, 172, 213, 251)**:
  El frontend envía `username: string = 'admin'` en el JSON de las solicitudes de configuración (`saveGeminiApiKey`, `saveAIProviderConfig`, `saveTelegramBotToken`).
- **`backend/src/main/java/com/simcop/controller/ConfigurationController.java` (Líneas 60-62, 132-134, 166-168, 199-201)**:
  Actualmente extrae el usuario de `SecurityContextHolder`, pero aún tolera parámetros en el payload o fallback `"system"`.
- **`backend/src/main/java/com/simcop/controller/LogisticsRequestController.java` (Línea 48)**:
  `request.setFulfilledByUserId(requestDetails.getFulfilledByUserId());` toma el ID del usuario del cuerpo JSON enviado por el cliente, permitiendo a un usuario suplantar la identidad de quien aprobó el pedido.
- **`backend/src/main/java/com/simcop/controller/UAVController.java` (Línea 34)**:
  `request.getRequesterId()` se toma del payload.

#### Requisitos Exactos de Remediación:
1. Eliminar todos los campos `username`, `userId` y `requesterId` de los payloads cliente en el frontend (`services/configService.ts`, etc.).
2. En los controladores de backend, resolver la identidad exclusivamente desde:
   ```java
   Authentication auth = SecurityContextHolder.getContext().getAuthentication();
   String currentUsername = auth.getName();
   ```
3. En `LogisticsRequestController.java`, asignar `request.setFulfilledByUserId(currentUsername)`.

---

### 3.10 SEC-11: Transmisión Segura de Claves de API e Integración OmniRoute

#### Observaciones de Código:
- **`backend/src/main/java/com/simcop/service/GeminiService.java` (Líneas 140-145)**:
  Actualmente envía `headers.set("x-goog-api-key", apiKey);` en lugar de pasarlo como parámetro de consulta URL (`?key=...`), lo cual es correcto.
- **`utils/geminiService.ts` (Líneas 170-190, 225-260)**:
  - Descarga la clave API en la variable en memoria `API_KEY` mediante `GET /api/config/gemini-api-key`.
  - Cuando se selecciona `OMNIROUTE` o `LOCAL_LMLink`, despacha la solicitud directamente a `${localEndpoint}/v1/chat/completions` con la cabecera `Authorization: Bearer <API_KEY>`.
- **`components/SettingsView.tsx`**:
  Debe contar con interfaz dedicada para el proveedor **OmniRoute** con:
  - URL Base por defecto: `https://api.omniroute.ai/v1`
  - Selector de modelos: `omni-default`, `deepseek-r1`, `qwen-2.5-72b`, etc.
  - Campo seguro de API Key con botón de revelación temporal / enmascarado.

#### Requisitos Exactos de Remediación:
1. Backend `GeminiService.java`: Mantener y reforzar la transmisión mediante cabecera `x-goog-api-key` para Gemini y `Authorization: Bearer <API_KEY>` para OpenAI / OmniRoute.
2. Frontend `SettingsView.tsx` y `configService.ts`: Integrar el selector completo de OmniRoute (R2), asegurando que la clave nunca se exponga en logs ni se guarde en texto plano en `localStorage`.

---

## 4. GUÍA DE VERIFICACIÓN PARA IMPLEMENTADORES

1. **Prueba de Inmutabilidad de Superadmin**:
   - Intentar `DELETE /api/users/{id_de_santiago_salazar}` con token de administrador: Debe retornar `403 Forbidden`.
   - Intentar `PUT /api/users/{id_de_santiago_salazar}` cambiando rol a `COMANDANTE_PELOTON`: Debe retornar `403 Forbidden`.
   - Reiniciar el backend sin la variable `SIMCOP_SUPERADMIN_PASSWORD`: La cuenta debe conservarse inmutable.
2. **Prueba de Cero Secretos en Claro**:
   - Ejecutar búsqueda global: `grep -rn "simcop-osint-secret-2026" .` -> 0 resultados.
   - Ejecutar búsqueda global: `grep -rn "yyPzfp5tCyd3PkkJgykYf7tffTSYVUCy" .` -> 0 resultados.
   - Ejecutar búsqueda global: `grep -rn "ssc841209" .` -> 0 resultados.
3. **Prueba de BOLA / IDOR**:
   - Crear un plan COA con usuario A. Intentar actualizar o borrar con usuario B: Debe retornar `403 Forbidden`.
4. **Prueba de Uploads y Descargas**:
   - Subir archivo `test.html` o `script.svg`: Debe ser rechazado por extensión no permitida.
   - Descargar archivo adjunto: Debe contener cabecera `Content-Disposition: attachment`.
5. **Prueba de Compilación**:
   - Ejecutar `npm run build` en el frontend: Debe compilar con 0 errores.
