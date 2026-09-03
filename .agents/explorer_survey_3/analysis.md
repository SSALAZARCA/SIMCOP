# INFORME DE ANÁLISIS TÉCNICO: CALIDAD DE DATOS, LOGGING E INFRAESTRUCTURA DE BUILD/TEST
**Agente:** Survey Explorer 3 (Data Quality, Logging & Build/Test Infra)  
**Fecha:** Septiembre 2026  
**Misión:** Evaluación profunda de integridad de datos (DATA-01, DATA-02), estandarización de logging estructurado (QUAL-04) e infraestructura de construcción y pruebas (R4).

---

## 1. DATA-01: UNICIDAD DE USUARIOS Y RESTRICCIONES DE INTEGRIDAD EN DB Y BACKEND

### 1.1 Observaciones del Modelo de Datos y Esquema
- **Entidad JPA (`User.java:22-23`)**:
  ```java
  @Column(unique = true, nullable = false)
  private String username;
  ```
  La anotación `@Column(unique = true, nullable = false)` está presente en la entidad `User.java`. La clave primaria es un UUID (`@GeneratedValue(strategy = GenerationType.UUID)`).
- **Esquema Flyway y Migraciones SQL**:
  - `V1__Initial_Schema.sql:6`: `username VARCHAR(255) UNIQUE NOT NULL`
  - `V8__Complete_Model_Sync_Final.sql:46`: `username VARCHAR(255) UNIQUE NOT NULL`
  - En scripts utilitarios residuales (`CreateUserTableManual.java:22`), la tabla `users` se creaba manualmente como `username VARCHAR(255)` sin restricción de unicidad (`UNIQUE`).
- **Repositorio JPA (`UserRepository.java`)**:
  ```java
  @Repository
  public interface UserRepository extends JpaRepository<User, String> {
      Optional<User> findByUsername(String username);
  }
  ```
  No cuenta con método `boolean existsByUsername(String username)`.

### 1.2 Análisis del Controlador y Flujo de Creación/Actualización (`UserController.java`)
- **`createUser` (`UserController.java:61-73`)**:
  ```java
  @PostMapping
  public ResponseEntity<User> createUser(@RequestBody User user) {
      logger.info("👤 Iniciando creación de usuario: {}", user.getUsername());
      try {
          user.setHashedPassword(passwordEncoder.encode(user.getHashedPassword()));
          User savedUser = repository.save(user);
          logger.info("✅ Usuario {} guardado exitosamente.", savedUser.getUsername());
          return ResponseEntity.ok(savedUser);
      } catch (Exception e) {
          logger.error("❌ Error al crear usuario {}: {}", user.getUsername(), e.getMessage());
          return ResponseEntity.status(500).build();
      }
  }
  ```
  **Vulnerabilidades y Deficiencias de Integridad**:
  1. **Falta de pre-validación de existencia**: No se ejecuta `repository.findByUsername(...)` o `existsByUsername(...)`.
  2. **Tratamiento inadecuado de excepciones de colisión**: Ante un username duplicado, Hibernate dispara `DataIntegrityViolationException`, pero el bloque `catch (Exception e)` responde con HTTP 500 Internal Server Error genérico en vez de HTTP 409 Conflict con mensaje explícito (`"El nombre de usuario ya existe"`).
  3. **Riesgo de `NullPointerException`**: Si el payload no incluye contraseña, `user.getHashedPassword()` es `null`, provocando `NullPointerException` en `passwordEncoder.encode(...)`.
  4. **Falta de normalización/trimming**: No se eliminan espacios en blanco laterales ni se valida longitud mínima/formato alfanumérico en `username`.
  5. **`updateUser` (`UserController.java:110-129`)**: Modifica campos de perfil pero no contempla validación de unicidad en caso de soportar cambios de username.

### 1.3 Preservación Inmutable de Usuarios Superadministradores (`DataInitializer.java`)
- `DataInitializer.java:59, 71` implementa la verificación previa `if (userRepository.findByUsername("santiago.salazar").isEmpty())` y `if (userRepository.findByUsername("admin").isEmpty())`.
- Las contraseñas se resuelven de forma segura desde variables de entorno (`SIMCOP_SUPERADMIN_PASSWORD` o `SIMCOP_ADMIN_PASSWORD`), garantizando que las cuentas existentes nunca sean sobreescritas en el arranque del sistema.

### 1.4 Recomendaciones de Implementación para DATA-01
1. Añadir `boolean existsByUsername(String username);` en `UserRepository.java`.
2. En `UserController.createUser`:
   - Validar que `user.getUsername()` no sea nulo ni vacío tras `trim()`.
   - Validar que `user.getHashedPassword()` no sea nulo ni vacío.
   - Comprobar `if (repository.existsByUsername(trimmedUsername))` y retornar `ResponseEntity.status(HttpStatus.CONFLICT).body(...)`.
3. Normalizar `username` a minúsculas o sanitizar antes de persistir.

---

## 2. DATA-02: LÍMITE Y MECANISMO DE PODA EN HISTORIAL DE RUTAS (ROUTE HISTORY)

### 2.1 Modelo y Mapeo Relacional (`MilitaryUnit.java`)
- `routeHistory` está modelado como una colección embebida (`@ElementCollection`):
  ```java
  @ElementCollection
  @CollectionTable(name = "unit_route_history", joinColumns = @JoinColumn(name = "unit_id"))
  @AttributeOverrides({
          @AttributeOverride(name = "lat", column = @Column(name = "location_lat")),
          @AttributeOverride(name = "lon", column = @Column(name = "location_lon"))
  })
  private List<RoutePoint> routeHistory = new ArrayList<>();
  ```
- Cada punto de ruta representa un registro en la tabla relacional `unit_route_history` (`unit_id`, `location_lat`, `location_lon`, `timestamp`).

### 2.2 Diagnóstico de Inconsistencia y Crecimiento Desmedido
- **Endpoint SPOT Telemetry (`MilitaryUnitController.java:185-188`)**:
  ```java
  unit.getRouteHistory().add(point);
  if (unit.getRouteHistory().size() > 500) {
      unit.setRouteHistory(new java.util.ArrayList<>(unit.getRouteHistory().subList(unit.getRouteHistory().size() - 500, unit.getRouteHistory().size())));
  }
  ```
  Este endpoint sí aplica poda a los últimos 500 puntos.
- **Endpoint Principal de Actualización (`MilitaryUnitController.java:141-144`)**:
  ```java
  if (unitDetails.getRouteHistory() != null) {
      unit.getRouteHistory().clear();
      unit.getRouteHistory().addAll(unitDetails.getRouteHistory());
  }
  ```
  `updateUnit` (`PUT /api/units/{id}`) **NO valida ni limita** la cantidad de puntos entrantes. Si un cliente o script externo envía miles de puntos, todos se insertan en `unit_route_history`.
- **Frontend (`constants.ts:13`, `useTacticalOps.ts:154, 235`)**:
  - `MAX_ROUTE_HISTORY_LENGTH = 50`.
  - El frontend poda a 50 puntos en memoria antes de enviar (`.slice(0, MAX_ROUTE_HISTORY_LENGTH)`).

### 2.3 Riesgo Operativo y Arquitectónico
- Sin una regla de poda en la capa de persistencia/entidad del backend, peticiones directas a la API REST pueden saturar la tabla `unit_route_history`, degradando las consultas de carga general de unidades (`GET /api/units`) al cargar colecciones de miles de elementos por unidad.

### 2.4 Recomendaciones de Implementación para DATA-02
1. **Centralizar la poda en la entidad o servicio**:
   - En `MilitaryUnit.setRouteHistory(List<RoutePoint> routeHistory)` o mediante un método de ayuda `addRoutePoint(RoutePoint point)`:
     ```java
     public static final int MAX_ROUTE_POINTS = 500;
     
     public void setRouteHistory(List<RoutePoint> routeHistory) {
         if (routeHistory != null && routeHistory.size() > MAX_ROUTE_POINTS) {
             this.routeHistory = new ArrayList<>(routeHistory.subList(routeHistory.size() - MAX_ROUTE_POINTS, routeHistory.size()));
         } else {
             this.routeHistory = routeHistory != null ? new ArrayList<>(routeHistory) : new ArrayList<>();
         }
     }
     ```
2. Aplicar la validación y poda en `MilitaryUnitController.updateUnit` antes de `repository.save(unit)`.
3. Crear un índice en base de datos sobre `unit_route_history (unit_id, timestamp)` si se requieren consultas temporales de tracking.

---

## 3. QUAL-04: ESTANDARIZACIÓN DE LOGGING ESTRUCTURADO Y PREVENCIÓN DE FUGAS DE DATOS

### 3.1 Auditoría de Logging en Backend Java (Spring Boot)
El proyecto cuenta con SLF4J / Logback incluido a través de `spring-boot-starter-web`, pero existen múltiples componentes que recurren a salidas estándar no estructuradas:

| Componente / Archivo | Líneas | Mecanismo Actual | Deficiencia Identificada |
|---|---|---|---|
| `OsintService.java` | 61, 109, 146, 178, 181, 182, 243 | `System.out.println`, `System.err.println` | Falta de logger SLF4J; información de noticias y errores en stdout/stderr sin contexto temporal ni nivel. |
| `SiochInteropService.java` | 36, 37, 39, 51, 53 | `System.out.println`, `System.err.println` | Vuelca payloads en stdout sin control de nivel ni formato. |
| `GeminiService.java` | 71, 131, 177 | `System.err.println` | Errores de llamadas a Ollama/LMLink/Gemini impresos en stderr. |
| `WeatherService.java` | 135, 253, 294 | `System.err.println` | Errores de Windy/RainViewer/Geocoding impresos en stderr. |
| `FlywayConfig.java` | 19, 23, 27, 29 | `System.out.println`, `System.err.println` | Mensajes de migración en stdout/stderr. |
| `SecurityConfig.java` | 40 | `System.err.println` | Debug de accesos no autorizados en stderr. |
| `GeoUtils.java` | 64 | `System.err.println` | Error de parseo GeoJSON en stderr. |
| `AdminController.java` | 54, 143 | `e.printStackTrace()` | No tiene `Logger` instanciado; imprime trazas crudas. |
| `SpecialtyCatalogController.java` | 24 | `e.printStackTrace()` | Trazas crudas sin registro formal. |
| `TwoFactorController.java` | 36 | `e.printStackTrace()` | Trazas crudas sin registro formal. |
| `UserController.java` | 126 | `e.printStackTrace()` | Traza cruda en `updateUser`. |
| `com.simcop.util.*` (7 clases) | Múltiples | `System.out.println`, `e.printStackTrace()` | Scripts utilitarios que imprimen hashes y credenciales en texto plano. |

### 3.2 Auditoría de Logging en Motor IA Python (`api_server.py`)
- `api_server.py:44, 52, 54, 58, 915` utiliza llamadas directas `print(...)`.
- **Recomendación**: Configurar `logging.basicConfig(format='%(asctime)s [%(levelname)s] %(name)s: %(message)s', level=logging.INFO)` y usar `logger = logging.getLogger("simcop-ai")`.

### 3.3 Auditoría de Seguridad: Fugas de Datos Sensibles en Logs
1. **Contraseñas y Hashes**:
   - `CheckUsers.java:24` imprime `Password: ` con el hash BCrypt a stdout.
   - En `UserController.java:77`, el log registra el username (`logger.info("🔑 Intento de login para usuario: {}", loginRequest.getUsername())`), lo cual es seguro y correcto al no incluir la contraseña.
2. **Secretos 2FA TOTP**:
   - `AdminController.java:72-87` implementa ofuscación de columnas sensibles (`***REDACTED***`) para campos de contraseñas, secretos 2FA y tokens en el visor administrativo.
3. **Claves de API en Frontend**:
   - `services/configService.ts:77` imprime `apiKey.substring(0, 10) + '...'` en la consola del navegador.
   - **Recomendación**: Eliminar logs de depuración en servicios frontend o envolverlos en `if (import.meta.env.DEV)`.

---

## 4. R4: INFRAESTRUCTURA DE CONSTRUCCIÓN, PRUEBAS Y CONTROL DE RESIDUOS

### 4.1 Verificación de Compilación Frontend (`npm run build`)
- **Estado de Ejecución**: `vite build` ejecuta con éxito (Código 0) en ~4.4 segundos, emitiendo los bundles en `dist/`.
- **Auditoría de Tipado TypeScript (`npx tsc --noEmit`)**:
  La ejecución directa del compilador TypeScript reportó **5 errores de compilación**:
  1. `components/TelegramConfigComponent.tsx:100`: `Cannot find name 'configService'`. Falta importación estática de `configService`.
  2. `utils/geminiService.ts:845`: `Cannot find name 'avgSlope'`. La variable no fue calculada tras el bucle de pendientes (`const avgSlope = countSlope > 0 ? totalSlope / countSlope : 0;`).
  3. `components/Map3DDisplayComponent.tsx:938`: `Expected 1 arguments, but got 0`. Propiedad `onPiccDrawingComplete?: (feature: any) => void` requiere parámetro obligatorio pero se invoca sin argumentos.
  4. `components/Map3DDisplayComponent.tsx:1087`: Mismo error de llamada sin argumentos.
  5. `components/Map3DDisplayComponent.tsx:1097`: Mismo error de llamada sin argumentos.

### 4.2 Infraestructura de Pruebas Backend (Java / Spring Boot)
- **Herramienta de Construcción**: Apache Maven 3.9.9 operativo en `tools/apache-maven-3.9.9/bin/mvn.cmd`.
- **Framework de Pruebas**: JUnit 5 Jupiter + Spring Boot Test + Mockito + AssertJ vía `spring-boot-starter-test` en `pom.xml`.
- **Base de Datos de Pruebas**: H2 en memoria (`jdbc:h2:mem:testdb`) configurada en `src/test/resources/application-test.properties`.
- **Resultados de Ejecución de Pruebas (`mvn test`)**:
  - `mvn test-compile`: 143 clases principales + 1 clase de prueba compiladas con éxito en 3.64s.
  - `mvn test`: 1 prueba ejecutada (`SimcopApplicationTests.contextLoads`), 0 fallos, 0 errores en 6.17s.
  - Se verificó el arranque completo del contenedor de Spring Boot, inicialización de 20 repositorios JPA, ejecución de `DataInitializer` y preservación de cuentas administrativas.

### 4.3 Inventario Completo de Archivos Residuales, Huérfanos y Temporales
Se identificaron las siguientes categorías de archivos residuales que deben limpiarse y agregarse a `.gitignore`:

| Categoría | Archivo / Directorio | Tamaño | Naturaleza / Razón de Residuos |
|---|---|---|---|
| **Archivos de Bloqueo MS Office** | `~$pacidades_SIMCOP.doc` | 162 B | Archivo temporal de bloqueo generado por Microsoft Word. Rastreado en Git. |
| **Documentos Binarios Huérfanos** | `Capacidades_SIMCOP.doc` | 13.8 KB | Documento de Word en la raíz del repositorio. |
| **Archivos Comprimidos Corruptos/Residuo** | `SIMCOP_SourceCode.zip` | 22 B | Archivo zip vacío/corrupto en raíz. Rastreado en Git. |
| **Scripts de Prueba / Scratch en Raíz** | `test-json.js`, `test-login.json`, `test-regex.js`, `test-user.json` | ~2.5 KB | Scripts y JSONs temporales de pruebas ad-hoc. Rastreados en Git. |
| **Logs de Previsualización** | `preview.log` | 257 B | Log de ejecución de servidor Vite en raíz. |
| **Herramientas de Prueba Ad-hoc** | `spot-sender.html` | 9.4 KB | Emulador HTML de balizas SPOT en raíz. |
| **Scripts de Migración Parche en Raíz** | `add_personnel_permission.py`, `add_personnel_permission.sql` | ~2.4 KB | Scripts de migración manual ejecutados por fuera de Flyway. |
| **Bytecode Python Rastreado** | `__pycache__/api_server.cpython-311.pyc` | ~60 KB | Bytecode compilado rastreado en Git. |
| **Scripts de Base de Datos Sueltos en `backend/`** | `create_specialty_table.sql`, `create_table.py`, `drop-users-tables.sql`, `init_mysql_table.ps1`, `init_specialty_catalog.sql` | ~5 KB | Scripts manuales de administración en `backend/`. |
| **Clases Java Utilitarias en `src/main/java/com/simcop/util/`** | `CheckUsers.java`, `CreateSpecialtyTable.java`, `CreateUserTableManual.java`, `DropAllTables.java`, `DropUserTable.java`, `InitSpecialtyTable.java`, `UpdateUserSchema.java` | ~10 KB | Clases con métodos `main()` independientes que exponen credenciales de BD remotas en duro (`Ssc841209*`). |
| **Archivos Duplicados de Maven** | `tools/maven.zip` (9.2 MB), `backend/apache-maven-3.9.6/` | ~30 MB | Archivos zip y carpetas redundantes de Maven. |

---

## 5. MATRIZ CONSOLIDADA DE HALLAZGOS Y PLAN DE REMEDIACIÓN

| Código | Área | Severidad | Estado Actual | Acción de Remediación Requerida |
|---|---|---|---|---|
| **DATA-01** | Integridad de Usuarios | Media | `@Column(unique=true)` existe en JPA, pero `UserController.createUser` no valida colisiones y responde con HTTP 500. Falta método `existsByUsername` en repositorio. | Implementar `existsByUsername` en `UserRepository`, validar formato y responder con HTTP 409 Conflict ante colisiones. |
| **DATA-02** | Historial de Rutas | Media | `MilitaryUnitController.updateUnit` permite insertar listas ilimitadas de `routeHistory`. Solo el endpoint `/spot` poda a 500 puntos. | Centralizar la poda a 500 puntos en el setter de `MilitaryUnit` y validar en `updateUnit`. |
| **QUAL-04** | Logging Estructurado | Baja | 11 clases en backend usan `System.out.println`, `System.err.println` o `e.printStackTrace()`. Python usa `print()`. | Estandarizar con SLF4J (`LoggerFactory.getLogger`) en Java y módulo `logging` en Python. Eliminar logs con claves de API en frontend. |
| **R4-TS** | Tipado TypeScript | Media | `npx tsc --noEmit` falla con 5 errores en `TelegramConfigComponent.tsx`, `geminiService.ts` y `Map3DDisplayComponent.tsx`. | Corregir la importación de `configService`, cálculo de `avgSlope` y la firma de `onPiccDrawingComplete`. |
| **R4-CLN** | Limpieza de Residuos | Media | 12+ archivos huérfanos/temporales rastreados en Git (`~$*.doc`, `*.zip`, `test-*.json`, `util/*.java`). | Eliminar archivos temporales del repositorio, limpiar historial de Git y actualizar `.gitignore`. |
