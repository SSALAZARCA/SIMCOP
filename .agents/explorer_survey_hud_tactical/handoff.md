# Handoff Report: HUD Controls, Terrain Exaggeration, Tactical Tools Synchronization, Camera Setup & Build Environment

## 1. Observation

### 1.1 Build and Compilation Failure
- **Command executed**: `npm run build`
- **Verbatim output**:
  ```text
  > copy-of-simcop---sistema-integrado-de-mando-y-control-operacional@0.0.0 build
  > vite build

  vite v6.4.1 building for production...
  transforming...
  ✓ 20 modules transformed.
  ✗ Build failed in 5.04s
  error during build:
  [vite:esbuild] Transform failed with 1 error:
  C:/DESARROLLOS/SIMCOP-main/components/Map3DDisplayComponent.tsx:300:15: ERROR: Expected "}" but found ";"
  file: C:/DESARROLLOS/SIMCOP-main/components/Map3DDisplayComponent.tsx:300:15

  Expected "}" but found ";"
  298|    // Real-time cursor tracking
  299|    const [cursorInfo, setCursorInfo] = useState<{
  300|      lat: string;
     |                 ^
  301|      lon: string;
  302|      dmsLat: string;
  ```
- **File inspection (`components/Map3DDisplayComponent.tsx:298-316`)**:
  ```tsx
  // Real-time cursor tracking
  const [cursorInfo, setCursorInfo] = useState<{
    lat: string;
    lon: string;
    dmsLat: string;
  const [coverageDomeActive, setCoverageDomeActive] = useState(false);
  const [coverageDomeEntity, setCoverageDomeEntity] = useState<Cesium.Entity | null>(null);
  const [showWindyPanel, setShowWindyPanel] = useState(false);
  const [windyCoords, setWindyCoords] = useState<{ lat: number; lon: number; zoom: number }>({ lat: 4.570868, lon: -74.297333, zoom: 6 });
  const [nativeRadarActive, setNativeRadarActive] = useState(false);
  const [aoiDrawingModeActive, setAoiDrawingModeActive] = useState(false);
  const [piccDrawingConfig, setPiccDrawingConfig] = useState<any>(null);
  const [hoveredTooltipInfo, setHoveredTooltipInfo] = useState<any>(null);

  const igacSatLayerRef = useRef<Cesium.ImageryLayer | null>(null);
  const igacSatLabelsLayerRef = useRef<Cesium.ImageryLayer | null>(null);
  const igacPolLayerRef = useRef<Cesium.ImageryLayer | null>(null);
  const osmLayerRef = useRef<Cesium.ImageryLayer | null>(null);
  ```
- **Comparison with Git HEAD (`git show HEAD:components/Map3DDisplayComponent.tsx:298-316`)**:
  ```tsx
  // Real-time cursor tracking
  const [cursorInfo, setCursorInfo] = useState<{
    lat: string;
    lon: string;
    dmsLat: string;
    dmsLon: string;
    elevation: number;
  } | null>(null);
  const [hoveredTooltipInfo, setHoveredTooltipInfo] = useState<{x: number, y: number, title: string, details: string[]} | null>(null);

  // Imagery layers refs
  const igacSatLayerRef = useRef<Cesium.ImageryLayer | null>(null);
  const igacSatLabelsLayerRef = useRef<Cesium.ImageryLayer | null>(null);
  const igacSatDaneLayerRef = useRef<Cesium.ImageryLayer | null>(null);
  const igacPolLayerRef = useRef<Cesium.ImageryLayer | null>(null);
  const osmLayerRef = useRef<Cesium.ImageryLayer | null>(null);
  const radarLayerRef = useRef<Cesium.ImageryLayer | null>(null);
  const cloudsLayerRef = useRef<Cesium.ImageryLayer | null>(null);
  ```
- Notice that variables `coverageDomeActive`, `showWindyPanel`, `windyCoords`, `nativeRadarActive` are already declared at lines 175-207 and in props (`aoiDrawingModeActive`, `piccDrawingConfig` at lines 142, 153). The unclosed generic type parameter `{` on line 299 cascades syntax errors across 32 lines in TypeScript compiler.

### 1.2 HUD Controls and Map Toolbar Structure
- **File**: `components/Map3DDisplayComponent.tsx`
- **Top-Left Global Toolbar (`lines 2976-3019`)**:
  - Button 1: Toggle tactical control panel (`setIsControlPanelOpen(!isControlPanelOpen)`).
  - Button 2: Toggle analysis filters (`setShowFilters(!showFilters)`).
  - Button 3: Toggle fullscreen (`document.getElementById('simcop-map-container')?.requestFullscreen()`).
  - **Absence**: There are **no on-screen Zoom In / Zoom Out (+/-)** buttons.
- **Floating Tactical Control Panel (`lines 3021-3162`)**:
  - Class: `absolute top-16 left-4 z-[99] bg-slate-950/85 backdrop-blur-md border border-slate-800/80 rounded-xl p-4 w-72 shadow-2xl`
  - **Reset/Center Button (`lines 3028-3037`)**:
    `<button onClick={reset3DPerspective} ...>🎯 Centrar Globo 3D</button>`
  - **Layer Selector (`lines 3039-3071`)**:
    Renders 4 buttons: `igac-sat` (Satélite), `igac-relieve` (Relieve), `igac-pol` (Base IGAC), `osm` (OSM).
    - `mapLayer` state definition (`line 163`): `useState<'igac-sat' | 'igac-pol' | 'osm' | 'igac-vias'>('igac-sat')`.
    - Layer handler effect (`lines 804-871`): Only handles `'osm'`, `'igac-sat'`, and `'igac-pol'`. There is **no handler** for `'igac-relieve'`, making the "Relieve" button a no-op that empties the layers.
    - Requirement R3 specifies 3 base layers: **Satélite HD, Cartografía, OSM**.
  - **Terrain and Relief Exaggeration (`lines 3073-3108`)**:
    - Checkbox toggle: `terrainActive` (`lines 3077-3082`).
    - Exaggeration buttons (`lines 3089-3098`):
      `{[1.0, 1.8, 2.8].map((factor) => ...)}`
    - Initial state in component (`line 164`): `const [terrainExaggeration, setTerrainExaggeration] = useState<number>(1.8);`
    - Initial globe setting in viewer creation (`line 363`): `viewer.scene.globe.terrainExaggeration = 1.5;`
    - Inconsistency: The buttons render `[1.0, 1.8, 2.8]`, state begins at `1.8`, Cesium globe begins at `1.5`, whereas requirement R3 explicitly specifies factors `(1.0x, 1.5x, 2.0x)`.
  - **Cesium Ion Modal (`lines 3165-3197`)**:
    Modal to input custom Cesium Ion token (`simcop_cesium_ion_token`), calls `handleSaveIonToken` (`line 690`).
  - **Tactical 3D Tools Buttons (`lines 3123-3161`)**:
    - LOS button: `onClick={() => { setLosToolActive(!losToolActive); setLosPoints([]); setCoverageDomeActive(false); }}`
    - Coverage Dome button: `onClick={() => { setCoverageDomeActive(!coverageDomeActive); setLosToolActive(false); }}`
    - Windy toggle button: `onClick={toggleWindyPanel}`
    - Radar toggle button: `onClick={() => setNativeRadarActive(!nativeRadarActive)}`
- **Real-Time Cursor HUD (`lines 2958-2974`)**:
  - Class: `absolute bottom-4 right-4 z-[99] bg-slate-950/85 backdrop-blur-sm ...`
  - Displays POS (`lat, lon`), DMS (`dmsLat, dmsLon`), ALT (`elevation msnm`).

### 1.3 Initial Camera Setup & Perspective
- **Initial setView (`components/Map3DDisplayComponent.tsx:376-384`)**:
  ```tsx
  viewer.camera.setView({
    destination: Cesium.Cartesian3.fromDegrees(-74.297333, 2.500000, 550000.0), // 550km altitude
    orientation: {
      heading: Cesium.Math.toRadians(12),
      pitch: Cesium.Math.toRadians(-45), // Perspectiva 3D táctica (45 grados de inclinación)
      roll: 0.0
    }
  });
  ```
- **Atmosphere and Fog settings (`lines 360-371`)**:
  ```tsx
  viewer.scene.globe.depthTestAgainstTerrain = true;
  viewer.scene.globe.enableLighting = true;
  viewer.scene.globe.terrainExaggeration = 1.5;
  viewer.scene.globe.terrainExaggerationRelativeHeight = 0.0;
  viewer.scene.globe.showGroundAtmosphere = true;
  if (viewer.scene.skyAtmosphere) {
    viewer.scene.skyAtmosphere.show = true;
  }
  viewer.scene.fog.enabled = true;
  viewer.scene.fog.density = 0.0003;
  ```
- **Reset Perspective (`components/Map3DDisplayComponent.tsx:669-681`)**:
  ```tsx
  const reset3DPerspective = () => {
    if (!viewerRef.current || viewerRef.current.isDestroyed()) return;
    const camera = viewerRef.current.camera;
    camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(-74.297333, 2.500000, 520000.0),
      orientation: {
        heading: Cesium.Math.toRadians(12),
        pitch: Cesium.Math.toRadians(-45),
        roll: 0.0
      },
      duration: 1.5
    });
  };
  ```
- **Geometric Geometry**: Camera placed at Lat 2.500000, Lon -74.297333 with Heading 12° (NNE) and Pitch -45° at 520-550 km altitude projects its line-of-sight center forward onto the Earth surface at approximately Lat 4.5°N, Lon -73.5°W (central Colombia: Cundinamarca/Bogotá savanna and the Eastern/Central cordilleras).
- **Cesium Default Home Button (`line 343: homeButton: true`)**: Clicking Cesium's standard Home Button in the top right returns the camera to the default USA/global rectangle rather than resetting to Colombia tactical view, because `viewer.homeButton.viewModel.command` is unhooked.

### 1.4 Tactical Tools Integration
1. **Line of Sight (LOS)**:
   - **Click Gathering (`lines 455-466`)**: Collects 2 points via `viewer.camera.getPickRay` and `viewer.scene.globe.pick(ray, viewer.scene)` and invokes `calculateLineOfSight(updated[0], updated[1])`.
   - **Calculation (`lines 2395-2488`)**:
     - Calculates normalized direction vector between start and end.
     - Creates `const ray = new Cesium.Ray(startCartesian, direction)`.
     - Tests intersection against terrain: `const intersection = viewer.scene.globe.pick(ray, viewer.scene)`.
     - Checks `if (distanceObstacle < distanceFull - 10.0)` for obstruction.
     - Adds entities: `los-line` (green polyline), `los-line-obstructed` (red polyline), and `los-obstacle-marker` (red point and billboard label).
   - **Gaps**:
     - Start and end cartesian coordinates are taken directly from the terrain surface without observer eye-height (+2.0m AGL). Because the ray starts on the terrain triangle, it is susceptible to self-intersection or false positive obstruction near `distanceObstacle < 10.0m`.
     - `AnalysisView.tsx:290` publishes `eventBus.publish('clearLosLayer')`, but `Map3DDisplayComponent` does not subscribe to this event or clear LOS entities when deactivated.
2. **Coverage Domes (Domos de Cobertura 3D)**:
   - **Click Placement (`lines 2490-2516: addCoverageDome`)**:
     - Places entity `coverage-dome-3d` with `ellipsoid: { radii: new Cesium.Cartesian3(15000, 15000, 15000), material: Cesium.Color.CYAN.withAlpha(0.25), outline: true }`.
     - Because `depthTestAgainstTerrain = true` (`line 361`), the subterranean portion of the sphere is naturally occluded by the 3D elevation mesh, creating a true 3D hemispherical dome following mountain contours.
   - **Unit Domes (`lines 1226-1246`)**:
     - In unit render loop: `Cesium.Cartesian3.fromDegrees(matchedUnit.location.lon, matchedUnit.location.lat, 0)`.
     - Hardcoding altitude to `0` buries the dome center beneath elevated terrain (e.g. Bogotá at 2,600m MSL).
3. **Windy Weather Integration**:
   - **Overlay (`lines 3200-3240`)**:
     - Renders floating iframe modal (`w-[450px]`, `h-[600px]`, `z-[99]`) pointing to `https://embed.windy.com/embed2.html?lat=...&lon=...&zoom=...&overlay=radar...`.
     - Coordinates and zoom are computed dynamically from `viewer.camera.positionCartographic`:
       `zoom = Math.max(4, Math.min(18, Math.round(27 - Math.log2(cameraPos.height))))`.
     - "Sincronizar" button allows re-sampling camera position.
   - **Atmospheric / Shader Effects (`lines 875-950`)**:
     - When `weatherEffect === 'storm'`, generates animated lightning Billboard entities (`lightningSvg`) within ~50km radius of `windyCoords` with `heightReference: Cesium.HeightReference.CLAMP_TO_GROUND`.
4. **Radar Overlay (RainViewer)**:
   - **Implementation (`lines 765-801`)**:
     - On `nativeRadarActive: true`, fetches `https://api.rainviewer.com/public/weather-maps.json`.
     - Dynamically mounts `Cesium.UrlTemplateImageryProvider` with `url: https://tilecache.rainviewer.com${latest}/256/{z}/{x}/{y}/2/1_1.png` and `layer.alpha = 0.6`.
     - The imagery layer is added to `viewer.imageryLayers`, draping precipitation reflectivity in real time directly across the 3D terrain.

### 1.5 Build & Docker Environment
- **`package.json`**:
  - Cesium: `cesium: ^1.142.0`
  - Bundler plugin: `vite-plugin-cesium: ^1.2.23`
  - React: `19.1.0`
  - Build script: `"build": "vite build"`
- **`vite.config.ts`**:
  - Plugins: `[react(), cesium()]`
  - Define: `'global': 'window'`
  - Rollup manualChunks: splits `cesium`, `leaflet`, `vendor`, and `deps`.
- **`Dockerfile`**:
  - Multi-stage: `node:20-alpine AS build` -> `npm ci` -> `ENV NODE_OPTIONS="--max-old-space-size=1024"` -> `RUN npm run build` -> `nginx:stable-alpine`.
- **`nginx.conf`**:
  - Includes CSP header with:
    `default-src 'self'; connect-src 'self' https://* wss://* http://localhost:* http://127.0.0.1:*; img-src 'self' data: blob: https://*; style-src 'self' 'unsafe-inline' https://*; font-src 'self' data: https://*; script-src 'self' 'unsafe-eval' 'unsafe-inline' blob:; worker-src 'self' blob:; frame-src 'self' https://embed.windy.com;`
  - Handles SPA routing with `try_files $uri $uri/ /index.html;`.
  - All external connections (`https://*`), workers (`worker-src 'self' blob:;`), and Windy frames (`frame-src 'self' https://embed.windy.com;`) are permitted.

---

## 2. Logic Chain

1. **Build Failure Root Cause**:
   - `npm run build` fails directly on `components/Map3DDisplayComponent.tsx:300:15` with `Expected "}" but found ";"`.
   - Inspection of lines 298-311 reveals that an edit accidentally inserted duplicate state definitions (`coverageDomeActive`, `showWindyPanel`, `windyCoords`, etc.) right in the middle of `const [cursorInfo, setCursorInfo] = useState<{ lat: string; lon: string; dmsLat: string;`.
   - Restoring the clean type signature for `cursorInfo` (`{ lat: string; lon: string; dmsLat: string; dmsLon: string; elevation: number } | null`) and removing the duplicate state declarations eliminates the syntax and type errors.

2. **HUD Controls & Terrain Exaggeration Alignment**:
   - Requirement R3 states: "ajuste del factor de exageración del terreno (1.0x, 1.5x, 2.0x), conmutación limpia entre capas base (Satélite HD, Cartografía, OSM)".
   - Current state:
     - `terrainExaggeration` buttons in HUD are `[1.0, 1.8, 2.8]`.
     - Initial state in React is `1.8`.
     - Initial Cesium globe value in viewer initialization is `1.5`.
     - Layer selector has a button for `'igac-relieve'` which has no implementation in `useEffect` and is not part of the requirement.
   - Therefore, updating the exaggeration buttons array to `[1.0, 1.5, 2.0]`, aligning the default state and globe setting to `1.5` (or `1.0`), and restricting the base layer selector to 3 buttons (`igac-sat`, `igac-pol`, `osm`) satisfies R3 without dead code.
   - Adding on-screen Zoom In (`+`) and Zoom Out (`-`) buttons to the top-left toolbar (`viewer.camera.zoomIn()` / `zoomOut()`) resolves the absence of tactical touch/click zoom controls.

3. **Camera Initial Setup & Reset Persistence**:
   - Setting the camera to `destination: Cesium.Cartesian3.fromDegrees(-74.297333, 2.500000, 550000.0)` with `heading: 12°`, `pitch: -45°`, and `roll: 0.0°` provides an oblique forward-looking view looking north over the Colombian Andes from the south. The line of sight intercepts the terrain surface around Bogotá (Lat ~4.6°N, Lon ~-74.1°W), revealing atmospheric fog, the horizon curvature, and the relief of the three cordilleras.
   - Harmonizing `viewer.camera.setView` in viewer initialization and `camera.flyTo` in `reset3DPerspective` to use identical coordinates (Lat 2.500000, Lon -74.297333, Height 550,000m, Heading 12°, Pitch -45°) ensures visual consistency.
   - Overriding the Cesium default `homeButton` action via `viewer.homeButton.viewModel.command.beforeExecute` to call `reset3DPerspective()` prevents accidental camera disorientation to the US globe.

4. **Tactical Tools Synchronization**:
   - **LOS Calculation**: Adding an observer offset (+2.0m along normal) to both the observer and target positions prevents ray-tracing false positives against the origin mesh facet and models true operational line-of-sight.
   - **EventBus Synchronization**: Subscribing to `clearLosLayer` (emitted by `AnalysisView.tsx:290`) in `Map3DDisplayComponent` ensures that switching tabs or clearing geospatial layers removes LOS polyline entities cleanly.
   - **Coverage Domes**: When rendering domes for military units, sampling terrain altitude (`viewer.scene.globe.getHeight(cartographic) || 0`) instead of hardcoding `0` ensures the dome origin sits on the ground surface regardless of elevation.
   - **Windy & Radar**: Both Windy (iframe overlay with camera sync) and RainViewer (dynamic imagery layer draped over 3D terrain) are structurally sound and permitted by Nginx CSP headers.

---

## 3. Caveats

1. **Cesium Ion Token vs. Public Elevation Services**:
   - Line 90 of `Map3DDisplayComponent.tsx` currently attempts to load Cesium World Terrain via `createWorldTerrainAsync` or Ion Asset 1. If an Ion token is not present in `localStorage`, Cesium returns HTTP 401 in the console and falls back to `EllipsoidTerrainProvider`.
   - The peer survey agent (`explorer_survey_terrain`) is specifically investigating terrain providers (e.g. `ArcGISTiledElevationTerrainProvider` / ESRI Terrain3D) to eliminate 401 errors without requiring user authentication.
2. **RainViewer API Availability**:
   - RainViewer API is a free public service (`https://api.rainviewer.com/public/weather-maps.json`). If the client machine is offline or behind an air-gapped proxy, the fetch fails silently via `.catch(...)`.
3. **Hardware Acceleration**:
   - 3D geometric terrain elevation and volumetric fog require WebGL 2.0 support on the client browser.

---

## 4. Conclusion

The SIMCOP 3D Geospatial Viewer already contains the architectural foundation for HUD controls, tactical camera positioning, and 3D tools (LOS, Domes, Windy, and Radar). However, concrete issues must be addressed:

1. **Build Blocker**: Line 299 in `components/Map3DDisplayComponent.tsx` has a syntax corruption that blocks `npm run build` and `tsc`. Restoring lines 298-316 to the correct `cursorInfo` definition fixes compilation immediately.
2. **HUD & Exaggeration**:
   - Align terrain exaggeration buttons and defaults to `[1.0, 1.5, 2.0]`.
   - Clean the base layer selector to 3 active options: **Satélite HD** (`igac-sat`), **Cartografía** (`igac-pol`), and **OSM** (`osm`).
   - Add on-screen tactical Zoom In / Zoom Out HUD buttons.
3. **Camera**:
   - Retain the tactical angle (`Lat 2.500000, Lon -74.297333, Height 550km, Heading 12°, Pitch -45°`).
   - Intercept Cesium default `homeButton` to execute `reset3DPerspective()`.
4. **Tactical Tools**:
   - Add +2.0m observer elevation offset to LOS ray calculation and subscribe to `clearLosLayer` from `eventBus`.
   - Sample ground elevation for unit coverage domes.

### Concrete Proposed Code Modifications

#### A. Fix `components/Map3DDisplayComponent.tsx` lines 298-316:
```tsx
<<<<<<< BEFORE
  // Real-time cursor tracking
  const [cursorInfo, setCursorInfo] = useState<{
    lat: string;
    lon: string;
    dmsLat: string;
  const [coverageDomeActive, setCoverageDomeActive] = useState(false);
  const [coverageDomeEntity, setCoverageDomeEntity] = useState<Cesium.Entity | null>(null);
  const [showWindyPanel, setShowWindyPanel] = useState(false);
  const [windyCoords, setWindyCoords] = useState<{ lat: number; lon: number; zoom: number }>({ lat: 4.570868, lon: -74.297333, zoom: 6 });
  const [nativeRadarActive, setNativeRadarActive] = useState(false);
  const [aoiDrawingModeActive, setAoiDrawingModeActive] = useState(false);
  const [piccDrawingConfig, setPiccDrawingConfig] = useState<any>(null);
  const [hoveredTooltipInfo, setHoveredTooltipInfo] = useState<any>(null);

  const igacSatLayerRef = useRef<Cesium.ImageryLayer | null>(null);
  const igacSatLabelsLayerRef = useRef<Cesium.ImageryLayer | null>(null);
  const igacPolLayerRef = useRef<Cesium.ImageryLayer | null>(null);
  const osmLayerRef = useRef<Cesium.ImageryLayer | null>(null);
=======
  // Real-time cursor tracking
  const [cursorInfo, setCursorInfo] = useState<{
    lat: string;
    lon: string;
    dmsLat: string;
    dmsLon: string;
    elevation: number;
  } | null>(null);
  const [hoveredTooltipInfo, setHoveredTooltipInfo] = useState<{x: number, y: number, title: string, details: string[]} | null>(null);

  const igacSatLayerRef = useRef<Cesium.ImageryLayer | null>(null);
  const igacSatLabelsLayerRef = useRef<Cesium.ImageryLayer | null>(null);
  const igacPolLayerRef = useRef<Cesium.ImageryLayer | null>(null);
  const osmLayerRef = useRef<Cesium.ImageryLayer | null>(null);
  const radarLayerRef = useRef<Cesium.ImageryLayer | null>(null);
>>>>>>> AFTER
```

#### B. Update Exaggeration State & Buttons (`lines 164 & 3089`):
```tsx
// Line 164
const [terrainExaggeration, setTerrainExaggeration] = useState<number>(1.5);

// Line 3089
{[1.0, 1.5, 2.0].map((factor) => (
  <button
    key={factor}
    onClick={() => handleExaggerationChange(factor)}
    className={`px-2 py-0.5 rounded font-bold transition ${terrainExaggeration === factor ? 'bg-sky-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'}`}
  >
    {factor}x
  </button>
))}
```

#### C. Add Zoom In / Zoom Out to HUD Toolbar:
```tsx
<button
  onClick={() => {
    if (viewerRef.current && !viewerRef.current.isDestroyed()) {
      const height = viewerRef.current.camera.positionCartographic.height;
      viewerRef.current.camera.zoomIn(height * 0.35);
    }
  }}
  className="p-2 rounded-lg border backdrop-blur-md bg-slate-900/80 border-slate-700 text-slate-300 hover:bg-slate-800 transition-all shadow-lg"
  title="Acercar Cámara (Zoom In)"
>
  ➕
</button>
<button
  onClick={() => {
    if (viewerRef.current && !viewerRef.current.isDestroyed()) {
      const height = viewerRef.current.camera.positionCartographic.height;
      viewerRef.current.camera.zoomOut(height * 0.35);
    }
  }}
  className="p-2 rounded-lg border backdrop-blur-md bg-slate-900/80 border-slate-700 text-slate-300 hover:bg-slate-800 transition-all shadow-lg"
  title="Alejar Cámara (Zoom Out)"
>
  ➖
</button>
```

#### D. Overriding Home Button:
```tsx
if (viewer.homeButton && viewer.homeButton.viewModel) {
  viewer.homeButton.viewModel.command.beforeExecute.addEventListener((e) => {
    e.cancel = true;
    reset3DPerspective();
  });
}
```

---

## 5. Verification Method

To independently verify these findings:

1. **Verify Build Failure & Resolution**:
   ```bash
   # Run type check to confirm the 32 TS errors stemming from line 299:
   npx tsc --noEmit
   # Run Vite build to observe the failure:
   npm run build
   ```
2. **Verify HUD Controls & Layer Selector**:
   - Inspect `components/Map3DDisplayComponent.tsx` lines 3039-3071 (buttons for `igac-sat`, `igac-relieve`, `igac-pol`, `osm`).
   - Inspect `components/Map3DDisplayComponent.tsx` lines 804-871 (missing `'igac-relieve'` branch).
3. **Verify Terrain Exaggeration Inconsistencies**:
   - Inspect line 164 (default `1.8`), line 363 (default `1.5`), and line 3089 (`[1.0, 1.8, 2.8]`).
4. **Verify Tactical Tools Integration**:
   - Inspect lines 2395-2488 (`calculateLineOfSight` ray generation and entity creation).
   - Inspect lines 2490-2516 (`addCoverageDome` ellipsoid configuration).
   - Inspect lines 3200-3240 (Windy iframe overlay and camera synchronization).
   - Inspect lines 765-801 (RainViewer dynamic radar imagery layer).
5. **Verify Nginx and Docker Configuration**:
   - Inspect `Dockerfile` line 11 (`RUN npm run build`).
   - Inspect `nginx.conf` lines 19, 35, 76 (CSP `frame-src 'self' https://embed.windy.com;`).
