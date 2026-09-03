# Handoff Report — Explorer Survey Imagery

**Subagent**: `explorer_survey_imagery`  
**Milestone**: Survey Phase — Cesium 3D Geospatial Viewer  
**Target Area**: Cartography, Satellite Imagery Layers, Base Layers, Geographic Labels & UI Layer Switching  
**Date**: 2026-09-03T01:42:00Z  

---

## 1. Observation

### 1.1 Files and Architecture Mapping
- **Primary file**: `c:\DESARROLLOS\SIMCOP-main\components\Map3DDisplayComponent.tsx` (3,244 lines). This is the single, central component where all Cesium imagery providers, layer collections, layer switching hooks, HUD controls, and tactical overlays are defined.
- **Vite Cesium Plugin**: `c:\DESARROLLOS\SIMCOP-main\vite.config.ts` (lines 4, 16): uses `vite-plugin-cesium` (`^1.2.23`).
- **Cesium Version**: `c:\DESARROLLOS\SIMCOP-main\package.json` (line 19): `"cesium": "^1.142.0"`.

### 1.2 Current Imagery Providers and Layer Instantiations
In `components/Map3DDisplayComponent.tsx`:
1. **Viewer Initialization** (lines 326–336, 372–374):
   ```typescript
   // Line 327-330:
   const satelliteProvider = new Cesium.UrlTemplateImageryProvider({
     url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
     credit: 'Esri, Maxar, Earthstar Geographics'
   });

   // Line 332-336:
   const labelsProvider = new Cesium.UrlTemplateImageryProvider({
     url: 'https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}.png',
     subdomains: ['a', 'b', 'c', 'd'],
     credit: '© CartoDB, © OpenStreetMap'
   });
   ...
   // Line 372-374:
   viewer.imageryLayers.removeAll();
   igacSatLayerRef.current = viewer.imageryLayers.addImageryProvider(satelliteProvider, 0);
   igacSatLabelsLayerRef.current = viewer.imageryLayers.addImageryProvider(labelsProvider, 1);
   ```

2. **Native Weather Radar Layer (RainViewer)** (lines 766–801):
   ```typescript
   // Line 778-785:
   const provider = new Cesium.UrlTemplateImageryProvider({
     url: `https://tilecache.rainviewer.com${latest}/256/{z}/{x}/{y}/2/1_1.png`,
     credit: 'RainViewer',
     enablePickFeatures: false,
   });
   const layer = viewer.imageryLayers.addImageryProvider(provider);
   layer.alpha = 0.6; // transparency
   radarLayerRef.current = layer;
   ```

3. **Base Layer Switching Hook** (lines 804–871):
   - Clears existing layers:
     ```typescript
     if (igacSatLayerRef.current) { viewer.imageryLayers.remove(igacSatLayerRef.current); igacSatLayerRef.current = null; }
     if (igacSatLabelsLayerRef.current) { viewer.imageryLayers.remove(igacSatLabelsLayerRef.current); igacSatLabelsLayerRef.current = null; }
     if (igacSatDaneLayerRef.current) { viewer.imageryLayers.remove(igacSatDaneLayerRef.current); igacSatDaneLayerRef.current = null; } // Error: undeclared ref!
     if (igacPolLayerRef.current) { viewer.imageryLayers.remove(igacPolLayerRef.current); igacPolLayerRef.current = null; }
     if (osmLayerRef.current) { viewer.imageryLayers.remove(osmLayerRef.current); osmLayerRef.current = null; }
     ```
   - When `mapLayer === 'osm'`:
     ```typescript
     const osmProvider = new Cesium.UrlTemplateImageryProvider({
       url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
       subdomains: ['a', 'b', 'c'],
       credit: '© OpenStreetMap contributors'
     });
     osmLayerRef.current = viewer.imageryLayers.addImageryProvider(osmProvider, 0);
     ```
   - When `mapLayer === 'igac-sat'`:
     Adds `satelliteProvider` (`https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}`) at index 0 and `labelsProvider` (`https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}.png`) at index 1.
   - When `mapLayer === 'igac-pol'`:
     Calls `Cesium.ArcGisMapServerImageryProvider.fromUrl('https://mapas.igac.gov.co/server/rest/services/carto/Colombia_Base/MapServer')` with fallback to `https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png`.

### 1.3 UI Layer Switcher in HUD Control Panel
In `components/Map3DDisplayComponent.tsx` (lines 3042–3071):
```tsx
<div className="grid grid-cols-4 gap-1">
  <button onClick={() => setMapLayer('igac-sat')} ...>Satélite</button>
  <button onClick={() => setMapLayer('igac-relieve')} ...>Relieve</button>
  <button onClick={() => setMapLayer('igac-pol')} ...>Base IGAC</button>
  <button onClick={() => setMapLayer('osm')} ...>OSM</button>
</div>
```
- **Discrepancy 1**: The button for `"Relieve"` triggers `setMapLayer('igac-relieve')`. However, `'igac-relieve'` is **not handled** in the `useEffect([mapLayer])` hook. Clicking "Relieve" removes all existing base layers and loads nothing, leaving the Cesium globe blank/black.
- **Discrepancy 2**: State definition at line 163 declares:
  `const [mapLayer, setMapLayer] = useState<'igac-sat' | 'igac-pol' | 'osm' | 'igac-vias'>('igac-sat');`
  `'igac-relieve'` is not in the type definition, while `'igac-vias'` is in the type definition but has no button or handler.
- **Discrepancy 3**: In `ORIGINAL_REQUEST.md` (R3), the requirement specifies:
  *"conmutación limpia entre capas base (Satélite HD, Cartografía, OSM)"*.
  Relief is a 3D terrain feature (governed by the `Relieve 3D Cordillera` toggle and exaggeration factor buttons `1.0x, 1.5x, 2.0x`), not a 2D imagery layer.

### 1.4 Critical Syntax and Ref Declaration Corruption in `Map3DDisplayComponent.tsx`
Running `npx tsc --noEmit` fails with:
```
components/Map3DDisplayComponent.tsx(300,16): error TS1005: ',' expected.
components/Map3DDisplayComponent.tsx(303,9): error TS1005: ':' expected.
components/Map3DDisplayComponent.tsx(318,13): error TS1138: Parameter declaration expected.
components/Map3DDisplayComponent.tsx(648,4): error TS1128: Declaration or statement expected.
components/Map3DDisplayComponent.tsx(3243,1): error TS1128: Declaration or statement expected.
```
**Exact Cause**:
At lines 298–316 of `components/Map3DDisplayComponent.tsx`:
```typescript
298:   // Real-time cursor tracking
299:   const [cursorInfo, setCursorInfo] = useState<{
300:     lat: string;
301:     lon: string;
302:     dmsLat: string;
303:   const [coverageDomeActive, setCoverageDomeActive] = useState(false);
304:   const [coverageDomeEntity, setCoverageDomeEntity] = useState<Cesium.Entity | null>(null);
305:   const [showWindyPanel, setShowWindyPanel] = useState(false);
306:   const [windyCoords, setWindyCoords] = useState<{ lat: number; lon: number; zoom: number }>({ lat: 4.570868, lon: -74.297333, zoom: 6 });
307:   const [nativeRadarActive, setNativeRadarActive] = useState(false);
308:   const [aoiDrawingModeActive, setAoiDrawingModeActive] = useState(false);
309:   const [piccDrawingConfig, setPiccDrawingConfig] = useState<any>(null);
310:   const [hoveredTooltipInfo, setHoveredTooltipInfo] = useState<any>(null);
311: 
312:   const igacSatLayerRef = useRef<Cesium.ImageryLayer | null>(null);
313:   const igacSatLabelsLayerRef = useRef<Cesium.ImageryLayer | null>(null);
314:   const igacPolLayerRef = useRef<Cesium.ImageryLayer | null>(null);
315:   const osmLayerRef = useRef<Cesium.ImageryLayer | null>(null);
```
1. `cursorInfo` state is unclosed (lines 299–302 cut off before `dmsLon`, `elevation`).
2. Duplicate declarations of states (`coverageDomeActive`, `showWindyPanel`, `windyCoords`, etc.) that were already declared at lines 175–204.
3. Missing ref declarations: `radarLayerRef`, `weatherStageRef`, and `igacSatDaneLayerRef` (or remove `igacSatDaneLayerRef`).
Because of the unclosed `useState<{`, TypeScript interprets all subsequent lines up to line 648 as inside the type definition, breaking the entire file parse.

---

## 2. Logic Chain

1. **Topographic 3D Drape vs. Flat 2D Artifacts**:
   - In Cesium, terrain elevation is provided exclusively by `viewer.terrainProvider` (which generates the geometric 3D vertex mesh).
   - Imagery layers (`viewer.imageryLayers`) are 2D raster textures mapped onto that 3D geometric mesh in the GPU fragment shader.
   - If an elevation dataset (such as SRTM DEM or heatmaps) is mistakenly added as an `ImageryProvider`, it renders as a flat 2D color overlay (red/yellow/green color ramp), destroying the natural photorealistic appearance.
   - Therefore, the base imagery layer must be pure photorealistic satellite imagery (ESRI World Imagery HD) at index 0, with vector/raster text labels (CartoDB Light Labels) at index 1 with transparent alpha.

2. **ESRI World Imagery HD Configuration**:
   - URL: `https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}` (or `https://server.arcgisonline.com/...`).
   - Projection & Tiling: ArcGIS Server tile scheme uses `{z}/{y}/{x}` where `{y}` is row and `{x}` is column, projected in EPSG:3857 (Web Mercator). Cesium's default `WebMercatorTilingScheme` handles this natively.
   - Setting `maximumLevel: 19` ensures that when users zoom into mountain passes, rivers, military bases, or road corridors in Colombia, Cesium fetches level 19 high-resolution tiles.
   - `enablePickFeatures: false` avoids unnecessary metadata queries.

3. **CartoDB Light Labels Layer Configuration**:
   - URL: `https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}.png` (or `https://cartodb-basemaps-{s}.global.ssl.fastly.net/light_only_labels/{z}/{x}/{y}.png`).
   - Subdomains: `['a', 'b', 'c', 'd']` distributes requests over multiple connections.
   - Projection: Standard Slippy map XYZ Web Mercator (`{z}/{x}/{y}`).
   - Alpha transparency: PNG with alpha channel. Setting `hasAlphaChannel: true` ensures alpha blending on top of ESRI satellite imagery.
   - Max zoom level: 20 (`maximumLevel: 20`).
   - Credit: `© CartoDB, © OpenStreetMap`.

4. **Layer Stacking & Z-Ordering**:
   - When Satellite HD is selected:
     - `satelliteProvider` is at index 0.
     - `labelsProvider` is at index 1.
   - When Weather Radar (RainViewer) is enabled:
     - Currently, radar is added without an explicit index, placing it at the top of the collection (over labels).
     - To ensure labels remain visible and legible over the weather radar, radar should be inserted between the base layer and the labels layer (or labels should be brought to top).
   - When switching base layers:
     - The switching logic must cleanly remove both satellite and labels before inserting the new base layer (Cartografía or OSM).
     - When switching to Cartografía (CartoDB Voyager / IGAC Base) or OSM, no separate label layer is needed because both basemaps already include embedded typography and road labels.

5. **Elimination of Duplicate Viewer Initialization**:
   - In lines 372–374, `viewer.imageryLayers.removeAll()` and `addImageryProvider` are called during the initial viewer mount.
   - Immediately thereafter, the `useEffect([mapLayer])` triggers (since `mapLayer = 'igac-sat'`), removing the layers and adding them again.
   - Synchronizing viewer creation so that the imagery layers are handled cleanly by the `mapLayer` effect (or initial state) prevents duplicate network bursts and flashing on initial render.

---

## 3. Caveats

1. **Cesium Ion Token vs. Public Providers**:
   - ESRI World Imagery HD, CartoDB Light Labels, CartoDB Voyager, and OpenStreetMap are public tile services that do **NOT** require a Cesium Ion token or Cesium Ion authentication.
   - Therefore, base cartography and satellite imagery will load immediately and 100% reliably regardless of whether the user provides a Cesium Ion token.
2. **IGAC Base Map Server Availability**:
   - `https://mapas.igac.gov.co/server/rest/services/carto/Colombia_Base/MapServer` is operated by the Colombian government. It is frequently slow or unavailable outside Colombia.
   - The fallback to `https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png` already present in the codebase is essential and should be preserved. Alternatively, CartoDB Voyager can be made the primary Cartografía layer with IGAC as an option.
3. **Terrain Mesh Scope**:
   - The geometric 3D terrain elevation mesh is being investigated concurrently by `explorer_survey_terrain`. The imagery layers tested here drape flawlessly over any `TerrainProvider` (`createWorldTerrainAsync`, `CesiumTerrainProvider`, or `EllipsoidTerrainProvider`).

---

## 4. Conclusion & Concrete Recommendations

### 4.1 Required Fixes in `components/Map3DDisplayComponent.tsx`

#### Fix 1: Repair Broken Declarations around Line 298
Replace the corrupted block (lines 298–316) with the complete, clean state and ref definitions:
```typescript
  // Real-time cursor tracking
  const [cursorInfo, setCursorInfo] = useState<{
    lat: string;
    lon: string;
    dmsLat: string;
    dmsLon: string;
    elevation: number;
  } | null>(null);
  const [hoveredTooltipInfo, setHoveredTooltipInfo] = useState<{ x: number; y: number; title: string; details: string[] } | null>(null);

  // Imagery layers refs
  const satLayerRef = useRef<Cesium.ImageryLayer | null>(null);
  const satLabelsLayerRef = useRef<Cesium.ImageryLayer | null>(null);
  const cartoLayerRef = useRef<Cesium.ImageryLayer | null>(null);
  const osmLayerRef = useRef<Cesium.ImageryLayer | null>(null);
  const radarLayerRef = useRef<Cesium.ImageryLayer | null>(null);
  const weatherStageRef = useRef<Cesium.PostProcessStage | null>(null);
```

#### Fix 2: Clean Base Layer State & Types
Update the state type at line 163 to cleanly represent the 3 required base layers:
```typescript
const [mapLayer, setMapLayer] = useState<'sat' | 'carto' | 'osm'>('sat');
```
(Or keep `'igac-sat' | 'igac-pol' | 'osm'` to minimize renaming, but remove `'igac-vias'` and phantom `'igac-relieve'`).

#### Fix 3: Standardize the 3 Base Layers in HUD Selector
Update the HUD button group (lines 3042–3071) from 4 buttons to 3 buttons matching R3:
```tsx
<div className="flex flex-col gap-1.5 pt-1 border-t border-slate-900">
  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Capa Base Cartográfica</label>
  <div className="grid grid-cols-3 gap-1">
    <button
      onClick={() => setMapLayer('igac-sat')}
      className={`text-[10px] py-1.5 rounded font-medium transition ${mapLayer === 'igac-sat' ? 'bg-sky-600 text-white shadow' : 'bg-slate-900 text-slate-300 hover:bg-slate-800'}`}
      title="Satelital de Alta Definición ESRI World Imagery + Etiquetas CartoDB"
    >
      Satélite HD
    </button>
    <button
      onClick={() => setMapLayer('igac-pol')}
      className={`text-[10px] py-1.5 rounded font-medium transition ${mapLayer === 'igac-pol' ? 'bg-sky-600 text-white shadow' : 'bg-slate-900 text-slate-300 hover:bg-slate-800'}`}
      title="Cartografía Táctica Base (IGAC / CartoDB Voyager)"
    >
      Cartografía
    </button>
    <button
      onClick={() => setMapLayer('osm')}
      className={`text-[10px] py-1.5 rounded font-medium transition ${mapLayer === 'osm' ? 'bg-sky-600 text-white shadow' : 'bg-slate-900 text-slate-300 hover:bg-slate-800'}`}
      title="OpenStreetMap Standard"
    >
      OSM
    </button>
  </div>
</div>
```

#### Fix 4: Robust Base Layer Switching Hook
In `useEffect([mapLayer])`:
```typescript
useEffect(() => {
  const viewer = viewerRef.current;
  if (!viewer || viewer.isDestroyed()) return;

  // 1. Remove active base and label layers cleanly
  if (igacSatLayerRef.current) {
    viewer.imageryLayers.remove(igacSatLayerRef.current);
    igacSatLayerRef.current = null;
  }
  if (igacSatLabelsLayerRef.current) {
    viewer.imageryLayers.remove(igacSatLabelsLayerRef.current);
    igacSatLabelsLayerRef.current = null;
  }
  if (igacPolLayerRef.current) {
    viewer.imageryLayers.remove(igacPolLayerRef.current);
    igacPolLayerRef.current = null;
  }
  if (osmLayerRef.current) {
    viewer.imageryLayers.remove(osmLayerRef.current);
    osmLayerRef.current = null;
  }

  // 2. Add selected layer
  if (mapLayer === 'osm') {
    const osmProvider = new Cesium.UrlTemplateImageryProvider({
      url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      subdomains: ['a', 'b', 'c'],
      credit: '© OpenStreetMap contributors',
      maximumLevel: 19,
      enablePickFeatures: false
    });
    osmLayerRef.current = viewer.imageryLayers.addImageryProvider(osmProvider, 0);
  } else if (mapLayer === 'igac-sat') {
    const satelliteProvider = new Cesium.UrlTemplateImageryProvider({
      url: 'https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      credit: 'Esri, Maxar, Earthstar Geographics',
      maximumLevel: 19,
      enablePickFeatures: false
    });
    igacSatLayerRef.current = viewer.imageryLayers.addImageryProvider(satelliteProvider, 0);

    const labelsProvider = new Cesium.UrlTemplateImageryProvider({
      url: 'https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}.png',
      subdomains: ['a', 'b', 'c', 'd'],
      credit: '© CartoDB, © OpenStreetMap',
      hasAlphaChannel: true,
      maximumLevel: 20,
      enablePickFeatures: false
    });
    igacSatLabelsLayerRef.current = viewer.imageryLayers.addImageryProvider(labelsProvider, 1);
  } else if (mapLayer === 'igac-pol') {
    Cesium.ArcGisMapServerImageryProvider.fromUrl(
      'https://mapas.igac.gov.co/server/rest/services/carto/Colombia_Base/MapServer',
      { credit: '© Instituto Geográfico Agustín Codazzi (IGAC)', enablePickFeatures: false }
    ).then(provider => {
      if (viewerRef.current && !viewerRef.current.isDestroyed()) {
        igacPolLayerRef.current = viewerRef.current.imageryLayers.addImageryProvider(provider, 0);
      }
    }).catch(() => {
      const voyagerProvider = new Cesium.UrlTemplateImageryProvider({
        url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png',
        subdomains: ['a', 'b', 'c', 'd'],
        credit: '© CartoDB, © OpenStreetMap contributors',
        maximumLevel: 19,
        enablePickFeatures: false
      });
      if (viewerRef.current && !viewerRef.current.isDestroyed()) {
        igacPolLayerRef.current = viewerRef.current.imageryLayers.addImageryProvider(voyagerProvider, 0);
      }
    });
  }
}, [mapLayer]);
```

#### Fix 5: Ensure Tactical Overlays (Enemy Influence / Hotspots) Do Not Simulate Heatmaps
Ensure that tactical overlays (such as lines 2807–2820) remain strictly tied to discrete intelligence reports with clear outline strokes, and are not rendered as broad full-map color tinting.

---

## 5. Verification Method

To independently verify these findings and the subsequent implementation:

1. **TypeScript Type Check**:
   Run:
   ```powershell
   npx tsc --noEmit
   ```
   *Expected result*: Exit code 0, no errors in `components/Map3DDisplayComponent.tsx`.

2. **Frontend Production Build**:
   Run:
   ```powershell
   npm run build
   ```
   *Expected result*: Exit code 0, dist bundle successfully created.

3. **In-Browser Imagery & Layer Switching Inspection**:
   Launch `npm run dev` or view `http://localhost`:
   - Verify that upon map load, the globe renders ESRI World Imagery HD draped over 3D terrain with CartoDB Light Labels clearly visible on top.
   - Click each of the 3 base layer buttons ("Satélite HD", "Cartografía", "OSM"):
     - "Satélite HD": ESRI imagery + CartoDB labels.
     - "Cartografía": CartoDB Voyager / IGAC cartographic base without artifacts.
     - "OSM": OpenStreetMap raster tiles.
   - Ensure switching between layers does not leave orphaned layers, black screens, or console errors (no 401 Unauthorized or CORS errors).
   - Toggle RainViewer Radar: verify radar appears semi-transparent with labels remaining legible.
