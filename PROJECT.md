# Project: SIMCOP - Visor Geoespacial Cesium 3D con Terreno y Cartografía HD

## Architecture
- Module/package boundaries, data flow, shared interfaces
- `components/Map3DDisplayComponent.tsx`: Core Cesium 3D geospatial viewer component (Viewer, TerrainProvider, ImageryLayers, HUD controls, Camera orientation, Tactical tools).
- `vite.config.ts` & `package.json`: Vite bundler config with `vite-plugin-cesium`, manualChunks, build targets.
- Docker & Nginx (`Dockerfile`, `nginx.conf`, `docker-compose.local.yml`): Containerized deployment with secure CSP and WebGL asset serving.

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Corrección de Sintaxis y Desbloqueo de Build | Corregir la definición truncada de cursorInfo (líneas 298-316) para que `npm run build` y `tsc` compilen con 0 errores | M1 | Survey E1, E2, E3 |
| 2 | Malla Geométrica de Terreno 3D (ArcGIS/Cesium) | Implementar cargador resiliente de elevación 3D usando ArcGISTiledElevationTerrainProvider sin 401s, con fallback a Cesium Ion token o Ellipsoid | M1 | Survey E1 |
| 3 | Cartografía Satelital HD y Etiquetas Claras | Integrar ESRI World Imagery HD (z19) y CartoDB Light Labels (z20) sobre la malla de elevación 3D con canal alfa | M1 | Survey E2 |
| 4 | Panel Táctico HUD y Conmutador de Capas Base | Conmutador de 3 capas base (Satélite HD, Cartografía, OSM), eliminando botón fantasma 'igac-relieve' y agregando botones Zoom In / Zoom Out | M1 | Survey E2, E3 |
| 5 | Controles de Factor de Exageración de Relieve | Botones HUD y estado sincronizado para factores 1.0x, 1.5x, 2.0x (con default 1.5x) | M1 | Survey E1, E2, E3 |
| 6 | Orientación Táctica de Cámara 3D e Intercepción Home | Perspectiva táctica inclinada (45°) sobre Colombia (Lat 2.5°, Lon -74.3°, Alt 550km, Heading 12°, Pitch -45°) y reasignación del botón Home de Cesium | M1 | Survey E3 |
| 7 | Sincronización de Herramientas Tácticas 3D | Offset de elevación (+2m) en LOS, muestreo de terreno en Domos de Cobertura, suscripción a clearLosLayer, y compatibilidad con Windy y Radar | M1 | Survey E3 |
| 8 | Verificación E2E, Docker y Auditoría de Cero Residuos | Verificación de compilación limpia (npm run build), ausencia de 401/CORS en consola, pruebas funcionales y despliegue Docker | M2 | Survey E1, E2, E3 |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | M1: Implementación Integral Visor Cesium 3D | Corrección sintaxis, Malla de terreno 3D ArcGIS/Cesium, Satélite ESRI HD + Etiquetas CartoDB, HUD (3 capas base, zoom, 1.0x/1.5x/2.0x), Cámara 45° y Herramientas tácticas | none | DONE |
| 2 | M2: Verificación E2E, Docker & Auditoría Forense | Verificación compilación npm run build (0 errores), contenedor Docker funcional, pruebas funcionales y auditoría forense de integridad | M1 | DONE |

## Interface Contracts
### Map3DDisplayComponent ↔ Cesium Globe & Terrain
- `getTerrainProvider(): Promise<Cesium.TerrainProvider>`:
  - Intenta `Cesium.createWorldTerrainAsync` sólo si `token` existe y es no vacío.
  - Carga `Cesium.ArcGISTiledElevationTerrainProvider.fromUrl('https://elevation3d.arcgis.com/arcgis/rest/services/WorldElevation3D/Terrain3D/ImageServer')` sin requerir token ni emitir 401s.
  - Fallback a `Cesium.EllipsoidTerrainProvider()` si no hay red.
- `viewer.scene.globe.terrainExaggeration`: valores numéricos soportados `[1.0, 1.5, 2.0]`.
- `viewer.scene.globe.depthTestAgainstTerrain = true`.
- Capas de imaginería base:
  - `igac-sat`: ESRI World Imagery (index 0) + CartoDB Light Labels (index 1 con alpha).
  - `igac-pol`: IGAC Colombia_Base con fallback a CartoDB Voyager.
  - `osm`: OpenStreetMap Standard.

## Code Layout
- `components/Map3DDisplayComponent.tsx`: Visor Cesium 3D central.
- `vite.config.ts`: Configuración Vite con plugin Cesium.
- `Dockerfile` & `nginx.conf`: Despliegue en contenedor.
- `.env`: Variables de entorno para tokens opcionales.
