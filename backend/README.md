# SIMCOP - Backend con Spring Boot y MySQL

Este es el proyecto backend para el Sistema Integrado de Mando y Control Operacional (SIMCOP). Está construido con Java y Spring Boot, y utiliza MySQL como base de datos.

## Estructura del Proyecto

El proyecto sigue una arquitectura en capas estándar para aplicaciones Spring Boot:

```
src/main/java/com/simcop/
├── SimcopApplication.java     // Punto de entrada de la aplicación
├── config/
│   ├── SecurityConfig.java    // Configuración de Spring Security y JWT
│   └── JwtRequestFilter.java  // Filtro para validar tokens en cada petición
├── controller/
│   ├── AuthController.java      // Endpoints para login
│   └── UnitController.java      // API para Unidades Militares
├── model/                     // Entidades JPA que mapean a la base de datos
│   ├── MilitaryUnit.java
│   ├── User.java
│   └── embeddable/            // Clases embebidas en otras entidades
├── repository/                // Interfaces de Spring Data JPA para acceso a datos
│   ├── MilitaryUnitRepository.java
│   └── UserRepository.java
├── service/                   // Lógica de negocio
│   └── JwtUserDetailsService.java
└── util/
    └── JwtTokenUtil.java      // Utilidades para generar y validar JWT
```

## Requisitos

-   Java 17 o superior
-   Maven 3.6 o superior
-   MySQL 8.0 o superior

## Pasos para la Configuración

### 1. Configurar la Base de Datos MySQL

1.  Abre tu cliente de MySQL (como MySQL Workbench, DBeaver, o la línea de comandos).
2.  Crea la base de datos para la aplicación:
    ```sql
    CREATE DATABASE simcop_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
    ```
3.  Selecciona la base de datos recién creada:
    ```sql
    USE simcop_db;
    ```
4.  Ejecuta el script **`schema.sql`** (proporcionado en `src/main/resources/schema.sql`) completo en esta base de datos. Esto creará todas las tablas y relaciones necesarias.

### 2. Configurar la Aplicación

1.  Abre el archivo `src/main/resources/application.properties`.
2.  Modifica las siguientes propiedades para que coincidan con tu configuración de MySQL:
    ```properties
    spring.datasource.url=jdbc:mysql://localhost:3306/simcop_db
    spring.datasource.username=TU_USUARIO_MYSQL
    spring.datasource.password=TU_CONTRASEÑA_MYSQL
    ```
3.  **Importante:** Modifica el secreto de JWT. Es una clave usada para firmar los tokens de seguridad. Cambia `"javainuse"` por una cadena larga y segura.
    ```properties
    jwt.secret=CAMBIA_ESTA_CLAVE_SECRETA_POR_ALGO_SEGURO
    ```

### 3. Ejecutar la Aplicación

1.  Navega a la raíz del proyecto (`backend/`) en tu terminal.
2.  Ejecuta el siguiente comando de Maven para compilar y lanzar la aplicación:
    ```bash
    mvn spring-boot:run
    ```
3.  El backend se iniciará y estará disponible en `http://localhost:8080`.

## API Endpoints (Ejemplos)

-   **Autenticación**:
    -   `POST /api/auth/login`: Realiza el login. Envía un cuerpo JSON con `username` y `password`. Devuelve un token JWT.
-   **Unidades**:
    -   `GET /api/units`: Devuelve una lista de todas las unidades militares. (Requiere token JWT).

Para acceder a los endpoints protegidos, debes incluir el token JWT en la cabecera `Authorization` de tus peticiones:
`Authorization: Bearer <token_jwt>`
