# Original User Request

## Initial Request — 2026-09-02T02:02:29Z

Equipo de agentes completo especializado para realizar todas las mejoras, remediaciones y cambios técnicos derivados del informe de análisis de SIMCOP, garantizando la preservación inmutable y segura del usuario superadministrador, integrando el nuevo proveedor de IA OmniRoute y ejecutando una auditoría exhaustiva de cero errores y cero residuos.

Working directory: c:/DESARROLLOS/SIMCOP-main
Integrity mode: development

## Requirements

### R1. Blindaje y Preservación del Usuario Superadministrador
Garantizar que el usuario superadministrador (santiago.salazar / admin) no quede expuesto en texto claro en código fuente, archivos de configuración o logs. Su inicialización debe realizarse exclusivamente a través de variables de entorno seguras (SIMCOP_SUPERADMIN_PASSWORD), y sus credenciales en base de datos deben ser inmutables (nunca sobrescribirse en el arranque).

### R2. Integración Integral del Proveedor de IA OmniRoute
Integrar de extremo a extremo el proveedor de Inteligencia Artificial OmniRoute (OpenAI-compatible) en frontend y backend:
- Interfaz gráfica en SettingsView.tsx con selector de proveedor, URL base (https://api.omniroute.ai/v1), modelo objetivo (omni-default, deepseek-r1, etc.) y campo seguro de API Key.
- Persistencia backend y despacho de consultas operacionales en geminiService.ts hacia /v1/chat/completions con cabecera Authorization: Bearer <API_KEY>.

### R3. Remediación Integral de la Matriz de Hallazgos del Informe Técnico
Implementar las correcciones necesarias para solventar los hallazgos técnicos documentados en INFORME_ANALISIS_SIMCOP.md:
- Seguridad: Mitigación de RCE en PyTorch (SEC-01), protección de secretos y tokens (SEC-03, SEC-04), eliminación de bypasses de autenticación (SEC-06), saneamiento de Path Traversal (SEC-07), prevención de BOLA/IDOR (SEC-08), ofuscación de datos sensibles en panel administrativo (SEC-09), extracción segura de usuarios autenticados (SEC-10) y transmisión segura de API keys (SEC-11).
- Rendimiento y Arquitectura: Optimización de pools de hilos y mitigación de memory leaks (PERF-01, ARQ-03), eliminación de bloqueos artificiales (ARQ-01) y restricción de orígenes CORS (SEC-12).
- Datos y Calidad: Unicidad de usuarios (DATA-01), limitación de historial de rutas (DATA-02) y estandarización de logs estructurados (QUAL-04).

### R4. Auditoría de Cero Errores y Cero Residuos
Auditar minuciosamente el código para asegurar:
- Compilación limpia del frontend (npm run build sin errores).
- Eliminación de archivos temporales, logs de depuración o artefactos huérfanos generados durante el proceso.

## Acceptance Criteria

### Seguridad y Credenciales
- [ ] Ninguna contraseña está quemada en texto claro en el código fuente.
- [ ] La cuenta del superadministrador se preserva y no se sobrescribe al iniciar la aplicación.
- [ ] El endpoint de Webhook OSINT y el acceso administrativo están protegidos por variables de entorno y contexto de autenticación seguro.

### Proveedor OmniRoute
- [ ] El usuario puede seleccionar OmniRoute en los ajustes y guardar su URL, modelo y API Key.
- [ ] Las consultas de IA táctica se despachan exitosamente al endpoint de OmniRoute con autenticación Bearer.

### Calidad y Limpieza
- [ ] npm run build compila con 0 errores.
- [ ] No existen archivos residuales ni carpetas temporales huérfanas en el repositorio.

## Follow-up — 2026-09-03T01:29:56Z

Implementación integral y depuración del visor geoespacial Cesium 3D con elevación topográfica geométrica real (malla 3D de terreno de alta definición) y cartografía satelital táctica nítida y fotorrealista en SIMCOP.

Working directory: c:/DESARROLLOS/SIMCOP-main
Integrity mode: development

## Requirements

### R1. Malla Geométrica de Terreno 3D en Cesium
Configurar el visor Cesium para cargar una malla de elevación topográfica tridimensional real (ArcGISTiledElevationTerrainProvider / CesiumTerrainProvider / Cesium.Terrain.fromWorldTerrain) sin depender de autenticaciones fallidas (401) ni recurrir a falsos overlays térmicos o mapas de calor de baja resolución. Las cordilleras, montañas, valles y cañones deben tener elevación física tridimensional visible al inclinar la cámara.

### R2. Cartografía Satelital y Táctica Fotorrealista de Alta Resolución
Superponer sobre la malla de elevación 3D una capa satelital fotorrealista de alta definición (ESRI World Imagery HD) junto con etiquetas geográficas claras (CartoDB Light Labels), asegurando una visualización limpia, profesional y libre de artefactos de color plano.

### R3. Panel Táctico HUD y Controles de Relieve
Optimizar los controles flotantes del mapa (HUD) para permitir centrado táctico 3D sobre Colombia, ajuste del factor de exageración del terreno (1.0x, 1.5x, 2.0x), conmutación limpia entre capas base (Satélite HD, Cartografía, OSM) y sincronización con las herramientas tácticas (Línea de Vista LOS, Domos de Cobertura, Windy y Radar).

### R4. Calidad, Rendimiento y Cero Residuos
Garantizar compilación limpia (npm run build con 0 errores), ausencia de errores en consola del navegador (401, CORS o fallos de renderizado) y despliegue funcional en el contenedor local Docker.

## Acceptance Criteria

### Terreno y Relieve 3D
- [ ] Las montañas y cordilleras muestran elevación física tridimensional real en el globo Cesium.
- [ ] La textura satelital es nítida, fotorrealista y se adapta a la topografía sin distorsiones ni artefactos de color rojo/amarillo.
- [ ] La cámara inicia con perspectiva táctica inclinada (45°) mostrando horizonte, atmósfera y relieve.

### Rendimiento y Calidad
- [ ] npm run build finaliza con código de salida 0.
- [ ] El contenedor frontend local responde correctamente en http://localhost.
- [ ] Consola del navegador libre de errores bloqueantes de autenticación o terreno.

