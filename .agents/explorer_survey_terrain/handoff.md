# Handoff Report — Survey of Cesium 3D Elevation Viewer & Terrain Providers

## 1. Observation

### 1.1 Files where Cesium is Imported, Configured, and Rendered
- **Root Component**: `components/Map3DDisplayComponent.tsx` (3,244 lines):
  - Line 2: `import * as Cesium from 'cesium';`
  - Line 3: `import 'cesium/Source/Widgets/widgets.css';`
  - Lines 338–351: Instantiates `new Cesium.Viewer(containerRef.current, { ... })`
  - Lines 353–358: Calls `getTerrainProvider().then(provider => { viewerRef.current.terrainProvider = provider; })`
  - Lines 360–371: Configures scene depth, lighting, and terrain exaggeration:
    - `viewer.scene.globe.depthTestAgainstTerrain = true;`
    - `viewer.scene.globe.enableLighting = true;`
    - `viewer.scene.globe.terrainExaggeration = 1.5;`
    - `viewer.scene.globe.terrainExaggerationRelativeHeight = 0.0;`
- **Callers & Parent Views**:
  - `App.tsx`:
    - Line 50: `import { Map3DDisplayComponent } from './components/Map3DDisplayComponent';`
    - Lines 1195, 1235: `<Map3DDisplayComponent {...mapDisplayProps} />`
  - `components/company/CompanyCommanderView.tsx`:
    - Line 11: `import { Map3DDisplayComponent } from '../Map3DDisplayComponent';`
    - Lines 176, 204: `<Map3DDisplayComponent {...mapDisplayProps} />`
  - `components/platoon/PlatoonCommanderView.tsx`:
    - Line 11: `import { Map3DDisplayComponent } from '../Map3DDisplayComponent';`
    - Lines 205, 233: `<Map3DDisplayComponent {...mapDisplayProps} />`
- **Build & Packaging Setup**:
  - `package.json`:
    - Line 19: `"cesium": "^1.142.0"`
    - Line 40: `"vite-plugin-cesium": "^1.2.23"`
  - `node_modules/cesium/package.json`:
    - Line 3: `"version": "1.142.0"`
    - Line 54: `"@cesium/engine": "^26.0.0"`
    - Line 55: `"@cesium/widgets": "^16.0.0"`
  - `vite.config.ts`:
    - Line 4: `import cesium from 'vite-plugin-cesium';`
    - Line 16: `plugins: [react(), cesium()]`
    - Line 34: `if (id.includes('cesium')) return 'cesium';` (manual chunking)

### 1.2 Current TerrainProvider Implementation & 401 Unauthorized Root Cause
- **`components/Map3DDisplayComponent.tsx` (Lines 90–119)**:
  ```typescript
  const getTerrainProvider = async (): Promise<Cesium.TerrainProvider> => {
    const token = localStorage.getItem('simcop_cesium_ion_token') || (import.meta as any).env?.VITE_CESIUM_ION_TOKEN || '';
    if (token && token.trim()) {
      Cesium.Ion.defaultAccessToken = token.trim();
    }

    if (typeof (Cesium as any).createWorldTerrainAsync === 'function') {
      try {
        return await (Cesium as any).createWorldTerrainAsync({
          requestWaterMask: true,
          requestVertexNormals: true
        });
      } catch (err) {
        console.warn("createWorldTerrainAsync failed, intentando CesiumTerrainProvider:", err);
      }
    }
    
    if (typeof (Cesium.CesiumTerrainProvider as any).fromUrl === 'function') {
      try {
        return await (Cesium.CesiumTerrainProvider as any).fromUrl('https://assets.ion.cesium.com/1', {
          requestWaterMask: true,
          requestVertexNormals: true
        });
      } catch (err) {
        console.warn("CesiumTerrainProvider.fromUrl failed, utilizando Ellipsoid con relieve simulado:", err);
      }
    }

    return new Cesium.EllipsoidTerrainProvider();
  };
  ```
- **Environment & Token Verification**:
  - `.env` contains:
    ```
    VITE_API_BASE_URL=http://localhost:8080
    ```
    `VITE_CESIUM_ION_TOKEN` is not defined.
  - In a fresh browser session, `localStorage.getItem('simcop_cesium_ion_token')` is `null`.
  - When `token` is empty, `Cesium.Ion.defaultAccessToken` uses the library default token shipped with Cesium 1.142.
  - Direct execution test in Node (`node -e "const Cesium = require('cesium'); Cesium.Terrain.fromWorldTerrain();"`):
    ```
    RequestErrorEvent {
      statusCode: 401,
      response: Response {
        status: 401,
        statusText: 'Unauthorized',
        url: 'https://api.cesium.com/v1/assets/1/endpoint?access_token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... Delete on August 1, 2026 ...'
      }
    }
    ```
    Verbatim error: `401 Unauthorized`. The bundled Cesium 1.142 default access token has audience `Delete on August 1, 2026` and was revoked/expired on August 1, 2026.
  - The fallback attempt `(Cesium.CesiumTerrainProvider as any).fromUrl('https://assets.ion.cesium.com/1')` requests `https://assets.ion.cesium.com/1/layer.json` without credentials, which also fails with `401 Unauthorized`.
  - Result: line 118 executes: `return new Cesium.EllipsoidTerrainProvider()`.
  - The ellipsoid has 0 elevation worldwide. Colombia's Andean mountain ranges, valleys, and canyons render completely flat.

### 1.3 Fake 2D Overlays and Layer Switcher Inconsistencies
- `Map3DDisplayComponent.tsx:114`:
  `console.warn("CesiumTerrainProvider.fromUrl failed, utilizando Ellipsoid con relieve simulado:", err);`
  The code claims "relieve simulado", but in fact `EllipsoidTerrainProvider` is a flat mathematical ellipsoid with zero simulated relief.
- `Map3DDisplayComponent.tsx:3050–3056`:
  ```tsx
  <button
    onClick={() => setMapLayer('igac-relieve')}
    className={`text-[10px] py-1.5 rounded font-medium transition ${mapLayer === 'igac-relieve' ? 'bg-sky-600 text-white shadow' : 'bg-slate-900 text-slate-300 hover:bg-slate-800'}`}
    title="Modelo Digital de Elevación y Sombreado de Relieve SRTM 30m del IGAC"
  >
    Relieve
  </button>
  ```
  In lines 820–871, the `useEffect([mapLayer])` handles only `'osm'`, `'igac-sat'`, and `'igac-pol'`. There is no branch for `'igac-relieve'`. When clicked, it removes `igacSatLayerRef`, `igacPolLayerRef`, and `osmLayerRef`, and adds nothing, leaving the Cesium globe untextured and completely blank.
- `Map3DDisplayComponent.tsx:3089–3098`:
  The HUD exaggeration buttons toggle between `[1.0, 1.8, 2.8]`, while `Map3DDisplayComponent.tsx:363` initializes `viewer.scene.globe.terrainExaggeration = 1.5;` and `useState` uses `1.8` at line 164. The requirement specifies `1.0x, 1.5x, 2.0x`.

### 1.4 Critical Syntax Error in `Map3DDisplayComponent.tsx`
- Running `npm run build` fails with:
  ```
  error during build:
  [vite:esbuild] Transform failed with 1 error:
  C:/DESARROLLOS/SIMCOP-main/components/Map3DDisplayComponent.tsx:300:15: ERROR: Expected "}" but found ";"
  298|    // Real-time cursor tracking
  299|    const [cursorInfo, setCursorInfo] = useState<{
  300|      lat: string;
     |                 ^
  301|      lon: string;
  302|      dmsLat: string;
  ```
- Lines 298–304 in `components/Map3DDisplayComponent.tsx` were truncated:
  ```typescript
  // Real-time cursor tracking
  const [cursorInfo, setCursorInfo] = useState<{
    lat: string;
    lon: string;
    dmsLat: string;
  const [coverageDomeActive, setCoverageDomeActive] = useState(false);
  ```
- Lines 539–545 and lines 2960–2972 require `cursorInfo` to have the following shape:
  ```typescript
  const [cursorInfo, setCursorInfo] = useState<{
    lat: string;
    lon: string;
    dmsLat: string;
    dmsLon: string;
    elevation: number | string;
  } | null>(null);
  ```

### 1.5 Available Terrain APIs in Cesium 1.142.0 (`@cesium/engine`)
- Node inspection of `node_modules/cesium`:
  - `Cesium.Terrain.fromWorldTerrain(options)`: Helper producing a `Terrain` instance for Cesium World Terrain (asset 1).
  - `Cesium.createWorldTerrainAsync(options)`: Returns a `Promise<CesiumTerrainProvider>` for asset 1.
  - `Cesium.ArcGISTiledElevationTerrainProvider.fromUrl(url, options)`: Static async method in `@cesium/engine/Source/Core/ArcGISTiledElevationTerrainProvider.js` (line 355). Allows streaming elevation tiles directly from an ArcGIS ImageServer (e.g. `https://elevation3d.arcgis.com/arcgis/rest/services/WorldElevation3D/Terrain3D/ImageServer`).
  - `Cesium.CesiumTerrainProvider.fromIonAssetId(assetId, options)`: Static async method for Ion assets.
  - `Cesium.CesiumTerrainProvider.fromUrl(url, options)`: Static async method for `layer.json` directories.
  - `viewer.terrainProvider = provider`: Directly updates the terrain provider on the underlying widget and scene.
  - `viewer.scene.setTerrain(terrain)`: Sets terrain when using a `Cesium.Terrain` instance.
  - `viewer.scene.globe.terrainExaggeration`: Controls vertical scale multiplier.
  - `viewer.scene.globe.terrainExaggerationRelativeHeight`: Reference datum for vertical displacement.
  - `viewer.scene.globe.depthTestAgainstTerrain`: Occludes sub-surface geometry and enables true physical 3D terrain horizon.

---

## 2. Logic Chain

1. **Observation 1.1** proves that `components/Map3DDisplayComponent.tsx` is the single source of truth for Cesium 3D rendering in SIMCOP. Any terrain, imagery, or camera fixes must be implemented here.
2. **Observation 1.2** proves that terrain loading fails on initial launch because:
   - Neither `localStorage` nor `.env` provides `VITE_CESIUM_ION_TOKEN`.
   - The embedded default token inside Cesium 1.142 expired on August 1, 2026.
   - `createWorldTerrainAsync` and `CesiumTerrainProvider.fromUrl('https://assets.ion.cesium.com/1')` both throw `401 Unauthorized` errors.
   - The catch block defaults to `new Cesium.EllipsoidTerrainProvider()`.
   - Consequently, the globe has 0 physical elevation; mountains and valleys are flat, and `terrainExaggeration` has no effect (`0 * 1.5 = 0`).
3. **Observation 1.5** demonstrates that Cesium 1.142 includes `Cesium.ArcGISTiledElevationTerrainProvider.fromUrl`. The standard ArcGIS World Elevation service (`https://elevation3d.arcgis.com/arcgis/rest/services/WorldElevation3D/Terrain3D/ImageServer`) provides high-resolution 3D digital elevation tiles globally without requiring an expired Cesium Ion token.
4. Therefore, introducing a resilient multi-tier terrain loader that prioritizes `ArcGISTiledElevationTerrainProvider.fromUrl(...)` when no valid Cesium Ion token is present, and supports `Cesium.Terrain.fromWorldTerrain` / `createWorldTerrainAsync` when a valid token is provided, will immediately resolve the 401 errors and restore physical 3D elevation mesh across Colombia.
5. **Observation 1.4** demonstrates that `npm run build` is currently blocked by a truncated type definition in `Map3DDisplayComponent.tsx:299-303`. This must be fixed to satisfy Requirement R4 (clean build).
6. **Observation 1.3** demonstrates that `igac-relieve` on line 3051 is a broken 2D imagery layer toggle that removes all textures. Removing or properly rewiring this button prevents the globe from becoming blank.

---

## 3. Caveats

- **Network Dependency**: Both Cesium Ion (`assets.ion.cesium.com`) and ArcGIS Elevation (`elevation3d.arcgis.com`) require outbound HTTPS internet connectivity from the client browser. In completely air-gapped/offline military networks without internet, an on-premises terrain tile server (e.g. Dockerized CTB or local GeoTIFF tile server) or cached DEM tiles would be required.
- **ArcGIS Elevation Quotas**: While the public ArcGIS ImageServer endpoint works for standard client sessions, high-volume production deployments can optionally configure an ArcGIS developer key or a dedicated Cesium Ion token in `.env` (`VITE_CESIUM_ION_TOKEN`).
- **WebGL Hardware Acceleration**: 3D geometric terrain mesh with `depthTestAgainstTerrain = true` and `enableLighting = true` requires a WebGL-capable browser. On low-end or virtualized headless environments without GPU, WebGL falls back to software rendering (SwiftShader).

---

## 4. Conclusion

1. **Root Cause of Flat Terrain & 401s**:
   `getTerrainProvider()` unconditionally attempts to load Cesium Ion Asset 1 (`createWorldTerrainAsync` and `https://assets.ion.cesium.com/1`) using an expired default token (`aud: "Delete on August 1, 2026"`), generating console 401 errors and falling back to `EllipsoidTerrainProvider` (flat globe with zero elevation).
2. **Recommended Multi-Tier Terrain Provider Solution**:
   Refactor `getTerrainProvider()` into a resilient hierarchical loader:
   - **Tier 1 (Tokenless High-Resolution 3D Mesh)**: `Cesium.ArcGISTiledElevationTerrainProvider.fromUrl("https://elevation3d.arcgis.com/arcgis/rest/services/WorldElevation3D/Terrain3D/ImageServer")`. This provides real 3D geometric relief for Colombia's mountain ranges with zero 401 errors.
   - **Tier 2 (Cesium World Terrain HD)**: If `token` (from `localStorage` or `import.meta.env.VITE_CESIUM_ION_TOKEN`) is non-empty, use `Cesium.createWorldTerrainAsync({ requestWaterMask: true, requestVertexNormals: true })`.
   - **Tier 3 (Graceful Offline Ellipsoid Fallback)**: Only if all network providers fail, return `new Cesium.EllipsoidTerrainProvider()` with a user notification.
3. **HUD & Exaggeration Alignment**:
   - Align exaggeration values in `Map3DDisplayComponent.tsx` to `[1.0, 1.5, 2.0]` (line 3089), with default `1.5` at line 164 and line 363.
   - Remove or fix the broken `igac-relieve` button at line 3051.
4. **Build Fix Required**:
   Correct the truncated type definition at lines 298–303 in `components/Map3DDisplayComponent.tsx` so `npm run build` completes with exit code 0.

### Proposed Code Changes for Implementer

#### Change A: Fix `cursorInfo` syntax error (`Map3DDisplayComponent.tsx:298–304`)
```typescript
<<<< BEFORE
  // Real-time cursor tracking
  const [cursorInfo, setCursorInfo] = useState<{
    lat: string;
    lon: string;
    dmsLat: string;
  const [coverageDomeActive, setCoverageDomeActive] = useState(false);
==== AFTER
  // Real-time cursor tracking
  const [cursorInfo, setCursorInfo] = useState<{
    lat: string;
    lon: string;
    dmsLat: string;
    dmsLon: string;
    elevation: number | string;
  } | null>(null);
  const [coverageDomeActive, setCoverageDomeActive] = useState(false);
>>>>
```

#### Change B: Resilient Terrain Provider Loader (`Map3DDisplayComponent.tsx:90–119`)
```typescript
<<<< BEFORE
const getTerrainProvider = async (): Promise<Cesium.TerrainProvider> => {
  const token = localStorage.getItem('simcop_cesium_ion_token') || (import.meta as any).env?.VITE_CESIUM_ION_TOKEN || '';
  if (token && token.trim()) {
    Cesium.Ion.defaultAccessToken = token.trim();
  }

  if (typeof (Cesium as any).createWorldTerrainAsync === 'function') {
    try {
      return await (Cesium as any).createWorldTerrainAsync({
        requestWaterMask: true,
        requestVertexNormals: true
      });
    } catch (err) {
      console.warn("createWorldTerrainAsync failed, intentando CesiumTerrainProvider:", err);
    }
  }
  
  if (typeof (Cesium.CesiumTerrainProvider as any).fromUrl === 'function') {
    try {
      return await (Cesium.CesiumTerrainProvider as any).fromUrl('https://assets.ion.cesium.com/1', {
        requestWaterMask: true,
        requestVertexNormals: true
      });
    } catch (err) {
      console.warn("CesiumTerrainProvider.fromUrl failed, utilizando Ellipsoid con relieve simulado:", err);
    }
  }

  return new Cesium.EllipsoidTerrainProvider();
};
==== AFTER
const getTerrainProvider = async (): Promise<Cesium.TerrainProvider> => {
  const token = localStorage.getItem('simcop_cesium_ion_token') || (import.meta as any).env?.VITE_CESIUM_ION_TOKEN || '';
  
  // 1. Si el usuario configuró un token de Cesium Ion válido, intentar Cesium World Terrain
  if (token && token.trim()) {
    Cesium.Ion.defaultAccessToken = token.trim();
    try {
      return await Cesium.createWorldTerrainAsync({
        requestWaterMask: true,
        requestVertexNormals: true
      });
    } catch (ionErr) {
      console.warn("Cesium World Terrain (Ion) falló con el token provisto:", ionErr);
    }
  }

  // 2. Proveedor principal de relieve 3D geométrico sin fallos 401: ArcGIS World Elevation 3D
  try {
    return await Cesium.ArcGISTiledElevationTerrainProvider.fromUrl(
      'https://elevation3d.arcgis.com/arcgis/rest/services/WorldElevation3D/Terrain3D/ImageServer'
    );
  } catch (arcGisErr) {
    console.warn("ArcGISTiledElevationTerrainProvider falló, probando fallback alternativo:", arcGisErr);
  }

  // 3. Fallback de contingencia: Si no hay conexión o fallan los anteriores
  return new Cesium.EllipsoidTerrainProvider();
};
>>>>
```

#### Change C: HUD Exaggeration Factors (`Map3DDisplayComponent.tsx:164, 3089`)
```typescript
<<<< BEFORE (Line 164)
  const [terrainExaggeration, setTerrainExaggeration] = useState<number>(1.8);
==== AFTER (Line 164)
  const [terrainExaggeration, setTerrainExaggeration] = useState<number>(1.5);
>>>>

<<<< BEFORE (Line 3089)
  {[1.0, 1.8, 2.8].map((factor) => (
==== AFTER (Line 3089)
  {[1.0, 1.5, 2.0].map((factor) => (
>>>>
```

---

## 5. Verification Method

1. **Syntax & Build Verification**:
   - Run `npm run build` in root `c:\DESARROLLOS\SIMCOP-main`.
   - Expected result: exit code 0, 0 build errors.
2. **Cesium 3D Geometric Terrain Mesh Verification**:
   - Start Vite dev server: `npm run dev` or launch docker container.
   - Open browser at `http://localhost:3010` (or `http://localhost`).
   - Navigate to the 3D Map view.
   - Check the browser DevTools Console (F12): Verify there are **zero** `401 Unauthorized` requests to `https://api.cesium.com/v1/assets/1/endpoint` or `https://assets.ion.cesium.com/1`.
   - Incline camera to 45° perspective over the Colombian Andes (Cordillera Oriental, Central, Occidental - Bogotá, Medellín, Cali).
   - Verify that mountains, ridges, and valleys exhibit true physical vertical displacement against the horizon.
   - Switch terrain exaggeration between `1.0x`, `1.5x`, and `2.0x` and verify that mountain peaks visually scale in physical height.
   - Verify that the bottom right cursor HUD displays realistic altitude in meters (e.g. 2,600+ msnm in Bogotá area) instead of 0 msnm.
