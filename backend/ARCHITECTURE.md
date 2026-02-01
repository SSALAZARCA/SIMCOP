# Arquitectura del Backend - SIMCOP

Este documento describe la arquitectura, la pila tecnológica y el diseño de la base de datos para el backend de la aplicación SIMCOP.

## 1. Pila Tecnológica

-   **Lenguaje:** Java 17
-   **Framework Principal:** Spring Boot 3
    -   **Web:** Spring Web (para crear APIs RESTful)
    -   **Seguridad:** Spring Security (para autenticación y autorización)
    -   **Base de Datos:** Spring Data JPA (para interactuar con la base de datos)
-   **Servidor de Base de Datos:** MySQL 8.0
-   **Autenticación:** JSON Web Tokens (JWT)
-   **Gestor de Dependencias y Build:** Maven

## 2. Arquitectura en Capas

El backend sigue un patrón de arquitectura en capas clásico para separar responsabilidades, facilitar el mantenimiento y la escalabilidad.

```
+-----------------------------------+
|       Capa de Controlador         |  (Controller Layer) - Expone Endpoints REST
+-----------------------------------+
                |
                v
+-----------------------------------+
|         Capa de Servicio          |  (Service Layer) - Contiene la lógica de negocio
+-----------------------------------+
                |
                v
+-----------------------------------+
|       Capa de Repositorio         |  (Repository Layer) - Abstracción de acceso a datos (JPA)
+-----------------------------------+
                |
                v
+-----------------------------------+
|          Capa de Modelo           |  (Model/Entity Layer) - Define las entidades de la BD
+-----------------------------------+
                |
                v
+-----------------------------------+
|          Base de Datos            |  (MySQL Database)
+-----------------------------------+
```

-   **`Controller`**: Recibe las peticiones HTTP del frontend, valida la entrada básica y llama a los servicios correspondientes. No contiene lógica de negocio.
-   **`Service`**: Orquesta la lógica de negocio. Puede llamar a múltiples repositorios para cumplir con una tarea. Aquí es donde se toman las decisiones de la aplicación.
-   **`Repository`**: Define las interfaces para interactuar con la base de datos. Spring Data JPA implementa automáticamente los métodos CRUD (Crear, Leer, Actualizar, Eliminar).
-   **`Model (Entity)`**: Son clases Java (`POJOs`) anotadas con JPA (`@Entity`) que representan las tablas en la base de datos.

## 3. Flujo de Seguridad con JWT

La seguridad se maneja mediante tokens JWT, lo que permite un servicio *stateless* (sin estado).

1.  **Login:** El usuario envía `username` y `password` al endpoint `POST /api/auth/login`.
2.  **Validación:** El `AuthController` usa `AuthenticationManager` de Spring Security para validar las credenciales contra la base de datos.
3.  **Generación de Token:** Si las credenciales son válidas, `JwtTokenUtil` genera un token JWT firmado con una clave secreta. Este token contiene información del usuario (como el `username` y roles).
4.  **Respuesta al Cliente:** El backend devuelve el token JWT al frontend.
5.  **Peticiones Subsecuentes:** El frontend debe almacenar este token y enviarlo en la cabecera `Authorization` de cada petición a endpoints protegidos (Ej: `Authorization: Bearer <token>`).
6.  **Filtro JWT:** `JwtRequestFilter` intercepta cada petición, extrae el token de la cabecera, lo valida (firma, expiración) y establece el contexto de seguridad de Spring para autorizar la petición.

## 4. Diagrama de la Base de Datos (Modelo Entidad-Relación Básico)

Este es un diagrama simplificado de las tablas principales y sus relaciones.

```mermaid
erDiagram
    USERS {
        Long id PK
        String username
        String password_hash
        String display_name
        String role
        String assigned_unit_id FK
    }

    MILITARY_UNITS {
        Long id PK
        String name
        String type
        String parent_id FK
        String commander_rank
        String commander_name
        Double location_lat
        Double location_lon
        String status
        -- etc. --
    }

    INTELLIGENCE_REPORTS {
        Long id PK
        String title
        String type
        Double location_lat
        Double location_lon
        -- etc. --
    }

    ALERTS {
        Long id PK
        String type
        String message
        String severity
        Long unit_id FK
        Long intel_id FK
    }

    OPERATIONS_ORDERS {
        Long id PK
        String title
        String status
        String mission_text
        -- etc. --
    }

    USERS ||--o{ MILITARY_UNITS : "is commander of"
    MILITARY_UNITS }o--|| MILITARY_UNITS : "is parent of"
    ALERTS }o--|| MILITARY_UNITS : "relates to"
    ALERTS }o--|| INTELLIGENCE_REPORTS : "relates to"

```

## 5. Documentación de API Endpoints (Ejemplos)

La API sigue los principios REST.

-   **`POST /api/auth/login`**
    -   **Descripción:** Autentica a un usuario.
    -   **Cuerpo (Request):** `{"username": "user", "password": "password"}`
    -   **Respuesta (Success):** `{"token": "jwt_token_string"}`

-   **`GET /api/units`**
    -   **Descripción:** Obtiene una lista de todas las unidades militares.
    -   **Cabeceras:** `Authorization: Bearer <token>`
    -   **Respuesta (Success):** `[{"id": 1, "name": "Bravo 1", ...}, ...]`

-   **`GET /api/intel`**
    -   **Descripción:** Obtiene una lista de todos los informes de inteligencia.
    -   **Cabeceras:** `Authorization: Bearer <token>`
    -   **Respuesta (Success):** `[{"id": 1, "title": "Actividad Sospechosa", ...}, ...]`

-   **`GET /api/alerts`**
    -   **Descripción:** Obtiene una lista de todas las alertas.
    -   **Cabeceras:** `Authorization: Bearer <token>`
    -   **Respuesta (Success):** `[{"id": 1, "type": "NO_MOVEMENT", ...}, ...]`

-   **`GET /api/ordops`**
    -   **Descripción:** Obtiene una lista de todas las órdenes de operaciones.
    -   **Cabeceras:** `Authorization: Bearer <token>`
    -   **Respuesta (Success):** `[{"id": 1, "title": "ORDOP Fragmentaria 001", ...}, ...]`
