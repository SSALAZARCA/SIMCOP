## 2026-09-02T20:45:00Z

Read c:\DESARROLLOS\SIMCOP-main\.agents\ORIGINAL_REQUEST.md thoroughly.
Read c:\DESARROLLOS\SIMCOP-main\PROJECT.md.
Read the findings and recommendations from the 3 Explorers:
- c:\DESARROLLOS\SIMCOP-main\.agents\explorer_survey_terrain\handoff.md
- c:\DESARROLLOS\SIMCOP-main\.agents\explorer_survey_imagery\handoff.md
- c:\DESARROLLOS\SIMCOP-main\.agents\explorer_survey_hud_tactical\handoff.md

You are the Worker subagent for Milestone 1: Implementación Integral del Visor Cesium 3D en SIMCOP.
Your working directory is: c:\DESARROLLOS\SIMCOP-main\.agents\worker_cesium_m1
File Ownership: You have EXCLUSIVE write ownership of `components/Map3DDisplayComponent.tsx`.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Detailed Implementation Requirements:
1. Syntax Corruption Fix (Build Blocker):
   - At lines 298-316 in `components/Map3DDisplayComponent.tsx`, fix the truncated `cursorInfo` state type definition and duplicate state declarations. Restore the clean type signature for `cursorInfo` (`{ lat: string; lon: string; dmsLat: string; dmsLon: string; elevation: number | string } | null`) and remove duplicate variables already declared earlier.
2. 3D Geometric Terrain Elevation Mesh:
   - In `getTerrainProvider()`, implement the resilient multi-tier loader:
     - If user configured a valid token (`simcop_cesium_ion_token` or `VITE_CESIUM_ION_TOKEN`), attempt `Cesium.createWorldTerrainAsync({ requestWaterMask: true, requestVertexNormals: true })`.
     - As the primary tokenless high-definition 3D geometric elevation provider (zero 401 errors, real physical mountain mesh), load `Cesium.ArcGISTiledElevationTerrainProvider.fromUrl('https://elevation3d.arcgis.com/arcgis/rest/services/WorldElevation3D/Terrain3D/ImageServer')`.
     - Graceful fallback: `new Cesium.EllipsoidTerrainProvider()` if network fails.
3. Photorealistic Satellite Cartography & Tactical Labels:
   - Base layer: ESRI World Imagery HD (`https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}`, max zoom 19, enablePickFeatures: false).
   - Label overlay: CartoDB Light Labels (`https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}.png`, max zoom 20, hasAlphaChannel: true) at index 1 over satellite.
   - Clean base layer switcher hook (`useEffect([mapLayer])`) supporting 3 base layers: 'igac-sat' (Satélite HD), 'igac-pol' (Cartografía base IGAC / CartoDB Voyager), and 'osm' (OpenStreetMap Standard). Ensure clean removal and addition of layers when switching.
4. HUD Tactical Controls & Relief Factors:
   - In the HUD base layer selector, render 3 buttons matching R3: "Satélite HD", "Cartografía", "OSM". Remove the disconnected/dead 'igac-relieve' button.
   - Align terrain exaggeration buttons and component state to `[1.0, 1.5, 2.0]` with `1.5` default.
   - Add on-screen Zoom In (`+`) and Zoom Out (`-`) buttons to the top-left map toolbar (`viewer.camera.zoomIn(height * 0.35)`, `zoomOut(height * 0.35)`).
5. Initial Tactical Camera & 3D Tools Synchronization:
   - Set initial camera setView and `reset3DPerspective` to:
     destination: `Cesium.Cartesian3.fromDegrees(-74.297333, 2.500000, 550000.0)`, heading: `Cesium.Math.toRadians(12)`, pitch: `Cesium.Math.toRadians(-45)`, roll: 0.0 (tactical 45° perspective over Colombia).
   - Intercept Cesium's standard `homeButton` via `viewer.homeButton.viewModel.command.beforeExecute` to execute `reset3DPerspective()`.
   - In LOS (`calculateLineOfSight`), add +2.0m vertical elevation offset to observer and target coordinates to prevent ray-tracing false positives against terrain mesh facets.
   - Subscribe to `clearLosLayer` event from `eventBus` to remove LOS polyline entities.
   - For unit coverage domes, sample terrain altitude (`viewer.scene.globe.getHeight(cartographic) || 0`) instead of hardcoding 0.
6. Verification:
   - Execute `npx tsc --noEmit` and `npm run build` to verify 0 errors and successful compilation.
   - Document all changes, files touched, lines modified, build command output, and verification results in `c:\DESARROLLOS\SIMCOP-main\.agents\worker_cesium_m1\handoff.md`.
   - Maintain `progress.md` in your working directory.
   - Notify parent orchestrator via send_message when done.
