# INFORME TÉCNICO CONSOLIDADO: AUDITORÍA INTEGRAL, MAPEO FUNCIONAL Y EVALUACIÓN DE ARQUITECTURA DE SIMCOP
**Sistema Integrado de Mando y Control Operacional**

---

**Fecha de Publicación:** Septiembre 2026  
**Versión del Documento:** 1.0 (Master Final Release)  
**Clasificación Técnica:** Auditoría de Arquitectura de Software, Seguridad Táctica y Evaluación de Inteligencia Artificial  
**Destinatarios:** Estado Mayor, Dirección de Comunicaciones y Ciberdefensa, Líderes de Desarrollo y Arquitectos de Software  
**Repositorio Base:** `c:\DESARROLLOS\SIMCOP-main`  

---

## TABLA DE CONTENIDO

1. [RESUMEN EJECUTIVO](#1-resumen-ejecutivo)
   - 1.1 Propósito Central y Misión de la Plataforma
   - 1.2 Evaluación Global del Estado del Sistema y Nivel de Madurez Técnica
   - 1.3 Capacidades y Fortalezas Sobresalientes
   - 1.4 Principales Focos de Vulnerabilidad, Riesgo y Deuda Técnica
   - 1.5 Resumen Numérico de Métricas Clave
2. [ANÁLISIS DE CONTEXTO OPERATIVO Y MAPEO FUNCIONAL (R1)](#2-análisis-de-contexto-operativo-y-mapeo-funcional-r1)
   - 2.1 Identidad y Propósito Doctrinal del Sistema
   - 2.2 Matriz Completa de Roles y Actores del Sistema (18 Roles)
   - 2.3 Mapeo de Flujos Operativos y Recorridos de Usuario (*User Journeys*) de Extremo a Extremo
     - 2.3.1 Flujo 1: Ciclo de Vida del Combate, Novedades Tácticas, AAR y Generación Automatizada de Reporte Q5
     - 2.3.2 Flujo 2: Apoyo de Fuegos y Centro de Dirección de Tiro (CDT / Artillería)
     - 2.3.3 Flujo 3: Planeamiento Táctico, Cursos de Acción (COA), Gráficos Militares OTAN y Wargaming
     - 2.3.4 Flujo 4: Cadena de Suministros y Logística Predictiva (Clases I, III, V)
     - 2.3.5 Flujo 5: Gestión de Efectivos de Personal y Organización de Fuerza (ORBAT / S1)
   - 2.4 Catálogo Exhaustivo de Módulos Funcionales
     - 2.4.1 Módulos Frontend: Catálogo de 26 Vistas Especializadas
     - 2.4.2 Módulos Backend: Catálogo de 31 Controladores REST (Spring Boot 3)
     - 2.4.3 Motor de IA: Catálogo de 11 Endpoints Especializados (Python FastAPI)
     - 2.4.4 Integración Geoespacial CesiumJS 3D y Simbología Táctica
     - 2.4.5 Canales de Integración Externa y Mensajería (Telegram, SPOT, OpenWeather, SIOCH/SIGEP)
3. [AUDITORÍA TÉCNICA, CALIDAD DE CÓDIGO Y SEGURIDAD (R2)](#3-auditoría-técnica-calidad-de-código-y-seguridad-r2)
   - 3.1 Frontend: React 19 + TypeScript + CesiumJS
     - Arquitectura y Acoplamiento Monolítico en `App.tsx`
     - Capa de Hooks Modulares y Sincronización de Estado
     - Calidad de Tipado y Ausencia de `strict: true`
     - Gestión de Memoria WebGL y Ciclos de Vida en CesiumJS
     - Persistencia Local Insegura de Datos Tácticos
   - 3.2 Backend: Java 17 + Spring Boot 3.2.5
     - Arquitectura en Capas y Servicios Transaccionales
     - Spring Security, Filtros JWT y Modelo RBAC
     - Esquemas de Persistencia JPA, Hibernate y Flyway
     - Manejo de Archivos y Vulnerabilidades de Path Traversal
   - 3.3 Matriz Estructurada de Riesgos y Hallazgos Técnicos (26 Hallazgos)
     - Tabla Consolidada de Hallazgos (10 Críticos, 11 Medios, 5 Bajos)
     - Fichas Técnicas Profundas de Vulnerabilidades Críticas
   - 3.4 Análisis de Dependencias, Contenedorización e Infraestructura
     - Frontend `package.json` y Estrategia de Build
     - Backend Python `requirements.ai.txt` y Dependencias Sin Fijar
     - Docker Compose, Dockerfiles y Configuración de Red/Nginx
4. [EVALUACIÓN ESPECIALIZADA DEL SUBSISTEMA DE INTELIGENCIA ARTIFICIAL (IA / NLP) (R3)](#4-evaluación-especializada-del-subsistema-de-inteligencia-artificial-ia--nlp-r3)
   - 4.1 Análisis Forense del Archivo de Pesos Cuantizados (`simcop_nlp_weights_quantized_int8.pth`)
   - 4.2 Evaluación del Motor Nativo en `api_server.py`
     - Captura de Fallo de Deserialización e Inferencia Simulada
     - Emulación Heurística por Expresiones Regulares y Plantillas Doctrinales
     - Retardos Artificiales (`time.sleep`) y Telemetría MLOps Sintética
     - Algoritmo Real Implementado: Búsqueda de Rutas A* sobre Terreno Altimétrico
   - 4.3 Orquestación Multi-Proveedor de Inteligencia Artificial (4 Modos de Operación)
   - 4.4 Pipeline de Audio y Voz en Tiempo Real
     - Captura `AudioWorkletProcessor` (16 kHz PCM) y Streaming WebSocket
     - Interacción con Gemini Live API (`gemini-2.0-flash-exp`) y Tool Calling (`focusOnUnit`)
     - Ausencia de Motor STT Local Offline (Vosk / Whisper)
   - 4.5 Evaluación de Pipelines NLP de Extracción y Clasificación Táctica (AAR a Q5, COA, BMA)
   - 4.6 Cuellos de Botella de Concurrencia y Viabilidad Operativa en Entornos Air-Gapped
5. [PLAN DE MITIGACIÓN Y HOJA DE RUTA ACCIONABLE (ROADMAP) (R4)](#5-plan-de-mitigación-y-hoja-de-ruta-accionable-roadmap-r4)
   - 5.1 Visión General del Plan de Remediación
   - 5.2 Fase 1: Blindaje Crítico de Seguridad y OPSEC (Inmediato: Semanas 1 a 2)
   - 5.3 Fase 2: Reestructuración Arquitectónica y Concurrencia (Corto Plazo: Semanas 3 a 4)
   - 5.4 Fase 3: Soberanía del Motor IA Local y STT Offline (Mediano Plazo: Meses 1 a 2)
   - 5.5 Fase 4: Refactorización Frontend, Estado Global y CI/CD (Largo Plazo: Meses 2 a 3)
   - 5.6 Conclusiones y Recomendaciones Estratégicas para Mandos y Desarrolladores

---

# 1. RESUMEN EJECUTIVO

### 1.1 Propósito Central y Misión de la Plataforma
**SIMCOP** (**S**istema **I**ntegrado de **M**ando y **C**ontrol **OP**eracional) es una plataforma militar de comando, control, comunicaciones, computación, inteligencia, vigilancia y reconocimiento (**C4ISR**), diseñada para acelerar y optimizar el **Proceso Militar de Toma de Decisiones (PMTD)** en las Fuerzas Militares, con especial alineación hacia la doctrina del **Ejército Nacional de Colombia** y los estándares de interoperabilidad de la **OTAN** (MIL-STD-2525 / APP-6).

La misión estratégica de SIMCOP es unificar las fuentes dispersas de telemetría táctica, informes de inteligencia, solicitudes de apoyo de fuego y niveles de inventario logístico en una **Imagen Operacional Común (COP - Common Operational Picture)** tridimensional, en tiempo real y contextualizada geoespacialmente. La plataforma proporciona soporte decisional a todos los escalones de mando: desde la visión estratégica nacional del Comandante del Ejército hasta la gestión táctica inmediata del Comandante de Pelotón en primera línea.

```
+─────────────────────────────────────────────────────────────────────────────+
|                         SIMCOP OPERATIONAL HORIZON                          |
+─────────────────────────────────────────────────────────────────────────────+
|  [ESTRATÉGICO]   Comando General / División  ──>  COP Nacional / OSINT      |
|  [OPERACIONAL]   Brigada / Batallón          ──>  PMTD / Wargaming / ORDOP  |
|  [TÁCTICO]       Compañía / Pelotón          ──>  INSITOP / Contactos / Q5  |
|  [APOYO FUEGO]   Batería / CDT Artillería    ──>  FCS / Balística / MRSI    |
|  [SOSTENIMIENTO] S1 a S6 Plana Mayor         ──>  Personal / Logística P.   |
+─────────────────────────────────────────────────────────────────────────────+
```

### 1.2 Evaluación Global del Estado del Sistema y Nivel de Madurez Técnica
SIMCOP demuestra un nivel de madurez funcional avanzado en su interfaz gráfica y modelado doctrinal militar, reflejando un conocimiento minucioso de la terminología de combate, plantillas de órdenes de operaciones (5 párrafos SMEPC), simbología de gráficos operacionales y cálculos balísticos de artillería.

No obstante, la auditoría técnica integral revela que el sistema se encuentra en un estado de **alta vulnerabilidad de seguridad, desacoplamiento arquitectónico crítico y simulación parcial en su motor de Inteligencia Artificial nativo**, lo que impide su despliegue operativo en ambientes de combate o redes militares de misión crítica en su estado actual.

### 1.3 Capacidades y Fortalezas Sobresalientes
1. **Modelado Doctrinal Preciso**: Implementación rigurosa de los flujos de trabajo de Estado Mayor (S1 a S6), Órdenes de Operaciones estructuradas (ORDOP), informes estandarizados (INSITOP, AAR, Q5) y matriz de inteligencia OTAN (Fiabilidad A–F y Credibilidad 1–6).
2. **Visualización Geoespacial 3D Inmersiva**: Integración de CesiumJS con renderizado de terreno tridimensional, perfiles de elevación, zonas de cobertura de radar, conos de observación y simbología dinámica OTAN mediante `milsymbol`.
3. **Cálculo Balístico Computarizado Completo**: Módulo balístico (`utils/ballistics.ts`) para 8 sistemas de armas de artillería y morteros (155mm, LG-1 Mk III, M101A1, L119, M120, HY1-12, MLRS), incorporando correcciones climáticas (viento, presión, temperatura) y algoritmos de impacto simultáneo de múltiples proyectiles (**MRSI**).
4. **Asistente Táctico por Voz con Streaming Bidireccional**: Integración avanzada de la API Gemini 2.0 Flash Live mediante `AudioWorkletProcessor` (16 kHz PCM) y WebSocket directo, permitiendo comandos por voz manos libres y manipulación de cámara en el mapa 3D mediante *Tool Calling*.
5. **Algoritmo de Ruteo Táctico A***: Implementación en Python de un motor de búsqueda de rutas óptimas sobre modelos de elevación digital (DEM) que pondera pendiente, fricción climática y zonas de desenfilada respecto a amenazas enemigas.

### 1.4 Principales Focos de Vulnerabilidad, Riesgo y Deuda Técnica
1. **Falsa Inferencia de Inteligencia Artificial (Ghost AI)**: El archivo de pesos neuronales `simcop_nlp_weights_quantized_int8.pth` (296 MB) está compuesto **100% por bytes nulos (`\x00`)**. El microservicio Python `api_server.py` captura el error de carga y emula la inferencia mediante expresiones regulares, retardos simulados (`time.sleep()`) y telemetría MLOps con puntuaciones de confianza generadas al azar.
2. **Vulnerabilidad Crítica de Ejecución Remota de Código (RCE)**: `api_server.py` (Línea 50) utiliza `torch.load(..., weights_only=False)`, habilitando la deserialización insegura de objetos Pickle.
3. **Credenciales y Secretos en Duro**: El backend Spring Boot (`DataInitializer.java`) crea en cada arranque usuarios administrativos (`admin`/`superadmin`) con contraseñas fijas (`password`), expone claves secretas estáticas JWT en texto claro y contiene tokens OSINT hardcodeados en endpoints públicos.
4. **Fugas de Información Operacional (OPSEC)**: El cliente frontend realiza peticiones HTTP directas no autenticadas a servicios públicos externos (`open-meteo.com`, `bigdatacloud.net`, `rainviewer.com`), transmitiendo coordenadas geográficas exactas del teatro de operaciones y Áreas de Interés (AOI) tácticas.
5. **Bypass de Catálogo Militar y Path Traversal**: El controlador `MilitaryUnitController.java` entrega el catálogo completo de tropas y coordenadas si la petición no incluye token JWT (bajo la asunción incorrecta de una conexión SIGEP segura). A su vez, `FileStorageService.java` no valida secuencias de escape de directorio (`..`).
6. **Cuellos de Botella y Fugas de Memoria**: `AIQueueService.java` utiliza un ejecutor monohilo secuencial (`SingleThreadExecutor`) con timeout de 30 minutos y un `ConcurrentHashMap` que almacena tareas históricas sin política de expiración (TTL/LRU), generando riesgo de denegación de servicio (DoS) y agotamiento de memoria (OOM).

### 1.5 Resumen Numérico de Métricas Clave

| Métrica / Dimensión del Sistema | Conteo / Valor Cuantificado | Detalle Técnico |
|---|---|---|
| **Vistas Frontend (SPA)** | **26 vistas** | 24 Vistas principales (`ViewType`) + 2 Vistas de Comandante de Pelotón y Compañía |
| **Controladores REST Backend** | **31 controladores** | Spring Boot 3.2.5 con Spring Data JPA y Spring Security |
| **Endpoints REST Backend** | **140+ endpoints** | Cobertura completa de unidades, fuego, logística, inteligencia y administración |
| **Endpoints Motor IA (FastAPI)** | **11 endpoints** | Wargaming, predicción logística, extracción Q5, BMA y comandos de voz |
| **Roles de Usuario (RBAC)** | **18 roles tácticos** | Niveles Estratégico, Operacional, Táctico, Estados Mayores S1-S6 y CDT |
| **Sistemas de Artillería Soportados** | **8 sistemas** | 155mm, LG1 105mm, M101A1, L119, M120 120mm, HY1-12, MLRS Cohetes, Mortero 60mm |
| **Hallazgos de Seguridad / Calidad** | **26 hallazgos** | **10 Críticos (38.5%)**, **11 Medios (42.3%)**, **5 Bajos (19.2%)** |
| **Integridad del Modelo IA Local** | **0% Neuronal** | Archivo `.pth` de 296 MB con relleno $100\%$ `\x00`; inferencia 100% heurística |
| **Líneas de Código en `App.tsx`** | **1,264 líneas** | Monolito de estado con acoplamiento de 15 submódulos y streaming de voz |
| **Instancias `as any` en Frontend** | **> 40 instancias** | Ausencia de `strict: true` en `tsconfig.json` y degradación de seguridad de tipos |

---

# 2. ANÁLISIS DE CONTEXTO OPERATIVO Y MAPEO FUNCIONAL (R1)

### 2.1 Identidad y Propósito Doctrinal del Sistema

SIMCOP se posiciona como una herramienta de comando y control de siguiente generación orientada a satisfacer los requerimientos doctrinales del **Ejército Nacional de Colombia** en teatros de operaciones complejos y multidominio.

```
                          ┌───────────────────────────┐
                          │   DOCTRINA MILITAR EJC    │
                          │        MANUALES EJC       │
                          └─────────────┬─────────────┘
                                        │
        ┌───────────────────────────────┼───────────────────────────────┐
        ▼                               ▼                               ▼
┌────────────────┐             ┌────────────────┐             ┌────────────────┐
│      PMTD      │             │  ESTÁNDAR OTAN │             │   APOYO FUEGO  │
│  Planeamiento  │             │   MIL-STD-2525 │             │ CDT Artillería │
│  5 Párrafos    │             │   APP-6 / Q5   │             │ Corrección Met │
│  (SMEPC/ORDOP) │             │ Fusión Intel   │             │   FCS / MRSI   │
└────────────────┘             └────────────────┘             └────────────────┘
```

1. **Doctrina del Proceso Militar de Toma de Decisiones (PMTD)**:
   - Facilita el ciclo sistemático de planeamiento: Recepción de la Misión, Análisis de la Misión, Desarrollo de Cursos de Acción (COA), Análisis y Comparación de COA (Wargaming), Aprobación del COA y Emisión de la Orden de Operaciones (ORDOP).
   - Estructura formal de Órdenes de Operaciones (ORDOP) en **5 Párrafos Doctrinales (SMEPC)**:
     * **1. Situación**: Fuerzas enemigas, fuerzas amigas, agregaciones/segregaciones y entorno operacional.
     * **2. Misión**: Tarea y propósito claro de la unidad comandante (Quién, Qué, Cuándo, Dónde y Para Qué).
     * **3. Ejecución**: Intención del comandante, concepto de la operación por fases, esquema de maniobra, tareas a unidades subordinadas e instrucciones de coordinación.
     * **4. Administración y Logística**: Abastecimiento de Clases I (Raciones), III (Combustible/POL), V (Municiones), servicios de sanidad militar y evacuación médica (MEDEVAC).
     * **5. Mando y Comunicaciones**: Ubicación de puestos de mando, frecuencias principales/alternas, santo y seña, y directivas de guerra electrónica.

2. **Estándares de Interoperabilidad OTAN (MIL-STD-2525 / APP-6)**:
   - Representación visual de unidades tácticas mediante simbología vectorial estandarizada (identidad de afiliación: Amigo [Azul], Hostil [Rojo], Neutral [Verde], Desconocido [Amarillo]; escalón: División, Brigada, Batallón, Compañía, Pelotón, Escuadra).
   - Matriz de Evaluación de Fuentes de Inteligencia OTAN estandarizada:
     * **Fiabilidad de la Fuente**: A (Completamente Confiable), B (Usualmente Confiable), C (Bastante Confiable), D (No Usualmente Confiable), E (No Confiable), F (Fiabilidad Imposible de Juzgar).
     * **Credibilidad de la Información**: 1 (Confirmada por Otras Fuentes), 2 (Probablemente Verdadera), 3 (Posiblemente Verdadera), 4 (Dudosamente Verdadera), 5 (Improbable), 6 (Veracidad Imposible de Juzgar).

3. **Balística y Centro de Dirección de Tiro (CDT)**:
   - Solución balística computarizada para artillería de campaña y morteros pesados basada en tablas de tiro balísticas y modelos matemáticos de trayectoria parabólica corregida por meteorología (velocidad y dirección del viento, presión barométrica, temperatura y altitud).

---

### 2.2 Matriz Completa de Roles y Actores del Sistema (18 Roles)

El sistema implementa un modelo de Control de Acceso Basado en Roles (**RBAC**) con 18 roles técnicos y operativos (`types/index.ts:674–694` y `UserRole.java`), distribuidos en 5 niveles de responsabilidad:

| # | Rol Técnico | Nombre Doctrinal / Pantalla | Escalón / Nivel Operacional | Responsabilidades Clave y Alcance |
|---|---|---|---|---|
| 1 | `ADMINISTRATOR` | Administrador General de TI | Estratégico / TI | Gestión de usuarios, asignación de roles, auditoría de base de datos, 2FA y configuración de infraestructura. |
| 2 | `COMANDANTE_EJERCITO` | Comandante del Ejército | Estratégico Nacional | Visión global de todas las Divisiones (`NATIONAL_VIEW`), aprobación estratégica y directivas generales. |
| 3 | `COMANDANTE_DIVISION` | Comandante de División | Operacional Mayor | Monitoreo de Brigadas orgánicas, seguimiento de áreas operacionales extensas y asignación de reservas. |
| 4 | `COMANDANTE_BRIGADA` | Comandante de Brigada | Táctico Superior | Supervisión de Batallones, aprobación de apoyos de artillería pesada y análisis de inteligencia S2. |
| 5 | `COMANDANTE_BATALLON` | Comandante de Batallón | Táctico / Plana Mayor | Emisión y publicación de ORDOPs, control de Compañías, dirección de combate y asignación táctica. |
| 6 | `COMANDANTE_COMPANIA` | Comandante de Compañía | Táctico Intermedio | Vista especializada (`CompanyCommanderView`): aprobación de novedades y consumos de pelotones subordinados. |
| 7 | `COMANDANTE_PELOTON` | Comandante de Pelotón | Táctico Terreno | Vista especializada (`PlatoonCommanderView`): reporte de novedades de combate, solicitud de fuego y acuse de OPORDs. |
| 8 | `OFICIAL_INTELIGENCIA` | Oficial de Inteligencia (B2/G2) | Plana Mayor (S2/G2) | Ingesta, validación y clasificación de reportes HUMINT/SIGINT/IMINT/OSINT y generación de mapas de calor. |
| 9 | `OFICIAL_LOGISTICA` | Oficial de Logística (B4/G4) | Plana Mayor (S4/G4) | Control de inventarios de Clases I, III y V, gestión de tickets de reabastecimiento y cálculo de autonomía. |
| 10 | `GESTOR_REPORTES` | Gestor de Reportes y Novedades | Operacional | Generación de reportes flash Q5, consolidación de informes AAR y mantenimiento de la cronología histórica. |
| 11 | `COMANDANTE_PIEZA_ARTILLERIA` | Comandante de Batería / Pieza | Apoyo de Fuego | Recepción de misiones de tiro, puntería de la pieza y confirmación de disparos ejecutados (`confirmShotFired`). |
| 12 | `COMANDANTE_OBSERVADOR_ADELANTADO` | Observador Adelantado (FO) | Apoyo de Fuego Terreno | Identificación de blancos hostiles, fijación de coordenadas en mapa y ajuste de tiro (*Call for Fire*). |
| 13 | `DIRECTOR_TIRO_155` | Director de Tiro - Obús 155mm | CDT / Artillería Pesada | Cálculo y emisión de órdenes de tiro balístico para piezas Santa Bárbara / M109 de 155mm. |
| 14 | `DIRECTOR_TIRO_M101A1` | Director de Tiro - Obús M101A1 | CDT / Artillería 105mm | Solución de tiro y corrección de deriva para obuses remolcados M101A1 de 105mm. |
| 15 | `DIRECTOR_TIRO_LG1` | Director de Tiro - LG-1 Mk III | CDT / Artillería 105mm | Solución de tiro computarizada de alta precisión para obuses ligeros Nexter LG-1 Mk III. |
| 16 | `DIRECTOR_TIRO_L119` | Director de Tiro - L119 Light Gun | CDT / Artillería Ligera | Solución de tiro rápido para piezas ligeras aerotransportadas L119 de 105mm. |
| 17 | `DIRECTOR_TIRO_M120` | Director de Tiro - Mortero M120 | CDT / Morteros Pesados | Cálculo balístico para morteros pesados de 120mm M120 y sus tablas de carga propelente. |
| 18 | `DIRECTOR_TIRO_HY112` | Director de Tiro - Mortero HY1-12 | CDT / Morteros 120mm | Cálculo de tiro para morteros de 120mm HY1-12 de alta cadencia. |

*(Nota: Adicionalmente, el sistema incluye soporte doctrinal para el rol `DIRECTOR_TIRO_MLRS` para sistemas de lanzacohetes múltiples).*

---

### 2.3 Mapeo de Flujos Operativos y Recorridos de Usuario (*User Journeys*) de Extremo a Extremo

#### 2.3.1 Flujo 1: Ciclo de Vida del Combate, Novedades Tácticas, AAR y Generación Automatizada de Reporte Q5

```
+─────────────────────────────────────────────────────────────────────────────+
|               FLUJO 1: CICLO DE COMBATE, AAR Y REPORTE FLASH Q5             |
+─────────────────────────────────────────────────────────────────────────────+
 [1. Unidad en Contacto] ──> [2. Botón "En Combate"] ──> [3. Alerta Instantánea]
                                                                │
                                                                ▼
 [4. Fin de Combate / Cese] <──────────────────────── [Telegram Comms Bot]
             │
             ▼
 [5. Registro de AAR (After Action Report)]
     - Bajas amigas / enemigas (KIA, WIA, MIA)
     - Munición gastada (%) y material capturado
             │
             ▼
 [6. Ingesta Pipeline IA / NLP (utils/geminiService.ts)]
     - Conversión de coordenadas a DMS
     - Extracción estructurada: QUÉ, QUIÉN, CUÁNDO, DÓNDE, HECHOS, ACCIONES
             │
             ▼
 [7. Generación de Reporte Q5 Flash Estándar]
             │
             ▼
 [8. Difusión Automática Vía Telegram a Comandantes Superiores]
             │
             ▼
 [9. Registro Permanente e Inmutable en "Caja Negra" (UnitHistoryEvent)]
```

- **Módulos y Componentes Involucrados**:
  * Frontend: `components/CommunicationsView.tsx`, `components/AARModalComponent.tsx`, `components/Q5ViewComponent.tsx`.
  * Backend Spring Boot: `AfterActionReportController.java`, `Q5ReportController.java`, `TelegramService.java`, `UnitHistoryEventController.java`.
  * Motor IA: `geminiService.ts` (`generateQ5ReportContentFromAAR`), `api_server.py` (`POST /api/v1/intelligence/generate_q5`).
- **Valor Operacional**: Reduce el tiempo de consolidación de novedades críticas de combate de un promedio doctrinal de 4 horas a **menos de 60 segundos**, asegurando la fidelidad probatoria jurídica y la toma de decisiones inmediata en el Puesto de Mando.

---

#### 2.3.2 Flujo 2: Apoyo de Fuegos y Centro de Dirección de Tiro (CDT / Artillería)

```
+─────────────────────────────────────────────────────────────────────────────+
|             FLUJO 2: PEDIDO DE FUEGO Y DIRECCIÓN DE TIRO (CDT / FCS)        |
+─────────────────────────────────────────────────────────────────────────────+
 [1. Observador Adelantado (FO) o Pelotón detecta Blanco en Mapa 3D Cesium]
                                    │
                                    ▼
 [2. Emisión de Solicitud de Fuego (Call for Fire - CFF)]
     - Coordenadas de objetivo (Lat/Lon/Alt) y tipo de blanco (Infantería, Blindados)
                                    │
                                    ▼
 [3. Notificación Push Inmediata a Canal Telegram de Artillería]
                                    │
                                    ▼
 [4. Centro de Dirección de Tiro (CDT) - ArtilleryViewComponent]
     - Selección de Batería disponible (155mm, LG1, M120, etc.)
                                    │
                                    ▼
 [5. Cálculo Balístico Computarizado (utils/ballistics.ts)]
     - Azimut táctico (mils / grados) y Ángulo de Elevación
     - Carga propelente y Tiempo de Vuelo (ToF en segundos)
     - Corrección atmosférica (Velocidad/Dirección del Viento, Presión, Temperatura)
     - Opción MRSI (Multiple Rounds Simultaneous Impact: disparos en arcos alto y bajo)
                                    │
                                    ▼
 [6. Emisión de Orden de Fuego a la Pieza]
                                    │
                                    ▼
 [7. Disparo y Confirmación de Ejecución (confirmShotFired)]
                                    │
                                    ▼
 [8. Descuento Automático de Munición Clase V en el Inventario de la Batería]
```

- **Módulos y Componentes Involucrados**:
  * Frontend: `components/ArtilleryViewComponent.tsx`, `components/FireMissionControlComponent.tsx`, `utils/ballistics.ts`.
  * Backend Spring Boot: `FireMissionController.java`, `ArtilleryPieceController.java`, `ForwardObserverController.java`, `FireMissionService.java`.
- **Valor Operacional**: Automatiza la trigonometría balística bajo presión de combate, mitigando el error humano en las tablas de tiro, reduciendo el riesgo de fuego amigo (*fratricide*) y habilitando fuegos de saturación sincronizados.

---

#### 2.3.3 Flujo 3: Planeamiento Táctico, Cursos de Acción (COA) y Wargaming

```
+─────────────────────────────────────────────────────────────────────────────+
|               FLUJO 3: PLANEAMIENTO COA, WARGAMING Y EMISIÓN ORDOP          |
+─────────────────────────────────────────────────────────────────────────────+
 [1. Estado Mayor delimita Área de Operaciones (AOI) y Objetivo en Mapa 3D]
                                    │
                                    ▼
 [2. Activación de Copiloto Táctico IA (AnalysisView / geminiService.ts)]
     - Análisis de terreno DEM (pendientes, corredores de movilidad, desenfiladas)
     - Cruce de unidades amigas disponibles vs. Inteligencia enemiga (S2)
                                    │
                                    ▼
 [3. Generación Automatizada del Plan COA en Fases]
     - Fase I: Aislamiento y Fijación
     - Fase II: Maniobra de Asalto Principal
     - Fase III: Consolidación y Explotación del Éxito
     - Gráficos Militares OTAN (PL RED, AXIS IRON, OBJ LION, AA VIPER)
                                    │
                                    ▼
 [4. Simulación de Enfrentamiento / Wargaming (simulateCOAOutcome)]
     - Detección de puntos de fricción y vulnerabilidades de flanco
     - Estimación de probabilidad de éxito, consumo de munición y pronóstico de bajas
                                    │
                                    ▼
 [5. Aprobación del Comandante y Exportación a Formato ORDOP de 5 Párrafos]
                                    │
                                    ▼
 [6. Publicación Clasificada y Notificación con Acuse de Recibo Obligatorio]
```

- **Módulos y Componentes Involucrados**:
  * Frontend: `components/AnalysisView.tsx`, `components/ORDOPViewComponent.tsx`, `utils/geminiService.ts`.
  * Backend Spring Boot: `COAPlanController.java`, `OperationsOrderController.java`, `OperationalGraphicController.java`.
  * Motor IA: `api_server.py` (`POST /api/v1/wargaming/generate_coa`, `POST /api/v1/wargaming/simulate_outcome`).
- **Valor Operacional**: Estructura el proceso mental del Estado Mayor, reduce el tiempo de confección de órdenes operacionales de días a minutos y somete los planes a estrés simulado previo al despliegue de tropas.

---

#### 2.3.4 Flujo 4: Cadena de Suministros y Logística Predictiva (Clases I, III, V)

```
+─────────────────────────────────────────────────────────────────────────────+
|              FLUJO 4: MONITOREO Y LOGÍSTICA PREDICTIVA (S4/G4)              |
+─────────────────────────────────────────────────────────────────────────────+
 [1. Telemetría de Unidades] (Combustible %, Raciones disponibles, Munición %)
                                    │
                                    ▼
 [2. Motor de Predicción Logística (api_server.py / logistics/predictive)]
     - Proyección de autonomía en horas según ritmo operacional y terreno
                                    │
                                    ▼
 [3. Detección de Umbrales Críticos (< 25% Raciones, < 20% Combustible, < 15% Munición)]
                                    │
                                    ▼
 [4. Generación Automática de Alerta Táctica (AlertSeverity.HIGH)]
                                    │
                                    ▼
 [5. Apertura de Requerimiento de Reabastecimiento (LogisticsRequest)]
                                    │
                                    ▼
 [6. Asignación de Escalón de Transporte y Despacho del Convoy Logístico]
                                    │
                                    ▼
 [7. Confirmación de Entrega y Restablecimiento de Niveles Operativos]
```

- **Módulos y Componentes Involucrados**:
  * Frontend: `components/LogisticsViewComponent.tsx`, `services/logisticsService.ts`.
  * Backend Spring Boot: `LogisticsRequestController.java`, `MilitaryUnitController.java`, `BMAController.java`.
  * Motor IA: `api_server.py` (`POST /api/v1/logistics/predictive`).

---

#### 2.3.5 Flujo 5: Gestión de Efectivos de Personal y Organización de Fuerza (ORBAT / S1)

```
+─────────────────────────────────────────────────────────────────────────────+
|            FLUJO 5: GESTIÓN DE PERSONAL, ORBAT Y EFECTIVOS REALES (S1)      |
+─────────────────────────────────────────────────────────────────────────────+
 [1. Carga de Tabla de Organización y Equipo (TOE Doctrinal)]
                                    │
                                    ▼
 [2. Comparación Automática con Efectivos Reales en Terreno]
     - Detección de brechas de personal por especialidad militar (MOS)
                                    │
                                    ▼
 [3. Novedades de Personal (Permisos, Descansos, Reentrenamiento, MEDEVAC)]
                                    │
                                    ▼
 [4. Descuento Automático del Pie de Fuerza Disponible en el ORBAT Activo]
                                    │
                                    ▼
 [5. Generación de Informe INSITOP con Efectivos Actualizados y Coordenadas DANE]
```

- **Módulos y Componentes Involucrados**:
  * Frontend: `components/PersonnelView.tsx`, `components/OrganizationStructureView.tsx`, `components/RetrainingAreaViewComponent.tsx`, `components/InsitopViewComponent.tsx`.
  * Backend Spring Boot: `SoldierController.java`, `SpecialtyCatalogController.java`, `MilitaryUnitController.java`.

---

### 2.4 Catálogo Exhaustivo de Módulos Funcionales

#### 2.4.1 Módulos Frontend: Catálogo de 26 Vistas Especializadas

| # | Identificador `ViewType` | Componente React | Archivo Fuente | Propósito y Capacidades Principales |
|---|---|---|---|---|
| 1 | `DASHBOARD` | `DashboardView` | `components/DashboardView.tsx` | Cuadro de mando ejecutivo: resumen de tropas desplegadas, alertas tácticas urgentes no leídas, resumen de inteligencia y estado general del teatro. |
| 2 | `UNITS` | `UnitsView` | `components/UnitsView.tsx` | Inventario y gestión de unidades tácticas (División a Pelotón): ubicación, estado de combate, combustible, munición, raciones y comandante a cargo. |
| 3 | `MAP3D` | `Map3DDisplayComponent` | `components/Map3DDisplayComponent.tsx` | Globo terráqueo Cesium 3D con terreno altimétrico, simbología OTAN militar (`milsymbol`), dibujo de AOI, conos de radar, perfiles de elevación y mapa de calor de amenazas. |
| 4 | `INTEL` | `IntelView` | `components/IntelView.tsx` | Ingesta, catalogación y filtrado de reportes HUMINT, SIGINT, IMINT, GEOINT; aplicación de matriz OTAN de fiabilidad (A–F) y credibilidad (1–6); visualización de eventos OSINT. |
| 5 | `ALERTS` | `AlertsView` | `components/AlertsView.tsx` | Centro unificado de alertas operacionales: rutinas peligrosas, falta de reporte >4h, unidades en combate, inmovilidad prolongada y anomalías logísticas. |
| 6 | `ANALYSIS` | `AnalysisView` | `components/AnalysisView.tsx` | Consola del Copiloto Táctico IA: generación de Cursos de Acción (COA), simulador Wargaming de choque de fuerzas, asistente doctrinal y análisis de micro-relieve. |
| 7 | `BMA` | `BMAPanel` | `components/BMAPanel.tsx` | Algoritmo de Gestión del Área de Batalla (*Battle Management Area*): cálculo de letalidad, detección de puntos calientes (*hotspots*), intercepción balística y recomendación de fuego. |
| 8 | `COMMUNICATIONS` | `CommunicationsView` | `components/CommunicationsView.tsx` | Monitoreo de enlaces horarios de radio, detección automática de comunicaciones vencidas (4h), botón de pánico "En Combate", configuración de bots Telegram y registro de AARs. |
| 9 | `ARTILLERY` | `ArtilleryViewComponent` | `components/ArtilleryViewComponent.tsx` | Centro de Dirección de Tiro (CDT): catálogo de piezas de artillería y morteros, observadores adelantados (FO), cálculo de soluciones balísticas y misiones de fuego activas. |
| 10 | `UAV` | `UAVManagementView` | `components/UAVManagementView.tsx` | Gestión de vehículos aéreos no tripulados (drones de reconocimiento y ataque): asignación a unidades, autonomía de batería, radio de acción y feeds de video. |
| 11 | `ORDOP` | `ORDOPViewComponent` | `components/ORDOPViewComponent.tsx` | Editor y gestor de Órdenes de Operaciones estructuradas en 5 párrafos SMEPC; clasificación de seguridad (SECRETO/RESERVADO), publicación y auditoría de acuse de recibo. |
| 12 | `ORBAT` | `OrganizationStructureView` | `components/OrganizationStructureView.tsx` | Árbol jerárquico del Orden de Batalla (Cadena de Mando): asignación de comandantes, subordinación orgánica y delimitación de Áreas de Operación (AO) en GeoJSON. |
| 13 | `HISTORICAL` | `HistoricalViewComponent` | `components/HistoricalViewComponent.tsx` | Repositorio histórico de combates: archivo de After Action Reports (AAR), estadísticas de bajas amigas/enemigas, consumo de munición y lecciones aprendidas. |
| 14 | `Q5` | `Q5ViewComponent` | `components/Q5ViewComponent.tsx` | Gestor de reportes tácticos estandarizados Q5: visualización de campos Qué, Quién, Cuándo, Dónde, Hechos y Acciones; retransmisión por canales de mensajería táctica. |
| 15 | `RETRAINING` | `RetrainingAreaViewComponent` | `components/RetrainingAreaViewComponent.tsx` | Control del personal en descanso, permiso o reentrenamiento operacional; deducción automática del pie de fuerza disponible para planeamiento realista. |
| 16 | `UNITHISTORY` | `UnitHistoryViewComponent` | `components/UnitHistoryViewComponent.tsx` | Auditoría inmutable de eventos ("Caja Negra"): registro cronológico inalterable de todos los movimientos, cambios de estado, disparos de artillería y órdenes recibidas. |
| 17 | `INSITOP` | `InsitopViewComponent` | `components/InsitopViewComponent.tsx` | Informe de Situación Topográfica y Operacional: coordenadas geográficas en grados minutos segundos (DMS), códigos DANE de municipios, situación orgánica y exportación a CSV. |
| 18 | `SPOT` | `SpotViewComponent` | `components/SpotViewComponent.tsx` | Integración de telemetría satelital: visualización de tracks y posiciones transmitidas por balizas Garmin InReach / SPOT desplegadas con patrullas en selva. |
| 19 | `LOGISTICS` | `LogisticsViewComponent` | `components/LogisticsViewComponent.tsx` | Control de inventarios de Clases I (Raciones), III (Combustible), V (Munición); creación, aprobación y seguimiento de requerimientos de abastecimiento. |
| 20 | `PERSONNEL` | `PersonnelView` | `components/PersonnelView.tsx` | Gestión de personal militar (S1/G1): comparación de efectivos reales vs TOE, listado nominal, código MOCE, estado médico y situación jurídica de combatientes. |
| 21 | `SPECIALTY_CATALOG` | `SpecialtyCatalogManager` | `components/SpecialtyCatalogManager.tsx` | Catálogo de Especialidades Militares (MOS) del Ejército: definición de códigos y perfiles para oficiales, suboficiales y soldados (ej. Infantería 11B, Explosivistas EXDE). |
| 22 | `USERS` | `UserManagementViewComponent` | `components/UserManagementViewComponent.tsx` | Administración de usuarios del sistema: asignación de los 18 roles tácticos, vinculación a unidades militares subordinadas y activación de 2FA. |
| 23 | `SETTINGS` | `SettingsView` | `components/SettingsView.tsx` | Configuración técnica del sistema: selección de proveedor de IA (Gemini, Ollama, LM Studio, Nativo), claves de API, tokens de Telegram y proveedor meteorológico. |
| 24 | `ADMIN_DB` | `AdminDashboardComponent` | `components/AdminDashboardComponent.tsx` | Panel de control de infraestructura: métricas de almacenamiento, visor de tablas de base de datos, logs de auditoría administrativa y operaciones protegidas con TOTP 2FA. |
| 25 | *(Especializada)* | `PlatoonCommanderView` | `components/platoon/PlatoonCommanderView.tsx` | Interfaz táctica simplificada y de alto contraste para Comandantes de Pelotón: reporte rápido de novedades, acuse de OPORD y llamada de fuego indirecto. |
| 26 | *(Especializada)* | `CompanyCommanderView` | `components/company/CompanyCommanderView.tsx` | Interfaz táctica intermedia para Comandantes de Compañía: supervisión de pelotones subordinados, aprobación de novedades y consolidación de municiones. |

---

#### 2.4.2 Módulos Backend: Catálogo de 31 Controladores REST (Spring Boot 3)

| # | Controlador Spring Boot | Ruta Base | Archivo Fuente | Responsabilidad Principal |
|---|---|---|---|---|
| 1 | `MilitaryUnitController` | `/api/units` | `backend/.../MilitaryUnitController.java` | CRUD de unidades militares, actualización de coordenadas, misiones, niveles de suministro e INSITOP. |
| 2 | `IntelligenceReportController`| `/api/intel` | `backend/.../IntelligenceReportController.java` | Ingesta, consulta y filtrado de reportes de inteligencia clasificada por fuente y fiabilidad. |
| 3 | `AlertController` | `/api/alerts` | `backend/.../AlertController.java` | Registro, consulta y acuse de recibo de alertas tácticas operacionales y de sistema. |
| 4 | `OperationsOrderController` | `/api/ordops` | `backend/.../OperationsOrderController.java` | Ciclo de vida de órdenes OPORD de 5 párrafos SMEPC, publicación y auditoría de lectura. |
| 5 | `ArtilleryPieceController` | `/api/artillery` | `backend/.../ArtilleryPieceController.java` | Registro, ubicación y estado operativo de piezas de artillería y morteros. |
| 6 | `ForwardObserverController` | `/api/observers` | `backend/.../ForwardObserverController.java` | Gestión de observadores adelantados (FO) desplegados en primera línea. |
| 7 | `FireMissionController` | `/api/fire-missions` | `backend/.../FireMissionController.java` | Creación, asignación de batería, cambio de estado y confirmación de disparo de misiones de fuego. |
| 8 | `BMAController` | `/api/bma` | `backend/.../BMAController.java` | Recomendaciones tácticas del Battle Management Area, cálculo de letalidad y hotspots. |
| 9 | `COAPlanController` | `/api/coa-plans` | `backend/.../COAPlanController.java` | Persistencia y serialización de Cursos de Acción (COA), fases y gráficos militares. |
| 10 | `OperationalGraphicController`| `/api/graphics` | `backend/.../OperationalGraphicController.java` | Almacenamiento de capas y plantillas de información de combate (PICC / GeoJSON). |
| 11 | `AfterActionReportController`| `/api/aar` | `backend/.../AfterActionReportController.java` | Registro y consulta de informes posteriores a la acción (AAR) de unidades en combate. |
| 12 | `Q5ReportController` | `/api/q5` | `backend/.../Q5ReportController.java` | Almacenamiento y consulta de reportes tácticos estandarizados Q5. |
| 13 | `LogisticsRequestController` | `/api/logistics` | `backend/.../LogisticsRequestController.java` | Creación, aprobación y despacho de requerimientos de abastecimiento de Clases I, III, V. |
| 14 | `SoldierController` | `/api/soldiers` | `backend/.../SoldierController.java` | Listado nominal de combatientes, estado médico, situación jurídica y código MOCE. |
| 15 | `SpecialtyCatalogController` | `/api/specialty-catalog` | `backend/.../SpecialtyCatalogController.java`| Catálogo de especialidades MOS del Ejército Nacional. |
| 16 | `UAVController` | `/api/uav` | `backend/.../UAVController.java` | Asignación de drones, misiones de reconocimiento y telemetría de vuelo. |
| 17 | `OsintController` | `/api/osint` | `backend/.../OsintController.java` | Ingesta, verificación y consulta de eventos tácticos de fuentes abiertas (OSINT). |
| 18 | `TelegramController` | `/api/telegram` | `backend/.../TelegramController.java` | Configuración y despacho de mensajes a canales de Telegram (Comunicaciones y CDT). |
| 19 | `WeatherController` | `/api/weather` | `backend/.../WeatherController.java` | Consulta y evaluación de impacto táctico del clima mediante OpenWeather API. |
| 20 | `WebhookController` | `/api/webhooks` | `backend/.../WebhookController.java` | Recepción de telemetría SPOT/Garmin y reportes automáticos de campo. |
| 21 | `UserController` | `/api/users` | `backend/.../UserController.java` | Autenticación JWT, registro de usuarios y consulta de perfiles y permisos. |
| 22 | `TwoFactorController` | `/api/2fa` | `backend/.../TwoFactorController.java` | Generación de secreto TOTP, código QR y validación de doble factor de autenticación. |
| 23 | `AdminController` | `/api/admin` | `backend/.../AdminController.java` | Estadísticas globales de BD, visor de tablas, auditoría y operaciones administrativas. |
| 24 | `ConfigurationController` | `/api/config` | `backend/.../ConfigurationController.java` | Gestión de claves API (Gemini, OpenWeather, Telegram) y selección de motor de IA. |
| 25 | `FileController` | `/api/files` | `backend/.../FileController.java` | Carga y descarga de archivos adjuntos (anexos de inteligencia, fotos de reconocimiento). |
| 26 | `UnitHistoryEventController` | `/api/history` | `backend/.../UnitHistoryEventController.java` | Consulta del registro cronológico inmutable de eventos de unidades ("Caja Negra"). |
| 27 | `AIController` | `/api/ai` | `backend/.../AIController.java` | Encolamiento de tareas de Inteligencia Artificial y consulta de estado de inferencia. |
| 28 | `HealthController` | `/api/health` | `backend/.../HealthController.java` | Endpoints de verificación de estado y disponibilidad del sistema (Liveness / Readiness). |
| 29 | `TacticalStatusController` | `/api/tactical-status`| `backend/.../TacticalStatusController.java` | Estado táctico consolidado de fuerzas y alertas operacionales. |
| 30 | `InteropController` | `/api/interop` | `backend/.../InteropController.java` | Interoperabilidad e intercambio de datos con sistemas externos (SIOCH / SIGEP). |
| 31 | `TestController` | `/api/test` | `backend/.../TestController.java` | Endpoints de diagnóstico y pruebas de integración interna. |

---

#### 2.4.3 Motor de IA: Catálogo de 11 Endpoints Especializados (Python FastAPI)

| # | Endpoint FastAPI | Método | Payload Principal | Funcionalidad Táctica Implementada |
|---|---|---|---|---|
| 1 | `/api/v1/system/kpis` | `GET` | N/A | Telemetría MLOps: tiempo de actividad, latencia de inferencia en ms, índice de confianza y lista de modelos activos. |
| 2 | `/api/v1/wargaming/generate_coa` | `POST` | `{ prompt, units, enemy_intel }` | Generación de planes COA estructurados en fases con gráficos militares OTAN (Phase Lines, Axis of Advance, Objectives). |
| 3 | `/api/v1/wargaming/simulate_outcome` | `POST` | `{ coa_plan, friendly_units, enemy_units }` | Simulación wargaming de choque de fuerzas: estimación de puntos de falla, resistencia enemiga y consumo de recursos. |
| 4 | `/api/v1/wargaming/simulate_bma` | `POST` | `{ defense_unit, threat, weather }` | Simulación de intercepción de artillería del BMA: probabilidad de éxito (%), riesgo y cálculo de daños colaterales. |
| 5 | `/api/v1/wargaming/bma_brief` | `POST` | `{ threat, recommendation, weather }` | Redacción de resumen ejecutivo de situación táctica para el Comandante Regional (máximo 150 palabras). |
| 6 | `/api/v1/logistics/predictive` | `POST` | `{ units_inventory }` | Análisis de inventario y estimación de tiempo de agotamiento crítico de Clase I (Raciones), Clase III (Combustible) y Clase V (Munición). |
| 7 | `/api/v1/intelligence/generate_q5` | `POST` | `{ aar_text, raw_data }` | Extracción y estandarización del reporte Q5 (Qué, Quién, Cuándo, Dónde, Hechos, Acciones) a partir de AARs no estructurados. |
| 8 | `/api/v1/intelligence/proactive` | `POST` | `{ friendly_units, enemy_intel, alerts }` | Detección proactiva de riesgos inminentes cruzando tropas amigas, inteligencia enemiga y alertas activas. |
| 9 | `/api/v1/intelligence/terrain_weather` | `POST` | `{ elevation_grid, weather_data, threat_layers }` | Evaluación del impacto de la topografía, clima y capas de amenaza sobre la movilidad y operaciones aéreas (Ruta óptima A*). |
| 10 | `/api/v1/system/translate_command` | `POST` | `{ voice_command_text }` | Traducción de comandos de voz u órdenes textuales a acciones de interfaz (*Natural Language Function Calling*, ej. `focusOnUnit`). |
| 11 | `/api/v1/intelligence/query` | `POST` | `{ tactical_scenario, doctrine_query }` | Análisis táctico y doctrinal exhaustivo ante escenarios de combate complejos planteados por el Estado Mayor. |

---

# 3. AUDITORÍA TÉCNICA, CALIDAD DE CÓDIGO Y SEGURIDAD (R2)

### 3.1 Frontend: React 19 + TypeScript + CesiumJS

```
+─────────────────────────────────────────────────────────────────────────────+
|                         FRONTEND ARCHITECTURE MAP                           |
+─────────────────────────────────────────────────────────────────────────────+
|  [App.tsx] ── Monolito Central (1,264 líneas / 20+ variables de estado)      |
|    ├── Audio Streaming (Web Audio API / AudioWorkletProcessor @ 16 kHz)     |
|    ├── WebSocket Live Connection (Gemini 2.0 Flash Exp)                     |
|    ├── View Router (24 ViewTypes + 2 Vistas de Comandante)                  |
|    └── Cross-Hook Prop Drilling:                                            |
|          ├── useTacticalOps (Timers en cliente / Broadcasts)                |
|          ├── useUnitsManagement (CRUD / Telemetría SPOT)                    |
|          └── useArtilleryManagement (Soluciones Balísticas / FCS)           |
+─────────────────────────────────────────────────────────────────────────────+
|  [Map3DDisplayComponent.tsx] ── Cesium 3D Viewer (3,106 líneas)             |
|    ├── Milsymbol NATO MIL-STD-2525 Canvas Rendering                         |
|    ├── WebGL Dynamic Layer Ingestion & DEM Elevation Profiles               |
|    └── FUGAS OPSEC: fetch(open-meteo.com) & fetch(bigdatacloud.net)         |
+─────────────────────────────────────────────────────────────────────────────+
```

#### 3.1.1 Arquitectura y Acoplamiento Monolítico en `App.tsx`
- **Diagnóstico**: `App.tsx` contiene 1,264 líneas de código y asume simultáneamente las responsabilidades de enrutador visual, concentrador de estado global de más de 15 módulos, cliente WebSockets de audio en tiempo real, gestor de autenticación y puente de comunicación entre componentes mediante *Prop Drilling* de hasta 4 niveles de profundidad.
- **Impacto**: La carencia de un patrón de arquitectura de estado global inmutable (Zustand, Redux Toolkit o React Context estructurado) provoca renderizados redundantes en cascada en toda la aplicación ante cualquier cambio de estado menor (como la recepción de un ping de telemetría de una unidad).

#### 3.1.2 Capa de Hooks Modulares y Sincronización de Estado
- Los hooks en `hooks/modules/` (`useTacticalOps.ts`, `useUnitsManagement.ts`, `useArtilleryManagement.ts`) aíslan la lógica de negocio, pero dependen de `React.Dispatch` y estados pasados por referencia desde `App.tsx`.
- En `useTacticalOps.ts` (Líneas 27–72), se implementa un temporizador en el navegador (`setInterval`) que evalúa periódicamente si las comunicaciones de las unidades superan las 4 horas de silencio. Si se detecta un vencimiento, el hook ejecuta mutaciones HTTP al backend y emite alertas de sistema. En un entorno multi-usuario con 10 operadores conectados, esto genera **10 peticiones concurrentes duplicadas y condiciones de carrera en base de datos**.

#### 3.1.3 Calidad de Tipado y Ausencia de `strict: true`
- El archivo `tsconfig.json` no tiene habilitada la directiva `"strict": true`.
- Se identificaron más de **40 instancias de degradación de tipo explícita con `as any`** en archivos clave como `Map3DDisplayComponent.tsx`, `useBackendData.ts` y `geminiService.ts`, desactivando las garantías del compilador de TypeScript ante desalineaciones de esquemas JSON con el backend.

#### 3.1.4 Gestión de Memoria WebGL y Ciclos de Vida en CesiumJS
- En `components/Map3DDisplayComponent.tsx` (3,106 líneas), la instancia del visor de Cesium se inicializa en un `useEffect`. Si bien cuenta con llamadas a `viewer.destroy()`, existen sub-efectos asíncronos que agregan proveedores de imágenes dinámicos (`UrlTemplateImageryProvider`) y listeners de cámara (`viewer.camera.moveEnd`). Transiciones rápidas entre pestañas del SPA provocan que primitivas gráficas queden huérfanas en el contexto WebGL antes de ser recolectadas, incrementando el consumo de VRAM en estaciones de trabajo de comando.

#### 3.1.5 Persistencia Local Insegura de Datos Tácticos
- En `utils/geminiService.ts` (Líneas 105–110, 144–150), los análisis operacionales, evaluaciones proactivas y pronósticos logísticos generados por IA se almacenan en el `localStorage` del navegador bajo claves de texto plano (`simcop_last_result_proactiveAnalysis`). En terminales tácticos compartidos, esta práctica expone inteligencia militar clasificada a usuarios no autorizados después de cerrar la sesión.

---

### 3.2 Backend: Java 17 + Spring Boot 3.2.5

```
+─────────────────────────────────────────────────────────────────────────────+
|                         BACKEND ARCHITECTURE MAP                            |
+─────────────────────────────────────────────────────────────────────────────+
|  [Security Layer] ── Spring Security + JwtAuthenticationFilter              |
|    ├── Permissive endpoints: /api/users/register, /api/osint/webhook        |
|    └── Flaw: MilitaryUnitController bypasses JWT if Authorization is empty   |
+─────────────────────────────────────────────────────────────────────────────+
|  [Service & Business Layer]                                                 |
|    ├── AIQueueService ── SingleThreadExecutor + Unbounded Memory Map        |
|    ├── FileStorageService ── Path Traversal vulnerability (Missing startsWith)
|    └── TelegramService ── Dual bot dispatch (Comms & CDT Artillery)        |
+─────────────────────────────────────────────────────────────────────────────+
|  [Persistence Layer]                                                        |
|    ├── Spring Data JPA / Hibernate ── DDL Auto: none                        |
|    ├── Flyway Migrations ── spring.flyway.enabled=false                     |
|    └── DataInitializer ── Hardcoded admin/password creation on startup      |
+─────────────────────────────────────────────────────────────────────────────+
```

#### 3.2.1 Arquitectura en Capas y Servicios Transaccionales
- El backend presenta una separación clara entre Controladores REST, Servicios transaccionales (`@Service`) y Repositorios (`JpaRepository`).
- Sin embargo, se detectaron brechas graves de validación de identidad en los controladores:
  * **Inseguridad BOLA / IDOR en `TelegramController.java:26`**: El método `updateTelegramConfig(@PathVariable String userId, @RequestBody Map<String, String> payload)` no verifica si el `userId` de la URL coincide con el usuario autenticado en el token JWT, permitiendo a cualquier operador alterar la configuración de mensajería de cualquier otro mando militar.
  * **Suplantación de Usuario en `ConfigurationController.java:60, 131`**: Los endpoints de guardado de configuraciones aceptan el campo `username` directamente en el cuerpo JSON del request en lugar de extraerlo de forma segura del `SecurityContextHolder`.

#### 3.2.2 Bypass de Catálogo en `MilitaryUnitController.java`
- En `MilitaryUnitController.java` (Líneas 34–37), se encuentra codificada la siguiente lógica de elusión:
  ```java
  if (token == null || token.isEmpty()) {
      logger.info("📡 Sincronización Server-to-Server detectada (Sin token JWT). Retornando catálogo completo para SIGEP.");
      return repository.findAll();
  }
  ```
  Cualquier atacante en la red que envíe una petición `GET /api/units` sin cabecera `Authorization` recibe el inventario militar completo de unidades, posiciones geográficas y niveles logísticos.

#### 3.2.3 Manejo de Archivos y Path Traversal en `FileStorageService.java`
- En `FileStorageService.java` (Líneas 59–63):
  ```java
  Path filePath = this.fileStorageLocation.resolve(fileName).normalize();
  Resource resource = new UrlResource(filePath.toUri());
  ```
  No se valida que `filePath.startsWith(this.fileStorageLocation)`. Un atacante puede suministrar nombres de archivo con secuencias de escape de directorio (`../../../../etc/shadow` o `..\\..\\Windows\\System32\\drivers\\etc\\hosts`) para acceder a archivos arbitrarios del servidor host.

#### 3.2.4 Esquemas de Persistencia, Flyway y Modelado JPA
- En `application.properties`: `spring.flyway.enabled=false` y `spring.jpa.hibernate.ddl-auto=none`. Un despliegue en una base de datos limpia fallará si no se aplican manualmente los scripts SQL.
- En `User.java` (Línea 22), la anotación `@Column(unique = true)` sobre el atributo `username` se encuentra comentada. El registro de dos usuarios con el mismo nombre corrompe el proceso de autenticación (`IncorrectResultSizeDataAccessException` en Hibernate).

---

### 3.3 Matriz Estructurada de Riesgos y Hallazgos Técnicos (26 Hallazgos)

A continuación se presenta la matriz completa de los 26 hallazgos técnicos identificados y verificados en la auditoría del código fuente, clasificados bajo el estándar de severidad industrial:

| ID | Severidad | Categoría | Componente / Archivo | Línea(s) | Descripción Técnica del Fallo | Recomendación de Mitigación |
|---|---|---|---|---|---|---|
| **SEC-01** | 🔴 **Crítica** | Seguridad / RCE | `api_server.py` | 50 | Invocación de `torch.load(..., weights_only=False)` permite Ejecución Remota de Código mediante deserialización de pickles adulterados. | Establecer `weights_only=True` o migrar a formato seguro Safetensors. |
| **SEC-02** | 🔴 **Crítica** | Seguridad / Credenciales | `DataInitializer.java` | 54, 66, 78 | Creación obligatoria en cada arranque de usuarios `admin` y `superadmin` con contraseña fija `"password"`. | Generar contraseñas criptográficamente seguras en el log o exigir cambio en 1er login. |
| **SEC-03** | 🔴 **Crítica** | Seguridad / Secretos | `OsintController.java` | 78-82 | Token del Webhook OSINT codificado en duro (`"simcop-osint-secret-2026"`) en endpoint público `permitAll()`. | Mover a variable de entorno `${OSINT_WEBHOOK_SECRET}` inyectada en runtime. |
| **SEC-04** | 🔴 **Crítica** | Seguridad / Secretos | `application.properties`, `docker-compose.yml` | `prop:28`, `dc:16` | Secreto de firma JWT predeterminado (`404E6352...`) en texto plano en archivos de configuración base. | Exigir variable obligatoria `JWT_SECRET`; rechazar arranque si se usa la clave default. |
| **SEC-05** | 🔴 **Crítica** | Seguridad / Fuga OPSEC | `Map3DDisplayComponent.tsx`, `App.tsx` | `Map:656, 703`, `App:271` | Peticiones HTTP directas del navegador a APIs públicas de terceros exponiendo coordenadas militares. | Enrutar consultas a través de un proxy inverso autenticado en el backend militar. |
| **SEC-06** | 🔴 **Crítica** | Seguridad / Bypass | `MilitaryUnitController.java` | 34-37 | Peticiones sin token JWT retornan el catálogo completo bajo asunción de sincronización SIGEP. | Eliminar el bypass incondicional; exigir autenticación mutua mTLS o API Key dedicada. |
| **SEC-07** | 🔴 **Crítica** | Seguridad / Path Traversal | `FileStorageService.java` | 59-63 | `loadFileAsResource` resuelve rutas con `resolve().normalize()` sin validar contención de directorio. | Validar estrictamente: `if (!filePath.startsWith(this.fileStorageLocation)) throw SecurityException`. |
| **ARQ-01** | 🔴 **Crítica** | Arquitectura / Ghost AI | `api_server.py` | 44-638 | Los pesos neuronales cargados en VRAM nunca son evaluados; la inferencia se emula con regex y `time.sleep()`. | Integrar un motor de inferencia real (`llama-cpp-python` / ONNX) con modelo GGUF cuantizado. |
| **ARQ-02** | 🔴 **Crítica** | Arquitectura / Concurrencia | `useTacticalOps.ts` | 27-72 | Temporizador en navegador (`setInterval`) dispara broadcasts y mutaciones de BD, causando condiciones de carrera. | Trasladar la verificación de comunicaciones vencidas a una tarea `@Scheduled` en Spring Boot. |
| **PERF-01** | 🔴 **Crítica** | Rendimiento / Memory Leak | `AIQueueService.java` | 18, 39 | `ConcurrentHashMap<String, TaskInfo> tasks` acumula tareas históricas indefinidamente sin TTL/LRU. | Implementar un cache con expiración por tiempo (Caffeine Cache / TTL 30 min / max 1,000 items). |
| **SEC-08** | 🟡 **Media** | Seguridad / BOLA-IDOR | `TelegramController.java` | 26-42 | `PUT /api/telegram/config/{userId}` permite a cualquier usuario autenticado modificar el Chat ID de otro usuario. | Validar que el `userId` coincida con el usuario del token JWT o que el rol sea `ADMINISTRATOR`. |
| **SEC-09** | 🟡 **Media** | Seguridad / SQL Injection | `AdminController.java` | 68, 70-76, 120 | Concatenación dinámica de nombres de tablas en consultas SQL y volcado masivo de tablas sin ocultar hashes ni 2FA. | Usar consultas parametrizadas, validar tablas contra lista blanca y ofuscar campos sensibles. |
| **SEC-10** | 🟡 **Media** | Seguridad / Suplantación | `ConfigurationController.java` | 60, 131, 164, 196 | Endpoints de configuración toman el `username` del cuerpo JSON del cliente en vez del contexto de seguridad JWT. | Extraer el nombre de usuario autenticado mediante `SecurityContextHolder.getContext()`. |
| **SEC-11** | 🟡 **Media** | Seguridad / Fuga de Claves | `GeminiService.java` | 23, 140 | La clave API de Gemini se envía como parámetro de consulta URL (`?key=...`), registrándose en logs de acceso HTTP. | Enviar la clave en la cabecera HTTP `x-goog-api-key` en peticiones POST. |
| **SEC-12** | 🟡 **Media** | Seguridad / CORS Inválido | `api_server.py` | 22-26 | Configuración combinada de `allow_origins=["*"]` con `allow_credentials=True` violando el estándar W3C. | Restringir orígenes permitidos a dominios militares autorizados (`http://localhost:5173`, etc.). |
| **ARQ-03** | 🟡 **Media** | Arquitectura / Cuello Botella | `AIQueueService.java`, `GeminiService.java` | `Queue:19`, `Gem:21` | Cola de IA basada en `SingleThreadExecutor` con timeout de 30 minutos, bloqueando solicitudes concurrentes. | Configurar un `ThreadPoolTaskExecutor` con 4-8 hilos concurrentes y timeouts de 30 segundos. |
| **ARQ-04** | 🟡 **Media** | Arquitectura / Acoplamiento | `App.tsx` | 71-1264 | Monolito de más de 1,200 líneas que centraliza estado de 15 módulos, audio WebSockets y enrutamiento visual. | Desacoplar estado global mediante un store modular liviano (Zustand) y separar rutas. |
| **DATA-01** | 🟡 **Media** | Integridad / Base de Datos | `User.java` | 22-23 | Restricción de unicidad comentada (`// @Column(unique = true)`), permitiendo usernames duplicados que rompen login. | Descomentar `@Column(unique = true, nullable = false)` y aplicar migración en base de datos. |
| **DATA-02** | 🟡 **Media** | Integridad / Rendimiento | `MilitaryUnitController.java` | 185 | Colección `routeHistory` en `MilitaryUnit` acumula telemetría SPOT sin límite máximo ni paginación. | Limitar la persistencia de tracks a los últimos N puntos (ej. 500) o crear entidad histórica paginada. |
| **DEP-01** | 🟡 **Media** | Dependencias / Supply Chain | `package.json`, `Dockerfile` | `pkg:12`, `df:5` | Versión flotante `"latest"` para `@google/genai` y uso de `npm install` en lugar de `npm ci` en Docker. | Fijar versión semántica exacta y utilizar `npm ci` en pipelines de construcción de contenedores. |
| **DEP-02** | 🟡 **Media** | Dependencias / Sin Fijar | `requirements.ai.txt` | 1-5 | Dependencias de Python sin versiones fijas (`torch`, `fastapi`, `uvicorn`), arriesgando quiebre de build. | Fijar versiones específicas en `requirements.ai.txt` (`torch==2.3.0`, `fastapi==0.111.0`, etc.). |
| **QUAL-01** | 🟢 **Baja** | Calidad / Tipado TypeScript | `tsconfig.json`, Múltiples | `ts:2`, Múltiples | Modo estricto (`strict: true`) ausente en `tsconfig.json` y uso de más de 40 castings `as any`. | Habilitar `strict: true` y tipar adecuadamente DTOs de comunicación con backend. |
| **QUAL-02** | 🟢 **Baja** | Calidad / Telemetría Falsa | `api_server.py` | 649, 668 | Métricas MLOps de confianza (`confidence_score`) y lista de modelos activos son valores aleatorios simulados. | Conectar la telemetría a métricas reales de GPU (`pynvml`) y certidumbre real del modelo. |
| **QUAL-03** | 🟢 **Baja** | Calidad / Exposición UI | `ErrorBoundary.tsx` | 88-103 | El componente de captura de errores de React muestra el Stack Trace completo en la interfaz del operador. | Restringir la visualización del stack trace a modo desarrollo (`import.meta.env.DEV`). |
| **QUAL-04** | 🟢 **Baja** | Calidad / Logging | `JwtAuthenticationFilter.java` | 35-41, 56 | Uso de `System.out.println` y `System.err.println` en lugar de un framework de logging estructurado. | Reemplazar por SLF4J / Logback (`logger.warn()`, `logger.error()`). |
| **QUAL-05** | 🟢 **Baja** | Calidad / Puertos | `.env`, `application.properties` | `env:1`, `prop:25` | El archivo `.env` apunta a `http://localhost:8082` mientras que Spring Boot escucha en `8080`. | Estandarizar la variable `VITE_API_URL=http://localhost:8080` en toda la configuración del proyecto. |

---

### 3.4 Análisis de Dependencias, Contenedorización e Infraestructura

1. **Análisis de `package.json` y `Dockerfile` (Frontend)**:
   - `@google/genai: "latest"`: La dependencia no especifica versión mayor ni menor. Una actualización de Google que modifique la API romperá automáticamente los despliegues futuros.
   - En el `Dockerfile` multietapa de Nginx, se invoca `RUN npm install` en lugar de `RUN npm ci`. Esto ignora la inmutabilidad de `package-lock.json` y produce artefactos no deterministas.

2. **Análisis de `requirements.ai.txt` y `Dockerfile.ai` (Backend Python)**:
   - `requirements.ai.txt` contiene únicamente los nombres de paquetes (`fastapi`, `uvicorn`, `pydantic`, `torch`, `psutil`) sin ningún operador de versión (`==`).
   - `Dockerfile.ai` descarga la versión de PyTorch para CPU (`--extra-index-url https://download.pytorch.org/whl/cpu`), lo que confirma que el contenedor nativo no posee aceleración por hardware CUDA en su configuración de despliegue estándar.

3. **Análisis de `docker-compose.yml`**:
   - Se expone la contraseña de MySQL en texto claro (`MYSQL_ROOT_PASSWORD=password`).
   - Se referencia una red Docker externa estática (`coolify: external: true`), lo que impide el levantamiento autónomo con `docker-compose up` en servidores que no utilicen la plataforma Coolify.

---

# 4. EVALUACIÓN ESPECIALIZADA DEL SUBSISTEMA DE INTELIGENCIA ARTIFICIAL (IA / NLP) (R3)

### 4.1 Análisis Forense del Archivo de Pesos Cuantizados (`simcop_nlp_weights_quantized_int8.pth`)

```
+─────────────────────────────────────────────────────────────────────────────+
|               FORENSIC ANALYSIS: WEIGHT FILE (.pth) INSPECTION              |
+─────────────────────────────────────────────────────────────────────────────+
|  Archivo: simcop_nlp_weights_quantized_int8.pth                             |
|  Ruta: c:\DESARROLLOS\SIMCOP-main\simcop_nlp_weights_quantized_int8.pth     |
|  Tamaño Físico: 310,354,942 bytes (295.98 MiB)                              |
+─────────────────────────────────────────────────────────────────────────────+
|  Estructura Esperada (PyTorch Zip / Pickle):                                |
|  - Magic Bytes PKZip (\x50\x4B\x03\x04) o Pickle Opcode (\x80\x02/\x04)    |
|  - Metadatos de tensores, tensores cuantizados INT8 y state_dict            |
+─────────────────────────────────────────────────────────────────────────────+
|  RESULTADO DE LA INSPECCIÓN BINARIA HEXADECIMAL:                            |
|  00000000: 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00  ................ |
|  00000010: 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00  ................ |
|  ... [310,354,942 BYTES NULOS CONTIGUOS \x00] ...                          |
|  128220BE: 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00  ................ |
|                                                                             |
|  DICTAMEN FORENSE: EL ARCHIVO ES UN DUMMY BINARIO VACÍO (100% BYTES NULOS). |
|  NO CONTIENE REDES NEURONALES, TENSORES INT8 NI PESOS ENTRENADOS.           |
+─────────────────────────────────────────────────────────────────────────────+
```

- **Inspección Técnica**:
  El archivo `simcop_nlp_weights_quantized_int8.pth` de 296 MB ubicado en la raíz del repositorio fue sometido a una verificación forense byte a byte. El análisis confirmó que el archivo está conformado por **310,354,942 bytes nulos (`0x00`) continuos**.
- **Consecuencia**: Cuando `torch.load()` intenta deserializar el archivo, la librería de PyTorch falla inmediatamente con un error de unpickling (`UnpicklingError: invalid load key, '\x00'`).

---

### 4.2 Evaluación del Motor Nativo en `api_server.py`

#### 4.2.1 Captura de Fallo de Deserialización e Inferencia Simulada
En `api_server.py` (Líneas 44–58), la clase `SimcopNativeEngine` maneja el fallo de deserialización de la siguiente manera:
```python
if os.path.exists(MODEL_PATH):
    try:
        self.weights = torch.load(MODEL_PATH, map_location=self.device, weights_only=False)
        print("[OK] Pesajes de la red neuronal (.pth) cargados NATIVAMENTE en la VRAM (RTX 5070 Ti).")
    except Exception as e:
        print(f"[ADVERTENCIA] Error cargando el archivo .pth, continuando con inferencia simulada. Error: {e}")
        self.weights = None
```
Al fallar la carga, el motor asigna `self.weights = None` y continúa su ejecución sin abortar el proceso.

#### 4.2.2 Emulación Heurística por Expresiones Regulares y Plantillas Doctrinales
En las líneas 59–66 de `api_server.py`, el código reconoce explícitamente la ausencia de un modelo neuronal activo:
```python
def generate_response(self, prompt: str, expect_json: bool = False):
    time.sleep(random.uniform(1.0, 2.5)) # Simulando tiempo de cómputo en VRAM
    # Como este es un entorno simulado y la red no tiene un tokenizer integrado en el código,
    # inyectamos respuestas lógicas según la ruta para mantener el sistema operativo offline.
```
El motor analiza los prompts entrantes mediante expresiones regulares (`re.search(r'Objetivo: (.*?)\n', prompt)`) e inserta los parámetros capturados en plantillas predefinidas de texto militar.

#### 4.2.3 Retardos Artificiales y Telemetría MLOps Sintética
- **Latencia Simulada**: Cada llamada a inferencia ejecuta `time.sleep(random.uniform(1.0, 2.5))`, bloqueando el hilo de ejecución síncrono del worker de FastAPI.
- **Métricas Falsas**: El endpoint `GET /api/v1/system/kpis` (Líneas 648–669) genera una puntuación de confianza aleatoria (`random.uniform(85.0, 99.5)`) y devuelve una lista estática de modelos inexistentes: `["NLP_Commander", "GNN_Wargaming", "CNN_AO", "LSTM_Logistics"]`.

#### 4.2.4 Algoritmo Real Implementado: Búsqueda de Rutas A* sobre Terreno Altimétrico
A pesar de la ausencia de inferencia neuronal, `api_server.py` implementa un algoritmo genuino y robusto de **Navegación Táctica A*** sobre mallas de elevación digital (Líneas 268–321):
- Calcula la distancia geodésica mediante la fórmula de Haversine.
- Aplica una penalización por pendiente altimétrica ($\Delta \text{elevación} \times 0.015$).
- Incorpora un factor de fricción meteorológica ($1.8\times$ ante lluvia torrencial o tormenta eléctrica).
- Pondera la proximidad a posiciones enemigas conocidas mediante una función de penalización por línea de vista: $\text{penalización} = \frac{5.0}{\max(0.1, \text{distancia\_km})}$ cuando la distancia es inferior a 3.0 km.

---

### 4.3 Orquestación Multi-Proveedor de Inteligencia Artificial (4 Modos de Operación)

SIMCOP implementa una arquitectura híbrida con 4 proveedores de Inteligencia Artificial configurables en caliente desde `SettingsView.tsx`:

```
+─────────────────────────────────────────────────────────────────────────────+
|                         SIMCOP AI PROVIDER ECOSYSTEM                        |
+─────────────────────────────────────────────────────────────────────────────+
|  [1. GEMINI CLOUD]          ──> Google Gemini 1.5 Flash (REST / Backend)    |
|                                 Google Gemini 2.0 Flash Exp (Live Voice WS) |
+─────────────────────────────────────────────────────────────────────────────+
|  [2. LOCAL OLLAMA]          ──> On-Premise Workstation (localhost:11434)    |
|                                 Modelos: Llama-3-8B / Gemma-2-9B (Offline)  |
+─────────────────────────────────────────────────────────────────────────────+
|  [3. LOCAL LMLink / STUDIO] ──> P2P Mesh Tunnel (WireGuard / Tailscale)     |
|                                 GPU Remota Servidor Dedicado                |
+─────────────────────────────────────────────────────────────────────────────+
|  [4. NATIVE SIMCOP]         ──> Python FastAPI Microservice (Puerto 8000)   |
|                                 A* Altimétrico + Reglas Heurísticas         |
+─────────────────────────────────────────────────────────────────────────────+
```

#### Matriz Comparativa Multidimensional de Proveedores de IA:

| Dimensión / Criterio | `GEMINI` (Google Cloud) | `LOCAL_OLLAMA` (On-Premise) | `LOCAL_LMLink` (Mesh P2P) | `NATIVE_SIMCOP` (Python) |
|---|---|---|---|---|
| **Tipo de Alojamiento** | Nube Pública (GCP) | Servidor Local / Estación | Servidor GPU Remoto Privado | Contenedor Local / Docker |
| **Modelos Ejecutados** | Gemini 1.5 Flash / 2.0 Flash Exp | Llama-3-8B, Gemma-2, Mistral | Gemma4, Damasco, Llama-3 | Motor Heurístico + A* |
| **Requisito de Internet** | **Obligatorio** (Conexión WAN) | **Ninguno** (100% Air-Gapped) | **Red Local / LAN Militar** | **Ninguno** (100% Offline) |
| **Comando por Voz en Vivo** | **Soportado** (Gemini Live API) | No soportado | No soportado | No soportado |
| **Salida JSON Estructurada** | Esquema forzado por Prompt | `format: "json"` nativo | `type: "json_object"` | Plantillas JSON Regex |
| **Latencia Promedio** | 800 ms – 2,200 ms | 1,500 ms – 5,000 ms (según GPU) | 700 ms – 1,800 ms | 1,000 ms – 2,500 ms (Mock) |
| **Consumo de VRAM / RAM** | 0 MB VRAM (Cliente liviano) | 6 GB – 16 GB VRAM | Offloaded a servidor remoto | < 250 MB RAM (CPU Docker) |
| **Sanitización de Razonamiento**| N/A | Stripping `<thought>` (DeepSeek/Gemma) | Stripping `<thought>` | N/A |

---

### 4.4 Pipeline de Audio y Voz en Tiempo Real

```
+─────────────────────────────────────────────────────────────────────────────+
|                     REAL-TIME VOICE PIPELINE ARCHITECTURE                   |
+─────────────────────────────────────────────────────────────────────────────+
  [Micrófono Operador] (navigator.mediaDevices.getUserMedia)
          │
          ▼
  [AudioContext @ 16 kHz] (Web Audio API)
          │
          ▼
  [AudioWorkletProcessor] (audio-processor.js / inline worklet)
    - Conversión Float32 a Int16 PCM: Math.max(-1, Math.min(1, x)) * 0x7FFF
    - Zero-copy Transferable ArrayBuffer a hilo principal
          │
          ▼
  [Base64 Encoding & Packaging] (Blob audio/pcm;rate=16000)
          │
          ▼ (WebSocket Stream Seguro)
  [Google Gemini 2.0 Flash Live API] (gemini-2.0-flash-exp)
          │
          ├──────────────────────────────────────────┐
          │                                          │
          ▼ (Audio Stream 24 kHz)                    ▼ (Tool Call JSON)
  [AudioContext @ 24 kHz Playback]          [Client Tool: focusOnUnit]
    - Int16 a Float32                          - Extracción nombre de unidad
    - Programación de buffer monótona          - Panorámica de cámara en Cesium 3D
```

1. **Captura en Cliente (`AudioWorkletProcessor`)**:
   - En `App.tsx` (Líneas 599–615), la captura de voz se ejecuta fuera del hilo principal de UI utilizando un `AudioWorklet`.
   - Procesa tramas de audio a 16,000 Hz en bloques de 128 muestras (~8 ms por paquete), convirtiendo Float32 a enteros con signo de 16 bits (`Int16Array`).
2. **Reproducción de Voz Sintetizada a 24 kHz**:
   - El audio de respuesta del modelo llega codificado en PCM de 24 kHz. En `App.tsx` (Líneas 650–668), se programa la reproducción secuencial mediante un apuntador monótono de tiempo (`nextStartTimeRef.current += audioBuffer.duration`), evitando distorsiones por solapamiento.
3. **Interacción Bidireccional (*Function Calling*)**:
   - El asistente de voz está configurado con la herramienta `focusOnUnit(unitName: string)`. Al recibir una orden verbal como *"SIMCOP, enfoca al Pelotón Cóndor 1"*, el modelo emite la llamada a la función y el cliente frontend desplaza automáticamente la cámara del mapa 3D hacia las coordenadas de la unidad.
4. **Vulnerabilidad de Dependencia Exclusiva de Nube**:
   - **No existe ningún motor de transcripción local (STT) integrado** (como Vosk WebAssembly o Whisper.cpp). Si el enlace satelital o de internet se interrumpe (o ante guerra electrónica/bloqueo de frecuencias), la interfaz de voz queda totalmente inoperativa.

---

### 4.5 Evaluación de Pipelines NLP de Extracción y Clasificación Táctica

SIMCOP define 10 tareas especializadas de procesamiento de lenguaje natural en `utils/geminiService.ts`:

| # | Función NLP | Datos de Entrada | Estructura de Salida | Propósito Doctrinal |
|---|---|---|---|---|
| 1 | `getCommandFromGemini` | Texto o voz del operador | `{ name: "focusOnUnit", args: { unitName } }` | Extracción de intención sobre mapa |
| 2 | `getProactiveAnalysis` | Unidades amigas, OSINT, alertas | Lista Markdown (3–5 riesgos/oportunidades) | Detección temprana de amenazas S2 |
| 3 | `getGeminiAnalysis` | Malla DEM, clima, tropas | Narrativa de evaluación táctica | Análisis de micro-relieve y terreno |
| 4 | `generateCOAPlan` | Objetivo táctico, tropas, S2 | JSON estructurado (Fases + Gráficos OTAN) | Planeamiento de maniobra militar |
| 5 | `generateQ5ReportContentFromAAR` | Informe AAR post-combate | JSON Q5 (Qué, Quién, Cuándo, Dónde, Hechos) | Reporte flash estandarizado EJC |
| 6 | `getDoctrinalAssistantResponse` | Consulta sobre manuales EJC | JSON / Markdown doctrinal | Asistencia en reglamento militar |
| 7 | `getPredictiveLogisticsAnalysis` | Inventario de unidades | Array de predicciones (Clases I, III, V) | Proyección de agotamiento de suministros |
| 8 | `simulateCOAOutcome` | Plan COA, ratio de fuerzas | Puntos de fricción, bajas estimadas | Simulación Wargaming de combate |
| 9 | `simulateBMAInterception` | Batería defensiva, amenaza | Probabilidad de intercepción (%), riesgo | Control de fuego y defensa de punto |
| 10 | `getBMASituationBrief` | Amenaza, clima, hotspots | Resumen ejecutivo (máximo 150 palabras) | Informe ejecutivo para el Comandante |

#### Evaluación del Pipeline de Extracción AAR a Q5:
En `utils/geminiService.ts` (Líneas 1199–1290), el pipeline mapea las 11 dimensiones de un informe post-combate AAR hacia la estructura oficial de 6 campos del reporte Q5. Las coordenadas geográficas son normalizadas a grados, minutos y segundos (DMS) mediante `decimalToDMS()`. La respuesta es saneada con expresiones regulares para remover bloques Markdown (````json`) y deserializada de forma segura con captura de excepciones.

---

### 4.6 Cuellos de Botella de Concurrencia y Viabilidad Operativa en Entornos Air-Gapped

1. **Cuello de Botella en `AIQueueService.java`**:
   - El servicio utiliza un ejecutor monohilo (`Executors.newSingleThreadExecutor()`). Todas las peticiones de IA de todos los usuarios conectados al sistema se encolan de forma estrictamente secuencial.
   - Con un tiempo de respuesta de 3 a 5 segundos por inferencia, una concurrencia de 20 operadores genera tiempos de espera superiores a 1 minuto, degradando la operatividad en situaciones de crisis.
2. **Viabilidad en Entornos Desconectados (*Air-Gapped*)**:
   - En puestos de mando avanzados sin acceso a internet, SIMCOP únicamente puede operar utilizando los modos `LOCAL_OLLAMA` o `NATIVE_SIMCOP`.
   - Dado que el motor nativo actual no realiza inferencia neuronal real, el despliegue desconectado depende obligatoriamente de contar con una instancia local de Ollama preconfigurada en el servidor de campaña.

---

# 5. PLAN DE MITIGACIÓN Y HOJA DE RUTA ACCIONABLE (ROADMAP) (R4)

### 5.1 Visión General del Plan de Remediación

Se establece un plan de remediación estructurado en **4 fases cronológicas priorizadas**, diseñado para subsanar los 26 hallazgos técnicos, blindar la seguridad operacional, dotar al sistema de verdadera soberanía en Inteligencia Artificial y preparar la plataforma para despliegues militares en producción.

```
+─────────────────────────────────────────────────────────────────────────────+
|                         SIMCOP REMEDIATION ROADMAP                          |
+─────────────────────────────────────────────────────────────────────────────+
|  [FASE 1: SEMANAS 1-2]  ──> Blindaje Crítico de Seguridad y OPSEC          |
|                             - Sanitizar torch.load, eliminar admin/password |
|                             - Eliminar bypass de catálogo y path traversal  |
|                             - Proxy inverso seguro para Open-Meteo/Geo      |
+─────────────────────────────────────────────────────────────────────────────+
|  [FASE 2: SEMANAS 3-4]  ──> Reestructuración Arquitectónica y Concurrencia  |
|                             - Mover timers de cliente a @Scheduled backend  |
|                             - ThreadPool concurrent y TTL Cache en AI Queue |
|                             - Resolver BOLA/IDOR en Telegram y Admin        |
+─────────────────────────────────────────────────────────────────────────────+
|  [FASE 3: MESES 1-2]    ──> Soberanía de Motor IA Local y STT Offline       |
|                             - Integrar llama-cpp-python + GGUF cuantizado   |
|                             - Integrar Vosk WebAssembly / Whisper offline   |
|                             - Telemetría real MLOps vía pynvml              |
+─────────────────────────────────────────────────────────────────────────────+
|  [FASE 4: MESES 2-3]    ──> Refactorización Frontend, Estado y CI/CD        |
|                             - Desacoplar App.tsx con Zustand                |
|                             - Habilitar TypeScript strict: true             |
|                             - Fijar versiones y pipeline Docker determinista|
+─────────────────────────────────────────────────────────────────────────────+
```

---

### 5.2 Fase 1: Blindaje Crítico de Seguridad y OPSEC (Inmediato: Semanas 1 a 2)

El objetivo de esta fase es erradicar las vulnerabilidades de severidad crítica que comprometen la integridad del servidor y la seguridad de las operaciones militares.

#### Acciones Específicas:
1. **Sanitización de Deserialización PyTorch (`SEC-01`)**:
   - Modificar `api_server.py:50` para forzar `weights_only=True` o migrar a carga mediante la librería `safetensors`.
2. **Eliminación de Credenciales por Defecto (`SEC-02`, `SEC-04`)**:
   - Refactorizar `DataInitializer.java` para que no inserte usuarios con contraseña `"password"`. En el primer arranque, el sistema generará una contraseña criptográfica aleatoria de 16 caracteres, la imprimirá en el log protegido del servidor y forzará su cambio en el primer inicio de sesión.
   - Configurar `application.properties` para requerir obligatoriamente la variable `${JWT_SECRET}` en el entorno, bloqueando el arranque del contenedor si se detecta la clave por defecto.
3. **Cierre de Brechas de Control de Acceso (`SEC-03`, `SEC-06`, `SEC-07`)**:
   - Eliminar el bloque de bypass en `MilitaryUnitController.java:34–37`. Exigir token JWT válido a todas las peticiones sin excepción.
   - Blindar `FileStorageService.java:59` con validación estricta de ruta:
     ```java
     Path filePath = this.fileStorageLocation.resolve(fileName).normalize();
     if (!filePath.startsWith(this.fileStorageLocation)) {
         throw new SecurityException("Intento de acceso no autorizado a ruta de archivo: " + fileName);
     }
     ```
   - Eliminar el secreto hardcodeado `"simcop-osint-secret-2026"` en `OsintController.java` y moverlo a la variable `${OSINT_WEBHOOK_SECRET}`.
4. **Mitigación de Fugas de Información OPSEC (`SEC-05`)**:
   - Eliminar las llamadas directas del frontend a `open-meteo.com` y `bigdatacloud.net`.
   - Enrutar todas las consultas a través de endpoints proxy autenticados en el backend Spring Boot (`/api/weather/current`, `/api/geo/reverse`), asegurando que en despliegues cerrados las peticiones se resuelvan contra servidores locales o bases de datos geoespaciales internas.

---

### 5.3 Fase 2: Reestructuración Arquitectónica y Concurrencia (Corto Plazo: Semanas 3 a 4)

El objetivo de esta fase es resolver cuellos de botella de rendimiento, condiciones de carrera y fallos de autorización granular.

#### Acciones Específicas:
1. **Traslado de Lógica Táctica al Backend (`ARQ-02`)**:
   - Eliminar el `setInterval` de `hooks/modules/useTacticalOps.ts`.
   - Crear un servicio programado `@Scheduled(fixedRate = 60000)` en Spring Boot (`TacticalCommsMonitoringService.java`) que evalúe periódicamente el estado de las comunicaciones de forma atómica y distribuya notificaciones a los clientes a través de WebSockets (STOMP).
2. **Optimización de la Cola de IA y Prevención de Fugas de Memoria (`PERF-01`, `ARQ-03`)**:
   - Reemplazar el `ConcurrentHashMap` de `AIQueueService.java` por un caché con tiempo de expiración (Caffeine Cache con TTL de 30 minutos y límite máximo de 1,000 entradas).
   - Migrar `Executors.newSingleThreadExecutor()` a un `ThreadPoolTaskExecutor` con un pool configurable de 4 a 8 hilos concurrentes y timeouts de ejecución de 30 segundos.
3. **Corrección de BOLA / IDOR y Suplantación (`SEC-08`, `SEC-09`, `SEC-10`, `DATA-01`)**:
   - En `TelegramController.java`, validar que el usuario autenticado en el JWT coincida con el `userId` a modificar o posea el rol `ADMINISTRATOR`.
   - En `ConfigurationController.java`, extraer la identidad del usuario exclusivamente de `SecurityContextHolder.getContext().getAuthentication().getName()`.
   - En `AdminController.java`, parametrizar consultas SQL y filtrar hashes de contraseñas y secretos 2FA en las vistas de tablas.
   - En `User.java`, descomentar la anotación `@Column(unique = true, nullable = false)`.

---

### 5.4 Fase 3: Soberanía del Motor IA Local y STT Offline (Mediano Plazo: Meses 1 a 2)

El objetivo de esta fase es transformar el subsistema de Inteligencia Artificial en un motor táctico soberano, genuinamente neuronal y autosuficiente en escenarios desconectados (*Air-Gapped*).

#### Acciones Específicas:
1. **Integración de Modelo SLM Real en Formato GGUF / ONNX (`ARQ-01`, `QUAL-02`)**:
   - Sustituir el archivo dummy `simcop_nlp_weights_quantized_int8.pth` de 296 MB por un modelo de lenguaje pequeño (SLM) cuantizado y adaptado al español militar (ej. `Llama-3.2-3B-Instruct-Q4_K_M.gguf` o `Phi-3.5-mini-instruct-onnx-int8`).
   - Integrar la librería `llama-cpp-python` o `onnxruntime-genai` dentro de `api_server.py` para ejecutar inferencia neuronal directa en CPU o GPU local sin requerir conexión a internet.
   - Empaquetar los vocabularios y tokenizadores oficiales (`tokenizer.json`, `tokenizer_config.json`).
2. **Integración de Motor de Voz Local Offline (STT / TTS) (`AI-RISK-04`)**:
   - Integrar el modelo acústico en español de Vosk (`vosk-model-small-es-0.42`) compilado a WebAssembly en el cliente frontend o Whisper.cpp en el contenedor de IA.
   - Implementar conmutación automática (*Failover*): si la conexión con Gemini Live API no está disponible, el sistema conmuta de forma transparente al motor Vosk WebAssembly local para el reconocimiento de comandos de voz.
3. **Telemetría MLOps Genuina (`QUAL-02`)**:
   - Conectar el panel de telemetría a métricas reales de hardware mediante `pynvml` (temperatura de GPU, VRAM utilizada, tokens por segundo y latencia real del pase forward).

---

### 5.5 Fase 4: Refactorización Frontend, Estado Global y CI/CD (Largo Plazo: Meses 2 a 3)

El objetivo de esta fase es consolidar la mantenibilidad del código, la estabilidad de las dependencias y la robustez del ciclo de vida del software.

#### Acciones Específicas:
1. **Desacoplamiento del Frontend con Almacén de Estado Global (`ARQ-04`)**:
   - Refactorizar `App.tsx`, delegando la gestión de estado a almacenes modulares livianos mediante **Zustand** (`useUnitStore`, `useIntelStore`, `useAlertStore`, `useArtilleryStore`).
   - Implementar React Router estructurado para sustituir el switch de 24 vistas monolítico.
2. **Tipado Estricto y Calidad de Código (`QUAL-01`, `QUAL-03`, `QUAL-04`)**:
   - Habilitar `"strict": true`, `"noImplicitAny": true` y `"strictNullChecks": true` en `tsconfig.json`.
   - Refactorizar las más de 40 instancias de `as any`, definiendo interfaces estrictas para todos los DTOs de intercambio con el backend.
   - Configurar `ErrorBoundary.tsx` para ocultar trazas de error en producción y sustituir `System.out.println` por SLF4J en el backend.
3. **Fijación Determinista de Dependencias y CI/CD (`DEP-01`, `DEP-02`)**:
   - Fijar versiones exactas en `package.json` (`@google/genai: "0.1.2"`) y `requirements.ai.txt` (`fastapi==0.111.0`, `torch==2.3.0`, `uvicorn==0.30.1`, `llama-cpp-python==0.2.77`).
   - Reemplazar `npm install` por `npm ci` en el `Dockerfile`.
   - Estandarizar la variable de entorno de puertos (`VITE_API_URL=http://localhost:8080`) en todo el proyecto.

---

### 5.6 Conclusiones y Recomendaciones Estratégicas para Mandos y Desarrolladores

1. **Para el Mando Militar y Tomadores de Decisión**:
   - SIMCOP posee un diseño conceptual y doctrinal de primer nivel que modela con fidelidad los procesos de combate y Estado Mayor de las Fuerzas Militares.
   - **No debe autorizarse su despliegue en redes operacionales activas ni en teatros de operaciones** hasta que no se hayan ejecutado en su totalidad las Fases 1 y 2 del plan de mitigación (eliminación de credenciales por defecto, resolución de vulnerabilidades RCE/Path Traversal y blindaje contra fugas OPSEC).
   - Debe asignarse prioridad a la Fase 3 para garantizar que los puestos de mando en campaña mantengan capacidades de comando por voz y asistencia táctica de IA en escenarios de silencio de radio y guerra electrónica.

2. **Para el Equipo de Desarrollo y Arquitectura**:
   - La deuda técnica identificada es subsanable mediante una refactorización disciplinada y quirúrgica.
   - La transición hacia un motor local basado en `llama-cpp-python` y modelos GGUF dotará a SIMCOP de una ventaja tecnológica real, convirtiendo la simulación heurística actual en una capacidad de Inteligencia Artificial soberana y medible.

---

**Fin del Informe Técnico Consolidado.**  
*Documento aprobado para fines de auditoría de arquitectura, evaluación de seguridad y hoja de ruta de desarrollo de SIMCOP.*
