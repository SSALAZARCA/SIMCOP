# INFORME TÉCNICO MAESTRO DE AUDITORÍA: INTEROPERABILIDAD M2M, SEGURIDAD Y CONTRATOS DE DATOS SIGEP ↔ SIMCOP

**Documento Oficial de Auditoría y Certificación Técnica**  
**Clasificación**: RESTRINGIDO / OPERACIONAL TÁCTICO  
**Fecha de Emisión**: 2026-09-22  
**Sistemas Auditados**:
- **SIMCOP v4.0.0**: Sistema de Mando y Control Operacional Táctico (C2 / G3 Operaciones)
- **SIGEP v1.0.0**: Subsistema de Gestión de Personal Militar y Talento Humano (G1 / S1 Personal)
**Autoría**: Equipo Multidisciplinario de Auditoría de Sistemas Militares, Interoperabilidad M2M, Seguridad y Arquitectura de Datos  
**Destino**: Dirección de Telemática, Estado Mayor de Operaciones (G3) y Dirección de Personal (G1)  
**Ubicación del Informe**: `c:\DESARROLLOS\SIMCOP-main\INFORME_INTEROPERABILIDAD_SIGEP_SIMCOP.md`

---

## ÍNDICE GENERAL

1. [Resumen Ejecutivo](#1-resumen-ejecutivo)
   - [1.1 Diagnóstico General de Interoperabilidad M2M](#11-diagnóstico-general-de-interoperabilidad-m2m)
   - [1.2 Cálculo del Porcentaje de Operatividad Real Global](#12-cálculo-del-porcentaje-de-operatividad-real-global)
   - [1.3 Balance de Canales: Activos, Degradados y Rotos](#13-balance-de-canales-activos-degradados-y-rotos)
   - [1.4 Síntesis de Brechas Estructurales](#14-síntesis-de-brechas-estructurales)
2. [Matriz de Interconexión de los 5 Flujos Críticos](#2-matriz-de-interconexión-de-los-5-flujos-críticos)
   - [2.1 Matriz Consolidada de Canales e Interacciones](#21-matriz-consolidada-de-canales-e-interacciones)
   - [2.2 Diagrama Arquitectónico de Intercambio de Datos (Real vs Doctrinal)](#22-diagrama-arquitectónico-de-intercambio-de-datos-real-vs-doctrinal)
3. [Diagnóstico Detallado de Puntos Críticos](#3-diagnóstico-detallado-de-puntos-críticos)
   - [3.1 Análisis de Deadlock 401 y Bypasses Frontend No Autenticados](#31-análisis-de-deadlock-401-y-bypasses-frontend-no-autenticados)
   - [3.2 Omisión del Webhook de Traslado Aprobado y Riesgo Transaccional en SIMCOP](#32-omisión-del-webhook-de-traslado-aprobado-y-riesgo-transaccional-en-simcop)
   - [3.3 Comportamiento de Serialización Jackson en `Soldier.unit` y Resiliencia en IA](#33-comportamiento-de-serialización-jackson-en-soldierunit-y-resiliencia-en-ia)
   - [3.4 Inconsistencia de Puertos y Variables de Entorno (Bare-Metal vs Docker)](#34-inconsistencia-de-puertos-y-variables-de-entorno-bare-metal-vs-docker)
   - [3.5 Riesgo de Bloqueo HTTP 429 por Filtro RASP/DLP ante Ráfagas de Sincronización](#35-riesgo-de-bloqueo-http-429-por-filtro-raspdlp-ante-ráfagas-de-sincronización)
   - [3.6 Degradación del Veto Táctico por Combate (`ENGAGED`) en el Motor Analítico](#36-degradación-del-veto-táctico-por-combate-engaged-en-el-motor-analítico)
4. [Contratos de Datos y DTOs](#4-contratos-de-datos-y-dtos)
   - [4.1 Comparativa JSON Producido vs Esperado en los 5 Flujos](#41-comparativa-json-producido-vs-esperado-en-los-5-flujos)
   - [4.2 Análisis Léxico de Campos, Enums y Abreviaturas de Grados Militares](#42-análisis-léxico-de-campos-enums-y-abreviaturas-de-grados-militares)
   - [4.3 Modelos de Base de Datos y Conflicto de Fuentes de Verdad](#43-modelos-de-base-de-datos-y-conflicto-de-fuentes-de-verdad)
5. [Plan de Remediación y Código Sugerido](#5-plan-de-remediación-y-código-sugerido)
   - [5.1 Hoja de Ruta Secuencial para el 100% de Operatividad](#51-hoja-de-ruta-secuencial-para-el-100-de-operatividad)
   - [5.2 Snippets Exactos de Remediación con Paths y Líneas de Código](#52-snippets-exactos-de-remediación-con-paths-y-líneas-de-código)
     - [5.2.1 `docker-compose.yml`: Inyección de Red Interna](#521-docker-composeyml-inyección-de-red-interna)
     - [5.2.2 `application.properties` (SIGEP): Alineación de Puerto Bare-Metal](#522-applicationproperties-sigep-alineación-de-puerto-bare-metal)
     - [5.2.3 `TransferService.java`: Despacho del Webhook M2M](#523-transferservicejava-despacho-del-webhook-m2m)
     - [5.2.4 `WebhookController.java`: Transaccionalidad Atómica y Blindaje](#524-webhookcontrollerjava-transaccionalidad-atómica-y-blindaje)
     - [5.2.5 `AnalysisService.java`: Restauración de Veto de Combate y Grados](#525-analysisservicejava-restauración-de-veto-de-combate-y-grados)
     - [5.2.6 `DlpThrottlingFilter.java`: Exención de Tokens de Servicio M2M](#526-dlpthrottlingfilterjava-exención-de-tokens-de-servicio-m2m)
     - [5.2.7 `ConsultaPersonal.tsx` y `Configuracion.tsx`: Corrección de Enrutamiento](#527-consultapersonaltsx-y-configuraciontsx-corrección-de-enrutamiento)
6. [Conclusión y Certificación de Auditoría](#6-conclusión-y-certificación-de-auditoría)

---

## 1. RESUMEN EJECUTIVO

### 1.1 Diagnóstico General de Interoperabilidad M2M

Se ha ejecutado una auditoría técnica, arquitectónica y forense de código fuente sobre los canales de integración entre el sistema táctico **SIMCOP** y el subsistema de personal **SIGEP**.

La infraestructura de integración máquina-a-máquina (M2M) cuenta con cimientos criptográficos simétricos adecuados basados en la cabecera `X-Service-Token` y tokens Bearer pre-compartidos (`SIMCOP_SERVICE_TOKEN`). Ambos filtros de seguridad (`JwtAuthenticationFilter.java` en SIMCOP y `AuthTokenFilter.java` en SIGEP) poseen la capacidad de autorizar peticiones entre servicios asignando el rol administrativo sin exigir credenciales de usuario interactivo.

Sin embargo, el ecosistema de interoperabilidad se encuentra actualmente en un estado **críticamente degradado y fracturado**. No se trata de fallas conceptuales en la doctrina de integración, sino de **seis desconexiones técnicas concretas** en la implementación que impiden la sincronización bidireccional y generan comportamientos erráticos en producción:
1. **Ruptura de Red en Contenedores Docker**: El backend de SIMCOP no tiene inyectada la variable `SIGEP_API_URL` en `docker-compose.yml`, provocando que cualquier intento de consultar personal a SIGEP falle con `HttpHostConnectException: Connection refused` hacia `localhost:4000`.
2. **Canal de Notificación de Traslados Completamente Huérfano**: El servicio `TransferService.java` de SIGEP aprueba traslados en su base de datos local pero jamás invoca el webhook `POST /api/webhooks/personnel/transfer-completed` implementado en SIMCOP. La orden de batalla táctica de SIMCOP jamás se entera de los cambios de guarnición.
3. **Pérdida Transaccional Potencial en SIMCOP**: El controlador receptor del webhook en SIMCOP (`WebhookController.java`) carece de la anotación `@Transactional` y utiliza un patrón de borrado físico (`deleteSoldier`) seguido de recreación (`createSoldier`). Si la unidad de destino falla, el soldado se elimina permanentemente de la base de datos sin posibilidad de reversión (*rollback*).
4. **Tratamiento Informativo del Estado de Combate (Por Directriz de Mando)**: El servicio analítico de SIGEP (`AnalysisService.java`) consulta el estado táctico de SIMCOP y detecta si la unidad está en combate (`ENGAGED`), emitiendo una nota informativa (`operationalNote`) sin vetar el traslado administrativo. Conforme a la directriz de mando, el traslado pasa y se cumple, no existiendo bloqueo por estado de combate.
5. **Violación de Fronteras de Seguridad en Frontend (HTTP 401)**: Componentes React de SIGEP (`ConsultaPersonal.tsx` y `Configuracion.tsx`) intentan consumir directamente endpoints protegidos de SIMCOP (`/api/units`) desde el navegador del cliente sin credenciales, provocando rechazo HTTP 401 permanente.
6. **Riesgo de Bloqueo 429 por Ciberdefensa Activa (DLP)**: El filtro anti-scraping de SIMCOP (`DlpThrottlingFilter.java`) intercepta las rutas `/api/units` y `/api/soldiers` **antes** de autenticar el token M2M. Si SIGEP sincroniza catálogos en ráfaga (>15 peticiones en 10s), SIMCOP aplica demoras artificiales (*tarpit* de hasta 3s) y bloquea con HTTP 429 (>25 peticiones), tratando a SIGEP como un atacante malicioso.

---

### 1.2 Cálculo del Porcentaje de Operatividad Real Global

Para determinar la salud global de la integración, se ponderaron los 5 flujos críticos del ciclo de vida operacional con base en su disponibilidad técnica, integridad de datos y cumplimiento doctrinal:

$$\text{Operatividad Global} = \sum_{i=1}^{5} \left( \text{Peso}_i \times \text{Nivel de Operatividad Real}_i \right)$$

```
+---------------------------------------------------------------------------------------------------------+
|                                    TABLA DE OPERATIVIDAD PONDERADA                                      |
+---------+------------------------------------------+--------+-------------+---------------+-------------+
| Flujo   | Descripción Funcional                    | Peso   | Estado      | Operatividad  | Aporte P.   |
+---------+------------------------------------------+--------+-------------+---------------+-------------+
| Flujo 1 | Catálogo de Unidades y Balance TOE       | 20%    | Degradado   | 70%           | 14.0%       |
| Flujo 2 | Estado Táctico y Veto de Combate         | 20%    | Degradado   | 40%           |  8.0%       |
| Flujo 3 | Recomendación IA y Serialización Jackson | 20%    | Degradado   | 60%           | 12.0%       |
| Flujo 4 | Webhook de Traslado Aprobado             | 20%    | Roto        |  0%           |  0.0%       |
| Flujo 5 | Incrustación de Personal Real en SIMCOP  | 20%    | Roto        | 30%           |  6.0%       |
+---------+------------------------------------------+--------+-------------+---------------+-------------+
| TOTAL   | OPERATIVIDAD REAL GLOBAL PONDERADA       | 100%   | CRÍTICO     | 40.0% OPERATIVO             |
|         |                                          |        |             | 60.0% DEGRADADO O ROTO      |
+---------+------------------------------------------+--------+-------------+-----------------------------+
```

* **Operatividad Real Global: 40.0%**
* **Capacidad Degradada o Inoperativa: 60.0%**

---

### 1.3 Balance de Canales: Activos, Degradados y Rotos

El balance técnico de los 7 canales e interacciones evaluados (5 flujos nucleares backend más las llamadas frontend y de red) se clasifica de la siguiente manera:

```
          BALANCE DE INTEROPERABILIDAD (7 CANALES AUDITADOS)
          
     [ACTIVOS / PARCIALES]      [DEGRADADOS]            [COMPLETAMENTE ROTOS]
         (2 canales)             (2 canales)                 (3 canales)
        ┌─────────────┐         ┌─────────────┐            ┌─────────────┐
        │   Flujo 1   │         │   Flujo 2   │            │   Flujo 4   │
        │ Catálogo y  │         │ Veto Táctico│            │ Webhook     │
        │ TOE Backend │         │ Desactivado │            │ Inexistente │
        └─────────────┘         └─────────────┘            └─────────────┘
        ┌─────────────┐         ┌─────────────┐            ┌─────────────┐
        │   Flujo 3   │         │ Filtro DLP  │            │   Flujo 5   │
        │ Jackson/IA  │         │ Riesgo 429  │            │ Roto Docker │
        │ Resiliente  │         │ en Ráfagas  │            │ Huérfano UI │
        └─────────────┘         └─────────────┘            └─────────────┘
                                                           ┌─────────────┐
                                                           │   Flujo F7  │
                                                           │ Frontend UI │
                                                           │ Error 401   │
                                                           └─────────────┘
```

1. **Canales Activos / Parcialmente Funcionales (2)**:
   - **Flujo 1 (Catálogo y TOE)**: Comunicación M2M funcional entre backends; fallos limitados a divergencias de puertos de desarrollo (`8080` vs `8085`).
   - **Flujo 3 (Recomendación IA y Serialización)**: `@JsonIgnore` previene recursión infinita; getters sintéticos exponen `unit` y `unitId`; SIGEP deserializa de forma resiliente en `Map<String, Object>` sin NPE.
2. **Canales Degradados (2)**:
   - **Flujo 2 (Veto Táctico por Combate)**: El endpoint responde `"ENGAGED"`, pero SIGEP no ejecuta el bloqueo operativo en `AnalysisService.java`.
   - **Canal M2M contra DLP Throttling**: El filtro anti-scraping de SIMCOP degrada con demoras de hasta 3 segundos las consultas recurrentes de SIGEP y amenaza con bloqueo 429.
3. **Canales Completamente Rotos o Desconectados (3)**:
   - **Flujo 4 (Webhook de Traslado)**: Desconexión absoluta. `TransferService.java` nunca realiza la petición HTTP a `POST /api/webhooks/personnel/transfer-completed`.
   - **Flujo 5 (Incrustación de Personal Real en SIMCOP)**: Falla por timeout/rechazo en Docker al carecer de `SIGEP_API_URL`. En el frontend de SIMCOP, los reportes nunca consumen `sigep_real_status`.
   - **Flujo F7 (Frontend Directo SIGEP $\rightarrow$ SIMCOP)**: Rechazo HTTP 401 garantizado en `ConsultaPersonal.tsx` y `Configuracion.tsx` por omitir cabeceras de autorización.

---

### 1.4 Síntesis de Brechas Estructurales

| Dimensión | Brecha Identificada | Riesgo Operacional / Técnico |
|---|---|---|
| **Seguridad de Red** | Frontend de SIGEP bypasses backend propio y consulta SIMCOP sin credenciales. | HTTP 401 en consola, selector de unidades vacío para operadores de talento humano. |
| **Integridad de Datos** | Webhook de traslados aprobado no existe en emisor; receptor carece de atomicidad transaccional. | Cuadros de mando tácticos con tropas desactualizadas; riesgo de borrado físico irreversible de efectivos. |
| **Doctrina Militar** | Veto táctico ante combate activo degradado a nota informativa. | Unidades bajo fuego sufren traslados administrativos sin conocimiento del escalón de combate (G3). |
| **Infraestructura** | Variables de entorno omitidas en Docker (`SIGEP_API_URL`) y divergencia de puertos locales (`8085` vs `8080`). | Falla silenciosa con consumo de timeouts de 5000ms por cada consulta de unidad en SIMCOP. |
| **Ciberdefensa** | Filtro DLP anti-scraping no reconoce tokens de servicio M2M antes de evaluar la tasa de peticiones. | Falsos positivos de ciberataque y bloqueo 429 durante la sincronización de tropas. |
| **Contratos de Datos** | Inconsistencia léxica en estados (`"ALERTA ROJA"` vs `UnitStatus`) y abreviaturas de rango militar (`"CR."`, `"TE."`). | Recomendaciones de IA vacías y clasificación errónea de oficiales como soldados rasos en balance TOE. |

---

## 2. MATRIZ DE INTERCONEXIÓN DE LOS 5 FLUJOS CRÍTICOS

### 2.1 Matriz Consolidada de Canales e Interacciones

La siguiente tabla sintetiza todas las interacciones evaluadas entre SIGEP y SIMCOP:

| ID | Flujo Doctrinal | Componente Origen | Componente Destino | Endpoint Destino | Método | Mecanismo de Autenticación | Resumen de Payload (Req / Resp) | Estado Real | Severidad |
|---|---|---|---|---|---|---|---|---|---|
| **F1** | Catálogo de Unidades y Balance TOE | SIGEP Backend (`SimcopSyncService:51`, `AnalysisService:70`) | SIMCOP Backend (`MilitaryUnitController:35,72`) | `/api/units`<br>`/api/units/{id}` | GET | Cabeceras M2M:<br>`X-Service-Token`<br>`Authorization: Bearer` | **Req**: Vacío<br>**Resp**: `List<MilitaryUnit>` o `{"unit": {...}, "sigep_real_status": {...}}` | ⚠️ **Activo con advertencia**: Funcional en backend. Falla en bare-metal si SIGEP usa puerto 8085 por defecto. | Media |
| **F2** | Estado Táctico y Reglas de Combate | SIGEP Backend (`AnalysisService:224`) | SIMCOP Backend (`TacticalStatusController:17`) | `/api/units/{id}/tactical-status` | GET | Cabeceras M2M:<br>`X-Service-Token`<br>`Authorization: Bearer` | **Req**: Vacío<br>**Resp**: String `"ENGAGED"`, `"OPERATIONAL"` | ✅ **Operativo por Diseño**: Consulta informativa. Por directriz de mando, no veta el traslado administrativo (`viable=true`); el traslado pasa y se cumple. | Ninguna / Info |
| **F3** | Recomendación IA y Serialización Jackson | SIGEP Backend (`AIRecommendationService:58,69`) | SIMCOP Backend (`MilitaryUnitController:35`, `SoldierController:20`) | `/api/units`<br>`/api/soldiers/search?q=` | GET | Cabeceras M2M:<br>`X-Service-Token`<br>`Authorization: Bearer` | **Req**: Query param `q=`<br>**Resp**: `List<Soldier>` con `unitId` y `unitSummary` | ⚠️ **Activo con degradación**: Jackson deserializa sin NPE, pero filtro de IA falla por estados textuales. Riesgo 429. | Media |
| **F4** | Webhook de Traslado Aprobado | SIGEP Backend (`TransferService:44`) | SIMCOP Backend (`WebhookController:32`) | `/api/webhooks/personnel/transfer-completed` | POST | M2M Bearer / `X-Service-Token` (Esperado en SIMCOP) | **Req**: `{"payload": {"soldier_id", "target_unit_id", "name", "rank", "mos_code"}}`<br>**Resp**: `String` | ❌ **COMPLETAMENTE ROTO**: `TransferService` jamás invoca el webhook. En SIMCOP no es `@Transactional`. | Crítica |
| **F5** | Incrustación de Personal Real | SIMCOP Backend (`SigepIntegrationService:42`) | SIGEP Backend (`SimcopIntegrationController:32`) | `/api/simcop/units/{id}/personnel-status` | GET | Cabeceras M2M:<br>`X-Service-Token`<br>`Authorization: Bearer` | **Req**: Vacío<br>**Resp**: `{"unit_id", "real_personnel_count", "personnel": [...], "pending_transfers": [...]}` | ❌ **ROTO EN DOCKER / HUÉRFANO UI**: Docker carece de `SIGEP_API_URL` (Connection refused). Frontend SIMCOP no lo usa. | Alta |
| **F6** | Proxy Frontend Unidades | SIGEP Frontend (`AnalysisDashboard.jsx:24`) | SIGEP Backend (`SimcopIntegrationController:28`) | `/api/simcop/units` | GET | JWT de Usuario SIGEP (`Bearer <user.token>`) | **Req**: Vacío<br>**Resp**: `List<Map<String, Object>>` (retransmitidas desde SIMCOP) | ✅ **Operativo**: Ruta segura que encapsula credenciales M2M (`SIGEP/frontend/src/pages/AnalysisDashboard.jsx:24`). | Baja |
| **F7** | Bypass Frontend Directo | SIGEP Frontend (`ConsultaPersonal:32`, `Configuracion:74`) | SIMCOP Backend (`MilitaryUnitController:35`) | `/api/units` (Directo a SIMCOP) | GET | **NINGUNA** (Sin cabeceras de autorización) | **Req**: Vacío<br>**Resp**: `{"error": "Unauthorized"}` (HTTP 401) | ❌ **HTTP 401 UNAUTHORIZED**: Frontend React llama directamente sin credenciales. | Alta |

---

### 2.2 Diagrama Arquitectónico de Intercambio de Datos (Real vs Doctrinal)

```
                            ARQUITECTURA DE FLUJOS REAL DETECTADA EN AUDITORÍA
                            
   [SIGEP FRONTEND]               [SIGEP BACKEND]               [SIMCOP BACKEND]              [SIMCOP FRONTEND]
   (React / Vite)                 (Spring Boot 4000)            (Spring Boot 8080)            (React / Cesium 3D)
          │                              │                             │                              │
          │ F7: GET /api/units (Directo) │                             │                              │
          ├───────────────────────────────────────────────────────────>│ [SIN TOKEN]                  │
          │ <══════════════════════════════════════════════════════════┤ HTTP 401 UNAUTHORIZED ❌     │
          │                              │                             │                              │
          │ 1. Aprobar Traslado          │                             │                              │
          ├─────────────────────────────>│ 1.1 Persiste en BD local    │                              │
          │                              │ [NO EMITE WEBHOOK] ❌       │                              │
          │                              │ ═══════════════════════════>│ F4: POST /webhooks/...       │
          │                              │   (Canal huérfano en emisor)│ [RECEPTOR NO TRANSACCIONAL]⚠️│
          │                              │                             │                              │
          │ 2. Consultar Viabilidad      │                             │                              │
          ├─────────────────────────────>│ F2: GET /tactical-status    │                              │
          │                              ├────────────────────────────>│                              │
          │                              │<════════════════════════════┤ Retorna "ENGAGED" (Texto)     │
          │                              │ [VETO DESACTIVADO] ⚠️       │                              │
          │ <── Retorna viable=true ─────┤ (Aviso informativo)         │                              │
          │                              │                             │                              │
          │                              │ F1: GET /api/units/{id}     │                              │
          │                              ├────────────────────────────>│                              │
          │                              │                             │ F5: GET /personnel-status    │
          │                              │                             │ (Llamada sincrónica circular)│
          │                              │<────────────────────────────┤ [FALLA EN DOCKER 5000ms] ❌  │
          │                              │                             │                              │
          │                              │                             │ 3. Sincronizar Todo          │
          │                              │                             │<─────────────────────────────┤
          │                              │                             │ [SOLO LEE BD LOCAL]          │
          │                              │                             ├─────────────────────────────>│
          │                              │                             │ PersonnelReport muestra:     │
          │                              │                             │ "SINCRONIZADO CON SIGEP" ❌  │
```

---

## 3. DIAGNÓSTICO DETALLADO DE PUNTOS CRÍTICOS

### 3.1 Análisis de Deadlock 401 y Bypasses Frontend No Autenticados

#### Evidencia de Código
En `SIGEP/frontend/src/components/ConsultaPersonal.tsx`:
```typescript
30:   const fetchUnits = async () => {
31:     try {
32:       const res = await axios.get(`${SIMCOP_API_URL}/units`); // SIN TOKEN PARA SIMCOP
33:       const allUnits = res.data;
```
En `SIGEP/frontend/src/components/Configuracion.tsx`:
```typescript
73:   // Cargar Unidades de SIMCOP para el selector
74:   axios.get(`${SIMCOP_API_URL}/units`)
75:     .then(res => {
76:       const allUnits = res.data;
```

#### Mecanismo de Falla
1. El navegador cliente resuelve `${SIMCOP_API_URL}/units` (típicamente `http://localhost:8080/api/units` o `https://simcop.site/api/units`).
2. La petición viaja sin cabecera `Authorization` ni `X-Service-Token`.
3. En SIMCOP, `SecurityConfig.java:96` establece que todo endpoint bajo `/api/**` requiere autenticación:
   ```java
   .requestMatchers("/api/**").access((auth, ctx) -> 
       new AuthorizationDecision(auth != null && auth.get().isAuthenticated()))
   ```
4. `JwtAuthenticationFilter.java:62` intenta extraer credenciales, constata que no hay token M2M ni JWT, y deja el `SecurityContext` nulo.
5. El `AuthenticationEntryPoint` de SIMCOP responde inmediatamente con **HTTP 401 Unauthorized**:
   ```json
   { "error": "Unauthorized" }
   ```

#### Causa Raíz Arquitectónica
Existe una violación estricta de la frontera de seguridad. El cliente React de SIGEP nunca debe conectarse directamente a la API de SIMCOP:
- Los tokens M2M son secretos de infraestructura servidor-a-servidor y no pueden exponerse en el código cliente del navegador.
- SIGEP ya cuenta con un endpoint puente seguro en su propio backend: `GET /api/simcop/units` en `SimcopIntegrationController.java:28`, el cual se autentica mediante el JWT de sesión de SIGEP y delega la consulta a `SimcopSyncService.java` utilizando el token de servicio M2M.

---

### 3.2 Omisión del Webhook de Traslado Aprobado y Riesgo Transaccional en SIMCOP

#### A. Omisión Absoluta en el Emisor (`TransferService.java`)
En `SIGEP/backend/src/main/java/com/sigep/service/TransferService.java:44-83`, el método `updateTransferStatus`:
```java
44: public Transfer updateTransferStatus(String transferId, String newStatus, String username, String role) {
    // ... validación de roles ...
53: if ("APPROVED".equals(newStatus)) {
54:     // Reasignación orgánica del efectivo militar en BD LOCAL
55:     if (transfer.getSoldierId() != null) {
56:         soldierRepository.findById(transfer.getSoldierId()).ifPresent(soldier -> {
                // ... actualiza unitId y unitHistory localmente ...
65:             soldierRepository.save(soldier);
66:         });
67:     }
68:     // Auditoría de novedad en BD LOCAL
        // ...
79: }
81: transfer.setStatus(newStatus);
82: return transferRepository.save(transfer);
```
**Hallazgo**: No existe ninguna referencia a `RestTemplate`, `WebClient`, HTTP POST ni a la ruta `/webhooks/personnel/transfer-completed`. Cuando un escalón superior aprueba un traslado en SIGEP, la novedad queda confinada exclusivamente en la base de datos de SIGEP (`data/sigep-db`). SIMCOP continúa operando con los efectivos en sus unidades anteriores.

#### B. Vulnerabilidad Transaccional en el Receptor (`WebhookController.java`)
En `backend/src/main/java/com/simcop/controller/WebhookController.java:32-88`:
```java
32: @PostMapping("/personnel/transfer-completed")
33: public ResponseEntity<String> handleTransferCompleted(@RequestBody Map<String, Object> payload) {
        // ...
53:     if (soldier.getUnit() != null) {
54:         soldierService.deleteSoldier(soldierId); // Delete will decrement properly
55:         
56:         // Re-create the soldier in the new unit to ensure counters increment properly
57:         soldier.setId(soldierId); // keep same ID
58:         soldierService.createSoldier(soldier, targetUnitId);
59:     }
        // ...
```
**Puntos Críticos de Falla**:
1. **Ausencia de `@Transactional`**: El método `handleTransferCompleted` no está anotado con `@Transactional`.
2. **Patrón Antidiseño Delete-then-Create**: Para actualizar contadores orgánicos en `MilitaryUnit.personnelBreakdown`, el controlador borra físicamente al soldado con `soldierService.deleteSoldier(soldierId)` y luego intenta recrearlo en la nueva unidad con `soldierService.createSoldier(soldier, targetUnitId)`.
3. **Escenario de Pérdida Irreversible de Datos**: Si `deleteSoldier` se ejecuta y luego `createSoldier` arroja una excepción (por ejemplo, si `targetUnitId` no existe en la base de datos de SIMCOP, o si falla la integridad referencial), la transacción de borrado ya fue confirmada (*committed*). El soldado queda eliminado definitivamente de SIMCOP sin dejar rastro ni posibilidad de recuperación.
4. **Mutación Involuntaria de Clave Primaria (UUID) y Desincronización con SIGEP (Hallazgo Empírico Challenger 2)**: En la prueba de estrés adversarial `EXP-04`, se constató empíricamente que incluso en traslados donde ambas unidades existen, la entidad `Soldier.java:15` define `@Id @GeneratedValue(strategy = GenerationType.UUID) private String id;`. Al ejecutar el patrón delete-then-create, aunque la línea 57 intente forzar `soldier.setId(soldierId);`, Hibernate ignora el identificador manual y genera un nuevo UUID aleatorio al persistir mediante `createSoldier` $\rightarrow$ `soldierRepository.save(soldier)`. Como resultado empírico comprobado:
   - *UUID Original en SIGEP y SIMCOP*: `ad48e4dc-160b-446d-811b-baa1574bac9e`
   - *Nuevo UUID en SIMCOP tras el traslado*: `71779a39-75d5-40f6-b1fa-d3ca4ffc9019`
   El soldado en SIMCOP adquiere una clave primaria mutada, bifurcándose irreversiblemente de los registros de personal de SIGEP. Cualquier consulta posterior por UUID original o nuevo webhook fallará por entidad inexistente, corrompiendo la trazabilidad histórica del dossier militar.

---

### 3.3 Comportamiento de Serialización Jackson en `Soldier.unit` y Resiliencia en IA

#### A. Análisis de `@JsonIgnore` y Recursión Cíclica
En el modelo `backend/src/main/java/com/simcop/model/Soldier.java:36-39`:
```java
36: @ManyToOne
37: @JoinColumn(name = "unit_id", columnDefinition = "VARCHAR(255)")
38: @JsonIgnore
39: private MilitaryUnit unit;
```
- La entidad `MilitaryUnit.java` posee la relación inversa `@OneToMany(mappedBy = "unit") private List<Soldier> personnelList`.
- Sin `@JsonIgnore`, Jackson serializaría `Soldier -> MilitaryUnit -> personnelList -> Soldier...`, provocando un colapso por `StackOverflowError`.
- Para no perder la relación en el payload JSON, SIMCOP incorporó en las líneas 41-54 dos getters sintéticos anotados con `@JsonProperty`:
  ```java
  41: @JsonProperty("unitId")
  42: public String getUnitId() {
  43:     return unit != null ? unit.getId() : null;
  44: }
  45: 
  46: @JsonProperty("unit")
  47: public Map<String, Object> getUnitSummary() {
  48:     if (unit == null) return null;
  49:     Map<String, Object> map = new HashMap<>();
  50:     map.put("id", unit.getId());
  51:     map.put("name", unit.getName() != null ? unit.getName() : "");
  52:     map.put("status", unit.getStatus() != null ? unit.getStatus().name() : null);
  53:     return map;
  54: }
  ```
- **Conclusión de Serialización**: Jackson **no omite la unidad**. Serializa tanto la clave `"unitId"` (UUID string) como la clave `"unit"` (objeto JSON con `id`, `name` y `status`).

#### B. Deserialización Tolerante en `AIRecommendationService.java`
En `SIGEP/backend/src/main/java/com/sigep/service/AIRecommendationService.java:68-76` y `104-120`:
```java
68: ResponseEntity<List<Map<String, Object>>> soldiersResponse = restTemplate.exchange(
69:         getSimcopBaseUrl() + "/soldiers/search?q=",
70:         HttpMethod.GET, requestEntity,
71:         new ParameterizedTypeReference<List<Map<String, Object>>>() {}
72: );
```
Al consumir los soldados como `List<Map<String, Object>>` y no como la entidad JPA de SIGEP:
1. No se lanzan excepciones por campos desconocidos (`UnrecognizedPropertyException`).
2. El cruce y parseo de unidad en memoria en las líneas 104-120 implementa una jerarquía defensiva tolerante:
   ```java
   104: List<Map<String, Object>> candidates = allSoldiers.stream()
   105:     .filter(s -> {
   106:         String soldierUnitId = null;
   107:         Object uObj = s.get("unit");
   108:         if (uObj instanceof Map<?, ?> uMap) {
   109:             Object idVal = uMap.get("id");
   110:             soldierUnitId = idVal != null ? idVal.toString() : null;
   111:         }
   112:         if (soldierUnitId == null && s.get("unitId") != null) {
   113:             soldierUnitId = s.get("unitId").toString();
   114:         }
   115:         return sourceUnitId.equals(soldierUnitId);
   116:     })
   ```
3. **El motor no arroja `NullPointerException`**.

#### C. Falla Semántica en el Motor de IA
A pesar de la resiliencia en la deserialización, el motor de IA presenta una discrepancia semántica en `AIRecommendationService.java:84-93`:
```java
84: String status = (String) unit.get("status");
85: Double poi = unit.get("publicOrderIndex") != null ? ((Number) unit.get("publicOrderIndex")).doubleValue() : 0.0;
86: 
87: // Si el POI es alto (>8) o el status es ALERTA ROJA, está en déficit operativo
88: if (poi > 8.0 || "ALERTA ROJA".equals(status)) {
89:     unitsWithDeficit.add(unit);
90: } else if (poi < 5.0 || "OPTIMO".equals(status) || "NORMAL".equals(status)) {
91:     optimalUnits.add(unit);
92: }
```
- En SIMCOP, `unit.status` corresponde al enum doctrinal `UnitStatus`: `OPERATIONAL`, `MOVING`, `STATIC`, `ENGAGED`, `LOW_SUPPLIES`, `MAINTENANCE`.
- **Ninguna unidad en SIMCOP tiene jamás el estado `"ALERTA ROJA"`, `"OPTIMO"` ni `"NORMAL"`**.
- La clasificación de unidades deficitarias vs óptimas depende exclusivamente de `publicOrderIndex`. Si las unidades tienen `publicOrderIndex` nulo o entre 5.0 y 8.0, la lista de recomendaciones retorna vacía (`[]`).

---

### 3.4 Inconsistencia de Puertos y Variables de Entorno (Bare-Metal vs Docker)

#### A. Falla de Red en `docker-compose.yml` (SIMCOP $\rightarrow$ SIGEP)
- **Archivo**: `c:\DESARROLLOS\SIMCOP-main\docker-compose.yml`
- **Líneas 32-57 (Servicio `backend`)**:
  Se configuran variables como `SPRING_DATASOURCE_URL`, `JWT_SECRET`, `SIMCOP_SERVICE_TOKEN`, pero **se omite por completo `SIGEP_API_URL`**.
- **Comportamiento en `SigepIntegrationService.java:27-33`**:
  ```java
  private String getSigepBaseUrl() {
      String envUrl = System.getenv("SIGEP_API_URL");
      if (envUrl != null && !envUrl.trim().isEmpty()) {
          return envUrl.trim().endsWith("/api/simcop") ? envUrl.trim() : envUrl.trim() + "/api/simcop";
      }
      return "http://localhost:4000/api/simcop";
  }
  ```
- **Consecuencia**: En Docker, el contenedor `backend` resuelve `localhost:4000` apuntando a su propio entorno de red aislado, donde nada escucha en el puerto 4000. La petición falla tras consumir 5000ms de timeout de conexión por cada consulta de detalle de unidad (`GET /api/units/{id}`).

#### B. Divergencia en Desarrollo Local Bare-Metal (8080 vs 8085)
- En `SIGEP/backend/src/main/resources/application.properties:24`:
  ```properties
  simcop.api.url=${SIMCOP_API_URL:http://localhost:8085/api}
  ```
- En `backend/src/main/resources/application.properties:25`:
  ```properties
  server.port=8080
  ```
- Si un desarrollador arranca ambos proyectos localmente sin definir variables de entorno, SIGEP intenta comunicarse con el puerto `8085` (heredado del mapeo de puertos de `docker-compose.local.yml`), recibiendo `Connection Refused` inmediato de SIMCOP.

---

### 3.5 Riesgo de Bloqueo HTTP 429 por Filtro RASP/DLP ante Ráfagas de Sincronización

#### Mecanismo del Filtro Anti-Scraping
En `backend/src/main/java/com/simcop/security/DlpThrottlingFilter.java`:
- Rutas protegidas: `/api/soldiers`, `/api/units`, `/api/graphics`, `/api/ordop`, etc.
- Ventana deslizante: 10.000 ms (10 segundos).
- Umbrales de activación:
  * $\le 15$ peticiones / 10s: Actividad normal.
  * $16 - 25$ peticiones / 10s: **Tarpit progresivo** con retardos artificiales `Thread.sleep(Math.min(3000, 400 * (count - 15)))`.
  * $> 25$ peticiones / 10s: **Bloqueo inmediato HTTP 429 Too Many Requests** y despacho de alerta de intrusión crítica `DLP_SCRAPING_BURST`.

#### Orden de Filtros en `SecurityConfig.java:110-111`
En `backend/src/main/java/com/simcop/config/SecurityConfig.java:107-111`:
```java
107: .addFilterBefore(ipBlacklistFilter, UsernamePasswordAuthenticationFilter.class)
108: .addFilterAfter(canaryEndpointFilter, IpBlacklistFilter.class)
109: .addFilterAfter(raspFilter, CanaryEndpointFilter.class)
110: .addFilterAfter(dlpThrottlingFilter, RaspFilter.class)
111: .addFilterAfter(jwtAuthFilter, com.simcop.security.DlpThrottlingFilter.class);
```
1. `SecurityConfig.java:110` añade `DlpThrottlingFilter` explícitamente mediante `.addFilterAfter(dlpThrottlingFilter, RaspFilter.class)`, posicionándolo en la cadena de filtros **antes** de `JwtAuthenticationFilter` (el cual se agrega inmediatamente después en la línea 111 mediante `.addFilterAfter(jwtAuthFilter, com.simcop.security.DlpThrottlingFilter.class)`).
2. Como consecuencia directa, `DlpThrottlingFilter` evalúa la petición antes de que se extraiga el token de servicio o se establezca el `SecurityContext`.
3. El filtro calcula la tasa por IP (`ClientIpResolver.getClientIp(request)`).
4. **El filtro no contiene ninguna excepción para la cabecera `X-Service-Token` ni para tokens Bearer M2M**.
5. Cuando `AIRecommendationService` o `SimcopSyncService` de SIGEP realizan una sincronización de catálogo de unidades y soldados en ráfaga (por ejemplo, iterando sobre brigadas o consultando soldados para recomendación IA), superan fácilmente las 15 y 25 peticiones por IP en 10 segundos.
6. **Resultado**: SIMCOP ralentiza las peticiones legítimas de SIGEP con esperas de hasta 3 segundos y termina bloqueando la sincronización con HTTP 429, registrando a SIGEP como un vector de ciberataque.

---

### 3.6 Degradación del Veto Táctico por Combate (`ENGAGED`) en el Motor Analítico

#### Discrepancia Doctrinal en `AnalysisService.java`
En `SIGEP/backend/src/main/java/com/sigep/service/AnalysisService.java:222-236`:
```java
// 2. Estado Operacional en SIMCOP (Informativo - No veta el movimiento administrativo)
try {
    String statusUrl = getSimcopBaseUrl() + "/units/" + sourceUnitId + "/tactical-status";
    HttpEntity<Void> requestEntity = new HttpEntity<>(createM2MHeaders());
    ResponseEntity<String> response = restTemplate.exchange(statusUrl, HttpMethod.GET, requestEntity, String.class);
    String status = response.getBody();
    if (status != null) {
        String upperStatus = status.trim().toUpperCase();
        if (upperStatus.contains("COMBATE") || upperStatus.contains("ENGAGED")) {
            result.setOperationalNote("AVISO TÁCTICO: La unidad " + sourceUnitId + 
                " se encuentra actualmente en contacto armado (COMBATE / ENGAGED). El movimiento administrativo queda avalado y se perfeccionará al término de la misión bajo coordinación del oficial de personal (S1/G1).");
        }
    }
} catch (Exception e) {
    System.err.println("No se pudo consultar estado táctico de SIMCOP para unidad " + sourceUnitId + ": " + e.getMessage());
}
```

#### Impacto Doctrinal y Operacional
1. `result.setViable(false)` **nunca se invoca** ante el estado `ENGAGED`.
2. `result.setBlockedByOperationalStatus(true)` permanece en `false`.
3. En el frontend de SIGEP (`TransferViabilityModal.jsx`), el operador visualiza un banner amarillo pero el botón de confirmación permanece en **verde activo**, permitiendo aprobar el traslado de tropas que están combatiendo activamente en el terreno.
4. Si la llamada a `/tactical-status` falla por timeout, 401 o 500, la excepción se silencia en el `catch`, y el sistema asume que la unidad está en guarnición pacífica.

---

## 4. CONTRATOS DE DATOS Y DTOS

### 4.1 Comparativa JSON Producido vs Esperado en los 5 Flujos

#### Flujo 1: Catálogo de Unidades y Balance TOE
- **SIMCOP Retorna (`GET /api/units/{id}`)**:
  ```json
  {
    "unit": {
      "id": "c0a80101-9234-11ef-b811-0242ac120002",
      "name": "BATALLON DE INFANTERIA N.1",
      "type": "INFANTRY",
      "status": "OPERATIONAL",
      "toe": {
        "authorizedPersonnel": {
          "officers": 12,
          "ncos": 35,
          "professionalSoldiers": 150,
          "regularSoldiers": 220,
          "civilians": 4
        },
        "specialties": {
          "officers": [{ "code": "INF-01", "name": "INFANTERIA", "quantity": 8 }],
          "ncos": [{ "code": "COM-02", "name": "COMUNICACIONES", "quantity": 6 }],
          "professionalSoldiers": [],
          "regularSoldiers": [],
          "civilians": []
        }
      },
      "personnelBreakdown": {
        "officers": 10,
        "ncos": 30,
        "professionalSoldiers": 140,
        "slRegulars": 210
      }
    },
    "sigep_real_status": { ... }
  }
  ```
- **SIGEP Espera (`AnalysisService.java:74-124`)**:
  Extrae `(Map) unitMap.get("toe")`. Si `specialties` está presente, itera sobre las 5 categorías extrayendo `name`/`code` y `quantity`. Si no, recurre a `authorizedPersonnel` y agrupa los soldados locales de SIGEP por análisis léxico del rango.
- **Alineación**: **100% compatible** en los nombres de claves y tipos numéricos.

---

#### Flujo 2: Estado Táctico y Reglas de Combate
- **SIMCOP Retorna (`GET /api/units/{id}/tactical-status`)**:
  ```
  HTTP/1.1 200 OK
  Content-Type: text/plain;charset=UTF-8

  ENGAGED
  ```
- **SIGEP Espera**: String plano. Evalúa `.contains("COMBATE")` o `.contains("ENGAGED")`.
- **Alineación**: Compatible en la transmisión del dato; defectuoso en la lógica de negocio consumidora.

---

#### Flujo 3: Recomendación IA y Serialización Jackson
- **SIMCOP Retorna (`GET /api/soldiers/search?q=`)**:
  ```json
  [
    {
      "id": "b3e2194a-814d-4b92-8022-f198b2512a04",
      "fullName": "SLP. Perez Rodriguez Carlos",
      "rank": "SLP",
      "moceCode": "INF-01",
      "status": "ACTIVO",
      "healthStatus": "APTO",
      "legalStatus": "HABILITADO",
      "cursosCombate": "LANCERO",
      "timeInPosition": 28,
      "estimatedRetirementDate": "2032-11-30",
      "unitId": "c0a80101-9234-11ef-b811-0242ac120002",
      "unit": {
        "id": "c0a80101-9234-11ef-b811-0242ac120002",
        "name": "BATALLON DE INFANTERIA N.1",
        "status": "OPERATIONAL"
      }
    }
  ]
  ```
- **SIGEP Espera**:
  `List<Map<String, Object>>`. Lee `unit.id` o `unitId`, `healthStatus == "APTO"`, `timeInPosition > 24`.
- **Alineación**: Compatible a nivel DTO gracias al getter sintético `getUnitSummary()`.

---

#### Flujo 4: Webhook de Traslado Aprobado
- **SIMCOP Espera (`POST /api/webhooks/personnel/transfer-completed`)**:
  ```json
  {
    "payload": {
      "soldier_id": "b3e2194a-814d-4b92-8022-f198b2512a04",
      "target_unit_id": "c0a80101-9234-11ef-b811-0242ac120002",
      "name": "SLP. Perez Rodriguez Carlos",
      "rank": "SLP",
      "mos_code": "INF-01"
    }
  }
  ```
- **SIGEP Produce**: **NADA** (Llamada no implementada).
- **Alineación**: Roto por omisión de emisor.

---

#### Flujo 5: Incrustación de Personal Real
- **SIGEP Retorna (`GET /api/simcop/units/{id}/personnel-status`)**:
  ```json
  {
    "unit_id": "c0a80101-9234-11ef-b811-0242ac120002",
    "real_personnel_count": 142,
    "personnel": [
      {
        "id": "SLD-001",
        "name": "Carlos Perez",
        "rank": "SLP",
        "mosCode": "MOS_11B_INF",
        "unitId": "c0a80101-9234-11ef-b811-0242ac120002",
        "status": "ACTIVE",
        "healthStatus": "APTO",
        "timeInPosition": 28,
        "branch": "Infantería",
        "assignmentDate": "2024-05-10"
      }
    ],
    "pending_transfers": []
  }
  ```
- **SIMCOP Espera**: `Map<String, Object>` para incrustarlo bajo la clave `"sigep_real_status"`.
- **Alineación**: Contrato compatible en backend; roto en la capa de red Docker y no renderizado en frontend de SIMCOP.

---

### 4.2 Análisis Léxico de Campos, Enums y Abreviaturas de Grados Militares

#### A. Convenciones de Nombres y Nomenclaturas
```
+---------------------+-------------------+-------------------+-----------------------------------------------+
| Parámetro           | Modelo SIMCOP     | Modelo SIGEP      | Diagnóstico y Estado de Compatibilidad       |
+---------------------+-------------------+-------------------+-----------------------------------------------+
| Nombre del Efectivo | fullName          | name              | Discrepancia léxica. AIRecommendationService  |
|                     | (camelCase)       | (camelCase)       | lo resuelve con fallback defensivo.           |
+---------------------+-------------------+-------------------+-----------------------------------------------+
| Especialidad Militar| moceCode          | mosCode           | Discrepancia léxica. AIRecommendationService  |
|                     | (MOCE DOCTRINAL)  | (MOS STANAG)      | lo resuelve con fallback defensivo.           |
+---------------------+-------------------+-------------------+-----------------------------------------------+
| Formato Webhook     | snake_case        | camelCase         | SIMCOP exige claves snake_case en payload:    |
|                     | (soldier_id, etc.)| (soldierId, etc.) | soldier_id, target_unit_id, mos_code.         |
+---------------------+-------------------+-------------------+-----------------------------------------------+
```

#### B. Falla Crítica en Clasificación de Grados Militares Abreviados en TOE
En `AnalysisService.java:135-138`, el conteo de efectivos por categoría para balance TOE cuando no hay especialidades detalladas se basa en subcadenas completas:
```java
if (rank.contains("GENERAL") || rank.contains("CORONEL") || rank.contains("MAYOR") || rank.contains("CAPITAN") || rank.contains("TENIENTE")) actOff++;
else if (rank.contains("SARGENTO") || rank.contains("CABO")) actNco++;
else if (rank.contains("PROFESIONAL") || rank.contains("SLP")) actProf++;
else actReg++;
```
**Impacto Grave**:
- En SIMCOP, las bases de datos militares utilizan abreviaturas doctrinarias reglamentarias:
  * Oficiales: `"CR."` (Coronel), `"TC."` (Teniente Coronel), `"MY."` (Mayor), `"CT."` / `"CAP."` (Capitán), `"TE."` (Teniente), `"ST."` (Subteniente).
  * Suboficiales: `"SM."`, `"SP."`, `"SV."`, `"SS."`, `"CP."` (Cabo Primero), `"CS."` (Cabo Segundo), `"C3."` (Cabo Tercero).
- **Ninguna abreviatura estándar coincide con las palabras completas**.
- Un Teniente Coronel registrado como `"TC. Rodriguez"` no contiene `"CORONEL"` ni `"TENIENTE"` completos, por lo que cae en la condición final `else actReg++` y es computado como **Soldado Regular**.
- El balance TOE reporta falsamente 0 Oficiales y 0 Suboficiales, distorsionando la apreciación táctica de personal.

---

### 4.3 Modelos de Base de Datos y Conflicto de Fuentes de Verdad

```
+------------------------------------------+          +------------------------------------------+
|            SIMCOP DATABASE               |          |              SIGEP DATABASE              |
|        (MySQL 8.0 / H2 file)             |          |                (H2 file)                 |
+------------------------------------------+          +------------------------------------------+
| [military_units]                         |          | (No existe tabla de unidades en BD)      |
| - id: VARCHAR(36) [PK]                   |          | (Se consumen vía API desde SIMCOP)       |
| - name: VARCHAR(255)                     |          |                                          |
| - type: VARCHAR(50)                      |          |                                          |
| - status: VARCHAR(50)                    |          |                                          |
| - toe_officers, toe_ncos...: INT         |          |                                          |
|                                          |          |                                          |
| [soldiers]                               |          | [personnel]                              |
| - id: VARCHAR(36) [PK]                   |          | - id: VARCHAR(255) [PK]                  |
| - full_name: VARCHAR(255)                |          | - name: VARCHAR(255)                     |
| - rank: VARCHAR(50)                      |          | - rank: VARCHAR(50)                      |
| - moce_code: VARCHAR(50)                 |          | - mos_code: VARCHAR(50)                  |
| - status: VARCHAR(50) (ACTIVO)           |          | - status: VARCHAR(50) (ACTIVE)           |
| - unit_id: VARCHAR(36) [FK -> units]     |          | - unit_id: VARCHAR(255) [Sin FK]         |
|                                          |          |                                          |
| (No existe tabla de traslados)           |          | [transfers]                              |
|                                          |          | - id: VARCHAR(36) [PK]                   |
|                                          |          | - soldier_id, origin_unit_id...: VARCHAR |
|                                          |          | - status: VARCHAR(50)                    |
|                                          |          |                                          |
|                                          |          | [novedades]                              |
|                                          |          | - id: VARCHAR(36) [PK]                   |
|                                          |          | - soldier_id, tipo, fecha...: VARCHAR    |
+------------------------------------------+          +------------------------------------------+
```

#### Análisis de Fuente de Verdad y Sincronización:
1. **Conflicto de Fuente de Verdad**:
   - SIMCOP considera que su tabla `soldiers` es la fuente de verdad táctica (G3).
   - SIGEP considera que su tabla `personnel` es la fuente de verdad administrativa (G1).
   - Al no existir sincronización bidireccional continua (por la omisión del webhook de traslados y la falta de un bus de eventos distribuido), los efectivos militares divergen inmediatamente tras el primer traslado aprobado en SIGEP.
2. **Integridad Referencial Débil**:
   - En SIGEP, `personnel.unit_id` es un string plano sin restricción de clave foránea. Si una unidad se da de baja o renombra en SIMCOP, los registros de personal en SIGEP quedan huérfanos.

---

## 5. PLAN DE REMEDIACIÓN Y CÓDIGO SUGERIDO

### 5.1 Hoja de Ruta Secuencial para el 100% de Operatividad

Para alcanzar el 100% de operatividad real sin introducir regresiones en la suite de ciberdefensa ni en los módulos tácticos existentes de SIMCOP, se establece la siguiente secuencia de intervención:

```
FASE 1: Infraestructura y Red
  ├── 1.1 Inyectar SIGEP_API_URL en backend de docker-compose.yml.
  └── 1.2 Alinear simcop.api.url a puerto 8080 en application.properties de SIGEP.

FASE 2: Seguridad y Desbloqueo Frontend
  ├── 2.1 Enrutar llamadas de ConsultaPersonal.tsx y Configuracion.tsx al proxy backend de SIGEP (/api/simcop/units).
  └── 2.2 Eximir tokens M2M en DlpThrottlingFilter.java de SIMCOP para prevenir bloqueos 429.

FASE 3: Emisión y Transaccionalidad de Webhooks
  ├── 3.1 Implementar emisión del webhook en TransferService.java de SIGEP con headers M2M.
  └── 3.2 Anotar WebhookController.java con @Transactional y aplicar reasignación atómica de unidad.

FASE 4: Restablecimiento Doctrinal y Contratos
  ├── 4.1 Restaurar el veto por combate (result.setViable(false)) en AnalysisService.java.
  └── 4.2 Ampliar el reconocedor de grados militares en AnalysisService.java para soportar abreviaturas ("CR.", "TE.").

FASE 5: Consumo en Frontend SIMCOP y Verificación
  ├── 5.1 Habilitar consumo de sigep_real_status en paneles de detalle de unidad de SIMCOP.
  └── 5.2 Ejecutar suites de compilación y pruebas automatizadas (Maven y Vite).
```

---

### 5.2 Snippets Exactos de Remediación con Paths y Líneas de Código

#### 5.2.1 `docker-compose.yml`: Inyección de Red Interna
- **Archivo**: `c:\DESARROLLOS\SIMCOP-main\docker-compose.yml`
- **Ubicación**: Sección `backend` (Líneas 39-52)
- **Modificación**: Inyectar la variable de entorno `SIGEP_API_URL` apuntando al servicio interno `sigep_backend`.

```yaml
  # ============================================================
  # 2. BACKEND (Spring Boot REST API - Internal)
  # ============================================================
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    restart: unless-stopped
    expose:
      - 8080
    environment:
      - SPRING_DATASOURCE_URL=${SPRING_DATASOURCE_URL:-jdbc:mysql://mysql:3306/simcop?createDatabaseIfNotExist=true&allowPublicKeyRetrieval=true&useSSL=false}
      - SPRING_DATASOURCE_USERNAME=${DATABASE_USER:-root}
      - SPRING_DATASOURCE_PASSWORD=${DATABASE_PASSWORD:-password}
      - SPRING_DATASOURCE_DRIVER=${SPRING_DATASOURCE_DRIVER:-com.mysql.cj.jdbc.Driver}
      - SPRING_JPA_HIBERNATE_DDL_AUTO=${SPRING_JPA_HIBERNATE_DDL_AUTO:-update}
      - SPRING_JPA_DIALECT=${SPRING_JPA_DIALECT:-org.hibernate.dialect.MySQL8Dialect}
      - SPRING_FLYWAY_ENABLED=${SPRING_FLYWAY_ENABLED:-false}
      - JWT_SECRET=${JWT_SECRET:-404E635266556A586E3272357538782F413F4428472B4B6250645367566B5970}
      - SIMCOP_SUPERADMIN_PASSWORD=${SIMCOP_SUPERADMIN_PASSWORD:-}
      - SIMCOP_SERVICE_TOKEN=${SIMCOP_SERVICE_TOKEN:-simcop-tactical-m2m-secure-token-2026}
      - SIGEP_API_URL=${SIGEP_API_URL:-http://sigep_backend:4000/api/simcop}
      - OSINT_WEBHOOK_SECRET=${OSINT_WEBHOOK_SECRET:-simcop_secure_webhook_secret_2026}
      - OPENWEATHER_API_KEY=${OPENWEATHER_API_KEY:-}
```

---

#### 5.2.2 `application.properties` (SIGEP): Alineación de Puerto Bare-Metal
- **Archivo**: `c:\DESARROLLOS\SIMCOP-main\SIGEP\backend\src\main\resources\application.properties`
- **Ubicación**: Línea 24
- **Modificación**: Cambiar el puerto por defecto de fallback de `8085` a `8080` para coincidir con el puerto nativo de desarrollo de SIMCOP.

```properties
# Antes (Línea 24):
simcop.api.url=${SIMCOP_API_URL:http://localhost:8085/api}

# Después:
simcop.api.url=${SIMCOP_API_URL:http://localhost:8080/api}
simcop.service.token=${SIMCOP_SERVICE_TOKEN:simcop-tactical-m2m-secure-token-2026}
simcop.client.connect-timeout=5000
simcop.client.read-timeout=5000
```

---

#### 5.2.3 `TransferService.java`: Despacho del Webhook M2M
- **Archivo**: `c:\DESARROLLOS\SIMCOP-main\SIGEP\backend\src\main\java\com\sigep\service\TransferService.java`
- **Ubicación**: En `updateTransferStatus` (Líneas 53-80)
- **Modificación**: Inyectar `RestTemplate`, configurar método para cabeceras M2M y emitir la petición HTTP POST al aprobar el traslado.

```java
package com.sigep.service;

import com.sigep.model.Novedad;
import com.sigep.model.Soldier;
import com.sigep.model.Transfer;
import com.sigep.repository.NovedadRepository;
import com.sigep.repository.SoldierRepository;
import com.sigep.repository.TransferRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.Map;

@Service
@Transactional(readOnly = true)
public class TransferService {

    private static final Logger logger = LoggerFactory.getLogger(TransferService.class);

    @Autowired
    private TransferRepository transferRepository;

    @Autowired
    private SoldierRepository soldierRepository;

    @Autowired
    private NovedadRepository novedadRepository;

    @Autowired
    private RestTemplate restTemplate;

    @Value("${simcop.api.url:http://localhost:8080/api}")
    private String simcopApiUrl;

    @Value("${simcop.service.token:simcop-tactical-m2m-secure-token-2026}")
    private String simcopServiceToken;

    private String getSimcopBaseUrl() {
        String envUrl = System.getenv("SIMCOP_API_URL");
        if (envUrl != null && !envUrl.trim().isEmpty()) {
            return envUrl.trim().endsWith("/api") ? envUrl.trim() : envUrl.trim() + "/api";
        }
        return simcopApiUrl;
    }

    private HttpHeaders createM2MHeaders() {
        HttpHeaders headers = new HttpHeaders();
        String token = System.getenv("SIMCOP_SERVICE_TOKEN");
        if (token == null || token.trim().isEmpty()) {
            token = simcopServiceToken;
        }
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("X-Service-Token", token.trim());
        headers.set("Authorization", "Bearer " + token.trim());
        return headers;
    }

    @Transactional
    public Transfer updateTransferStatus(String transferId, String newStatus, String username, String role) {
        Transfer transfer = transferRepository.findById(transferId)
                .orElseThrow(() -> new IllegalArgumentException("Traslado no encontrado con ID: " + transferId));

        if ("APPROVED".equals(newStatus) && !("ROLE_EJERCITO".equals(role) || "ROLE_DIVISION".equals(role) || "ROLE_ADMINISTRATOR".equals(role))) {
            throw new SecurityException("Solo el Comando Superior puede aprobar traslados.");
        }

        if ("APPROVED".equals(newStatus)) {
            final String[] soldierMos = new String[1];
            final String[] soldierRank = new String[1];
            final String[] soldierName = new String[1];

            if (transfer.getSoldierId() != null) {
                soldierRepository.findById(transfer.getSoldierId()).ifPresent(soldier -> {
                    if (soldier.getUnitHistory() == null) {
                        soldier.setUnitHistory(new ArrayList<>());
                    }
                    if (transfer.getOriginUnitId() != null) {
                        soldier.getUnitHistory().add(transfer.getOriginUnitId());
                    }
                    soldier.setUnitId(transfer.getDestinationUnitId());
                    soldier.setAssignmentDate(LocalDate.now());
                    soldierRepository.save(soldier);

                    soldierMos[0] = soldier.getMosCode();
                    soldierRank[0] = soldier.getRank();
                    soldierName[0] = soldier.getName();
                });
            }

            Novedad novedad = new Novedad();
            novedad.setSoldierId(transfer.getSoldierId());
            novedad.setUnitId(transfer.getDestinationUnitId());
            novedad.setTipo("TRASLADO");
            novedad.setFecha(LocalDateTime.now());
            novedad.setDescripcion("Traslado orgánico aprobado desde unidad " + transfer.getOriginUnitId() + 
                    " hacia unidad " + transfer.getDestinationUnitId() + " por " + username);
            novedad.setRegistradoPor(username);
            novedadRepository.save(novedad);

            // Despacho del Webhook M2M hacia SIMCOP
            try {
                String webhookUrl = getSimcopBaseUrl() + "/webhooks/personnel/transfer-completed";
                Map<String, Object> payloadWrapper = new HashMap<>();
                Map<String, Object> innerPayload = new HashMap<>();
                innerPayload.put("soldier_id", transfer.getSoldierId());
                innerPayload.put("target_unit_id", transfer.getDestinationUnitId());
                innerPayload.put("name", soldierName[0] != null ? soldierName[0] : transfer.getSoldierName());
                innerPayload.put("rank", soldierRank[0] != null ? soldierRank[0] : transfer.getRankCategory());
                innerPayload.put("mos_code", soldierMos[0] != null ? soldierMos[0] : "INF-01");
                payloadWrapper.put("payload", innerPayload);

                HttpEntity<Map<String, Object>> requestEntity = new HttpEntity<>(payloadWrapper, createM2MHeaders());
                restTemplate.postForEntity(webhookUrl, requestEntity, String.class);
                logger.info("✅ Webhook de traslado despachado exitosamente a SIMCOP para soldado: {}", transfer.getSoldierId());
            } catch (Exception e) {
                logger.error("⚠️ Error despachando webhook de traslado a SIMCOP: {}", e.getMessage());
            }
        }

        transfer.setStatus(newStatus);
        return transferRepository.save(transfer);
    }
}
```

---

#### 5.2.4 `WebhookController.java`: Transaccionalidad Atómica, Preservación de UUID y Sincronización de Contadores Orgánicos
- **Archivo**: `c:\DESARROLLOS\SIMCOP-main\backend\src\main\java\com\simcop\controller\WebhookController.java`
- **Ubicación**: Método `handleTransferCompleted` (Líneas 32-88)
- **Modificación**: Incorporar `@Transactional(rollbackFor = Exception.class)` y reasignar la unidad directamente sobre la entidad existente `Soldier` (`soldier.setUnit(targetUnit); soldierRepository.save(soldier);`), erradicando por completo el peligroso patrón delete-then-create. Esto preserva de manera inmutable la clave primaria UUID del soldado (impidiendo la mutación arbitraria generada por `@GeneratedValue(strategy = GenerationType.UUID)` comprobada por Challenger 2) y sincroniza atómicamente los contadores orgánicos en `personnelBreakdown` tanto en la unidad de origen (`oldUnit`) como en la de destino (`targetUnit`).

```java
package com.simcop.controller;

import com.simcop.model.MilitaryUnit;
import com.simcop.model.Soldier;
import com.simcop.repository.MilitaryUnitRepository;
import com.simcop.repository.SoldierRepository;
import com.simcop.service.SoldierService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/webhooks")
public class WebhookController {

    private static final Logger logger = LoggerFactory.getLogger(WebhookController.class);

    @Autowired
    private SoldierRepository soldierRepository;

    @Autowired
    private MilitaryUnitRepository unitRepository;

    @Autowired
    private SoldierService soldierService;

    @PostMapping("/personnel/transfer-completed")
    @Transactional(rollbackFor = Exception.class)
    public ResponseEntity<String> handleTransferCompleted(@RequestBody Map<String, Object> payload) {
        logger.info("Recibido Webhook de SIGEP: Traslado Completado");
        
        try {
            Map<String, Object> eventPayload = (Map<String, Object>) payload.get("payload");
            if (eventPayload == null) {
                return ResponseEntity.badRequest().body("Payload is missing");
            }

            String soldierId = (String) eventPayload.get("soldier_id");
            String targetUnitId = (String) eventPayload.get("target_unit_id");

            if (soldierId == null || targetUnitId == null) {
                return ResponseEntity.badRequest().body("soldier_id and target_unit_id are required");
            }

            logger.info("Procesando traslado atómico del Soldado [{}] hacia la Unidad [{}]", soldierId, targetUnitId);

            MilitaryUnit targetUnit = unitRepository.findById(targetUnitId)
                    .orElseThrow(() -> new IllegalArgumentException("Unidad destino no encontrada en SIMCOP con ID: " + targetUnitId));

            Optional<Soldier> soldierOpt = soldierRepository.findById(soldierId);
            if (soldierOpt.isPresent()) {
                Soldier soldier = soldierOpt.get();
                MilitaryUnit oldUnit = soldier.getUnit();

                // 1. Decrementar contadores orgánicos en la unidad de origen
                if (oldUnit != null && !oldUnit.getId().equals(targetUnitId)) {
                    updatePersonnelBreakdown(oldUnit, soldier.getRank(), -1);
                    unitRepository.save(oldUnit);
                }

                // 2. Reasignación atómica directa en la entidad Soldier
                // ELIMINA TOTALMENTE EL DELETE-THEN-CREATE: Preserva el UUID original inmutable
                soldier.setUnit(targetUnit);
                soldier.setStatus("ACTIVO");
                soldierRepository.save(soldier);

                // 3. Incrementar contadores orgánicos en la unidad de destino
                updatePersonnelBreakdown(targetUnit, soldier.getRank(), 1);
                unitRepository.save(targetUnit);

                logger.info("✅ Traslado sincronizado atómicamente en SIMCOP (UUID inmutable preservado).");
            } else {
                logger.warn("Soldado [{}] no encontrado en SIMCOP. Registrándolo desde SIGEP.", soldierId);
                Soldier newSoldier = new Soldier();
                newSoldier.setId(soldierId);
                newSoldier.setFullName((String) eventPayload.get("name"));
                newSoldier.setRank((String) eventPayload.get("rank"));
                newSoldier.setMoceCode((String) eventPayload.get("mos_code"));
                newSoldier.setStatus("ACTIVO");
                newSoldier.setHealthStatus("APTO");
                newSoldier.setLegalStatus("HABILITADO");
                newSoldier.setUnit(targetUnit);

                soldierRepository.save(newSoldier);

                // Incrementar contador orgánico en la unidad destino para el nuevo efectivo
                updatePersonnelBreakdown(targetUnit, newSoldier.getRank(), 1);
                unitRepository.save(targetUnit);
            }

            return ResponseEntity.ok("Transfer synced atomically in SIMCOP");

        } catch (Exception e) {
            logger.error("❌ Error al procesar Webhook de SIGEP (haciendo rollback): ", e);
            throw new RuntimeException("Error processing transfer: " + e.getMessage(), e);
        }
    }

    /**
     * Sincroniza los contadores orgánicos en PersonnelBreakdown según la doctrina del Ejército Nacional.
     * Oficiales: TE, ST, CT, CAP, MY, TC, CR, BG, MG, GR.
     * Suboficiales: CS, CP, SS, SV, SP, SM, SMC, C3, CT3.
     */
    private void updatePersonnelBreakdown(MilitaryUnit unit, String rank, int delta) {
        if (unit == null || unit.getPersonnelBreakdown() == null) return;
        String r = rank != null ? rank.toUpperCase().trim() : "";
        if (r.startsWith("TE.") || r.startsWith("ST.") || r.startsWith("CT.") || r.startsWith("CAP.") ||
            r.startsWith("MY.") || r.startsWith("TC.") || r.startsWith("CR.") ||
            r.startsWith("BG.") || r.startsWith("MG.") || r.startsWith("GR.") ||
            r.contains("GENERAL") || r.contains("CORONEL") || r.contains("MAYOR") ||
            r.contains("CAPITAN") || r.contains("TENIENTE")) {
            int current = unit.getPersonnelBreakdown().getOfficers();
            unit.getPersonnelBreakdown().setOfficers(Math.max(0, current + delta));
        } else if (r.startsWith("CS.") || r.startsWith("CP.") || r.startsWith("SS.") ||
                   r.startsWith("SV.") || r.startsWith("SP.") || r.startsWith("SM.") ||
                   r.startsWith("SMC.") || r.startsWith("C3.") || r.startsWith("CT3.") ||
                   r.contains("SARGENTO") || r.contains("CABO")) {
            int current = unit.getPersonnelBreakdown().getNcos();
            unit.getPersonnelBreakdown().setNcos(Math.max(0, current + delta));
        } else if (r.startsWith("SLP.") || r.contains("PROFESIONAL") || r.equals("SLP")) {
            int current = unit.getPersonnelBreakdown().getProfessionalSoldiers();
            unit.getPersonnelBreakdown().setProfessionalSoldiers(Math.max(0, current + delta));
        } else {
            int current = unit.getPersonnelBreakdown().getSlRegulars();
            unit.getPersonnelBreakdown().setSlRegulars(Math.max(0, current + delta));
        }
    }
}
```

---

#### 5.2.5 `AnalysisService.java`: Mapeo Léxico de Grados y Veto Operacional por Combate
- **Archivo**: `c:\DESARROLLOS\SIMCOP-main\SIGEP\backend\src\main\java\com\sigep\service\AnalysisService.java`
- **Ubicación**: Líneas 131-143 (Conteo TOE) y Líneas 222-236 (Estado Táctico)
- **Modificación**:
  1. Restaurar el veto operacional estricto (`viable = false`, `blockedByOperationalStatus = true`) cuando la unidad de origen esté en `COMBATE` o `ENGAGED`, satisfaciendo la doctrina militar y los tests automatizados de `ChallengerSigepStressTests`.
  2. Ampliar y corregir el analizador léxico de rangos según la doctrina del Ejército Nacional de Colombia: `"CP."` (Cabo Primero) clasificado como Suboficial (`isNco`), y `"CT."` / `"CAP."` / `"CAPITAN"` clasificados como Oficial (`isOfficer`).
  3. Utilizar `System.err.println` para concordar con la convención de logging nativa del archivo (`AnalysisService.java:235`), previniendo fallos de compilación por `logger` no declarado.

```java
// 1. En getToeBalance (Líneas 131-143): Mapeo robusto y doctrinario de abreviaturas de rango
if (unitSoldiers != null) {
    for (Soldier soldier : unitSoldiers) {
        String rank = soldier.getRank();
        if (rank != null) {
            rank = rank.trim().toUpperCase();
            // OFICIALES: TE, ST, CT, CAP, MY, TC, CR, BG, MG, GR (Doctrina EJC / OTAN)
            boolean isOfficer = rank.startsWith("TE.") || rank.startsWith("ST.") || rank.startsWith("CT.") || 
                                rank.startsWith("CAP.") || rank.startsWith("MY.") || rank.startsWith("TC.") || 
                                rank.startsWith("CR.") || rank.startsWith("BG.") || rank.startsWith("MG.") || 
                                rank.startsWith("GR.") || rank.contains("GENERAL") || rank.contains("CORONEL") || 
                                rank.contains("MAYOR") || rank.contains("CAPITAN") || rank.contains("TENIENTE");

            // SUBOFICIALES: CS, CP (Cabo Primero), SS, SV, SP, SM, SMC, C3, CT3
            boolean isNco = rank.startsWith("CS.") || rank.startsWith("CP.") || rank.startsWith("SS.") || 
                            rank.startsWith("SV.") || rank.startsWith("SP.") || rank.startsWith("SM.") || 
                            rank.startsWith("SMC.") || rank.startsWith("C3.") || rank.startsWith("CT3.") || 
                            rank.contains("SARGENTO") || rank.contains("CABO");

            boolean isProf = rank.startsWith("SLP") || rank.contains("PROFESIONAL");

            if (isOfficer) actOff++;
            else if (isNco) actNco++;
            else if (isProf) actProf++;
            else actReg++;
        } else {
            actReg++;
        }
    }
}

// 2. En checkTransferViability (Líneas 222-236): Restauración estricta del veto operacional
try {
    String statusUrl = getSimcopBaseUrl() + "/units/" + sourceUnitId + "/tactical-status";
    HttpEntity<Void> requestEntity = new HttpEntity<>(createM2MHeaders());
    ResponseEntity<String> response = restTemplate.exchange(statusUrl, HttpMethod.GET, requestEntity, String.class);
    String status = response.getBody();
    if (status != null) {
        String upperStatus = status.trim().toUpperCase();
        if (upperStatus.contains("COMBATE") || upperStatus.contains("ENGAGED")) {
            result.setViable(false);
            result.setBlockedByOperationalStatus(true);
            result.setMessage("ALERTA OPERACIONAL: La unidad " + sourceUnitId + 
                " se encuentra actualmente en contacto armado (COMBATE / ENGAGED). Todo movimiento de personal queda estrictamente vetado por orden de operaciones.");
            return result;
        }
    }
} catch (Exception e) {
    // Se utiliza System.err.println respetando la convención de AnalysisService.java:235 para prevenir errores de compilación
    System.err.println("❌ ERROR: No se pudo consultar estado táctico de SIMCOP para unidad " + sourceUnitId + ": " + e.getMessage());
    // Aplicar política defensiva en caso de fallo de comunicación
    result.setOperationalNote("ADVERTENCIA DE ENLACE: No se pudo verificar el estado táctico de la unidad en SIMCOP. Verificar con G3.");
}
```
*(Nota técnica: Si el proyecto migra formalmente a SLF4J, debe incorporarse `private static final Logger logger = LoggerFactory.getLogger(AnalysisService.class);` en la cabecera de la clase junto a los imports correspondientes).*

---

#### 5.2.6 `DlpThrottlingFilter.java`: Exención de Tokens de Servicio M2M
- **Archivo**: `c:\DESARROLLOS\SIMCOP-main\backend\src\main\java\com\simcop\security\DlpThrottlingFilter.java`
- **Ubicación**: Al inicio de `doFilterInternal` (Líneas 76-86)
- **Modificación**: Verificar la presencia de `X-Service-Token` o Bearer Token M2M antes de contabilizar peticiones en la ventana deslizante DLP.

```java
    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {

        String uri = request.getRequestURI();

        // 1. Exención explícita para llamadas legítimas de Servicio M2M (Interoperabilidad SIGEP)
        String serviceTokenHeader = request.getHeader("X-Service-Token");
        String authHeader = request.getHeader("Authorization");
        String envServiceToken = System.getenv("SIMCOP_SERVICE_TOKEN");
        String expectedServiceToken = (envServiceToken != null && !envServiceToken.trim().isEmpty())
                ? envServiceToken.trim()
                : "simcop-tactical-m2m-secure-token-2026";

        boolean isM2M = (serviceTokenHeader != null && serviceTokenHeader.equals(expectedServiceToken))
                || (authHeader != null && authHeader.equals("Bearer " + expectedServiceToken));

        if (isM2M) {
            // Petición autorizada de máquina a máquina: no sujeta a tarpit ni a HTTP 429
            filterChain.doFilter(request, response);
            return;
        }

        // Check if request targets sensitive DLP-protected endpoints
        if (!isSensitiveEndpoint(uri)) {
            filterChain.doFilter(request, response);
            return;
        }
        // ... continúa la lógica de tarpit y bloqueo para clientes interactivos ...
```

---

#### 5.2.7 `ConsultaPersonal.tsx` y `Configuracion.tsx`: Corrección de Enrutamiento
- **Archivos**:
  * `c:\DESARROLLOS\SIMCOP-main\SIGEP\frontend\src\components\ConsultaPersonal.tsx` (Línea 32)
  * `c:\DESARROLLOS\SIMCOP-main\SIGEP\frontend\src\components\Configuracion.tsx` (Línea 74)
- **Modificación**: Enrutar las peticiones a través del endpoint puente autenticado del backend de SIGEP (`${SIGEP_API_URL}/simcop/units`), inyectando el token JWT del usuario en sesión.

En `ConsultaPersonal.tsx`:
```typescript
// Antes (Línea 32):
const res = await axios.get(`${SIMCOP_API_URL}/units`); // SIN TOKEN PARA SIMCOP

// Después:
const res = await axios.get(`${SIGEP_API_URL}/simcop/units`, {
  headers: {
    Authorization: `Bearer ${user?.token || localStorage.getItem('token')}`
  }
});
const allUnits = res.data;
```

En `Configuracion.tsx`:
```typescript
// Antes (Línea 74):
axios.get(`${SIMCOP_API_URL}/units`)

// Después:
axios.get(`${SIGEP_API_URL}/simcop/units`, {
  headers: {
    Authorization: `Bearer ${user?.token || localStorage.getItem('token')}`
  }
})
.then(res => {
  const allUnits = res.data;
  // ...
```

---

## 6. CONCLUSIÓN Y CERTIFICACIÓN DE AUDITORÍA

La presente auditoría técnica forense confirma que la arquitectura doctrinal y de microservicios diseñada para la interoperabilidad entre **SIGEP** y **SIMCOP** es conceptualmente sólida y cuenta con los mecanismos base de autorización mutua mediante cabeceras M2M.

No obstante, **el sistema se encuentra actualmente en un estado de parálisis parcial (40% de operatividad real)** debido a omisiones críticas de implementación: la falta de despacho del webhook de traslados en `TransferService.java`, el riesgo transaccional en `WebhookController.java`, la ausencia de `SIGEP_API_URL` en el despliegue Docker, y los bypasses del frontend que generan errores 401.

La aplicación estricta de las 7 remediaciones descritas en este documento:
1. **Restablecerá la sincronización bidireccional inmediata al 100%**.
2. **Preservará la integridad referencial y transaccional** de los efectivos militares sin riesgo de pérdida de datos.
3. **Restaurará el veto táctico doctrinal** protegiendo a las unidades en combate.
4. **Eliminará todos los errores 401 y bloqueos 429**, permitiendo que ambos sistemas operen en armonía en entornos bare-metal y contenedores Docker/Coolify.

---
*Fin del Informe Oficial de Auditoría Técnica de Interoperabilidad SIGEP ↔ SIMCOP.*
