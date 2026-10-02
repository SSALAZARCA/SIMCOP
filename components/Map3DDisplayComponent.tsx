import React, { useEffect, useRef, useState } from 'react';
import * as Cesium from 'cesium';
import 'cesium/Source/Widgets/widgets.css';
import ms from 'milsymbol';
import { 
  MilitaryUnit, 
  IntelligenceReport, 
  SelectedEntity, 
  MapEntityType, 
  ArtilleryPiece, 
  ForwardObserver, 
  FireMission, 
  Hotspot, 
  PICCDrawingConfig, 
  COAPlan,
  PICCElementType,
  PlantillaType,
  COAGraphicType,
  OperationalGraphic,
  GeoLocation
} from '../types';
import { API_BASE_URL } from '../utils/apiConfig';
import { apiClient } from '../utils/apiClient';
import { 
  generateUnitSIDC, 
  getThreatStyle, 
  assessThreatLevel, 
  INITIAL_ENEMY_FILTER_KEYWORDS,
  getPICCElementSIDC
} from '../utils/sidcUtils';
import { BoltIcon } from './icons';
import { 
  SIDC_AFFILIATION_FRIEND, 
  SIDC_DIMENSION_GROUND, 
  SIDC_STATUS_PRESENT, 
  ARTILLERY_TYPE_DETAILS, 
  SIDC_FORWARD_OBSERVER,
  DEFAULT_PICC_SYMBOL_SIZE
} from '../constants';
import { piccService } from '../services/piccService';
import { coaPlanService } from '../services/coaPlanService';
import { COLOMBIA_RIVER_NETWORKS } from '../constants/colombiaHydrography';

const PlantillaPICCConfig: any = {};

interface EventEmitter {
  subscribe(event: string, callback: (...args: any[]) => void): string;
  unsubscribe(token: string): void;
  publish(event: string, data?: any): void;
}

interface Map3DDisplayProps {
  units: MilitaryUnit[];
  intelligenceReports: IntelligenceReport[];
  selectedEntity: SelectedEntity | null;
  onSelectEntityOnMap?: (entity: SelectedEntity | null) => void;
  isCoordinatePickingActive?: boolean;
  onCoordinatePicked?: (location: GeoLocation) => void;
  isTargetSelectionActive?: boolean;
  onTargetSelected?: (location: GeoLocation) => void;
  distanceToolActive?: boolean;
  aoiDrawingModeActive?: boolean;
  enemyInfluenceLayerActive?: boolean;
  elevationProfileActive?: boolean;
  eventBus: EventEmitter;
  artilleryPieces?: ArtilleryPiece[];
  forwardObservers?: ForwardObserver[];
  activeFireMissions?: FireMission[];
  hotspots?: Hotspot[];
  historicalHotspots?: Hotspot[];
  osintEvents?: any[];
  osintLayerActive?: boolean;
  piccDrawingConfig?: PICCDrawingConfig;
  activeTemplateContext?: string | null;
  onPiccDrawingComplete?: (feature?: any) => void;
  children?: React.ReactNode;
}

const decimalToDMSValue = (val: number, isLat: boolean): string => {
  const absolute = Math.abs(val);
  const degrees = Math.floor(absolute);
  const minutesNotTruncated = (absolute - degrees) * 60;
  const minutes = Math.floor(minutesNotTruncated);
  const seconds = Math.round((minutesNotTruncated - minutes) * 60);

  const direction = isLat
    ? (val >= 0 ? 'N' : 'S')
    : (val >= 0 ? 'E' : 'O');

  return `${degrees}°${minutes}'${seconds}"${direction}`;
};

const getTerrainProvider = async (): Promise<Cesium.TerrainProvider> => {
  const token = localStorage.getItem('simcop_cesium_ion_token') || (import.meta as any).env?.VITE_CESIUM_ION_TOKEN || '';
  
  // 1. Si el usuario configuró un token de Cesium Ion válido, intentar Cesium World Terrain
  if (token && token.trim()) {
    Cesium.Ion.defaultAccessToken = token.trim();
    try {
      if (typeof (Cesium as any).createWorldTerrainAsync === 'function') {
        return await (Cesium as any).createWorldTerrainAsync({
          requestWaterMask: true,
          requestVertexNormals: true
        });
      }
    } catch (ionErr) {
      console.warn("Cesium World Terrain (Ion) falló con el token provisto:", ionErr);
    }
  }

  // 2. Proveedor principal de relieve 3D geométrico sin fallos 401: ArcGIS World Elevation 3D
  try {
    const arcgisProvider = (Cesium as any).ArcGISTiledElevationTerrainProvider;
    if (arcgisProvider && typeof arcgisProvider.fromUrl === 'function') {
      return await arcgisProvider.fromUrl(
        'https://elevation3d.arcgis.com/arcgis/rest/services/WorldElevation3D/Terrain3D/ImageServer'
      );
    }
  } catch (arcGisErr) {
    console.warn("ArcGISTiledElevationTerrainProvider falló, utilizando Ellipsoid de contingencia:", arcGisErr);
  }

  // 3. Fallback de contingencia: Si no hay conexión o fallan los anteriores
  return new Cesium.EllipsoidTerrainProvider();
};

const PHASE_COLORS = [
    '#3B82F6', // Azul - Fase 1
    '#10B981', // Verde - Fase 2
    '#F59E0B', // Naranja - Fase 3
    '#8B5CF6', // Púrpura - Fase 4
    '#EC4899', // Rosa - Fase 5
];

const symbolScaleByDistance = new Cesium.NearFarScalar(1.0e4, 1.0, 5.0e6, 0.3);
const labelScaleByDistance = new Cesium.NearFarScalar(1.0e4, 1.0, 5.0e6, 0.0);

// Cache global en memoria para símbolos tácticos milsymbol (evita recrear canvas/DataURL por cada punto)
const historicoSymbolCache = new Map<string, string>();
const unitSymbolCache = new Map<string, string>();

/**
 * Resuelve el SIDC (MIL-STD-2525C/D / APP-6) táctico doctrinal estrictamente HOSTIL (ROJO)
 * para los factores de inestabilidad y presencia del enemigo (MTE 2-01.3 & STANAG 2019).
 * Guía oficial Cesium + Milsymbol: https://cesium.com/blog/2016/07/20/cesium-and-milsymbol
 */
const getHistoricoSIDC = (category?: string, aff?: string): string => {
  const cat = (category || '').toUpperCase();
  const a = (aff || '').toUpperCase();

  // Combate / Contacto armado contra el enemigo -> Infantería hostil en contacto (Rombo rojo con 'X')
  if (cat.includes('COMBATE') || a === 'CONTACTO' || cat.includes('ENFRENTAMIENTO')) {
    return 'SHGPUCI--------';
  }
  // Atentado terrorista, activación de artefacto explosivo, IED, bombas
  if (cat.includes('ACTIVACIÓN ARTEFACTO') || cat.includes('ACTO TERRORISMO') || cat.includes('BOMBA') || cat.includes('IED')) {
    return 'OHVPB----------'; // Violent Activity - Bombing / IED (MIL-STD-2525C/D)
  }
  // Neutralización de Artefactos Explosivos, Minas, Zapadores hostiles
  if (cat.includes('EXPLOSIV') || cat.includes('MINA') || cat.includes('TERRORIS')) {
    return 'SHGPUCE--------'; // Ingenieros / Explosivos hostiles
  }
  // Ataque directo contra la Fuerza Pública, emboscada, homicidio
  if (cat.includes('ATAQUE FUERZA PUBLICA') || cat.includes('HOMICIDIO') || cat.includes('SICARIATO')) {
    return 'OHVPA----------'; // Violent Activity - Attack / Targeted killing
  }
  // Francotirador enemigo / Hostigamiento de precisión
  if (cat.includes('FRANCOTIRADOR') || cat.includes('SNIPER')) {
    return 'SHGPUCIS-------'; // Hostile Ground Infantry Sniper
  }
  // Depósito ilegal, caleta, armamento incautado, munición
  if (cat.includes('DEPÓSITO') || cat.includes('DEPOSITO') || cat.includes('CALETA') || cat.includes('ARMA') || cat.includes('MUNICION') || cat.includes('INCAUTACIÓN')) {
    return 'SHGPUSA--------'; // Suministro / Depósito de armamento y municiones hostil
  }
  // Campamentos, áreas base, infraestructura ilícita enemiga
  if (cat.includes('CAMPAMENTO') || cat.includes('BASE') || cat.includes('INFRAESTRUCTURA')) {
    return 'SHGPI----------'; // Instalación / base fija hostil
  }
  // Narcotráfico, cristalizaderos, laboratorios, insumos
  if (cat.includes('NARCO') || cat.includes('LABORATORIO') || cat.includes('CRISTALIZADERO') || cat.includes('COCA')) {
    return 'SHGPUS---------'; // Red de abastecimiento / logística ilícita
  }
  // Minería ilegal / Explotación ilícita de yacimientos mineros
  if (cat.includes('MINERÍA') || cat.includes('MINERIA') || cat.includes('EXPLOTACIÓN ILÍCITA') || cat.includes('EXPLOTACION ILICITA')) {
    return 'SHGPUS---------'; // Red logística ilícita
  }
  // Capturas, neutralizaciones, delincuencia, presencia armada general
  return 'SHGPU----------'; // Factor de inestabilidad / Unidad terrestre hostil estándar
};

const getHistoricoSymbolUrl = (sidc: string): string => {
  const cached = historicoSymbolCache.get(sidc);
  if (cached) return cached;

  try {
    const sym = new ms.Symbol(sidc, {
      size: 36,
      outlineColor: 'white',
      outlineWidth: 3.5,
      infoFields: false
    });
    const url = sym.asCanvas().toDataURL();
    historicoSymbolCache.set(sidc, url);
    return url;
  } catch (err) {
    console.warn("Error generando simbolo milsymbol para SIDC:", sidc, err);
    return '/files/hostil.png';
  }
};


export const Map3DDisplayComponent: React.FC<Map3DDisplayProps> = ({
  units,
  intelligenceReports,
  selectedEntity,
  onSelectEntityOnMap,
  isCoordinatePickingActive = false,
  onCoordinatePicked,
  isTargetSelectionActive = false,
  onTargetSelected,
  distanceToolActive = false,
  aoiDrawingModeActive = false,
  enemyInfluenceLayerActive = false,
  elevationProfileActive = false,
  eventBus,
  artilleryPieces = [],
  forwardObservers = [],
  activeFireMissions = [],
  hotspots = [],
  historicalHotspots = [],
  osintEvents = [],
  osintLayerActive = true,
  piccDrawingConfig,
  activeTemplateContext,
  onPiccDrawingComplete,
  children
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<Cesium.Viewer | null>(null);

  // States for UI Toggles
  const [terrainActive, setTerrainActive] = useState<boolean>(true);
  const [mapLayer, setMapLayer] = useState<'igac-sat' | 'topo' | 'vias' | 'igac-pol' | 'osm'>('igac-sat');
  const [terrainExaggeration, setTerrainExaggeration] = useState<number>(1.5);
  const [showIonModal, setShowIonModal] = useState<boolean>(false);
  const [ionTokenInput, setIonTokenInput] = useState<string>(localStorage.getItem('simcop_cesium_ion_token') || '');

  const [weatherEffect, setWeatherEffect] = useState<'clear' | 'rain' | 'fog' | 'storm'>('clear');
  
  const [showFilters, setShowFilters] = useState<boolean>(false);
  const [showCmocTransitLayer, setShowCmocTransitLayer] = useState<boolean>(false);
  const [showHydrographyLayer, setShowHydrographyLayer] = useState<boolean>(false);
  const [showRoadsLayer, setShowRoadsLayer] = useState<boolean>(false);
  const [showSatDefensoriaLayer, setShowSatDefensoriaLayer] = useState<boolean>(false);
  const [selectedSatYear, setSelectedSatYear] = useState<string>('TODOS');
  const [showHistoricoBr23Layer, setShowHistoricoBr23Layer] = useState<boolean>(false);
  const [historicoDoctrinalMode, setHistoricoDoctrinalMode] = useState<'DOCTRINAL_RED' | 'NATO_AFFILIATION'>('DOCTRINAL_RED');
  const [selectedHistoricoAff, setSelectedHistoricoAff] = useState<string>('TODOS');
  const [selectedHistoricoYear, setSelectedHistoricoYear] = useState<string>('2021');
  const [selectedHistoricoStructure, setSelectedHistoricoStructure] = useState<string>('TODOS');
  const [selectedHistoricoCategory, setSelectedHistoricoCategory] = useState<string>('TODOS');
  const [historicoEvents, setHistoricoEvents] = useState<any[]>([]);
  const [isHistoricoLoading, setIsHistoricoLoading] = useState<boolean>(false);
  const [showS2COALayer, setShowS2COALayer] = useState<boolean>(false);
  const [showPiccGraphicsLayer, setShowPiccGraphicsLayer] = useState<boolean>(false);
  const [showUnitsLayer, setShowUnitsLayer] = useState<boolean>(true);
  const [showIntelligenceLayer, setShowIntelligenceLayer] = useState<boolean>(false);
  const [showHotspotsLayer, setShowHotspotsLayer] = useState<boolean>(false);
  const [showHistoricalHotspots, setShowHistoricalHotspots] = useState<boolean>(false);
  const [showOsintLayer, setShowOsintLayer] = useState<boolean>(false);
  const [showWindyPanel, setShowWindyPanel] = useState<boolean>(false);
  const [nativeRadarActive, setNativeRadarActive] = useState<boolean>(false);
  const [windyCoords, setWindyCoords] = useState<{lat: number, lon: number, zoom: number}>({ lat: 4.5708, lon: -74.2973, zoom: 6 });
  
  const [isControlPanelOpen, setIsControlPanelOpen] = useState<boolean>(true);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);


  const toggleWindyPanel = () => {
    if (!showWindyPanel && viewerRef.current) {
      const cameraPos = viewerRef.current.camera.positionCartographic;
      const lat = Cesium.Math.toDegrees(cameraPos.latitude);
      const lon = Cesium.Math.toDegrees(cameraPos.longitude);
      const zoom = Math.max(4, Math.min(18, Math.round(27 - Math.log2(cameraPos.height))));
      setWindyCoords({ lat, lon, zoom });
    }
    setShowWindyPanel(!showWindyPanel);
  };
  // Tactical tool states
  const [losToolActive, setLosToolActive] = useState<boolean>(false);
  const [losPoints, setLosPoints] = useState<Cesium.Cartesian3[]>([]);
  const [coverageDomeActive, setCoverageDomeActive] = useState<boolean>(false);
  const [selectedUnitForDome, setSelectedUnitForDome] = useState<string | null>(null);

  // Analysis tool states and refs
  const [distance3DPoints, setDistance3DPoints] = useState<Cesium.Cartesian3[]>([]);
  const [aoi3DPoints, setAoi3DPoints] = useState<Cesium.Cartesian3[]>([]);

  const distanceEntitiesRef = useRef<Cesium.Entity[]>([]);
  const aoiEntitiesRef = useRef<Cesium.Entity[]>([]);
  const distance3DPointsRef = useRef<Cesium.Cartesian3[]>([]);
  const aoi3DPointsRef = useRef<Cesium.Cartesian3[]>([]);

  const [loadedPiccGraphics, setLoadedPiccGraphics] = useState<OperationalGraphic[]>([]);
  const [piccPoints, setPiccPoints] = useState<Cesium.Cartesian3[]>([]);
  const [currentCOAPlan, setCurrentCOAPlan] = useState<COAPlan | null>(() => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const saved = localStorage.getItem('simcop_active_coa_plan');
        if (saved) return JSON.parse(saved);
      }
    } catch (e) {
      console.error("Error restoring COA plan from localStorage in Map3D:", e);
    }
    return null;
  });

  const updateCurrentCOAPlan = (plan: COAPlan | null) => {
    setCurrentCOAPlan(plan);
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        if (plan) {
          localStorage.setItem('simcop_active_coa_plan', JSON.stringify(plan));
        } else {
          localStorage.removeItem('simcop_active_coa_plan');
        }
      }
    } catch (e) {
      console.error("Error saving COA plan to localStorage in Map3D:", e);
    }
  };
  const piccDrawingPointsRef = useRef<Cesium.Cartesian3[]>([]);

  const unitDataSourceRef = useRef<Cesium.CustomDataSource | null>(null);
  const historicoDataSourceRef = useRef<Cesium.CustomDataSource | null>(null);
  const tacticalEntitiesRef = useRef<Cesium.Entity[]>([]);
  const piccEntitiesRef = useRef<Cesium.Entity[]>([]);

  const expandedHoverStateRef = useRef<{
    clusterPrimitive: any;
    entities: Cesium.Entity[];
    basePosition: Cesium.Cartesian3;
  } | null>(null);

  useEffect(() => {
    distance3DPointsRef.current = distance3DPoints;
  }, [distance3DPoints]);

  useEffect(() => {
    aoi3DPointsRef.current = aoi3DPoints;
  }, [aoi3DPoints]);

  useEffect(() => {
    piccDrawingPointsRef.current = piccPoints;
  }, [piccPoints]);

  // Latest props ref to avoid recreating the viewer/handlers
  const latestProps = useRef({
    units,
    intelligenceReports,
    onSelectEntityOnMap,
    isCoordinatePickingActive,
    onCoordinatePicked,
    isTargetSelectionActive,
    onTargetSelected,
    losToolActive,
    coverageDomeActive,
    distanceToolActive,
    aoiDrawingModeActive,
    enemyInfluenceLayerActive,
    elevationProfileActive,
    artilleryPieces,
    forwardObservers,
    activeFireMissions,
    hotspots,
    historicalHotspots,
    osintEvents,
    osintLayerActive,
    piccDrawingConfig,
    activeTemplateContext,
    onPiccDrawingComplete
  });

  useEffect(() => {
    latestProps.current = {
      units,
      intelligenceReports,
      onSelectEntityOnMap,
      isCoordinatePickingActive,
      onCoordinatePicked,
      isTargetSelectionActive,
      onTargetSelected,
      losToolActive,
      coverageDomeActive,
      distanceToolActive,
      aoiDrawingModeActive,
      enemyInfluenceLayerActive,
      elevationProfileActive,
      artilleryPieces,
      forwardObservers,
      activeFireMissions,
      hotspots,
      historicalHotspots,
      osintEvents,
      osintLayerActive,
      piccDrawingConfig,
      activeTemplateContext,
      onPiccDrawingComplete
    };
  });

  // Real-time cursor tracking
  const [cursorInfo, setCursorInfo] = useState<{
    lat: string;
    lon: string;
    dmsLat: string;
    dmsLon: string;
    elevation: number | string;
  } | null>(null);
  const [hoveredTooltipInfo, setHoveredTooltipInfo] = useState<{ x: number; y: number; title: string; details: string[] } | null>(null);

  // Imagery layer refs
  const igacSatLayerRef = useRef<Cesium.ImageryLayer | null>(null);
  const igacSatLabelsLayerRef = useRef<Cesium.ImageryLayer | null>(null);
  const igacPolLayerRef = useRef<Cesium.ImageryLayer | null>(null);
  const osmLayerRef = useRef<Cesium.ImageryLayer | null>(null);
  const hydroLayerRef = useRef<Cesium.ImageryLayer | null>(null);
  const roadsLayerRef = useRef<Cesium.ImageryLayer | null>(null);
  const radarLayerRef = useRef<Cesium.ImageryLayer | null>(null);
  const weatherStageRef = useRef<Cesium.PostProcessStage | null>(null);

  // Control de Cámara Táctica 3D
  const reset3DPerspective = () => {
    if (!viewerRef.current || viewerRef.current.isDestroyed()) return;
    const camera = viewerRef.current.camera;
    camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(-74.297333, 2.500000, 550000.0),
      orientation: {
        heading: Cesium.Math.toRadians(12),
        pitch: Cesium.Math.toRadians(-45),
        roll: 0.0
      },
      duration: 1.5
    });
  };

  // Initialize Cesium Viewer
  useEffect(() => {
    if (!containerRef.current) return;

    const token = localStorage.getItem('simcop_cesium_ion_token') || (import.meta as any).env?.VITE_CESIUM_ION_TOKEN || '';
    if (token && token.trim()) {
      Cesium.Ion.defaultAccessToken = token.trim();
    }

    // Capa Satelital de Alta Definición ESRI World Imagery HD
    const satelliteProvider = new Cesium.UrlTemplateImageryProvider({
      url: 'https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      credit: 'Esri, Maxar, Earthstar Geographics',
      maximumLevel: 19,
      enablePickFeatures: false
    });

    const labelsProvider = new Cesium.UrlTemplateImageryProvider({
      url: 'https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
      credit: '© Esri, HERE, Garmin',
      hasAlphaChannel: true,
      maximumLevel: 20,
      enablePickFeatures: false
    });

    const viewer = new Cesium.Viewer(containerRef.current, {
      baseLayer: false as any,
      terrainProvider: new Cesium.EllipsoidTerrainProvider(),
      sceneMode: Cesium.SceneMode.SCENE3D,
      sceneModePicker: false,
      baseLayerPicker: false,
      geocoder: false,
      homeButton: true,
      infoBox: false,
      navigationHelpButton: false,
      timeline: false,
      animation: false,
      selectionIndicator: false,
      shadows: false,
      shouldAnimate: true,
      requestRenderMode: false
    });

    // Cargar relieve 3D geométrico
    getTerrainProvider().then(provider => {
      if (viewerRef.current && !viewerRef.current.isDestroyed()) {
        viewerRef.current.terrainProvider = provider;
      }
    });

    // Configurar realismo 3D, iluminación solar y relieve de terreno
    viewer.scene.globe.depthTestAgainstTerrain = true;
    viewer.scene.globe.enableLighting = true;
    (viewer.scene.globe as any).terrainExaggeration = 1.5;
    (viewer.scene.globe as any).terrainExaggerationRelativeHeight = 0.0;
    viewer.scene.globe.showGroundAtmosphere = true;
    if (viewer.scene.skyAtmosphere) {
      viewer.scene.skyAtmosphere.show = true;
    }
    viewer.scene.fog.enabled = true;
    viewer.scene.fog.density = 0.0003;

    viewer.imageryLayers.removeAll();
    igacSatLayerRef.current = viewer.imageryLayers.addImageryProvider(satelliteProvider, 0);
    igacSatLabelsLayerRef.current = viewer.imageryLayers.addImageryProvider(labelsProvider, 1);

    // Vista inicial en perspectiva táctica 3D inclinada sobre Colombia
    viewer.camera.setView({
      destination: Cesium.Cartesian3.fromDegrees(-74.297333, 2.500000, 550000.0), // 550km altitude con ángulo inclinado
      orientation: {
        heading: Cesium.Math.toRadians(12),
        pitch: Cesium.Math.toRadians(-45), // Perspectiva 3D táctica (45 grados de inclinación)
        roll: 0.0
      }
    });

    // Interceptar homeButton de Cesium para ejecutar centrado táctico 3D sobre Colombia
    if (viewer.homeButton && viewer.homeButton.viewModel) {
      viewer.homeButton.viewModel.command.beforeExecute.addEventListener((e: any) => {
        e.cancel = true;
        reset3DPerspective();
      });
    }

    viewerRef.current = viewer;

    // R3 Optimización: Pausar renderizado cuando el tab está oculto (Page Visibility API)
    const handleVisibilityChange = () => {
      if (viewerRef.current && !viewerRef.current.isDestroyed()) {
        if (document.hidden) {
          viewerRef.current.useDefaultRenderLoop = false;
        } else {
          viewerRef.current.useDefaultRenderLoop = true;
          viewerRef.current.scene.requestRender();
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Setup screen event handlers
    const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
    
    // Left click handling
    handler.setInputAction((click: any) => {
      const pickedObject = viewer.scene.pick(click.position);
      
      // Coordinate picking
      const ray = viewer.camera.getPickRay(click.position);
      if (ray) {
        const cartesian = viewer.scene.globe.pick(ray, viewer.scene);
        if (cartesian) {
          const cartographic = Cesium.Cartographic.fromCartesian(cartesian);
          const lat = Cesium.Math.toDegrees(cartographic.latitude);
          const lon = Cesium.Math.toDegrees(cartographic.longitude);

          if (latestProps.current.isCoordinatePickingActive && latestProps.current.onCoordinatePicked) {
            latestProps.current.onCoordinatePicked({ lat, lon });
            return;
          }
          if (latestProps.current.isTargetSelectionActive && latestProps.current.onTargetSelected) {
            latestProps.current.onTargetSelected({ lat, lon });
            return;
          }

          // PICC drawing tool click handler
          if (latestProps.current.piccDrawingConfig) {
            const config = latestProps.current.piccDrawingConfig;
            const isPoint = [
              PICCElementType.ENEMY_UNIT_POINT_SIT, PICCElementType.FRIENDLY_UNIT_POINT_SIT,
              PICCElementType.NEUTRAL_POINT_SIT, PICCElementType.CIVILIAN_POINT_SIT,
              PICCElementType.NAI_POINT, PICCElementType.TARGET_REFERENCE_POINT,
              PICCElementType.CONTROL_CHECKPOINT, PICCElementType.OBSTACLE_DEMOLITION_PLANNED,
              PICCElementType.ENEMY_GUERRILLA_POINT, PICCElementType.ENEMY_LEADER_POINT,
              PICCElementType.CIVILIAN_CR_POINT, PICCElementType.TAI_POINT
            ].includes(config.type as PICCElementType);

            if (isPoint) {
              handlePointPiccDrawing(cartesian, config);
            } else {
              setPiccPoints(prev => {
                const updated = [...prev, cartesian];
                updatePiccDrawingPreview(updated, config);
                return updated;
              });
            }
            return;
          }

          // Distance tool click handler
          if (latestProps.current.distanceToolActive) {
            setDistance3DPoints(prev => {
              const updated = [...prev, cartesian];
              updateDistance3DDrawing(updated);
              return updated;
            });
            return;
          }

          // AOI drawing tool click handler
          if (latestProps.current.aoiDrawingModeActive) {
            setAoi3DPoints(prev => {
              const updated = [...prev, cartesian];
              updateAoi3DDrawing(updated);
              return updated;
            });
            return;
          }

          // Line of Sight tool click handler
          if (latestProps.current.losToolActive || latestProps.current.elevationProfileActive) {
            setLosPoints(prev => {
              const updated = [...prev, cartesian];
              if (updated.length === 2) {
                calculateLineOfSight(updated[0], updated[1]);
                return []; // Reset after calculation
              }
              return updated;
            });
            return;
          }

          // Coverage dome tool handler
          if (latestProps.current.coverageDomeActive) {
            addCoverageDome(cartesian);
            return;
          }
        }
      }

      // Normal unit selection
      let selectedEntityId: string | null = null;
      
      if (Cesium.defined(pickedObject) && pickedObject.id) {
         if (pickedObject.id.id && pickedObject.id.id.startsWith('expanded-hover-')) {
             // User clicked on a hover-expanded unit
             selectedEntityId = pickedObject.id.id.replace('expanded-hover-', '');
         } else if (typeof pickedObject.id === 'string' || pickedObject.id.id) {
             // Standard entity click
             selectedEntityId = pickedObject.id.id || pickedObject.id;
         }
      }

      if (selectedEntityId) {
        const matchedUnit = latestProps.current.units.find(u => u.id === selectedEntityId);
        if (matchedUnit && latestProps.current.onSelectEntityOnMap) {
          latestProps.current.onSelectEntityOnMap({ id: matchedUnit.id, type: MapEntityType.UNIT });
        } else if (selectedEntityId.startsWith('osint-3d-')) {
          const osintId = selectedEntityId.replace('osint-3d-', '');
          const matchedOsint = latestProps.current.osintEvents?.find(o => o.id === osintId);
          if (matchedOsint && latestProps.current.onSelectEntityOnMap) {
            latestProps.current.onSelectEntityOnMap({ id: matchedOsint.id, type: MapEntityType.OSINT });
          }
        } else {
          const matchedIntel = latestProps.current.intelligenceReports.find(i => i.id === selectedEntityId);
          if (matchedIntel && latestProps.current.onSelectEntityOnMap) {
            latestProps.current.onSelectEntityOnMap({ id: matchedIntel.id, type: MapEntityType.INTEL });
          }
        }
      } else {
        const isClusterClick = Cesium.defined(pickedObject) && pickedObject.id && Array.isArray(pickedObject.id);
        if (isClusterClick) {
          const clusterEntities = pickedObject.id as Cesium.Entity[];
          if (clusterEntities.length > 0 && clusterEntities[0].position) {
            const firstPos = clusterEntities[0].position.getValue ? clusterEntities[0].position.getValue(Cesium.JulianDate.now()) : clusterEntities[0].position;
            if (firstPos) {
              const carto = Cesium.Cartographic.fromCartesian(firstPos);
              const targetAlt = Math.max(12000, viewer.camera.positionCartographic.height * 0.45);
              viewer.camera.flyTo({
                destination: Cesium.Cartesian3.fromRadians(carto.longitude, carto.latitude, targetAlt),
                duration: 1.2
              });
            }
          }
        } else if (latestProps.current.onSelectEntityOnMap) {
          latestProps.current.onSelectEntityOnMap(null);
        }
      }
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK);



    // Right click handling (undo last point in distance tool)
    handler.setInputAction(() => {
      if (latestProps.current.distanceToolActive) {
        setDistance3DPoints(prev => {
          if (prev.length === 0) return prev;
          const updated = prev.slice(0, -1);
          updateDistance3DDrawing(updated);
          return updated;
        });
      }
    }, Cesium.ScreenSpaceEventType.RIGHT_CLICK);

    // Mouse Move handling for Coordinates HUD
    handler.setInputAction((movement: any) => {
      const ray = viewer.camera.getPickRay(movement.endPosition);
      if (ray) {
        const cartesian = viewer.scene.globe.pick(ray, viewer.scene);
        if (cartesian) {
          const cartographic = Cesium.Cartographic.fromCartesian(cartesian);
          const lat = Cesium.Math.toDegrees(cartographic.latitude);
          const lon = Cesium.Math.toDegrees(cartographic.longitude);
          const elevation = viewer.scene.globe.getHeight(cartographic) || 0;

          setCursorInfo({
            lat: lat.toFixed(6),
            lon: lon.toFixed(6),
            dmsLat: decimalToDMSValue(lat, true),
            dmsLon: decimalToDMSValue(lon, false),
            elevation: Math.round(elevation)
          });
        } else {
          setCursorInfo(null);
        }
      } else {
        setCursorInfo(null);
      }

      // Check for hovered entity and clusters
      const pickedObject = viewer.scene.pick(movement.endPosition);
      
      // 1. Hover handling for clusters and individual entities
      let isHoveringCluster = Cesium.defined(pickedObject) && pickedObject.id && Array.isArray(pickedObject.id);
      let isHoveringExpandedUnit = Cesium.defined(pickedObject) && pickedObject.id && pickedObject.id.id && pickedObject.id.id.startsWith('expanded-hover-');
      
      if (isHoveringCluster) {
          const clusteredEntities = pickedObject.id as Cesium.Entity[];
          const isHistoricoCluster = clusteredEntities.some((e: Cesium.Entity) => typeof e.id === 'string' && e.id.startsWith('hist-3d-'));

          if (isHistoricoCluster) {
              // Reseña detallada del sector agrupado de factores de inestabilidad
              if (expandedHoverStateRef.current) {
                  expandedHoverStateRef.current.entities.forEach(e => viewer.entities.remove(e));
                  expandedHoverStateRef.current = null;
              }

              const count = clusteredEntities.length;
              const details: string[] = [
                  `📍 Total Hechos en este Sector: ${count} eventos operacionales agrupados.`,
                  'Haga clic sobre el círculo rojo o acerque la cámara para ver cada punto en el terreno.',
                  '----------------------------------------'
              ];

              clusteredEntities.slice(0, 8).forEach((entity: Cesium.Entity) => {
                  const p: any = entity.properties;
                  let title = entity.name || 'Factor de Inestabilidad';
                  let dateStr = '';
                  let grpStr = '';

                  if (p) {
                      if (typeof p.hasProperty === 'function') {
                          if (p.hasProperty('tooltipTitle')) {
                              const rawT = p.tooltipTitle;
                              title = typeof rawT?.getValue === 'function' ? rawT.getValue() : rawT;
                          }
                          if (p.hasProperty('tooltipDetails')) {
                              const rawD = p.tooltipDetails;
                              const dList = typeof rawD?.getValue === 'function' ? rawD.getValue() : rawD;
                              if (Array.isArray(dList)) {
                                  const dt = dList.find(d => typeof d === 'string' && (d.startsWith('Fecha del Hecho:') || d.includes('Total Hechos')));
                                  if (dt) dateStr = dt.replace('Fecha del Hecho: ', '');
                                  const grp = dList.find(d => typeof d === 'string' && d.startsWith('Estructura Amenaza:'));
                                  if (grp) grpStr = grp.replace('Estructura Amenaza: ', '');
                              }
                          }
                      } else {
                          if (p.tooltipTitle) title = typeof p.tooltipTitle.getValue === 'function' ? p.tooltipTitle.getValue() : p.tooltipTitle;
                          if (p.tooltipDetails) {
                              const dList = typeof p.tooltipDetails.getValue === 'function' ? p.tooltipDetails.getValue() : p.tooltipDetails;
                              if (Array.isArray(dList)) {
                                  const dt = dList.find(d => typeof d === 'string' && (d.startsWith('Fecha del Hecho:') || d.includes('Total Hechos')));
                                  if (dt) dateStr = dt.replace('Fecha del Hecho: ', '');
                                  const grp = dList.find(d => typeof d === 'string' && d.startsWith('Estructura Amenaza:'));
                                  if (grp) grpStr = grp.replace('Estructura Amenaza: ', '');
                              }
                          }
                      }
                  }

                  const row = [dateStr ? `[${dateStr.slice(0, 10)}]` : '', title, grpStr ? `(${grpStr})` : ''].filter(Boolean).join(' ');
                  details.push(`• ${row}`);
              });

              if (count > 8) {
                  details.push(`... y ${count - 8} hechos operacionales adicionales registrados en este sector.`);
              }

              setHoveredTooltipInfo({
                  x: movement.endPosition.x,
                  y: movement.endPosition.y,
                  title: `Concentración Táctica: ${count} Factores de Inestabilidad`,
                  details: details
              });
              document.body.style.cursor = 'pointer';
              return;
          }

          // Para unidades militares amigas: expansión lateral
          if (!expandedHoverStateRef.current || expandedHoverStateRef.current.clusterPrimitive !== pickedObject.primitive) {
              if (expandedHoverStateRef.current) {
                 expandedHoverStateRef.current.entities.forEach(e => viewer.entities.remove(e));
                 expandedHoverStateRef.current = null;
              }
              
              let cartesianPos = pickedObject.primitive?.position;
              if (cartesianPos) {
                  const expandedEntities: Cesium.Entity[] = [];
                  const baseHorizontalOffset = 30;
                  const spacing = 50;
                  
                  clusteredEntities.forEach((entity: Cesium.Entity, index: number) => {
                      const offsetX = baseHorizontalOffset + (index * spacing);
                      const expandedEntity = viewer.entities.add({
                          id: `expanded-hover-${entity.id}`,
                          position: cartesianPos,
                          properties: entity.properties,
                          billboard: {
                              image: entity.billboard?.image,
                              heightReference: entity.billboard?.heightReference,
                              horizontalOrigin: entity.billboard?.horizontalOrigin,
                              verticalOrigin: entity.billboard?.verticalOrigin,
                              scaleByDistance: entity.billboard?.scaleByDistance,
                              disableDepthTestDistance: Number.POSITIVE_INFINITY,
                              pixelOffset: new Cesium.Cartesian2(offsetX, 0)
                          },
                          label: {
                              text: entity.label?.text,
                              font: entity.label?.font,
                              style: entity.label?.style,
                              fillColor: entity.label?.fillColor,
                              outlineColor: entity.label?.outlineColor,
                              outlineWidth: entity.label?.outlineWidth,
                              verticalOrigin: entity.label?.verticalOrigin,
                              scaleByDistance: entity.label?.scaleByDistance,
                              disableDepthTestDistance: Number.POSITIVE_INFINITY,
                              heightReference: entity.label?.heightReference,
                              pixelOffset: new Cesium.Cartesian2(offsetX, 25)
                          }
                      });
                      expandedEntities.push(expandedEntity);
                  });
                  
                  expandedHoverStateRef.current = {
                      clusterPrimitive: pickedObject.primitive,
                      entities: expandedEntities,
                      basePosition: cartesianPos
                  };
              }
          }
      } else if (!isHoveringExpandedUnit && expandedHoverStateRef.current) {
          expandedHoverStateRef.current.entities.forEach(e => viewer.entities.remove(e));
          expandedHoverStateRef.current = null;
      }

      // 2. Extracción de reseña táctica (Tooltip) para entidades individuales
      if (pickedObject && pickedObject.id && pickedObject.id.properties) {
        const props: any = pickedObject.id.properties;
        let title: string | undefined;
        let details: string[] = [];

        if (typeof props.hasProperty === 'function') {
          if (props.hasProperty('tooltipTitle')) {
            const rawT = props.tooltipTitle;
            title = typeof rawT?.getValue === 'function' ? rawT.getValue() : rawT;
          }
          if (props.hasProperty('tooltipDetails')) {
            const rawD = props.tooltipDetails;
            const val = typeof rawD?.getValue === 'function' ? rawD.getValue() : rawD;
            details = Array.isArray(val) ? val.filter(Boolean) : [String(val)];
          }
        } else {
          if (props.tooltipTitle) {
            title = typeof props.tooltipTitle?.getValue === 'function' ? props.tooltipTitle.getValue() : props.tooltipTitle;
          }
          if (props.tooltipDetails) {
            const val = typeof props.tooltipDetails?.getValue === 'function' ? props.tooltipDetails.getValue() : props.tooltipDetails;
            details = Array.isArray(val) ? val.filter(Boolean) : [String(val)];
          }
        }

        if (title) {
          setHoveredTooltipInfo({
            x: movement.endPosition.x,
            y: movement.endPosition.y,
            title: title,
            details: details
          });
          document.body.style.cursor = 'pointer';
        } else {
          setHoveredTooltipInfo(null);
          if (!distanceToolActive && !aoiDrawingModeActive && !piccDrawingConfig && !isTargetSelectionActive && !elevationProfileActive) {
            document.body.style.cursor = 'default';
          }
        }
      } else {
        setHoveredTooltipInfo(null);
        if (!distanceToolActive && !aoiDrawingModeActive && !piccDrawingConfig && !isTargetSelectionActive && !elevationProfileActive) {
          document.body.style.cursor = 'default';
        }
      }
    }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      handler.destroy();
      viewer.destroy();
    };
  }, []);

  // Handle terrain toggle
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;

    if (terrainActive) {
      getTerrainProvider().then(provider => {
        if (viewerRef.current && !viewerRef.current.isDestroyed()) {
          viewerRef.current.terrainProvider = provider;
        }
      }).catch(err => {
        console.error("Failed to load terrain provider:", err);
      });
    } else {
      viewer.terrainProvider = new Cesium.EllipsoidTerrainProvider();
    }
  }, [terrainActive]);


  const handleExaggerationChange = (val: number) => {
    setTerrainExaggeration(val);
    if (viewerRef.current && !viewerRef.current.isDestroyed()) {
      (viewerRef.current.scene.globe as any).terrainExaggeration = val;
    }
  };

  const handleSaveIonToken = () => {
    if (ionTokenInput.trim()) {
      localStorage.setItem('simcop_cesium_ion_token', ionTokenInput.trim());
      Cesium.Ion.defaultAccessToken = ionTokenInput.trim();
    } else {
      localStorage.removeItem('simcop_cesium_ion_token');
      Cesium.Ion.defaultAccessToken = '';
    }
    setShowIonModal(false);
    if (viewerRef.current && !viewerRef.current.isDestroyed()) {
      getTerrainProvider().then(provider => {
        if (viewerRef.current && !viewerRef.current.isDestroyed()) {
          viewerRef.current.terrainProvider = provider;
        }
      });
    }
  };

  // Auto-sync weather effect based on camera center
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;

    let timeoutId: NodeJS.Timeout;

    const handleCameraMoveEnd = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(async () => {
        try {
          if (!viewer || viewer.isDestroyed()) return;
          const cameraPos = viewer.camera.positionCartographic;
          
          // REGLA SOLICITADA POR USUARIO: Si la cámara está viendo todo el país (> 800km de altura), 
          // apagar el clima para no manchar el mapa y abortar el Auto-Sync.
          if (cameraPos.height > 800000) {
            setWeatherEffect('clear');
            return;
          }

          const lat = Cesium.Math.toDegrees(cameraPos.latitude);
          const lon = Cesium.Math.toDegrees(cameraPos.longitude);
          
          const res = await apiClient.fetch(`${API_BASE_URL}/api/weather/current?lat=${lat}&lon=${lon}`);
          if (!res.ok) return;
          const data = await res.json();
          const code = data.current?.weather_code;
          
          if (code !== undefined) {
            if (code === 45 || code === 48) {
              setWeatherEffect('fog');
            } else if (code >= 95 && code <= 99) {
              setWeatherEffect('storm');
            } else if (code >= 51) {
              setWeatherEffect('rain');
            } else {
              setWeatherEffect('clear');
            }
          }
        } catch (e) {
          console.warn('Auto weather fetch failed:', e);
        }
      }, 1500); // Wait 1.5s after moving camera to fetch
    };

    viewer.camera.moveEnd.addEventListener(handleCameraMoveEnd);
    handleCameraMoveEnd(); // Initial trigger

    return () => {
      clearTimeout(timeoutId);
      if (viewer && !viewer.isDestroyed()) {
        viewer.camera.moveEnd.removeEventListener(handleCameraMoveEnd);
      }
    };
  }, []);

  // Handle native RainViewer radar layer
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;

    if (nativeRadarActive) {
      fetch('https://api.rainviewer.com/public/weather-maps.json')
        .then(res => res.json())
        .then(data => {
          if (!nativeRadarActive) return; // double check if toggled off quickly
          const past = data.radar.past;
          if (past && past.length > 0) {
            const latest = past[past.length - 1].path;
            const provider = new Cesium.UrlTemplateImageryProvider({
              url: `https://tilecache.rainviewer.com${latest}/256/{z}/{x}/{y}/2/1_1.png`,
              credit: 'RainViewer',
              enablePickFeatures: false,
            });
            const layer = viewer.imageryLayers.addImageryProvider(provider);
            layer.alpha = 0.6; // transparency
            radarLayerRef.current = layer;
          }
        }).catch(e => console.error("Error loading RainViewer", e));
    } else {
      if (radarLayerRef.current) {
        viewer.imageryLayers.remove(radarLayerRef.current);
        radarLayerRef.current = null;
      }
    }

    return () => {
      if (radarLayerRef.current && viewerRef.current && !viewerRef.current.isDestroyed()) {
        viewerRef.current.imageryLayers.remove(radarLayerRef.current);
        radarLayerRef.current = null;
      }
    };
  }, [nativeRadarActive]);

  // Handle map layer updates (ESRI World Imagery HD + CartoDB Labels, Cartografía, or OSM)
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer || viewer.isDestroyed()) return;

    // Clear existing base layers cleanly
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
      // Capa Satelital Fotorrealista HD ESRI + Etiquetas CartoDB
      const satelliteProvider = new Cesium.UrlTemplateImageryProvider({
        url: 'https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        credit: 'Esri, Maxar, Earthstar Geographics',
        maximumLevel: 19,
        enablePickFeatures: false
      });
      igacSatLayerRef.current = viewer.imageryLayers.addImageryProvider(satelliteProvider, 0);

      const labelsProvider = new Cesium.UrlTemplateImageryProvider({
        url: 'https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
        credit: '© Esri, HERE, Garmin',
        hasAlphaChannel: true,
        maximumLevel: 20,
        enablePickFeatures: false
      });
      igacSatLabelsLayerRef.current = viewer.imageryLayers.addImageryProvider(labelsProvider, 1);
    } else if (mapLayer === 'topo') {
      // Mapa Topográfico Mundial ESRI (World Topo Map) con curvas de nivel e hidrografía
      const topoProvider = new Cesium.UrlTemplateImageryProvider({
        url: 'https://services.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',
        credit: 'Esri, HERE, Garmin, USGS, Intermap, INCREMENT P, NRCan, Esri Japan, METI, Esri China (Hong Kong), Esri Korea, Esri (Thailand), NGCC, (c) OpenStreetMap contributors, and the GIS User Community',
        maximumLevel: 19,
        enablePickFeatures: false
      });
      igacSatLayerRef.current = viewer.imageryLayers.addImageryProvider(topoProvider, 0);
    } else if (mapLayer === 'vias') {
      // Mapa de Vías y Carreteras detalladas ESRI (World Street Map)
      const streetProvider = new Cesium.UrlTemplateImageryProvider({
        url: 'https://services.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
        credit: 'Esri, HERE, Garmin, USGS, Intermap, INCREMENT P, NRCan, Esri Japan, METI, Esri China (Hong Kong), Esri Korea, Esri (Thailand), NGCC, (c) OpenStreetMap contributors, and the GIS User Community',
        maximumLevel: 19,
        enablePickFeatures: false
      });
      igacSatLayerRef.current = viewer.imageryLayers.addImageryProvider(streetProvider, 0);
    } else if (mapLayer === 'igac-pol') {
      // Cartografía Base Táctica Militar (ESRI NatGeo World Map - Libre de marcas de agua)
      const natGeoProvider = new Cesium.UrlTemplateImageryProvider({
        url: 'https://services.arcgisonline.com/ArcGIS/rest/services/NatGeo_World_Map/MapServer/tile/{z}/{y}/{x}',
        credit: 'National Geographic, Esri, DeLorme, HERE, UNEP-WCMC, USGS, NASA, ESA, METI, NRCAN, GEBCO, NOAA, increment P Corp.',
        maximumLevel: 19,
        enablePickFeatures: false
      });
      igacPolLayerRef.current = viewer.imageryLayers.addImageryProvider(natGeoProvider, 0);
    }

    if (viewer && !viewer.isDestroyed()) {
      viewer.scene.requestRender();
    }
  }, [mapLayer]);

  // CMOC: Clasificación Militar de Transitabilidad Topográfica (Doctrina MTE 2-01.3 / MFRE 1-02.2)
  // Verde (<15°): Sin Restricciones (Valles y corredores)
  // Amarillo/Ámbar (15° - 30°): Terreno Restringido (Cuchillas y laderas)
  // Rojo (>30°): Severamente Restringido (Farallones y cañones)
  const getCMOCColorRamp = () => {
    const ramp = document.createElement('canvas');
    ramp.width = 100;
    ramp.height = 1;
    const ctx = ramp.getContext('2d');
    if (!ctx) return ramp;

    // Rampa de inclinación normalizada de 0 a 90 grados (0.0 a 1.0)
    // 15° / 90° = 0.1666
    // 30° / 90° = 0.3333
    const grd = ctx.createLinearGradient(0, 0, 100, 0);
    // <15°: Terreno Sin Restricciones (Verde esmeralda táctico)
    grd.addColorStop(0.0, 'rgba(16, 185, 129, 0.40)');
    grd.addColorStop(0.165, 'rgba(16, 185, 129, 0.40)');
    // 15° - 30°: Terreno Restringido (Ámbar / Amarillo militar)
    grd.addColorStop(0.166, 'rgba(245, 158, 11, 0.65)');
    grd.addColorStop(0.332, 'rgba(245, 158, 11, 0.65)');
    // >30°: Terreno Severamente Restringido (Rojo Farallón / Cañón)
    grd.addColorStop(0.333, 'rgba(239, 68, 68, 0.78)');
    grd.addColorStop(1.0, 'rgba(220, 38, 38, 0.88)');

    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, 100, 1);
    return ramp;
  };

  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer || viewer.isDestroyed()) return;

    if (showCmocTransitLayer) {
      try {
        const rampCanvas = getCMOCColorRamp();
        viewer.scene.globe.material = Cesium.Material.fromType('SlopeRamp', {
          image: rampCanvas
        });
      } catch (e) {
        console.error("Error setting CMOC slope ramp material:", e);
      }
    } else {
      viewer.scene.globe.material = undefined as any;
    }
    viewer.scene.requestRender();
  }, [showCmocTransitLayer]);

  // Capa Oficial de Red Hidrográfica (Ríos Navegables, Afluentes y Quebradas - IGAC / Topo)
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer || viewer.isDestroyed()) return;

    let isCancelled = false;

    if (showHydrographyLayer) {
      if (!hydroLayerRef.current) {
        // Cargar capa hidrográfica con soporte para export dinámico IGAC (Drenajes dobles y sencillos)
        // y respaldo visual transparente de aguas y drenajes
        const initHydro = async () => {
          try {
            let provider: Cesium.ImageryProvider | null = null;
            
            // 1. Intentar ArcGisMapServerImageryProvider oficial de IGAC con export dinámico (sin caché requerido)
            try {
              provider = await (Cesium.ArcGisMapServerImageryProvider as any).fromUrl(
                'https://mapas2.igac.gov.co/server/rest/services/carto/carto25000colombia2017/MapServer',
                {
                  usePreCachedTilesIfAvailable: false,
                  layers: '1,4,6,9,10,11,12,20,21,22', // Cuerpos de agua, Embalses, Lagunas, Drenaje Doble, Drenaje Sencillo (Quebradas), Raudales
                  enablePickFeatures: false
                }
              );
            } catch (igacErr) {
              console.warn("IGAC MapServer export falló, intentando capa de referencia hidrográfica ESRI/OSM:", igacErr);
            }

            // 2. Si IGAC tiene retraso o cae, usar capa de referencia de aguas y drenajes transparente de alta resolución
            if (!provider) {
              provider = new Cesium.UrlTemplateImageryProvider({
                url: 'https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Reference_Overlay/MapServer/tile/{z}/{y}/{x}',
                credit: '© Esri, USGS, NPS, IGAC - Red Hidrográfica y Cuerpos de Agua',
                hasAlphaChannel: true,
                maximumLevel: 16,
                enablePickFeatures: false
              });
            }

            if (!isCancelled && viewer && !viewer.isDestroyed() && provider) {
              const layer = viewer.imageryLayers.addImageryProvider(provider);
              layer.alpha = 0.95;
              hydroLayerRef.current = layer;
              viewer.scene.requestRender();
            }
          } catch (err) {
            console.error("Error inicializando capa de hidrografía:", err);
          }
        };

        initHydro();
      }
    } else {
      if (hydroLayerRef.current) {
        viewer.imageryLayers.remove(hydroLayerRef.current);
        hydroLayerRef.current = null;
      }
    }
    viewer.scene.requestRender();

    return () => {
      isCancelled = true;
    };
  }, [showHydrographyLayer]);

  // Capa de Red Vial Oficial (Vías y Corredores de Movilidad sobre relieve)
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer || viewer.isDestroyed()) return;

    if (showRoadsLayer) {
      if (!roadsLayerRef.current) {
        const roadsProvider = new Cesium.UrlTemplateImageryProvider({
          url: 'https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}',
          credit: '© Esri, HERE, Garmin, Transportation',
          hasAlphaChannel: true,
          maximumLevel: 19,
          enablePickFeatures: false
        });
        roadsLayerRef.current = viewer.imageryLayers.addImageryProvider(roadsProvider);
      }
    } else {
      if (roadsLayerRef.current) {
        viewer.imageryLayers.remove(roadsLayerRef.current);
        roadsLayerRef.current = null;
      }
    }
    viewer.scene.requestRender();
  }, [showRoadsLayer]);

  // Handle visual weather volumetric effects (Shaders)
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;

    // Remove current weather stage
    if (weatherStageRef.current) {
      viewer.scene.postProcessStages.remove(weatherStageRef.current);
      weatherStageRef.current = null;
    }
    viewer.scene.fog.enabled = false;

    if (weatherEffect === 'rain' || weatherEffect === 'storm') {
      viewer.scene.fog.enabled = true;
      viewer.scene.fog.density = weatherEffect === 'storm' ? 0.002 : 0.0015;
    } else if (weatherEffect === 'fog') {
      // Niebla táctica volumétrica densa
      viewer.scene.fog.enabled = true;
      viewer.scene.fog.density = 0.0025;
    }

    let lightningTimeout: NodeJS.Timeout;
    const lightningEntities: Cesium.Entity[] = [];

    if (weatherEffect === 'storm') {
      const lightningSvg = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="48" height="48" fill="#ffffff" stroke="#c084fc" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>');

      const triggerLightning = () => {
        // Spawn a localized lightning strike icon around the Windy Coords
        const viewer = viewerRef.current;
        if (viewer && viewer.camera) {
          // Center the storm exactly where the Windy widget is pointing
          const lat = windyCoords.lat;
          const lon = windyCoords.lon;

          // Localized strike radius: ~50km max from the windy center, not tied to camera height
          const offsetDegrees = 0.6; 
          const strikeLat = lat + (Math.random() - 0.5) * offsetDegrees * 2;
          const strikeLon = lon + (Math.random() - 0.5) * offsetDegrees * 2;

          const strikeEntity = viewer.entities.add({
            position: Cesium.Cartesian3.fromDegrees(strikeLon, strikeLat),
            billboard: {
              image: lightningSvg,
              scale: 1.0,
              verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
              heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
              disableDepthTestDistance: Number.POSITIVE_INFINITY // Always visible like Windy
            }
          });

          lightningEntities.push(strikeEntity);

          // Fade out and remove the entity after 2.5 seconds
          setTimeout(() => {
            if (viewer && !viewer.isDestroyed()) {
              viewer.entities.remove(strikeEntity);
              const index = lightningEntities.indexOf(strikeEntity);
              if (index > -1) lightningEntities.splice(index, 1);
            }
          }, 2500);
        }

        lightningTimeout = setTimeout(triggerLightning, Math.random() * 3000 + 800);
      };
      triggerLightning();
    }

    return () => {
      clearTimeout(lightningTimeout);
      const viewer = viewerRef.current;
      if (viewer && !viewer.isDestroyed()) {
        lightningEntities.forEach(ent => viewer.entities.remove(ent));
      }
    };
  }, [weatherEffect, windyCoords]);

  // PICC and COA drawing and loading helpers
  const fetchPiccGraphics = async () => {
    try {
      const graphics = await piccService.getAllGraphics();
      setLoadedPiccGraphics(graphics);
    } catch (err) {
      console.error("Error loading PICC graphics in 3D:", err);
    }
  };

  const handlePointPiccDrawing = async (cartesian: Cesium.Cartesian3, config: PICCDrawingConfig) => {
    const viewer = viewerRef.current;
    if (!viewer) return;

    const cartographic = Cesium.Cartographic.fromCartesian(cartesian);
    const lat = Cesium.Math.toDegrees(cartographic.latitude);
    const lon = Cesium.Math.toDegrees(cartographic.longitude);

    const toolConfig = PlantillaPICCConfig[activeTemplateContext || '']?.elements.find(el => el.type === config.type);
    const defaultLabel = toolConfig?.label || config.type || 'PUNTO';

    const labelText = config.options?.labelPrompt
      ? window.prompt(config.options.labelPrompt, defaultLabel) || defaultLabel
      : defaultLabel;

    const sidcOptions = config.options?.sidcOptions;
    const finalSIDC = getPICCElementSIDC(config.type as PICCElementType, sidcOptions);

    const geoJson = {
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [lon, lat]
      },
      properties: {}
    };

    try {
      const saved = await piccService.saveGraphic({
        plantillaType: (activeTemplateContext as PlantillaType) || PlantillaType.MANIOBRA_PROPUESTA,
        graphicType: config.type as PICCElementType,
        geoJson: JSON.stringify(geoJson),
        label: labelText
      });
      console.log('✅ PICC 3D: Guardado punto:', saved.id);
      eventBus.publish('refreshPiccGraphics');
    } catch (err) {
      console.error('❌ PICC 3D: Error guardando punto:', err);
    }

    if (onPiccDrawingComplete) {
      onPiccDrawingComplete();
    }
  };

  const updatePiccDrawingPreview = (points: Cesium.Cartesian3[], config: PICCDrawingConfig) => {
    const viewer = viewerRef.current;
    if (!viewer) return;

    piccEntitiesRef.current.forEach(e => viewer.entities.remove(e));
    piccEntitiesRef.current = [];

    if (points.length === 0) return;

    const isPoly = [
      PICCElementType.FRIENDLY_ASSEMBLY_AREA, PICCElementType.FRIENDLY_OBJECTIVE,
      PICCElementType.NFA_AREA, PICCElementType.RFA_AREA, PICCElementType.CONTROL_AREA_GENERIC,
      PICCElementType.NAI_AREA, PICCElementType.TAI_AREA
    ].includes(config.type as PICCElementType);

    const colorHex = config.color || '#0000FF';
    const color = Cesium.Color.fromCssColorString(colorHex);

    points.forEach(p => {
      const ptEntity = viewer.entities.add({
        position: p,
        point: {
          pixelSize: 6,
          color: color,
          outlineColor: Cesium.Color.BLACK,
          outlineWidth: 1.5,
          heightReference: Cesium.HeightReference.CLAMP_TO_GROUND
        }
      });
      piccEntitiesRef.current.push(ptEntity);
    });

    if (points.length >= 2) {
      if (isPoly) {
        if (points.length >= 3) {
          const polyEntity = viewer.entities.add({
            polygon: {
              hierarchy: new Cesium.PolygonHierarchy(points),
              material: color.withAlpha(0.2),
              outline: true,
              outlineColor: color,
              outlineWidth: 2,
              heightReference: Cesium.HeightReference.CLAMP_TO_GROUND
            }
          });
          piccEntitiesRef.current.push(polyEntity);
        } else {
          const lineEntity = viewer.entities.add({
            polyline: {
              positions: points,
              width: 2,
              material: color,
              clampToGround: true
            }
          });
          piccEntitiesRef.current.push(lineEntity);
        }
      } else {
        const lineEntity = viewer.entities.add({
          polyline: {
            positions: points,
            width: 3,
            material: new Cesium.PolylineDashMaterialProperty({
              color: color
            }),
            clampToGround: true
          }
        });
        piccEntitiesRef.current.push(lineEntity);
      }
    }
  };

  const handleFinalizePiccDrawing = async () => {
    const points = piccPoints;
    if (points.length < 2) {
      console.warn("Se necesitan al menos 2 puntos para el dibujo.");
      return;
    }

    const config = piccDrawingConfig;
    if (!config) return;

    const coords = points.map(p => {
      const carto = Cesium.Cartographic.fromCartesian(p);
      return [Cesium.Math.toDegrees(carto.longitude), Cesium.Math.toDegrees(carto.latitude)];
    });

    const isPoly = [
      PICCElementType.FRIENDLY_ASSEMBLY_AREA, PICCElementType.FRIENDLY_OBJECTIVE,
      PICCElementType.NFA_AREA, PICCElementType.RFA_AREA, PICCElementType.CONTROL_AREA_GENERIC,
      PICCElementType.NAI_AREA, PICCElementType.TAI_AREA
    ].includes(config.type as PICCElementType);

    let geometry: any;
    if (isPoly) {
      coords.push([...coords[0]]);
      geometry = {
        type: 'Polygon',
        coordinates: [coords]
      };
    } else {
      geometry = {
        type: 'LineString',
        coordinates: coords
      };
    }

    const toolConfig = PlantillaPICCConfig[activeTemplateContext || '']?.elements.find(el => el.type === config.type);
    const defaultLabel = toolConfig?.label || config.type || 'LÍNEA';

    const labelText = config.options?.labelPrompt
      ? window.prompt(config.options.labelPrompt, defaultLabel) || defaultLabel
      : defaultLabel;

    const geoJson = {
      type: 'Feature',
      geometry: geometry,
      properties: {
        style: {
          color: config.color || '#0000FF',
          weight: 3,
          fillColor: config.color || '#0000FF',
          fillOpacity: isPoly ? 0.2 : 0,
          dashArray: !isPoly && config.type === PICCElementType.CONTROL_PHASE_LINE ? '10, 5' : undefined
        }
      }
    };

    try {
      const saved = await piccService.saveGraphic({
        plantillaType: (activeTemplateContext as PlantillaType) || PlantillaType.MANIOBRA_PROPUESTA,
        graphicType: config.type as PICCElementType,
        geoJson: JSON.stringify(geoJson),
        label: labelText
      });
      console.log('✅ PICC 3D: Guardado gráfico:', saved.id);
      eventBus.publish('refreshPiccGraphics');
    } catch (err) {
      console.error('❌ PICC 3D: Error guardando gráfico:', err);
    }

    setPiccPoints([]);
    piccEntitiesRef.current.forEach(e => viewerRef.current?.entities.remove(e));
    piccEntitiesRef.current = [];

    if (onPiccDrawingComplete) {
      onPiccDrawingComplete();
    }
  };

  const handleCancelPiccDrawing = () => {
    setPiccPoints([]);
    piccEntitiesRef.current.forEach(e => viewerRef.current?.entities.remove(e));
    piccEntitiesRef.current = [];

    if (onPiccDrawingComplete) {
      onPiccDrawingComplete();
    }
  };

  // Sync PICC graphics load
  useEffect(() => {
    fetchPiccGraphics();

    const handleRefresh = () => {
      fetchPiccGraphics();
    };

    const clearPiccToken = eventBus.subscribe('clearPiccLayer', handleRefresh);
    const refreshPiccToken = eventBus.subscribe('refreshPiccGraphics', handleRefresh);

    return () => {
      eventBus.unsubscribe(clearPiccToken);
      eventBus.unsubscribe(refreshPiccToken);
    };
  }, [eventBus]);

  // Load COA plan and graphics
  useEffect(() => {
    // If no COA plan in state, try restoring from coaPlanService
    if (!currentCOAPlan) {
      coaPlanService.getAllPlans()
        .then(plans => {
          if (plans && plans.length > 0) {
            const latest = plans[plans.length - 1];
            if (latest && latest.phases && latest.phases.length > 0) {
              updateCurrentCOAPlan(latest);
            }
          }
        })
        .catch(err => {
          console.warn("Could not restore COA plan from backend:", err);
        });
    }

  }, []);

  // Cargar Histórico Factores de Inestabilidad BR23 bajo demanda (Lazy-load al activar la capa)
  useEffect(() => {
    if (showHistoricoBr23Layer && historicoEvents.length === 0 && !isHistoricoLoading) {
      setIsHistoricoLoading(true);
      fetch('/historico_inestabilidad_br23.json')
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) {
            setHistoricoEvents(data);
          }
          setIsHistoricoLoading(false);
        })
        .catch(err => {
          console.warn("Fallo cargando historico completo, usando contingencia táctica:", err);
          fetch('/historico_inestabilidad_tactico.json')
            .then(r => r.json())
            .then(d => { 
              if (Array.isArray(d)) setHistoricoEvents(d); 
              setIsHistoricoLoading(false);
            })
            .catch(e => {
              console.warn("No se pudo cargar dataset táctico:", e);
              setIsHistoricoLoading(false);
            });
        });
    }
  }, [showHistoricoBr23Layer, historicoEvents.length, isHistoricoLoading]);

  useEffect(() => {
    if (!eventBus) return;

    const handleNewCOAPlan = (_msg: string, plan: COAPlan) => {
      if (plan) updateCurrentCOAPlan(plan);
    };

    const handleRenderCOAGraphics = (_msg: string, plan: COAPlan) => {
      if (plan) updateCurrentCOAPlan(plan);
    };

    const handleClearCOA = () => {
      updateCurrentCOAPlan(null);
      if (viewerRef.current && !viewerRef.current.isDestroyed()) {
        const entities = viewerRef.current.entities.values;
        for (let i = entities.length - 1; i >= 0; i--) {
          const ent = entities[i];
          if (ent.id && typeof ent.id === 'string' && ent.id.startsWith('coa-3d-')) {
            viewerRef.current.entities.remove(ent);
          }
        }
        viewerRef.current.scene.requestRender();
      }
    };

    const handleClearPicc = () => {
      setLoadedPiccGraphics([]);
      if (viewerRef.current && !viewerRef.current.isDestroyed()) {
        const entities = viewerRef.current.entities.values;
        for (let i = entities.length - 1; i >= 0; i--) {
          const ent = entities[i];
          if (ent.id && typeof ent.id === 'string' && ent.id.startsWith('picc-3d-')) {
            viewerRef.current.entities.remove(ent);
          }
        }
        viewerRef.current.scene.requestRender();
      }
    };

    const handleSetMapLayer = (_msg: string, layer: any) => {
      if (layer && typeof layer === 'string') {
        const validLayers = ['igac-sat', 'topo', 'vias', 'igac-pol', 'osm'];
        if (validLayers.includes(layer)) {
          setMapLayer(layer as any);
        }
      }
    };

    const handleSetCmoc = (_msg: string, active: boolean) => setShowCmocTransitLayer(!!active);
    const handleSetHydro = (_msg: string, active: boolean) => setShowHydrographyLayer(!!active);
    const handleSetRoads = (_msg: string, active: boolean) => setShowRoadsLayer(!!active);

    const tokenNew = eventBus.subscribe('newCOAPlan', handleNewCOAPlan);
    const tokenRender = eventBus.subscribe('renderCOAGraphics', handleRenderCOAGraphics);
    const tokenClear = eventBus.subscribe('clearCOALayer', handleClearCOA);
    const tokenClearPicc = eventBus.subscribe('clearPiccLayer', handleClearPicc);
    const tokenSetMapLayer = eventBus.subscribe('setMapLayer', handleSetMapLayer);
    const tokenCmoc = eventBus.subscribe('setCmocTransitLayer', handleSetCmoc);
    const tokenHydro = eventBus.subscribe('setHydrographyLayer', handleSetHydro);
    const tokenRoads = eventBus.subscribe('setRoadsLayer', handleSetRoads);

    return () => {
      eventBus.unsubscribe(tokenNew);
      eventBus.unsubscribe(tokenRender);
      eventBus.unsubscribe(tokenClear);
      eventBus.unsubscribe(tokenClearPicc);
      eventBus.unsubscribe(tokenSetMapLayer);
      eventBus.unsubscribe(tokenCmoc);
      eventBus.unsubscribe(tokenHydro);
      eventBus.unsubscribe(tokenRoads);
    };
  }, [eventBus]);

  // Manejadores de borrado de calco táctico y medidas
  const handleClearS2COAPlan = () => {
    updateCurrentCOAPlan(null);
    if (viewerRef.current && !viewerRef.current.isDestroyed()) {
      const entities = viewerRef.current.entities.values;
      for (let i = entities.length - 1; i >= 0; i--) {
        const ent = entities[i];
        if (ent.id && typeof ent.id === 'string' && ent.id.startsWith('coa-3d-')) {
          viewerRef.current.entities.remove(ent);
        }
      }
      viewerRef.current.scene.requestRender();
    }
    if (eventBus) {
      eventBus.publish('clearCOALayer', {});
    }
  };

  const handleClearPiccGraphics = async () => {
    setLoadedPiccGraphics([]);
    if (viewerRef.current && !viewerRef.current.isDestroyed()) {
      const entities = viewerRef.current.entities.values;
      for (let i = entities.length - 1; i >= 0; i--) {
        const ent = entities[i];
        if (ent.id && typeof ent.id === 'string' && ent.id.startsWith('picc-3d-')) {
          viewerRef.current.entities.remove(ent);
        }
      }
      viewerRef.current.scene.requestRender();
    }
    try {
      const all = await piccService.getAllGraphics();
      for (const g of all) {
        if (g.id) await piccService.deleteGraphic(g.id);
      }
    } catch (err) {
      console.warn("Borrado en memoria de gráficos PICC completado");
    }
    if (eventBus) {
      eventBus.publish('clearPiccLayer', {});
    }
  };

  const handleClearAllTacticalCalco = () => {
    handleClearS2COAPlan();
    handleClearPiccGraphics();
  };

  // Render all tactical overlays (Surgical Entity Management)
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;

    // 0. Safely clear any active hover expansions when data refreshes
    if (expandedHoverStateRef.current) {
        expandedHoverStateRef.current.entities.forEach(e => viewer.entities.remove(e));
        expandedHoverStateRef.current = null;
    }

    // 1. Clear previous tactical entities
    tacticalEntitiesRef.current.forEach(e => viewer.entities.remove(e));
    tacticalEntitiesRef.current = [];

    // Helper to add entity to surgical tracking list
    const addTacticalEntity = (entityConfig: Cesium.Entity.ConstructorOptions) => {
      const entity = viewer.entities.add(entityConfig);
      tacticalEntitiesRef.current.push(entity);
      return entity;
    };

    // 2. Redraw selected coverage dome if active
    if (coverageDomeActive && selectedUnitForDome) {
      const matchedUnit = units.find(u => u.id === selectedUnitForDome);
      if (matchedUnit) {
        const cartographic = Cesium.Cartographic.fromDegrees(matchedUnit.location.lon, matchedUnit.location.lat);
        const elevation = viewer.scene.globe.getHeight(cartographic) || 0;
        const center = Cesium.Cartesian3.fromDegrees(matchedUnit.location.lon, matchedUnit.location.lat, elevation);
        const radius = 15000.0;
        addTacticalEntity({
          id: 'coverage-dome-3d',
          name: 'Domo de Cobertura de Radio/Artillería (15km)',
          position: center,
          ellipsoid: {
            radii: new Cesium.Cartesian3(radius, radius, radius),
            material: Cesium.Color.CYAN.withAlpha(0.25),
            outline: true,
            outlineColor: Cesium.Color.CYAN,
            outlineWidth: 2,
            subdivisions: 32
          }
        });
      }
    }
    // 3. Render Military Units via CustomDataSource for true Native Clustering
    if (unitDataSourceRef.current && viewer.dataSources.contains(unitDataSourceRef.current)) {
      viewer.dataSources.remove(unitDataSourceRef.current, true); // MUST pass true to destroy orphaned cluster primitives!
    }
    const unitDataSource = new Cesium.CustomDataSource('units');
    unitDataSourceRef.current = unitDataSource;
    
    // Enable clustering (behaves exactly like Leaflet's markercluster)
    unitDataSource.clustering.enabled = true;
    unitDataSource.clustering.pixelRange = 50;
    unitDataSource.clustering.minimumClusterSize = 2;

    // Style the cluster to look like a clean, professional grouping indicator
    unitDataSource.clustering.clusterEvent.addEventListener((clusteredEntities, cluster) => {
      cluster.label.show = true;
      cluster.label.text = clusteredEntities.length.toLocaleString();
      cluster.label.font = 'bold 16px sans-serif';
      cluster.label.fillColor = Cesium.Color.WHITE;
      cluster.label.style = Cesium.LabelStyle.FILL_AND_OUTLINE;
      cluster.label.outlineWidth = 4;
      cluster.label.outlineColor = Cesium.Color.BLACK;
      // Center the text perfectly
      cluster.label.horizontalOrigin = Cesium.HorizontalOrigin.CENTER;
      cluster.label.verticalOrigin = Cesium.VerticalOrigin.CENTER;
      
      cluster.billboard.show = false;
      cluster.point.show = true;
      cluster.point.color = Cesium.Color.fromCssColorString('rgba(56, 189, 248, 0.85)'); // Cyan/Blue tactical glow
      cluster.point.pixelSize = 45;
      cluster.point.outlineColor = Cesium.Color.WHITE;
      cluster.point.outlineWidth = 3;
      cluster.point.disableDepthTestDistance = Number.POSITIVE_INFINITY;
      
      // Attach the clustered entities directly to the primitive's id
      // so that pickedObject.id returns the array when the cluster is clicked.
      cluster.point.id = clusteredEntities;
      cluster.label.id = clusteredEntities;
    });

    if (showUnitsLayer) {
      units.forEach(unit => {
      if (!unit || !unit.location) return;

      const sidc = generateUnitSIDC(unit);
      const isHQ = unit.type === UnitType.COMMAND_POST || unit.type === UnitType.BRIGADE || unit.type === UnitType.DIVISION || (unit.name && unit.name.toUpperCase().includes('HQ'));
      
      const symbolKey = `${sidc}_${isHQ ? 'HQ' : 'STD'}`;
      let iconUrl = unitSymbolCache.get(symbolKey);

      if (!iconUrl) {
        try {
          const symbol = new ms.Symbol(sidc, {
            size: 38,
            outlineColor: 'white',
            outlineWidth: 4,
            headquarters: isHQ,
            infoFields: false // Desactivar texto lateral de canvas para usar label Cesium 3D nítido
          });
          const canvas = symbol.asCanvas();
          iconUrl = canvas.toDataURL();
          unitSymbolCache.set(symbolKey, iconUrl);
        } catch (e) {
          console.warn("Fallo generando símbolo de unidad militar con milsymbol:", sidc, e);
          iconUrl = '/files/amigo.png';
        }
      }

      unitDataSource.entities.add({
        id: unit.id,
        name: unit.name,
        position: Cesium.Cartesian3.fromDegrees(unit.location.lon, unit.location.lat),
        properties: new Cesium.PropertyBag({
          tooltipTitle: `Fuerza Amiga: ${unit.name}`,
          tooltipDetails: [
             `Estado: ${unit.status}`,
             `Munición: ${unit.ammoLevel ?? 'Desconocido'}%`
          ]
        }),
        billboard: {
          image: iconUrl,
          heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
          horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
          verticalOrigin: Cesium.VerticalOrigin.CENTER,
          scaleByDistance: symbolScaleByDistance,
          disableDepthTestDistance: Number.POSITIVE_INFINITY
        },
        label: {
          text: unit.name,
          font: 'bold 12px system-ui, sans-serif',
          style: Cesium.LabelStyle.FILL_AND_OUTLINE,
          fillColor: Cesium.Color.WHITE,
          outlineColor: Cesium.Color.BLACK,
          outlineWidth: 4,
          verticalOrigin: Cesium.VerticalOrigin.TOP,
          pixelOffset: new Cesium.Cartesian2(0, 25), // Label exactly below the icon
          scaleByDistance: labelScaleByDistance,
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
          heightReference: Cesium.HeightReference.CLAMP_TO_GROUND
        }
      });
    });

    viewer.dataSources.add(unitDataSource);

    // UAV active drones inside this unit
    units.forEach(unit => {
      if (unit.uavAssets && unit.uavAssets.length > 0) {
        unit.uavAssets.forEach(uav => {
          if (!uav.location) return;

          const groundHeight = viewer.scene.globe.getHeight(Cesium.Cartographic.fromDegrees(uav.location.lon, uav.location.lat)) || 0;
          const uavAlt = groundHeight + 800.0;
          const uavPos = Cesium.Cartesian3.fromDegrees(uav.location.lon, uav.location.lat, uavAlt);

          const uavSIDC = 'SFAPMFQ------';
          const uavSymbol = new ms.Symbol(uavSIDC, {
            size: 35,
            uniqueDesignation: uav.id.split('-')[1] || uav.id,
            outlineColor: 'white',
            outlineWidth: 4
          });
          const uavCanvas = uavSymbol.asCanvas();
          const uavIconUrl = uavCanvas.toDataURL();

          addTacticalEntity({
            id: uav.id,
            name: `UAV: ${uav.id}`,
            position: uavPos,
            properties: new Cesium.PropertyBag({
              tooltipTitle: `UAV: ${uav.id.split('-')[1] || uav.id}`,
              tooltipDetails: [`En vuelo - Tiempo Real`]
            }),
            billboard: {
              image: uavIconUrl,
              heightReference: Cesium.HeightReference.RELATIVE_TO_GROUND,
              width: 28,
              height: 28,
              horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
              verticalOrigin: Cesium.VerticalOrigin.CENTER,
              disableDepthTestDistance: Number.POSITIVE_INFINITY
            },
            label: {
              text: `UAV: ${uav.id} (Bat: ${uav.batteryStatus}%)`,
              font: '10px sans-serif',
              fillColor: Cesium.Color.CYAN,
              outlineColor: Cesium.Color.BLACK,
              outlineWidth: 2,
              pixelOffset: new Cesium.Cartesian2(0, 18)
            }
          });

          // Circular orbit path around UAV's position
          const orbitPositions = [];
          const orbitPointsCount = 36;
          const orbitRadiusDeg = 1000.0 / 111320.0;
          for (let i = 0; i <= orbitPointsCount; i++) {
            const angle = (i / orbitPointsCount) * Math.PI * 2;
            const oLon = uav.location.lon + Math.cos(angle) * orbitRadiusDeg;
            const oLat = uav.location.lat + Math.sin(angle) * orbitRadiusDeg * Math.cos(Cesium.Math.toRadians(uav.location.lat));
            orbitPositions.push(Cesium.Cartesian3.fromDegrees(oLon, oLat, uavAlt));
          }

          addTacticalEntity({
            id: `${uav.id}-orbit`,
            name: `Trayectoria de Vuelo UAV: ${uav.id}`,
            polyline: {
              positions: orbitPositions,
              width: 2,
              material: new Cesium.PolylineDashMaterialProperty({
                color: Cesium.Color.CYAN.withAlpha(0.6)
              }),
              clampToGround: false
            }
          });

          // Volumetric camera frustum projection
          const dLon = 0.003;
          const dLat = 0.002;
          const c1 = Cesium.Cartesian3.fromDegrees(uav.location.lon - dLon, uav.location.lat - dLat);
          const c2 = Cesium.Cartesian3.fromDegrees(uav.location.lon + dLon, uav.location.lat - dLat);
          const c3 = Cesium.Cartesian3.fromDegrees(uav.location.lon + dLon, uav.location.lat + dLat);
          const c4 = Cesium.Cartesian3.fromDegrees(uav.location.lon - dLon, uav.location.lat + dLat);

          addTacticalEntity({
            id: `${uav.id}-footprint`,
            name: `Área del Sensor UAV: ${uav.id}`,
            polygon: {
              hierarchy: new Cesium.PolygonHierarchy([c1, c2, c3, c4]),
              material: Cesium.Color.CYAN.withAlpha(0.18),
              heightReference: Cesium.HeightReference.CLAMP_TO_GROUND
            }
          });

          const corners = [c1, c2, c3, c4];
          corners.forEach((corner, idx) => {
            addTacticalEntity({
              id: `${uav.id}-frustum-line-${idx}`,
              polyline: {
                positions: [uavPos, corner],
                width: 1.5,
                material: Cesium.Color.CYAN.withAlpha(0.3),
                clampToGround: false
              }
            });
          });
        });
      }
    });
    }

    // 4. Render Intelligence Reports
    if (showIntelligenceLayer) intelligenceReports.forEach((report, idx) => {
      const isHostile = report.type === 'OSINT' || report.details.toLowerCase().includes('enemigo') || report.details.toLowerCase().includes('hostil');
      const sidc = isHostile ? 'SHGPU----------' : 'SNGPU----------';

      const symbol = new ms.Symbol(sidc, {
        size: 35,
        outlineColor: 'white',
        outlineWidth: 4,
        uniqueDesignation: 'INTEL'
      });
      const canvas = symbol.asCanvas();
      const iconUrl = canvas.toDataURL();

      addTacticalEntity({
        id: `intel-3d-${idx}`,
        name: report.title,
        position: Cesium.Cartesian3.fromDegrees(report.location.lon, report.location.lat),
        properties: new Cesium.PropertyBag({
          tooltipTitle: `Inteligencia: ${report.title}`,
          tooltipDetails: [
             `Tipo: ${report.type}`,
             `Fiabilidad: ${report.reliability}`
          ]
        }),
        billboard: {
          image: iconUrl,
          width: 28,
          height: 28,
          heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
          horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
          verticalOrigin: Cesium.VerticalOrigin.CENTER,
          scaleByDistance: symbolScaleByDistance,
          disableDepthTestDistance: Number.POSITIVE_INFINITY
        },
        label: {
          text: `Intel: ${report.type}`,
          font: '10px sans-serif',
          fillColor: Cesium.Color.YELLOW,
          outlineColor: Cesium.Color.BLACK,
          outlineWidth: 2,
          verticalOrigin: Cesium.VerticalOrigin.TOP,
          scaleByDistance: labelScaleByDistance,
          pixelOffset: new Cesium.Cartesian2(0, 22),
          heightReference: Cesium.HeightReference.CLAMP_TO_GROUND
        }
      });
    });

    // 5. Render Artillery Pieces
    artilleryPieces.forEach(piece => {
      if (!piece || !piece.location) return;
      const isSelected = selectedEntity?.type === MapEntityType.ARTILLERY && selectedEntity.id === piece.id;
      const typeDetails = ARTILLERY_TYPE_DETAILS[piece.type];
      const sidcFunctionId = typeDetails ? typeDetails.sidcFunctionId : 'E-F-A';
      const sidc = `S${SIDC_AFFILIATION_FRIEND}${SIDC_DIMENSION_GROUND}${SIDC_STATUS_PRESENT}${sidcFunctionId}-A---`;
      
      const symbol = new ms.Symbol(sidc, {
        size: isSelected ? 45 : 35,
        outlineColor: 'white',
        outlineWidth: isSelected ? 6 : 4
      });
      const canvas = symbol.asCanvas();
      const iconUrl = canvas.toDataURL();

      addTacticalEntity({
        id: piece.id,
        name: piece.name,
        position: Cesium.Cartesian3.fromDegrees(piece.location.lon, piece.location.lat),
        properties: new Cesium.PropertyBag({
          tooltipTitle: `Artillería: ${piece.name}`,
          tooltipDetails: [
             `Tipo: ${piece.type}`,
             `Munición: ${piece.ammunition.reduce((sum, a) => sum + a.quantity, 0)} proyectiles`,
             `Estado: ${piece.status}`
          ]
        }),
        billboard: {
          image: iconUrl,
          heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
          horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
          verticalOrigin: Cesium.VerticalOrigin.CENTER,
          scaleByDistance: symbolScaleByDistance,
          disableDepthTestDistance: Number.POSITIVE_INFINITY
        },
        label: {
          text: piece.name,
          font: '10px system-ui, sans-serif',
          fillColor: Cesium.Color.WHITE,
          outlineColor: Cesium.Color.BLACK,
          outlineWidth: 2.5,
          verticalOrigin: Cesium.VerticalOrigin.TOP,
          scaleByDistance: labelScaleByDistance,
          pixelOffset: new Cesium.Cartesian2(0, 22),
          heightReference: Cesium.HeightReference.CLAMP_TO_GROUND
        }
      });

      if (isSelected) {
        addTacticalEntity({
          id: `${piece.id}-max-range`,
          name: `Rango Máximo: ${(piece.maxRange / 1000).toFixed(1)} km`,
          position: Cesium.Cartesian3.fromDegrees(piece.location.lon, piece.location.lat),
          ellipse: {
            semiMajorAxis: piece.maxRange,
            semiMinorAxis: piece.maxRange,
            material: Cesium.Color.fromCssColorString('#facc15').withAlpha(0.08),
            outline: true,
            outlineColor: Cesium.Color.fromCssColorString('#facc15'),
            outlineWidth: 2,
            heightReference: Cesium.HeightReference.CLAMP_TO_GROUND
          }
        });

        addTacticalEntity({
          id: `${piece.id}-min-range`,
          name: `Rango Mínimo: ${(piece.minRange / 1000).toFixed(1)} km`,
          position: Cesium.Cartesian3.fromDegrees(piece.location.lon, piece.location.lat),
          ellipse: {
            semiMajorAxis: piece.minRange,
            semiMinorAxis: piece.minRange,
            material: Cesium.Color.fromCssColorString('#f87171').withAlpha(0.12),
            outline: true,
            outlineColor: Cesium.Color.fromCssColorString('#f87171'),
            outlineWidth: 2,
            heightReference: Cesium.HeightReference.CLAMP_TO_GROUND
          }
        });

        const now = Date.now();
        addTacticalEntity({
          id: `${piece.id}-selection-pulse`,
          position: Cesium.Cartesian3.fromDegrees(piece.location.lon, piece.location.lat),
          ellipse: {
            semiMajorAxis: new Cesium.CallbackProperty(() => {
              const pulse = ((Date.now() - now) % 2000) / 2000;
              return 100.0 + pulse * 400.0;
            }, false),
            semiMinorAxis: new Cesium.CallbackProperty(() => {
              const pulse = ((Date.now() - now) % 2000) / 2000;
              return 100.0 + pulse * 400.0;
            }, false),
            material: Cesium.Color.WHITE.withAlpha(0.25),
            outline: true,
            outlineColor: Cesium.Color.WHITE,
            outlineWidth: 2,
            heightReference: Cesium.HeightReference.CLAMP_TO_GROUND
          }
        });
      }
    });

    // 6. Render Forward Observers
    forwardObservers.forEach(obs => {
      if (!obs || !obs.location) return;
      const isSelected = selectedEntity?.type === MapEntityType.FORWARD_OBSERVER && selectedEntity.id === obs.id;
      const sidc = `S${SIDC_AFFILIATION_FRIEND}${SIDC_DIMENSION_GROUND}${SIDC_STATUS_PRESENT}${SIDC_FORWARD_OBSERVER}-A---`;

      const symbol = new ms.Symbol(sidc, {
        size: isSelected ? 45 : 35,
        outlineColor: 'white',
        outlineWidth: isSelected ? 6 : 4
      });
      const canvas = symbol.asCanvas();
      const iconUrl = canvas.toDataURL();

      addTacticalEntity({
        id: obs.id,
        name: obs.callsign,
        position: Cesium.Cartesian3.fromDegrees(obs.location.lon, obs.location.lat),
        properties: new Cesium.PropertyBag({
          tooltipTitle: `Obs. Adelantado: ${obs.callsign}`,
          tooltipDetails: [`Estado: ${obs.status}`]
        }),
        billboard: {
          image: iconUrl,
          width: isSelected ? 30 : 25,
          height: isSelected ? 30 : 25,
          heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
          horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
          verticalOrigin: Cesium.VerticalOrigin.CENTER,
          scaleByDistance: symbolScaleByDistance,
          disableDepthTestDistance: Number.POSITIVE_INFINITY
        },
        label: {
          text: obs.callsign,
          font: '10px system-ui, sans-serif',
          fillColor: Cesium.Color.WHITE,
          outlineColor: Cesium.Color.BLACK,
          outlineWidth: 2.5,
          verticalOrigin: Cesium.VerticalOrigin.TOP,
          scaleByDistance: labelScaleByDistance,
          pixelOffset: new Cesium.Cartesian2(0, 22),
          heightReference: Cesium.HeightReference.CLAMP_TO_GROUND
        }
      });
    });

    // 7. Render Active Fire Missions (AFAT Trajectories & Target SIDC)
    activeFireMissions.forEach(mission => {
      const gun = artilleryPieces.find(p => p.id === mission.artilleryId);
      if (!gun || !gun.location || !mission.target) return;

      const targetSIDC = 'GHGPGP----';
      const targetSymbol = new ms.Symbol(targetSIDC, {
        size: 35,
        outlineColor: 'white',
        outlineWidth: 4
      });
      const targetCanvas = targetSymbol.asCanvas();
      const targetIconUrl = targetCanvas.toDataURL();

      addTacticalEntity({
        id: `target-${mission.id}`,
        name: `Blanco: ${mission.id}`,
        position: Cesium.Cartesian3.fromDegrees(mission.target.lon, mission.target.lat),
        properties: new Cesium.PropertyBag({
          tooltipTitle: `Blanco (Misión Fuego)`,
          tooltipDetails: [
             `Coordenadas: ${mission.target.lat.toFixed(4)}, ${mission.target.lon.toFixed(4)}`,
             `Estado: ${mission.status}`
          ]
        }),
        billboard: {
          image: targetIconUrl,
          heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
          horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
          verticalOrigin: Cesium.VerticalOrigin.CENTER,
          scaleByDistance: symbolScaleByDistance,
          disableDepthTestDistance: Number.POSITIVE_INFINITY
        },
        label: {
          text: `OBJ: MISIÓN FUEGO`,
          font: '9px bold sans-serif',
          fillColor: Cesium.Color.RED,
          outlineColor: Cesium.Color.BLACK,
          outlineWidth: 2,
          verticalOrigin: Cesium.VerticalOrigin.TOP,
          scaleByDistance: labelScaleByDistance,
          pixelOffset: new Cesium.Cartesian2(0, 30),
          heightReference: Cesium.HeightReference.CLAMP_TO_GROUND
        }
      });

      const gunPos = Cesium.Cartesian3.fromDegrees(gun.location.lon, gun.location.lat);
      const targetPos = Cesium.Cartesian3.fromDegrees(mission.target.lon, mission.target.lat);

      addTacticalEntity({
        id: `${mission.id}-link`,
        name: `Línea de Enlace de Fuego: ${gun.name}`,
        polyline: {
          positions: [gunPos, targetPos],
          width: 2,
          material: new Cesium.PolylineDashMaterialProperty({
            color: Cesium.Color.RED,
            dashLength: 15.0
          }),
          clampToGround: true
        }
      });

      const distance = Cesium.Cartesian3.distance(gunPos, targetPos);
      const H_max = distance * 0.25;
      const pointsCount = 40;
      const trajectoryPoints: Cesium.Cartesian3[] = [];

      for (let i = 0; i <= pointsCount; i++) {
        const f = i / pointsCount;
        const oLon = gun.location.lon + (mission.target.lon - gun.location.lon) * f;
        const oLat = gun.location.lat + (mission.target.lat - gun.location.lat) * f;
        const heightArc = H_max * 4.0 * f * (1.0 - f);
        const tHeight = viewer.scene.globe.getHeight(Cesium.Cartographic.fromDegrees(oLon, oLat)) || 0;
        trajectoryPoints.push(Cesium.Cartesian3.fromDegrees(oLon, oLat, tHeight + heightArc));
      }

      addTacticalEntity({
        id: `${mission.id}-trajectory`,
        name: `Trayectoria Balística 3D`,
        polyline: {
          positions: trajectoryPoints,
          width: 3.5,
          material: Cesium.Color.RED,
          clampToGround: false
        }
      });

      const startTime = Date.now();
      const flightDuration = 4000;
      addTacticalEntity({
        id: `${mission.id}-projectile`,
        name: `Proyectil en Vuelo`,
        position: new Cesium.CallbackProperty(() => {
          const elapsed = (Date.now() - startTime) % flightDuration;
          const f = elapsed / flightDuration;
          const oLon = gun.location.lon + (mission.target.lon - gun.location.lon) * f;
          const oLat = gun.location.lat + (mission.target.lat - gun.location.lat) * f;
          const heightArc = H_max * 4.0 * f * (1.0 - f);
          const tHeight = viewer.scene.globe.getHeight(Cesium.Cartographic.fromDegrees(oLon, oLat)) || 0;
          return Cesium.Cartesian3.fromDegrees(oLon, oLat, tHeight + heightArc);
        }, false) as any,
        point: {
          pixelSize: 8,
          color: Cesium.Color.YELLOW,
          outlineColor: Cesium.Color.RED,
          outlineWidth: 2
        }
      });

      forwardObservers.forEach(obs => {
        if (!obs || !obs.location) return;
        const obsPos = Cesium.Cartesian3.fromDegrees(obs.location.lon, obs.location.lat);
        const distanceToTarget = Cesium.Cartesian3.distance(obsPos, targetPos);
        if (distanceToTarget < 12000.0) {
          addTacticalEntity({
            id: `${mission.id}-obs-${obs.id}-link`,
            name: `Línea de Reporte Observador: ${obs.callsign}`,
            polyline: {
              positions: [obsPos, targetPos],
              width: 1.5,
              material: new Cesium.PolylineDashMaterialProperty({
                color: Cesium.Color.ORANGE,
                dashLength: 10.0
              }),
              clampToGround: true
            }
          });
        }
      });
    });

    // 8. Render Selected Unit Route History & Area of Operations
    if (selectedEntity && selectedEntity.type === MapEntityType.UNIT) {
      const unit = units.find(u => u.id === selectedEntity.id);
      if (unit) {
        if (unit.routeHistory && unit.routeHistory.length > 1) {
          const historyCoords = unit.routeHistory.map(pt => Cesium.Cartesian3.fromDegrees(pt.lon, pt.lat));
          addTacticalEntity({
            id: `${unit.id}-route-history-3d`,
            name: `Historial de Ruta: ${unit.name}`,
            polyline: {
              positions: historyCoords,
              width: 3,
              material: new Cesium.PolylineDashMaterialProperty({
                color: Cesium.Color.fromCssColorString('rgba(59, 130, 246, 0.7)')
              }),
              clampToGround: true
            }
          });
        }

        if (unit.areaOfOperations) {
          try {
            const parsedAo = typeof unit.areaOfOperations === 'string' ? JSON.parse(unit.areaOfOperations) : unit.areaOfOperations;
            if (parsedAo?.coordinates && parsedAo.coordinates.length > 0) {
              const aoCoords = parsedAo.coordinates[0].map((coord: any) => Cesium.Cartesian3.fromDegrees(coord[0], coord[1]));
              addTacticalEntity({
                id: `${unit.id}-ao-polygon-3d`,
                name: `Área de Operaciones: ${unit.name}`,
                polygon: {
                  hierarchy: new Cesium.PolygonHierarchy(aoCoords),
                  material: Cesium.Color.CYAN.withAlpha(0.18),
                  outline: true,
                  outlineColor: Cesium.Color.CYAN,
                  outlineWidth: 2,
                  heightReference: Cesium.HeightReference.CLAMP_TO_GROUND
                }
              });
            }
          } catch (e) {
            console.error("Error parsing areaOfOperations in 3D rendering:", e);
          }
        }
      }
    }

    // 9. Render Hotspots (BMA Critical Points)
    if (showHotspotsLayer) hotspots.forEach((hotspot, idx) => {
      if (!hotspot || !hotspot.center) return;
      const center = Cesium.Cartesian3.fromDegrees(hotspot.center.lon, hotspot.center.lat);
      const radius = hotspot.radius * 1000.0;
      
      addTacticalEntity({
        id: `hotspot-3d-${idx}`,
        name: `Punto Crítico BMA: ${hotspot.description}`,
        position: center,
        ellipse: {
          semiMajorAxis: radius,
          semiMinorAxis: radius,
          material: Cesium.Color.fromCssColorString('#7C3AED').withAlpha(0.15),
          outline: true,
          outlineColor: Cesium.Color.fromCssColorString('#8B5CF6'),
          outlineWidth: 2,
          heightReference: Cesium.HeightReference.CLAMP_TO_GROUND
        },
        label: {
          text: `BMA: ${hotspot.description}`,
          font: '9px bold sans-serif',
          fillColor: Cesium.Color.fromCssColorString('#E9D5FF'),
          outlineColor: Cesium.Color.BLACK,
          outlineWidth: 2,
          pixelOffset: new Cesium.Cartesian2(0, -10),
          heightReference: Cesium.HeightReference.CLAMP_TO_GROUND
        }
      });
    });

    // 10. Render Historical Hotspots
    if (showHistoricalHotspots) historicalHotspots.forEach((hotspot, idx) => {
      if (!hotspot || !hotspot.center) return;
      const center = Cesium.Cartesian3.fromDegrees(hotspot.center.lon, hotspot.center.lat);
      const radius = hotspot.radius * 1000.0;

      addTacticalEntity({
        id: `historical-hotspot-3d-${idx}`,
        name: `Histórico Hotspot: ${hotspot.description}`,
        position: center,
        ellipse: {
          semiMajorAxis: radius,
          semiMinorAxis: radius,
          material: Cesium.Color.fromCssColorString('#4B5563').withAlpha(0.1),
          outline: true,
          outlineColor: Cesium.Color.fromCssColorString('#6B7280'),
          outlineWidth: 1.5,
          heightReference: Cesium.HeightReference.CLAMP_TO_GROUND
        },
        label: {
          text: `HISTÓRICO: ${hotspot.description}`,
          font: '8px sans-serif',
          fillColor: Cesium.Color.fromCssColorString('#D1D5DB'),
          outlineColor: Cesium.Color.BLACK,
          outlineWidth: 2,
          pixelOffset: new Cesium.Cartesian2(0, -10),
          heightReference: Cesium.HeightReference.CLAMP_TO_GROUND
        }
      });
    });

    // 11. Render Defensoría del Pueblo SAT Early Warnings (Alertas Tempranas)
    if (showSatDefensoriaLayer) {
      const satAlerts = osintEvents.filter(o => {
        const type = (o.eventType || '').toUpperCase();
        const isSat = type.includes('ALERTA_TEMPRANA_SAT') || !!o.satMetadata;
        if (!isSat) return false;
        if (selectedSatYear && selectedSatYear !== 'TODOS') {
          const alertYear = o.satMetadata?.anioEmision || (o.eventTimestamp ? new Date(o.eventTimestamp).getFullYear().toString() : '');
          const matchCodeYear = o.satMetadata?.numeroAlerta?.endsWith(`-${selectedSatYear.slice(-2)}`);
          if (alertYear !== selectedSatYear && !matchCodeYear) {
            return false;
          }
        }
        return true;
      });

      satAlerts.forEach((osint) => {
        if (!osint.location || osint.location.lat === undefined || osint.location.lon === undefined) return;
        const isImminent = osint.satMetadata?.nivelRiesgo === 'INMINENTE' || (osint.eventType || '').includes('INMINENTE');
        const colorStr = isImminent ? '#DC2626' : '#EA580C';
        const color = Cesium.Color.fromCssColorString(colorStr);

        // Anillo de radio táctico (3.000m) que delimita el municipio / zona de riesgo humanitario
        addTacticalEntity({
          id: `sat-ring-3d-${osint.id}`,
          name: `Área de Influencia SAT: ${osint.title}`,
          position: Cesium.Cartesian3.fromDegrees(osint.location.lon, osint.location.lat),
          ellipse: {
            semiMajorAxis: 3000.0,
            semiMinorAxis: 3000.0,
            material: color.withAlpha(0.18),
            outline: true,
            outlineColor: color,
            outlineWidth: 2,
            heightReference: Cesium.HeightReference.CLAMP_TO_GROUND
          }
        });

        const tooltipDetails = osint.satMetadata ? [
          `Alerta SAT: ${osint.satMetadata.numeroAlerta || 'N/A'} (Riesgo ${osint.satMetadata.nivelRiesgo || 'ESTRUCTURAL'})`,
          `Municipio: ${osint.satMetadata.municipio || osint.locationName} (${osint.satMetadata.departamento || ''})`,
          `GAOs Involucrados: ${(osint.satMetadata.gaosInvolucrados || []).join(', ') || 'En Verificación'}`,
          `Riesgos: ${(osint.satMetadata.riesgosHumanitarios || []).join(', ')}`,
          osint.summary.substring(0, 140) + (osint.summary.length > 140 ? '...' : '')
        ] : [
          `Fuente: ${osint.sourceName}`,
          `Fiabilidad: ${(osint.confidenceScore * 100).toFixed(0)}%`,
          osint.summary.substring(0, 100) + (osint.summary.length > 100 ? '...' : '')
        ];

        addTacticalEntity({
          id: `osint-3d-${osint.id}`,
          name: `Defensoría SAT: ${osint.title}`,
          position: Cesium.Cartesian3.fromDegrees(osint.location.lon, osint.location.lat),
          point: {
            pixelSize: 14,
            color: color,
            outlineColor: Cesium.Color.WHITE,
            outlineWidth: 3,
            heightReference: Cesium.HeightReference.CLAMP_TO_GROUND
          },
          properties: {
            tooltipTitle: `Defensoría del Pueblo - SAT: ${osint.title}`,
            tooltipDetails: tooltipDetails
          },
          label: {
            text: `🛡️⚠️ ${osint.title}`,
            font: 'bold 11px system-ui, sans-serif',
            fillColor: Cesium.Color.WHITE,
            outlineColor: Cesium.Color.BLACK,
            outlineWidth: 3,
            pixelOffset: new Cesium.Cartesian2(0, -16),
            heightReference: Cesium.HeightReference.CLAMP_TO_GROUND
          }
        });
      });
    }

    // 11b. Render General OSINT News (no-SAT) if active
    if (osintLayerActive && showOsintLayer) {
      const generalOsint = osintEvents.filter(o => {
        const type = (o.eventType || '').toUpperCase();
        return !type.includes('ALERTA_TEMPRANA_SAT') && !o.satMetadata;
      });

      generalOsint.forEach((osint) => {
        if (!osint.location || osint.location.lat === undefined || osint.location.lon === undefined) return;

        let emoji = '📢';
        let colorStr = '#EC4899';
        const type = (osint.eventType || '').toUpperCase();

        if (type.includes('ATAQUE') || type.includes('EXPLOSIÓN')) {
          emoji = '💥';
          colorStr = '#DC2626';
        } else if (type.includes('PROTESTA') || type.includes('DISTURBIO')) {
          emoji = '🚩';
          colorStr = '#F97316';
        } else if (type.includes('MILITAR') || type.includes('DESPLIEGUE')) {
          emoji = '🎖️';
          colorStr = '#2563EB';
        } else if (type.includes('CRÍMEN') || type.includes('DELITO')) {
          emoji = '⚖️';
          colorStr = '#374151';
        }

        const color = Cesium.Color.fromCssColorString(colorStr);
        const tooltipDetails = [
          `Fuente: ${osint.sourceName}`,
          `Fiabilidad: ${(osint.confidenceScore * 100).toFixed(0)}%`,
          osint.verified ? '✓ VERIFICADO' : '⚠️ NO VERIFICADO',
          osint.summary.substring(0, 100) + (osint.summary.length > 100 ? '...' : '')
        ];

        addTacticalEntity({
          id: `osint-3d-${osint.id}`,
          name: `OSINT: ${osint.title}`,
          position: Cesium.Cartesian3.fromDegrees(osint.location.lon, osint.location.lat),
          point: {
            pixelSize: 10,
            color: color,
            outlineColor: Cesium.Color.WHITE,
            outlineWidth: 2,
            heightReference: Cesium.HeightReference.CLAMP_TO_GROUND
          },
          properties: {
            tooltipTitle: `OSINT: ${osint.title}`,
            tooltipDetails: tooltipDetails
          },
          label: {
            text: `${emoji} ${osint.title}`,
            font: '10px bold sans-serif',
            fillColor: Cesium.Color.WHITE,
            outlineColor: Cesium.Color.BLACK,
            outlineWidth: 2,
            pixelOffset: new Cesium.Cartesian2(0, -15),
            heightReference: Cesium.HeightReference.CLAMP_TO_GROUND
          }
        });
      });
    }

    // 11c. Red Hidrográfica Oficial de Colombia (92 Cuencas, Ríos Principales y Afluentes Navegables)
    if (showHydrographyLayer) {
      COLOMBIA_RIVER_NETWORKS.forEach((river) => {
        const isMain = river.type === 'RIO_PRINCIPAL';
        const color = isMain 
          ? Cesium.Color.fromCssColorString('#0284C7').withAlpha(0.92)  // Azul celeste brillante táctico
          : Cesium.Color.fromCssColorString('#38BDF8').withAlpha(0.85); // Azul afluente claro
        const polyWidth = isMain ? 4.5 : 2.5;

        river.paths.forEach((segment, segIdx) => {
          if (!segment || segment.length < 2) return;
          const positions = segment.map(([lon, lat]) => Cesium.Cartesian3.fromDegrees(lon, lat));

          addTacticalEntity({
            id: `river-3d-${river.id}-${segIdx}`,
            name: `${river.name} (Obstáculo Natural / Corredor Fluvial)`,
            properties: new Cesium.PropertyBag({
              tooltipTitle: river.name,
              tooltipDetails: [
                `Tipo: ${isMain ? 'Arteria Fluvial Principal' : 'Afluente / Cuenca Secundaria'}`,
                `Navegabilidad: ${river.navigable ? 'Navegable Militar' : 'Restringida / Vado'}`,
                `Profundidad Estimada: ~${river.depthMeters || 3}m`,
                'Doctrina: Obstáculo Natural de Agua (MTE 2-01.3)'
              ]
            }),
            polyline: {
              positions: positions,
              width: polyWidth,
              material: color,
              clampToGround: true
            }
          });

          // Etiqueta flotante identificadora en el tramo medio de cada río principal
          if (isMain && segIdx === Math.floor(river.paths.length / 2) && segment.length >= 4) {
            const midCoord = segment[Math.floor(segment.length / 2)];
            addTacticalEntity({
              id: `river-label-3d-${river.id}`,
              name: river.name,
              position: Cesium.Cartesian3.fromDegrees(midCoord[0], midCoord[1]),
              label: {
                text: `🌊 ${river.name}`,
                font: 'bold 11px system-ui, sans-serif',
                fillColor: Cesium.Color.WHITE,
                outlineColor: Cesium.Color.fromCssColorString('#0369A1'),
                outlineWidth: 3,
                showBackground: true,
                backgroundColor: Cesium.Color.fromCssColorString('#0C4A6E').withAlpha(0.75),
                backgroundPadding: new Cesium.Cartesian2(5, 3),
                pixelOffset: new Cesium.Cartesian2(0, -12),
                heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
                distanceDisplayCondition: new Cesium.DistanceDisplayCondition(100.0, 1500000.0)
              }
            });
          }
        });
      });
    }

    // 12. Render Loaded PICC operational graphics
    if (showPiccGraphicsLayer) {
      loadedPiccGraphics.forEach(graphic => {
      try {
        const geoJson = JSON.parse(graphic.geoJson);
        const type = graphic.graphicType as PICCElementType;
        const colorHex = geoJson.properties?.style?.color || '#0000FF';
        const color = Cesium.Color.fromCssColorString(colorHex);

        if (geoJson.geometry.type === 'Point') {
          const coords = geoJson.geometry.coordinates;
          const sidc = getPICCElementSIDC(type);
          const symbol = new ms.Symbol(sidc, { size: DEFAULT_PICC_SYMBOL_SIZE > 30 ? DEFAULT_PICC_SYMBOL_SIZE : 40, outlineColor: 'white', outlineWidth: 4 });
          const canvas = symbol.asCanvas();
          const iconUrl = canvas.toDataURL();

          addTacticalEntity({
            id: `picc-3d-${graphic.id}`,
            name: `PICC: ${graphic.label || type}`,
            position: Cesium.Cartesian3.fromDegrees(coords[0], coords[1]),
            properties: new Cesium.PropertyBag({
              tooltipTitle: `Elemento PICC`,
              tooltipDetails: [`Tipo: ${type}`, graphic.label ? `Etiqueta: ${graphic.label}` : '']
            }),
            billboard: {
              image: iconUrl,
              heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
              horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
              verticalOrigin: Cesium.VerticalOrigin.CENTER,
          scaleByDistance: symbolScaleByDistance,
              disableDepthTestDistance: Number.POSITIVE_INFINITY
            },
            label: graphic.label ? {
              text: graphic.label,
              font: '10px bold sans-serif',
              fillColor: Cesium.Color.WHITE,
              outlineColor: Cesium.Color.BLACK,
              outlineWidth: 2,
              pixelOffset: new Cesium.Cartesian2(0, -(DEFAULT_PICC_SYMBOL_SIZE / 2) - 4),
              heightReference: Cesium.HeightReference.CLAMP_TO_GROUND
            } : undefined
          });
        } else if (geoJson.geometry.type === 'LineString') {
          const coords = geoJson.geometry.coordinates;
          const positions = coords.map((c: any) => Cesium.Cartesian3.fromDegrees(c[0], c[1]));

          const isAttackAxis = [
            PICCElementType.FRIENDLY_MAIN_ATTACK_AXIS,
            PICCElementType.FRIENDLY_SUPPORTING_ATTACK_AXIS,
            PICCElementType.ENEMY_COA_AXIS
          ].includes(type);

          const isDashed = type === PICCElementType.CONTROL_PHASE_LINE;

          const polylineConfig: any = {
            positions: positions,
            clampToGround: true
          };

          if (isAttackAxis) {
            polylineConfig.width = 15.0;
            polylineConfig.material = new Cesium.PolylineArrowMaterialProperty(color);
          } else {
            polylineConfig.width = 3.0;
            if (isDashed) {
              polylineConfig.material = new Cesium.PolylineDashMaterialProperty({
                color: color
              });
            } else {
              polylineConfig.material = color;
            }
          }

          addTacticalEntity({
            id: `picc-3d-${graphic.id}`,
            name: `PICC: ${graphic.label || type}`,
            polyline: polylineConfig
          });

          if (type === PICCElementType.CONTROL_PHASE_LINE && positions.length >= 2) {
            const startPt = positions[0];
            const endPt = positions[positions.length - 1];
            const labelText = graphic.label || 'LF';

            addTacticalEntity({
              id: `picc-3d-${graphic.id}-start-label`,
              position: startPt,
              label: {
                text: labelText,
                font: '10px bold sans-serif',
                fillColor: Cesium.Color.WHITE,
                backgroundColor: color,
                showBackground: true,
                backgroundPadding: new Cesium.Cartesian2(4, 2),
                heightReference: Cesium.HeightReference.CLAMP_TO_GROUND
              }
            });

            addTacticalEntity({
              id: `picc-3d-${graphic.id}-end-label`,
              position: endPt,
              label: {
                text: labelText,
                font: '10px bold sans-serif',
                fillColor: Cesium.Color.WHITE,
                backgroundColor: color,
                showBackground: true,
                backgroundPadding: new Cesium.Cartesian2(4, 2),
                heightReference: Cesium.HeightReference.CLAMP_TO_GROUND
              }
            });
          } else if (graphic.label && positions.length >= 2) {
            const midpoint = Cesium.Cartesian3.lerp(positions[0], positions[positions.length - 1], 0.5, new Cesium.Cartesian3());
            addTacticalEntity({
              id: `picc-3d-${graphic.id}-label`,
              position: midpoint,
              label: {
                text: graphic.label,
                font: '10px bold sans-serif',
                fillColor: Cesium.Color.WHITE,
                outlineColor: Cesium.Color.BLACK,
                outlineWidth: 2,
                heightReference: Cesium.HeightReference.CLAMP_TO_GROUND
              }
            });
          }
        } else if (geoJson.geometry.type === 'Polygon') {
          const coords = geoJson.geometry.coordinates[0];
          const positions = coords.map((c: any) => Cesium.Cartesian3.fromDegrees(c[0], c[1]));

          addTacticalEntity({
            id: `picc-3d-${graphic.id}`,
            name: `PICC: ${graphic.label || type}`,
            polygon: {
              hierarchy: new Cesium.PolygonHierarchy(positions),
              material: color.withAlpha(0.2),
              outline: true,
              outlineColor: color,
              outlineWidth: 2,
              heightReference: Cesium.HeightReference.CLAMP_TO_GROUND
            }
          });

          if (type === PICCElementType.FRIENDLY_ASSEMBLY_AREA) {
            addTacticalEntity({
              id: `picc-3d-${graphic.id}-dashed-outline`,
              polyline: {
                positions: [...positions, positions[0]],
                width: 2.0,
                material: new Cesium.PolylineDashMaterialProperty({
                  color: color
                }),
                clampToGround: true
              }
            });
          }

          if (graphic.label && positions.length >= 3) {
            const midpoint = Cesium.Cartesian3.lerp(positions[0], positions[Math.floor(positions.length / 2)], 0.5, new Cesium.Cartesian3());
            addTacticalEntity({
              id: `picc-3d-${graphic.id}-label`,
              position: midpoint,
              label: {
                text: type === PICCElementType.FRIENDLY_OBJECTIVE ? `OBJ ${graphic.label}` : type === PICCElementType.FRIENDLY_ASSEMBLY_AREA ? `AR ${graphic.label}` : graphic.label,
                font: '10px bold sans-serif',
                fillColor: Cesium.Color.WHITE,
                outlineColor: Cesium.Color.BLACK,
                outlineWidth: 2,
                heightReference: Cesium.HeightReference.CLAMP_TO_GROUND
              }
            });
          }
        }
      } catch (err) {
        console.error("Error drawing PICC graphic in 3D:", err, graphic);
      }
    });
    }

    // 13. Render Course of Action (COA) Plans
    if (showS2COALayer && currentCOAPlan) {
      currentCOAPlan.phases.forEach((phase, phaseIdx) => {
        const phaseColorHex = PHASE_COLORS[phaseIdx % PHASE_COLORS.length];
        const phaseColor = Cesium.Color.fromCssColorString(phaseColorHex);

        phase.graphics.forEach((graphic, graphicIdx) => {
          if (!graphic.locations || !Array.isArray(graphic.locations) || graphic.locations.length === 0) return;

          const positions = graphic.locations.map((loc: any) => {
            if (Array.isArray(loc) && loc.length >= 2) {
              const c0 = typeof loc[0] === 'number' ? loc[0] : parseFloat(loc[0]);
              const c1 = typeof loc[1] === 'number' ? loc[1] : parseFloat(loc[1]);
              if (isNaN(c0) || isNaN(c1)) return null;
              let lon: number;
              let lat: number;
              if (c0 < -20 || Math.abs(c0) > 20) {
                lon = c0;
                lat = c1;
              } else if (c1 < -20 || Math.abs(c1) > 20) {
                lon = c1;
                lat = c0;
              } else {
                lat = c0;
                lon = c1;
              }
              return Cesium.Cartesian3.fromDegrees(Number(lon), Number(lat));
            }
            if (loc && typeof loc === 'object') {
              let rawLon = loc.lon ?? loc.lng ?? loc.longitude;
              let rawLat = loc.lat ?? loc.latitude ?? loc.lati ?? loc.latitud;
              if (rawLon === undefined || rawLat === undefined) return null;
              let lon = typeof rawLon === 'number' ? rawLon : parseFloat(rawLon);
              let lat = typeof rawLat === 'number' ? rawLat : parseFloat(rawLat);
              if (isNaN(lon) || isNaN(lat)) return null;
              if (lat < -20 && lon > -20) {
                const tmp = lat;
                lat = lon;
                lon = tmp;
              }
              return Cesium.Cartesian3.fromDegrees(Number(lon), Number(lat));
            }
            return null;
          }).filter((pos): pos is Cesium.Cartesian3 => pos !== null);
          const id = `coa-3d-${currentCOAPlan.planName}-${phaseIdx}-${graphicIdx}`;

          switch (graphic.type) {
            case COAGraphicType.PHASE_LINE:
              if (positions.length >= 2) {
                addTacticalEntity({
                  id: id,
                  name: `Línea de Fase: ${graphic.label}`,
                  polyline: {
                    positions: positions,
                    width: 3.0,
                    material: new Cesium.PolylineDashMaterialProperty({
                      color: phaseColor
                    }),
                    clampToGround: true
                  }
                });

                addTacticalEntity({
                  id: `${id}-start-lbl`,
                  position: positions[0],
                  label: {
                    text: graphic.label,
                    font: '11px bold sans-serif',
                    fillColor: Cesium.Color.WHITE,
                    backgroundColor: phaseColor,
                    showBackground: true,
                    backgroundPadding: new Cesium.Cartesian2(4, 2),
                    heightReference: Cesium.HeightReference.CLAMP_TO_GROUND
                  }
                });

                addTacticalEntity({
                  id: `${id}-end-lbl`,
                  position: positions[positions.length - 1],
                  label: {
                    text: graphic.label,
                    font: '11px bold sans-serif',
                    fillColor: Cesium.Color.WHITE,
                    backgroundColor: phaseColor,
                    showBackground: true,
                    backgroundPadding: new Cesium.Cartesian2(4, 2),
                    heightReference: Cesium.HeightReference.CLAMP_TO_GROUND
                  }
                });
              }
              break;

            case COAGraphicType.AXIS_OF_ADVANCE:
              if (positions.length >= 2) {
                addTacticalEntity({
                  id: id,
                  name: `Eje de Avance: ${graphic.label}`,
                  polyline: {
                    positions: positions,
                    width: 15.0,
                    material: new Cesium.PolylineArrowMaterialProperty(phaseColor),
                    clampToGround: true
                  }
                });

                const mid = Cesium.Cartesian3.lerp(positions[0], positions[positions.length - 1], 0.5, new Cesium.Cartesian3());
                addTacticalEntity({
                  id: `${id}-lbl`,
                  position: mid,
                  label: {
                    text: graphic.label,
                    font: '10px bold sans-serif',
                    fillColor: phaseColor,
                    outlineColor: Cesium.Color.BLACK,
                    outlineWidth: 2,
                    heightReference: Cesium.HeightReference.CLAMP_TO_GROUND
                  }
                });
              }
              break;

            case COAGraphicType.OBJECTIVE:
              if (positions.length === 1 || positions.length === 2) {
                const center = positions.length === 2 ? Cesium.Cartesian3.lerp(positions[0], positions[1], 0.5, new Cesium.Cartesian3()) : positions[0];
                addTacticalEntity({
                  id: id,
                  name: `OBJ ${graphic.label}`,
                  position: center,
                  ellipse: {
                    semiMajorAxis: 500.0,
                    semiMinorAxis: 500.0,
                    material: phaseColor.withAlpha(0.3),
                    outline: true,
                    outlineColor: phaseColor,
                    outlineWidth: 2,
                    heightReference: Cesium.HeightReference.CLAMP_TO_GROUND
                  },
                  label: {
                    text: `OBJ ${graphic.label}`,
                    font: 'bold 11px sans-serif',
                    fillColor: phaseColor,
                    outlineColor: Cesium.Color.BLACK,
                    outlineWidth: 2.5,
                    pixelOffset: new Cesium.Cartesian2(0, -10),
                    heightReference: Cesium.HeightReference.CLAMP_TO_GROUND
                  }
                });
              } else if (positions.length > 2) {
                addTacticalEntity({
                  id: id,
                  name: `OBJ ${graphic.label}`,
                  polygon: {
                    hierarchy: new Cesium.PolygonHierarchy(positions),
                    material: phaseColor.withAlpha(0.2),
                    outline: true,
                    outlineColor: phaseColor,
                    outlineWidth: 2,
                    heightReference: Cesium.HeightReference.CLAMP_TO_GROUND
                  }
                });

                const centerApprox = Cesium.Cartesian3.lerp(positions[0], positions[Math.floor(positions.length / 2)], 0.5, new Cesium.Cartesian3());
                addTacticalEntity({
                  id: `${id}-lbl`,
                  position: centerApprox,
                  label: {
                    text: `OBJ ${graphic.label}`,
                    font: 'bold 11px sans-serif',
                    fillColor: phaseColor,
                    outlineColor: Cesium.Color.BLACK,
                    outlineWidth: 2.5,
                    heightReference: Cesium.HeightReference.CLAMP_TO_GROUND
                  }
                });
              }
              break;

            case COAGraphicType.ASSEMBLY_AREA:
              if (positions.length >= 3) {
                addTacticalEntity({
                  id: id,
                  name: `AR ${graphic.label}`,
                  polygon: {
                    hierarchy: new Cesium.PolygonHierarchy(positions),
                    material: phaseColor.withAlpha(0.15),
                    outline: true,
                    outlineColor: phaseColor,
                    outlineWidth: 2,
                    heightReference: Cesium.HeightReference.CLAMP_TO_GROUND
                  }
                });

                addTacticalEntity({
                  id: `${id}-dashed-outline`,
                  polyline: {
                    positions: [...positions, positions[0]],
                    width: 2.0,
                    material: new Cesium.PolylineDashMaterialProperty({
                      color: phaseColor
                    }),
                    clampToGround: true
                  }
                });

                const centerApprox = Cesium.Cartesian3.lerp(positions[0], positions[Math.floor(positions.length / 2)], 0.5, new Cesium.Cartesian3());
                addTacticalEntity({
                  id: `${id}-lbl`,
                  position: centerApprox,
                  label: {
                    text: `AR ${graphic.label}`,
                    font: 'bold 11px sans-serif',
                    fillColor: phaseColor,
                    outlineColor: Cesium.Color.BLACK,
                    outlineWidth: 2.5,
                    heightReference: Cesium.HeightReference.CLAMP_TO_GROUND
                  }
                });
              } else if (positions.length === 1 || positions.length === 2) {
                const center = positions.length === 2 ? Cesium.Cartesian3.lerp(positions[0], positions[1], 0.5, new Cesium.Cartesian3()) : positions[0];
                addTacticalEntity({
                  id: id,
                  name: `AR ${graphic.label}`,
                  position: center,
                  ellipse: {
                    semiMajorAxis: 600.0,
                    semiMinorAxis: 600.0,
                    material: phaseColor.withAlpha(0.2),
                    outline: true,
                    outlineColor: phaseColor,
                    outlineWidth: 2,
                    heightReference: Cesium.HeightReference.CLAMP_TO_GROUND
                  },
                  label: {
                    text: `AR ${graphic.label}`,
                    font: 'bold 11px sans-serif',
                    fillColor: phaseColor,
                    outlineColor: Cesium.Color.BLACK,
                    outlineWidth: 2.5,
                    pixelOffset: new Cesium.Cartesian2(0, -10),
                    heightReference: Cesium.HeightReference.CLAMP_TO_GROUND
                  }
                });
              }
              break;

            case COAGraphicType.BOUNDARY:
              if (positions.length >= 2) {
                addTacticalEntity({
                  id: id,
                  name: `Límite de Sector: ${graphic.label}`,
                  polyline: {
                    positions: positions,
                    width: 4.0,
                    material: new Cesium.PolylineOutlineMaterialProperty({
                      color: Cesium.Color.BLACK,
                      outlineWidth: 2,
                      outlineColor: phaseColor
                    }),
                    clampToGround: true
                  }
                });

                const midBoundary = Cesium.Cartesian3.lerp(positions[0], positions[Math.floor(positions.length / 2)], 0.5, new Cesium.Cartesian3());
                addTacticalEntity({
                  id: `${id}-lbl`,
                  position: midBoundary,
                  label: {
                    text: `Límite: ${graphic.label}`,
                    font: 'bold 10px sans-serif',
                    fillColor: Cesium.Color.WHITE,
                    backgroundColor: Cesium.Color.BLACK.withAlpha(0.7),
                    showBackground: true,
                    backgroundPadding: new Cesium.Cartesian2(4, 2),
                    heightReference: Cesium.HeightReference.CLAMP_TO_GROUND
                  }
                });
              }
              break;

            case COAGraphicType.CHECKPOINT:
              if (positions.length >= 1) {
                addTacticalEntity({
                  id: id,
                  name: `Punto de Control: ${graphic.label}`,
                  position: positions[0],
                  point: {
                    pixelSize: 12,
                    color: Cesium.Color.YELLOW,
                    outlineColor: phaseColor,
                    outlineWidth: 3,
                    heightReference: Cesium.HeightReference.CLAMP_TO_GROUND
                  },
                  label: {
                    text: `PC ${graphic.label}`,
                    font: 'bold 11px sans-serif',
                    fillColor: Cesium.Color.WHITE,
                    backgroundColor: phaseColor,
                    showBackground: true,
                    backgroundPadding: new Cesium.Cartesian2(4, 2),
                    pixelOffset: new Cesium.Cartesian2(0, -15),
                    heightReference: Cesium.HeightReference.CLAMP_TO_GROUND
                  }
                });
              }
              break;

            // Medidas de Control de Inteligencia MFRE 1-02.2 (Numeral 6.19)
            case COAGraphicType.INTEL_COORDINATION_LINE:
              if (positions.length >= 2) {
                addTacticalEntity({
                  id: id,
                  name: `Línea Coord. Intel (ICL): ${graphic.label}`,
                  polyline: {
                    positions: positions,
                    width: 3.5,
                    material: new Cesium.PolylineDashMaterialProperty({
                      color: Cesium.Color.MAGENTA,
                      dashLength: 16.0
                    }),
                    clampToGround: true
                  }
                });
                const midICL = Cesium.Cartesian3.lerp(positions[0], positions[Math.floor(positions.length / 2)], 0.5, new Cesium.Cartesian3());
                addTacticalEntity({
                  id: `${id}-lbl`,
                  position: midICL,
                  label: {
                    text: `ICL ${graphic.label}`,
                    font: 'bold 10px monospace',
                    fillColor: Cesium.Color.WHITE,
                    backgroundColor: Cesium.Color.PURPLE,
                    showBackground: true,
                    backgroundPadding: new Cesium.Cartesian2(4, 2),
                    heightReference: Cesium.HeightReference.CLAMP_TO_GROUND
                  }
                });
              }
              break;

            case COAGraphicType.NAMED_AREA_OF_INTEREST:
              if (positions.length >= 1) {
                const pos = positions[0];
                addTacticalEntity({
                  id: id,
                  name: `Área Nombrada de Interés (ANI): ${graphic.label}`,
                  position: pos,
                  ellipse: {
                    semiMajorAxis: 350.0,
                    semiMinorAxis: 350.0,
                    material: Cesium.Color.PURPLE.withAlpha(0.25),
                    outline: true,
                    outlineColor: Cesium.Color.PURPLE,
                    outlineWidth: 2,
                    heightReference: Cesium.HeightReference.CLAMP_TO_GROUND
                  },
                  label: {
                    text: `ANI: ${graphic.label}`,
                    font: 'bold 11px sans-serif',
                    fillColor: Cesium.Color.WHITE,
                    backgroundColor: Cesium.Color.PURPLE,
                    showBackground: true,
                    backgroundPadding: new Cesium.Cartesian2(3, 2),
                    pixelOffset: new Cesium.Cartesian2(0, -12),
                    heightReference: Cesium.HeightReference.CLAMP_TO_GROUND
                  }
                });
              }
              break;

            case COAGraphicType.TARGET_AREA_OF_INTEREST:
              if (positions.length >= 1) {
                const pos = positions[0];
                addTacticalEntity({
                  id: id,
                  name: `Área Blanco de Interés (ABI): ${graphic.label}`,
                  position: pos,
                  ellipse: {
                    semiMajorAxis: 400.0,
                    semiMinorAxis: 400.0,
                    material: Cesium.Color.DARKRED.withAlpha(0.3),
                    outline: true,
                    outlineColor: Cesium.Color.RED,
                    outlineWidth: 2.5,
                    heightReference: Cesium.HeightReference.CLAMP_TO_GROUND
                  },
                  label: {
                    text: `ABI: ${graphic.label}`,
                    font: 'bold 11px sans-serif',
                    fillColor: Cesium.Color.WHITE,
                    backgroundColor: Cesium.Color.RED,
                    showBackground: true,
                    backgroundPadding: new Cesium.Cartesian2(3, 2),
                    pixelOffset: new Cesium.Cartesian2(0, -12),
                    heightReference: Cesium.HeightReference.CLAMP_TO_GROUND
                  }
                });
              }
              break;

            // Tareas Tácticas de la Misión MFRE 1-02.2 (Capítulo 7)
            case COAGraphicType.TASK_BLOCK:
            case COAGraphicType.TASK_CANALIZE:
            case COAGraphicType.TASK_ISOLATE:
            case COAGraphicType.TASK_DESTROY:
              if (positions.length >= 2) {
                const taskLabels: Record<string, string> = {
                  [COAGraphicType.TASK_BLOCK]: 'BLOQUEAR',
                  [COAGraphicType.TASK_CANALIZE]: 'CANALIZAR',
                  [COAGraphicType.TASK_ISOLATE]: 'AISLAR',
                  [COAGraphicType.TASK_DESTROY]: 'DESTRUIR',
                };
                const taskText = taskLabels[graphic.type] || 'TAREA TÁCTICA';
                addTacticalEntity({
                  id: id,
                  name: `${taskText}: ${graphic.label}`,
                  polyline: {
                    positions: positions,
                    width: 5.0,
                    material: new Cesium.PolylineArrowMaterialProperty(phaseColor),
                    clampToGround: true
                  }
                });
                const midTask = Cesium.Cartesian3.lerp(positions[0], positions[Math.floor(positions.length / 2)], 0.5, new Cesium.Cartesian3());
                addTacticalEntity({
                  id: `${id}-lbl`,
                  position: midTask,
                  label: {
                    text: `[${taskText}] ${graphic.label}`,
                    font: 'bold 10px sans-serif',
                    fillColor: Cesium.Color.WHITE,
                    backgroundColor: phaseColor,
                    showBackground: true,
                    backgroundPadding: new Cesium.Cartesian2(4, 2),
                    heightReference: Cesium.HeightReference.CLAMP_TO_GROUND
                  }
                });
              }
              break;
          }
        });
      });
    }
  }, [
    units,
    intelligenceReports,
    selectedEntity,
    artilleryPieces,
    forwardObservers,
    activeFireMissions,
    hotspots,
    historicalHotspots,
    osintEvents,
    osintLayerActive,
    showSatDefensoriaLayer,
    selectedSatYear,
    showS2COALayer,
    showPiccGraphicsLayer,
    showUnitsLayer,
    showHydrographyLayer,
    showRoadsLayer,
    showCmocTransitLayer,
    showIntelligenceLayer,
    showHotspotsLayer,
    showHistoricalHotspots,
    showOsintLayer,
    loadedPiccGraphics,
    currentCOAPlan,
    selectedUnitForDome,
    coverageDomeActive
  ]);

  // Dedicated, optimized effect for Histórico Factores de Inestabilidad BR23 with native clustering and WebGL safety cap
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer || viewer.isDestroyed()) return;

    // Clean previous datasource and any cluster primitives safely
    if (historicoDataSourceRef.current && viewer.dataSources.contains(historicoDataSourceRef.current)) {
      viewer.dataSources.remove(historicoDataSourceRef.current, true);
      historicoDataSourceRef.current = null;
    }

    if (!showHistoricoBr23Layer || historicoEvents.length === 0) {
      viewer.scene.requestRender();
      return;
    }

    const filteredHistorico = historicoEvents.filter(h => {
      if (selectedHistoricoAff !== 'TODOS' && h.aff !== selectedHistoricoAff) return false;
      if (selectedHistoricoYear !== 'TODOS' && (h.year || h.date?.slice(0, 4)) !== selectedHistoricoYear) return false;
      if (selectedHistoricoStructure !== 'TODOS' && h.groupClean !== selectedHistoricoStructure) return false;
      if (selectedHistoricoCategory !== 'TODOS' && h.category !== selectedHistoricoCategory) return false;
      return true;
    });

    if (filteredHistorico.length === 0) {
      viewer.scene.requestRender();
      return;
    }

    const historicoDataSource = new Cesium.CustomDataSource('historico-br23');
    historicoDataSourceRef.current = historicoDataSource;

    // Enable native Cesium clustering to prevent WebGL GPU stalls
    historicoDataSource.clustering.enabled = true;
    historicoDataSource.clustering.pixelRange = 35;
    historicoDataSource.clustering.minimumClusterSize = 3;
    historicoDataSource.clustering.clusterEvent.addEventListener((clusteredEntities, cluster) => {
      cluster.label.show = true;
      cluster.label.text = `🔴 ${clusteredEntities.length.toLocaleString()}`;
      cluster.label.font = 'bold 12px system-ui, sans-serif';
      cluster.label.fillColor = Cesium.Color.WHITE;
      cluster.label.style = Cesium.LabelStyle.FILL_AND_OUTLINE;
      cluster.label.outlineWidth = 3;
      cluster.label.outlineColor = Cesium.Color.BLACK;
      cluster.label.horizontalOrigin = Cesium.HorizontalOrigin.CENTER;
      cluster.label.verticalOrigin = Cesium.VerticalOrigin.CENTER;
      cluster.label.disableDepthTestDistance = Number.POSITIVE_INFINITY;

      cluster.billboard.show = false;
      cluster.point.show = true;
      cluster.point.color = Cesium.Color.fromCssColorString('rgba(220, 38, 38, 0.90)');
      cluster.point.pixelSize = Math.min(48, Math.max(26, 22 + Math.log2(clusteredEntities.length) * 3));
      cluster.point.outlineColor = Cesium.Color.WHITE;
      cluster.point.outlineWidth = 2.5;
      cluster.point.disableDepthTestDistance = Number.POSITIVE_INFINITY;

      cluster.point.id = clusteredEntities;
      cluster.label.id = clusteredEntities;
    });

    // Grouping by unique coordinates to eliminate duplicate overlapping entities
    const coordEventMap = new Map<string, typeof filteredHistorico>();
    filteredHistorico.forEach((ev) => {
      if (!ev.lat || !ev.lon) return;
      const key = `${Number(ev.lat).toFixed(5)},${Number(ev.lon).toFixed(5)}`;
      const list = coordEventMap.get(key);
      if (list) {
        list.push(ev);
      } else {
        coordEventMap.set(key, [ev]);
      }
    });

    // WebGL Safety Cap (if 'TODOS' is chosen with ~18,997 events, cap to 3,500 representative points)
    const MAX_POINTS_TO_RENDER = 3500;
    let entries = Array.from(coordEventMap.entries());
    if (entries.length > MAX_POINTS_TO_RENDER) {
      console.warn(`[Historico] Dataset excede límite seguro de WebGL (${entries.length} coords). Aplicando muestreo seguro de ${MAX_POINTS_TO_RENDER} puntos.`);
      const priorityEntries: [string, typeof filteredHistorico][] = [];
      const regularEntries: [string, typeof filteredHistorico][] = [];
      entries.forEach(e => {
        const hasImportant = e[1].some(ev => ev.aff === 'CONTACTO' || (ev.category && (ev.category.includes('COMBATE') || ev.category.includes('EXPLOSIV'))));
        if (hasImportant) priorityEntries.push(e);
        else regularEntries.push(e);
      });
      const remainingSlots = Math.max(0, MAX_POINTS_TO_RENDER - priorityEntries.length);
      const step = Math.max(1, Math.floor(regularEntries.length / remainingSlots));
      const sampledRegular = regularEntries.filter((_, idx) => idx % step === 0).slice(0, remainingSlots);
      entries = [...priorityEntries, ...sampledRegular];
    }

    entries.forEach(([coordKey, eventsAtCoord]) => {
      const ev = eventsAtCoord[0];
      const count = eventsAtCoord.length;
      const isMulti = count > 1;

      // DOCTRINA MILITAR MTE 2-01.3 & STANAG 2019:
      // Toda actividad del enemigo / factores de inestabilidad es 100% HOSTIL (ROJO #DC2626).
      // Jamás se grafica en azul (amigo) ni amarillo (desconocido) en esta capa de amenazas.
      const colorStr = '#DC2626';

      const hasCombat = eventsAtCoord.some(e => e.aff === 'CONTACTO' || e.category?.includes('COMBATE'));
      const hasExplosive = eventsAtCoord.some(e => e.category && (e.category.includes('EXPLOSIV') || e.category.includes('TERRORIS')));
      const hasDepot = eventsAtCoord.some(e => e.category && (e.category.includes('DEPÓSITO') || e.category.includes('CALETA') || e.category.includes('DEPOSITO')));

      // Generar símbolo táctico vectorial OTAN estándar con milsymbol (MIL-STD-2525)
      const primaryCat = hasCombat ? 'COMBATES' : (hasExplosive ? 'EXPLOSIVOS' : (hasDepot ? 'DEPÓSITO' : (ev.category || '')));
      const sidc = getHistoricoSIDC(primaryCat, ev.aff);
      const iconUrl = getHistoricoSymbolUrl(sidc);

      const color = Cesium.Color.fromCssColorString(colorStr);

      let tooltipTitle = '';
      let tooltipDetails: string[] = [];

      if (isMulti) {
        tooltipTitle = `Sector ${ev.mun || ev.place || 'Rural'}: ${count} Factores de Inestabilidad (Amenaza)`;
        tooltipDetails.push(`📍 Total Hechos Registrados en este Punto: ${count}`);
        tooltipDetails.push('🔴 Simbología Militar Doctrinal: Amenaza / Factor de Inestabilidad (MTE 2-01.3)');
        tooltipDetails.push(`Ubicación: ${ev.mun || ''} (${ev.dept || 'Nariño'})`);
        tooltipDetails.push('----------------------------------------');
        eventsAtCoord.slice(0, 10).forEach((item) => {
          const yr = item.date ? item.date.slice(0, 10) : 'S/F';
          const cat = item.category || 'Hecho';
          const grp = item.groupClean || item.group || 'Amenaza';
          const res = item.resumen ? `"${item.resumen.slice(0, 80)}${item.resumen.length > 80 ? '...' : ''}"` : '';
          tooltipDetails.push(`• [${yr}] ${cat} (${grp}) ${res}`);
        });
        if (count > 10) {
          tooltipDetails.push(`... y ${count - 10} hechos operacionales adicionales registrados.`);
        }
      } else {
        tooltipTitle = `Factor de Inestabilidad: ${ev.category || ev.desc || ev.oper || ev.mun || 'Amenaza Hostil'}`;
        tooltipDetails = [
          '🔴 Clasificación: Amenaza / Actividad Hostil (MTE 2-01.3 & STANAG 2019)',
          `Tipo de Hecho / Factor: ${ev.category || ev.desc || 'Factor de Inestabilidad'}`,
          `Símbolo Táctico SIDC: ${sidc}`,
          `Fecha del Hecho: ${ev.date || 'Sin fecha registrada'}`,
          `Ubicación: ${ev.place || ev.mun || 'Sector rural'} - ${ev.mun || ''} (${ev.dept || 'Nariño'})`,
          `Estructura Amenaza: ${ev.group || ev.desc || 'No determinada'}`,
          `Misión/Operación: ${ev.type_op || 'Control Territorial'} ${ev.oper ? `(${ev.oper})` : ''}`,
          `Unidad Empeñada: ${ev.unit || 'Fuerza Pública'} - ${ev.brigade || 'BR23'} (${ev.div || 'DIV03'})`,
          ev.ordop ? `ORDOP UT: ${ev.ordop}` : '',
          ev.terrain ? `Terreno / Relieve: ${ev.terrain} (Clima: ${ev.weather || 'Variable'})` : '',
          ev.field ? `Ambiente Operacional: ${ev.field}` : '',
          ev.boletin ? `Boletín Operacional: ${ev.boletin} | HR: ${ev.hr || 'S/N'}` : '',
          ev.resumen ? `Resumen: ${ev.resumen}` : ''
        ].filter(Boolean);
      }

      const labelText = isMulti
        ? `🔴 [${count}] ${hasCombat ? 'Combates' : hasExplosive ? 'Explosivos' : ev.category || 'Hechos'}`
        : (hasCombat || hasExplosive || hasDepot)
        ? `${hasCombat ? 'Combate' : hasExplosive ? 'Artefacto Explosivo' : 'Depósito/Caleta'} [${ev.date ? ev.date.slice(0, 4) : ''}]`
        : undefined;

      historicoDataSource.entities.add({
        id: `hist-3d-${coordKey.replace('.', '_').replace(',', '_')}`,
        name: isMulti ? `HISTÓRICO (${count} Hechos): ${ev.mun || ev.place}` : `HISTÓRICO HOSTIL: ${ev.category || ev.desc || ev.oper || ev.mun}`,
        position: Cesium.Cartesian3.fromDegrees(ev.lon, ev.lat),
        billboard: {
          image: iconUrl,
          heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
          horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
          verticalOrigin: Cesium.VerticalOrigin.CENTER,
          scaleByDistance: symbolScaleByDistance,
          disableDepthTestDistance: Number.POSITIVE_INFINITY
        },
        properties: new Cesium.PropertyBag({
          tooltipTitle: tooltipTitle,
          tooltipDetails: tooltipDetails
        }),
        label: labelText ? {
          text: labelText,
          font: 'bold 10px system-ui, sans-serif',
          style: Cesium.LabelStyle.FILL_AND_OUTLINE,
          fillColor: Cesium.Color.WHITE,
          outlineColor: Cesium.Color.BLACK,
          outlineWidth: 3,
          pixelOffset: new Cesium.Cartesian2(0, -20),
          heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
          scaleByDistance: labelScaleByDistance,
          distanceDisplayCondition: new Cesium.DistanceDisplayCondition(1.0, 350000.0)
        } : undefined
      });
    });

    viewer.dataSources.add(historicoDataSource);
    viewer.scene.requestRender();

    return () => {
      if (viewer && !viewer.isDestroyed() && historicoDataSourceRef.current && viewer.dataSources.contains(historicoDataSourceRef.current)) {
        viewer.dataSources.remove(historicoDataSourceRef.current, true);
        historicoDataSourceRef.current = null;
      }
    };
  }, [
    showHistoricoBr23Layer,
    historicoEvents,
    selectedHistoricoAff,
    selectedHistoricoYear,
    selectedHistoricoStructure,
    selectedHistoricoCategory,
    historicoDoctrinalMode
  ]);

  // Helper to safely clear LOS entities
  const clearLosEntities = (viewer: Cesium.Viewer) => {
    const existingLos = viewer.entities.getById('los-line');
    if (existingLos) viewer.entities.remove(existingLos);
    const existingLosObstructed = viewer.entities.getById('los-line-obstructed');
    if (existingLosObstructed) viewer.entities.remove(existingLosObstructed);
    const existingLosMarker = viewer.entities.getById('los-obstacle-marker');
    if (existingLosMarker) viewer.entities.remove(existingLosMarker);
  };

  // Compute Line of Sight between two coordinates
  const calculateLineOfSight = (startCartesian: Cesium.Cartesian3, endCartesian: Cesium.Cartesian3) => {
    const viewer = viewerRef.current;
    if (!viewer) return;

    // Elevate observer and target by +2.0m vertical elevation offset to prevent terrain mesh self-intersection false positives
    const startCartographic = Cesium.Cartographic.fromCartesian(startCartesian);
    startCartographic.height += 2.0;
    const adjustedStart = Cesium.Cartographic.toCartesian(startCartographic);

    const endCartographic = Cesium.Cartographic.fromCartesian(endCartesian);
    endCartographic.height += 2.0;
    const adjustedEnd = Cesium.Cartographic.toCartesian(endCartographic);

    // Check visibility using 3D Ray picking against the Globe terrain
    const direction = Cesium.Cartesian3.normalize(
      Cesium.Cartesian3.subtract(adjustedEnd, adjustedStart, new Cesium.Cartesian3()),
      new Cesium.Cartesian3()
    );
    const ray = new Cesium.Ray(adjustedStart, direction);
    const intersection = viewer.scene.globe.pick(ray, viewer.scene);

    const distanceFull = Cesium.Cartesian3.distance(adjustedStart, adjustedEnd);
    let obstructed = false;
    let obstaclePoint = adjustedEnd;

    if (Cesium.defined(intersection)) {
      const distanceObstacle = Cesium.Cartesian3.distance(adjustedStart, intersection);
      if (distanceObstacle < distanceFull - 10.0) { // Offset of 10m to avoid precision glitches
        obstructed = true;
        obstaclePoint = intersection;
      }
    }

    // Clean previous LOS lines
    clearLosEntities(viewer);

    if (!obstructed) {
      // Clear path - Render green line
      viewer.entities.add({
        id: 'los-line',
        name: 'Línea de Vista: Despejada',
        polyline: {
          positions: [adjustedStart, adjustedEnd],
          width: 5,
          material: Cesium.Color.GREEN,
          clampToGround: false
        }
      });
    } else {
      // Obstructed path - Render green segment up to obstacle, red segment after it
      viewer.entities.add({
        id: 'los-line',
        name: 'Línea de Vista: Segmento Visible',
        polyline: {
          positions: [adjustedStart, obstaclePoint],
          width: 5,
          material: Cesium.Color.GREEN,
          clampToGround: false
        }
      });

      viewer.entities.add({
        id: 'los-line-obstructed',
        name: 'Línea de Vista: Obstruida por Terreno',
        polyline: {
          positions: [obstaclePoint, adjustedEnd],
          width: 4,
          material: Cesium.Color.RED,
          clampToGround: false
        }
      });

      // Mark the obstacle point
      viewer.entities.add({
        id: 'los-obstacle-marker',
        name: 'Obstrucción de Relieve',
        position: obstaclePoint,
        point: {
          pixelSize: 12,
          color: Cesium.Color.RED,
          outlineColor: Cesium.Color.WHITE,
          outlineWidth: 2,
          heightReference: Cesium.HeightReference.CLAMP_TO_GROUND
        },
        label: {
          text: 'PUNTO DE OBSTRUCCIÓN (RELIEVE)',
          font: '10px bold sans-serif',
          fillColor: Cesium.Color.RED,
          outlineColor: Cesium.Color.BLACK,
          outlineWidth: 2,
          pixelOffset: new Cesium.Cartesian2(0, -15)
        }
      });
    }

    setLosToolActive(false);
  };

  // Add 3D Dome representation for Communications or Artillery coverage
  const addCoverageDome = (centerCartesian: Cesium.Cartesian3) => {
    const viewer = viewerRef.current;
    if (!viewer) return;

    // Clean previous domes
    const existingDome = viewer.entities.getById('coverage-dome-3d');
    if (existingDome) viewer.entities.remove(existingDome);

    const radius = 15000.0; // 15 km standard tactical range radius

    viewer.entities.add({
      id: 'coverage-dome-3d',
      name: 'Domo de Cobertura de Radio/Artillería (15km)',
      position: centerCartesian,
      ellipsoid: {
        radii: new Cesium.Cartesian3(radius, radius, radius),
        material: Cesium.Color.CYAN.withAlpha(0.25),
        outline: true,
        outlineColor: Cesium.Color.CYAN,
        outlineWidth: 2,
        subdivisions: 32
      }
    });

    setCoverageDomeActive(false);
  };

  // Distance measurement helper
  const updateDistance3DDrawing = (points: Cesium.Cartesian3[]) => {
    const viewer = viewerRef.current;
    if (!viewer) return;

    distanceEntitiesRef.current.forEach(entity => viewer.entities.remove(entity));
    distanceEntitiesRef.current = [];

    if (points.length === 0) return;

    let totalDistance = 0;

    for (let i = 0; i < points.length; i++) {
      const ptEntity = viewer.entities.add({
        position: points[i],
        point: {
          pixelSize: 8,
          color: Cesium.Color.YELLOW,
          outlineColor: Cesium.Color.BLACK,
          outlineWidth: 1.5,
          heightReference: Cesium.HeightReference.CLAMP_TO_GROUND
        }
      });
      distanceEntitiesRef.current.push(ptEntity);

      if (i > 0) {
        const p1 = points[i - 1];
        const p2 = points[i];
        
        const c1 = Cesium.Cartographic.fromCartesian(p1);
        const c2 = Cesium.Cartographic.fromCartesian(p2);
        const geodesic = new Cesium.EllipsoidGeodesic(c1, c2);
        const distM = geodesic.surfaceDistance;
        totalDistance += distM;

        const lineEntity = viewer.entities.add({
          polyline: {
            positions: [p1, p2],
            width: 3,
            material: Cesium.Color.YELLOW,
            clampToGround: true
          }
        });
        distanceEntitiesRef.current.push(lineEntity);

        const midpoint = Cesium.Cartesian3.lerp(p1, p2, 0.5, new Cesium.Cartesian3());
        const labelEntity = viewer.entities.add({
          position: midpoint,
          label: {
            text: `${(distM / 1000).toFixed(2)} km`,
            font: '10px sans-serif',
            fillColor: Cesium.Color.WHITE,
            outlineColor: Cesium.Color.BLACK,
            outlineWidth: 2,
            backgroundColor: Cesium.Color.BLACK.withAlpha(0.6),
            showBackground: true,
            backgroundPadding: new Cesium.Cartesian2(4, 2),
            pixelOffset: new Cesium.Cartesian2(0, -10),
            heightReference: Cesium.HeightReference.CLAMP_TO_GROUND
          }
        });
        distanceEntitiesRef.current.push(labelEntity);
      }
    }

    if (points.length > 1) {
      const lastPoint = points[points.length - 1];
      const totalLabelEntity = viewer.entities.add({
        position: lastPoint,
        label: {
          text: `TOTAL: ${(totalDistance / 1000).toFixed(2)} km`,
          font: 'bold 12px sans-serif',
          fillColor: Cesium.Color.YELLOW,
          outlineColor: Cesium.Color.BLACK,
          outlineWidth: 2.5,
          backgroundColor: Cesium.Color.BLACK.withAlpha(0.8),
          showBackground: true,
          backgroundPadding: new Cesium.Cartesian2(6, 3),
          pixelOffset: new Cesium.Cartesian2(0, -25),
          heightReference: Cesium.HeightReference.CLAMP_TO_GROUND
        }
      });
      distanceEntitiesRef.current.push(totalLabelEntity);
    }
  };

  // AOI drawing preview helper
  const updateAoi3DDrawing = (points: Cesium.Cartesian3[]) => {
    const viewer = viewerRef.current;
    if (!viewer) return;

    aoiEntitiesRef.current.forEach(entity => viewer.entities.remove(entity));
    aoiEntitiesRef.current = [];

    if (points.length === 0) return;

    for (let i = 0; i < points.length; i++) {
      const ptEntity = viewer.entities.add({
        position: points[i],
        point: {
          pixelSize: 6,
          color: Cesium.Color.CYAN,
          outlineColor: Cesium.Color.BLACK,
          outlineWidth: 1.5,
          heightReference: Cesium.HeightReference.CLAMP_TO_GROUND
        }
      });
      aoiEntitiesRef.current.push(ptEntity);

      if (i > 0) {
        const lineEntity = viewer.entities.add({
          polyline: {
            positions: [points[i - 1], points[i]],
            width: 2,
            material: new Cesium.PolylineDashMaterialProperty({
              color: Cesium.Color.CYAN
            }),
            clampToGround: true
          }
        });
        aoiEntitiesRef.current.push(lineEntity);
      }
    }

    if (points.length > 2) {
      const closingEntity = viewer.entities.add({
        polyline: {
          positions: [points[points.length - 1], points[0]],
          width: 2,
          material: new Cesium.PolylineDashMaterialProperty({
            color: Cesium.Color.CYAN
          }),
          clampToGround: true
        }
      });
      aoiEntitiesRef.current.push(closingEntity);
    }
  };

  const handleCompleteAoiDrawing = () => {
    const points = aoi3DPointsRef.current;
    if (points.length < 3) {
      console.warn("Se necesitan al menos 3 puntos para definir el AOI.");
      return;
    }

    const coords = points.map(p => {
      const carto = Cesium.Cartographic.fromCartesian(p);
      return [Cesium.Math.toDegrees(carto.longitude), Cesium.Math.toDegrees(carto.latitude)];
    });
    coords.push([...coords[0]]);

    const geoJson = {
      type: "Feature",
      properties: {},
      geometry: {
        type: "Polygon",
        coordinates: [coords]
      }
    };

    eventBus.publish('aoiDrawingFinished', geoJson);
  };

  const handleFinalizeAoiLayer = (geoJson: any) => {
    const viewer = viewerRef.current;
    if (!viewer) return;

    aoiEntitiesRef.current.forEach(entity => viewer.entities.remove(entity));
    aoiEntitiesRef.current = [];

    const prevFinal = viewer.entities.getById('final-aoi-polygon');
    if (prevFinal) viewer.entities.remove(prevFinal);

    if (geoJson && geoJson.geometry && geoJson.geometry.type === 'Polygon') {
      const coordinates = geoJson.geometry.coordinates[0];
      const hierarchy = coordinates.map((coord: any) => Cesium.Cartesian3.fromDegrees(coord[0], coord[1]));

      viewer.entities.add({
        id: 'final-aoi-polygon',
        name: 'Área de Interés (AOI)',
        polygon: {
          hierarchy: new Cesium.PolygonHierarchy(hierarchy),
          material: Cesium.Color.CYAN.withAlpha(0.25),
          outline: true,
          outlineColor: Cesium.Color.CYAN,
          outlineWidth: 2,
          heightReference: Cesium.HeightReference.CLAMP_TO_GROUND
        }
      });
    }
  };

  const handleClearAoiLayer = () => {
    const viewer = viewerRef.current;
    if (!viewer) return;

    const prevFinal = viewer.entities.getById('final-aoi-polygon');
    if (prevFinal) viewer.entities.remove(prevFinal);

    setAoi3DPoints([]);
    aoiEntitiesRef.current.forEach(entity => viewer.entities.remove(entity));
    aoiEntitiesRef.current = [];
  };

  // Sync eventBus subscriptions
  useEffect(() => {
    if (!eventBus) return;

    const handleComplete = () => handleCompleteAoiDrawing();
    const handleFinalize = (_msg: string, geoJson: any) => handleFinalizeAoiLayer(geoJson);
    const handleClear = () => handleClearAoiLayer();
    const handleClearLos = () => {
      const viewer = viewerRef.current;
      if (viewer && !viewer.isDestroyed()) {
        clearLosEntities(viewer);
      }
      setLosPoints([]);
    };

    const completeToken = eventBus.subscribe('completeAoiDrawing', handleComplete);
    const finalizeToken = eventBus.subscribe('finalizeAoiLayer', handleFinalize);
    const clearToken = eventBus.subscribe('clearAoiLayer', handleClear);
    const clearLosToken = eventBus.subscribe('clearLosLayer', handleClearLos);

    return () => {
      eventBus.unsubscribe(completeToken);
      eventBus.unsubscribe(finalizeToken);
      eventBus.unsubscribe(clearToken);
      eventBus.unsubscribe(clearLosToken);
    };
  }, [eventBus]);

  // Clean distance tool drawing when disabled
  useEffect(() => {
    if (!distanceToolActive) {
      setDistance3DPoints([]);
      const viewer = viewerRef.current;
      if (viewer) {
        distanceEntitiesRef.current.forEach(entity => viewer.entities.remove(entity));
        distanceEntitiesRef.current = [];
      }
    }
  }, [distanceToolActive]);

  // Clean AOI interactive drawing when disabled
  useEffect(() => {
    if (!aoiDrawingModeActive) {
      setAoi3DPoints([]);
      const viewer = viewerRef.current;
      if (viewer) {
        aoiEntitiesRef.current.forEach(entity => viewer.entities.remove(entity));
        aoiEntitiesRef.current = [];
      }
    }
  }, [aoiDrawingModeActive]);

  // Synchronize elevationProfileActive with losToolActive
  useEffect(() => {
    if (elevationProfileActive) {
      setLosToolActive(true);
      setLosPoints([]);
      setCoverageDomeActive(false);
    } else {
      setLosToolActive(false);
      const viewer = viewerRef.current;
      if (viewer) {
        const losLine = viewer.entities.getById('los-line');
        const losLineObstructed = viewer.entities.getById('los-line-obstructed');
        const obstacleMarker = viewer.entities.getById('los-obstacle-marker');
        if (losLine) viewer.entities.remove(losLine);
        if (losLineObstructed) viewer.entities.remove(losLineObstructed);
        if (obstacleMarker) viewer.entities.remove(obstacleMarker);
      }
    }
  }, [elevationProfileActive]);

  // Handle Enemy Influence Layer in 3D
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;

    const toRemove = viewer.entities.values.filter(e => e.id.startsWith('enemy-influence-'));
    toRemove.forEach(e => viewer.entities.remove(e));

    if (enemyInfluenceLayerActive) {
      const relevantIntelReports = intelligenceReports.filter(report => 
        INITIAL_ENEMY_FILTER_KEYWORDS.some(keyword => 
          `${report.title.toLowerCase()} ${report.details.toLowerCase()}`.includes(keyword)
        )
      );

      relevantIntelReports.forEach(intel => {
        if (!intel || !intel.location) return;
        const threatLevel = assessThreatLevel(intel);
        if (threatLevel === 'Ninguno') return;
        const style = getThreatStyle(threatLevel);

        viewer.entities.add({
          id: `enemy-influence-${intel.id}`,
          name: `Área de Influencia: ${threatLevel}`,
          position: Cesium.Cartesian3.fromDegrees(intel.location.lon, intel.location.lat),
          ellipse: {
            semiMajorAxis: style.radiusKm * 1000.0,
            semiMinorAxis: style.radiusKm * 1000.0,
            material: Cesium.Color.fromCssColorString(style.color).withAlpha(0.25),
            outline: true,
            outlineColor: Cesium.Color.fromCssColorString(style.color),
            outlineWidth: 2,
            heightReference: Cesium.HeightReference.CLAMP_TO_GROUND
          }
        });
      });
    }
  }, [enemyInfluenceLayerActive, intelligenceReports]);

  // Clean PICC interactive drawing when disabled
  useEffect(() => {
    if (!piccDrawingConfig) {
      setPiccPoints([]);
      const viewer = viewerRef.current;
      if (viewer) {
        piccEntitiesRef.current.forEach(entity => viewer.entities.remove(entity));
        piccEntitiesRef.current = [];
      }
    }
  }, [piccDrawingConfig]);

  // Adjust cursor style for active tools
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;

    if (distanceToolActive || aoiDrawingModeActive || elevationProfileActive || piccDrawingConfig) {
      viewer.scene.canvas.style.cursor = 'crosshair';
    } else {
      viewer.scene.canvas.style.cursor = 'default';
    }
  }, [distanceToolActive, aoiDrawingModeActive, elevationProfileActive, piccDrawingConfig]);

  const isPointSymbol = piccDrawingConfig ? [
    PICCElementType.ENEMY_UNIT_POINT_SIT, PICCElementType.FRIENDLY_UNIT_POINT_SIT,
    PICCElementType.NEUTRAL_POINT_SIT, PICCElementType.CIVILIAN_POINT_SIT,
    PICCElementType.NAI_POINT, PICCElementType.TARGET_REFERENCE_POINT,
    PICCElementType.CONTROL_CHECKPOINT, PICCElementType.OBSTACLE_DEMOLITION_PLANNED,
    PICCElementType.ENEMY_GUERRILLA_POINT, PICCElementType.ENEMY_LEADER_POINT,
    PICCElementType.CIVILIAN_CR_POINT, PICCElementType.TAI_POINT
  ].includes(piccDrawingConfig.type as PICCElementType) : false;

  const isPolygon = piccDrawingConfig ? [
    PICCElementType.FRIENDLY_ASSEMBLY_AREA, PICCElementType.FRIENDLY_OBJECTIVE,
    PICCElementType.NFA_AREA, PICCElementType.RFA_AREA, PICCElementType.CONTROL_AREA_GENERIC,
    PICCElementType.NAI_AREA, PICCElementType.TAI_AREA
  ].includes(piccDrawingConfig.type as PICCElementType) : false;

  return (
    <div id="simcop-map-container" className="relative w-full h-full flex flex-col min-h-[500px]">
      {/* Interactive PICC Drawing HUD (Floating Card) */}
      {piccDrawingConfig && !isPointSymbol && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-[99] bg-slate-950/90 backdrop-blur-md border border-teal-500/40 rounded-xl p-3 shadow-2xl flex flex-col items-center gap-2 w-80 animate-in fade-in slide-in-from-top-2">
          <div className="text-[10px] font-bold uppercase tracking-wider text-teal-400">
            Dibujando en 3D: {piccDrawingConfig.type}
          </div>
          <div className="text-[10px] text-slate-400 text-center">
            Haz clic en el relieve para agregar puntos.
            {piccPoints.length > 0 && <span className="text-teal-400 block font-semibold mt-1">Puntos colocados: {piccPoints.length}</span>}
          </div>
          <div className="flex gap-2 w-full mt-1.5">
            <button
              onClick={handleFinalizePiccDrawing}
              disabled={piccPoints.length < (isPolygon ? 3 : 2)}
              className="flex-1 text-[11px] py-1.5 rounded font-bold transition bg-teal-600 text-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-teal-500"
            >
              Finalizar
            </button>
            <button
              onClick={handleCancelPiccDrawing}
              className="flex-1 text-[11px] py-1.5 rounded font-bold transition bg-slate-800 text-slate-300 hover:bg-slate-700"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* AOI Drawing Validation Window */}
      {aoiDrawingModeActive && aoi3DPoints.length >= 3 && (
        <div className="absolute top-20 left-1/2 transform -translate-x-1/2 z-[100] bg-slate-900/90 backdrop-blur-md border border-green-500/50 rounded-xl p-4 shadow-2xl flex items-center gap-4 animate-in slide-in-from-top-4">
          <div className="text-sm font-bold text-slate-200">
            {aoi3DPoints.length} Puntos definidos
          </div>
          <button
            onClick={() => eventBus.publish('completeAoiDrawing')}
            className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg text-sm font-bold shadow-lg flex items-center gap-2 transition-all"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            Validar Polígono
          </button>
        </div>
      )}
      
      {/* App.tsx Injected Children (like Global Banners) */}
      {children}
      
      {/* 3D Visualizer Canvas Container */}
      <div ref={containerRef} className="flex-1 w-full h-full rounded-lg overflow-hidden border border-slate-800" />

      {/* Analysis Layers Filters Dropdown */}
      {showFilters && (
        <div className="absolute top-16 left-[9.5rem] z-[100] bg-slate-950/95 backdrop-blur-md border border-slate-800 rounded-xl p-4 w-72 shadow-2xl flex flex-col gap-3 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center justify-between border-b border-slate-700 pb-2">
            <h4 className="text-sm font-semibold text-slate-200">Capas y Medidas Tácticas</h4>
            <span className="text-[10px] text-sky-400 font-mono">ON/OFF</span>
          </div>
          
          <div className="space-y-2.5 pt-1">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Capas Operacionales & PICC</p>
            
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-300">⛰️ CMOC: Transitabilidad (&lt;15°, 15-30°, &gt;30°)</span>
              <input type="checkbox" checked={showCmocTransitLayer} onChange={e => setShowCmocTransitLayer(e.target.checked)} className="w-4 h-4 accent-emerald-500 rounded cursor-pointer" />
            </div>

            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-300">🌊 Red Hidrográfica (Ríos)</span>
              <input type="checkbox" checked={showHydrographyLayer} onChange={e => setShowHydrographyLayer(e.target.checked)} className="w-4 h-4 accent-cyan-500 rounded cursor-pointer" />
            </div>

            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-300">🛣️ Red Vial (Corredores Viales)</span>
              <input type="checkbox" checked={showRoadsLayer} onChange={e => setShowRoadsLayer(e.target.checked)} className="w-4 h-4 accent-amber-500 rounded cursor-pointer" />
            </div>

            <div className="flex flex-col gap-1.5 py-1 px-1.5 bg-slate-900/60 rounded border border-slate-800/80">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-300">🛡️ Alertas Defensoría (SAT)</span>
                <input type="checkbox" checked={showSatDefensoriaLayer} onChange={e => setShowSatDefensoriaLayer(e.target.checked)} className="w-4 h-4 accent-red-500 rounded cursor-pointer" />
              </div>
              {showSatDefensoriaLayer && (
                <div className="flex items-center justify-between gap-1 pt-1 border-t border-slate-800/50">
                  <span className="text-[10px] text-slate-400 font-mono">Año SAT:</span>
                  <select
                    value={selectedSatYear}
                    onChange={e => setSelectedSatYear(e.target.value)}
                    className="bg-slate-950 text-slate-200 border border-slate-700/80 rounded px-2 py-0.5 text-[11px] font-medium outline-none focus:border-red-500 cursor-pointer"
                  >
                    <option value="TODOS">Todos los años (369)</option>
                    <option value="2026">2026 (23)</option>
                    <option value="2025">2025 (20)</option>
                    <option value="2024">2024 (27)</option>
                    <option value="2023">2023 (39)</option>
                    <option value="2022">2022 (34)</option>
                    <option value="2021">2021 (29)</option>
                    <option value="2020">2020 (54)</option>
                    <option value="2019">2019 (56)</option>
                    <option value="2018">2018 (86)</option>
                    <option value="2017">2017 (1)</option>
                  </select>
                </div>
              )}
            </div>

            {/* Capa Histórico Factores de Inestabilidad BR23 (Simbología OTAN) */}
            <div className="flex flex-col gap-1.5 py-1 px-1.5 bg-slate-900/60 rounded border border-slate-800/80">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-medium text-slate-300">⚔️ Histórico BR23 (OTAN)</span>
                  {isHistoricoLoading && (
                    <span className="text-[9px] text-amber-400 font-mono animate-pulse">Cargando...</span>
                  )}
                  {showHistoricoBr23Layer && historicoEvents.length > 0 && (
                    <span className="text-[9px] text-emerald-400 font-mono">({historicoEvents.length.toLocaleString()})</span>
                  )}
                </div>
                <input type="checkbox" checked={showHistoricoBr23Layer} onChange={e => setShowHistoricoBr23Layer(e.target.checked)} className="w-4 h-4 accent-amber-500 rounded cursor-pointer" />
              </div>
              {showHistoricoBr23Layer && (
                <div className="flex flex-col gap-1.5 pt-1 border-t border-slate-800/50">
                  {/* Doctrina Militar MTE 2-01.3: Simbología OTAN milsymbol 100% Hostil (Rojo) */}
                  <div className="flex flex-col gap-1 bg-slate-950/80 p-1.5 rounded border border-red-900/50">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-red-400 font-semibold tracking-wider uppercase">Simbología Táctica OTAN:</span>
                      <span className="text-[9px] px-1.5 py-0.2 bg-red-950/80 text-red-300 border border-red-800 rounded font-mono">MIL-STD-2525</span>
                    </div>
                    <p className="text-[9px] text-slate-400 leading-tight">
                      MTE 2-01.3 PICC: Toda actividad y factor de inestabilidad del enemigo se grafica en <strong className="text-red-400">ROJO DOCTRINAL</strong> mediante vectorización milsymbol.
                    </p>
                  </div>

                  {/* Filtro por Categoría / Tipo de Hecho */}
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-[10px] text-slate-400 font-mono">Tipo Hecho:</span>
                    <select
                      value={selectedHistoricoCategory}
                      onChange={e => setSelectedHistoricoCategory(e.target.value)}
                      className="bg-slate-950 text-slate-200 border border-slate-700/80 rounded px-1.5 py-0.5 text-[10px] font-medium outline-none focus:border-amber-500 cursor-pointer max-w-[155px] truncate"
                    >
                      <option value="TODOS">Todos los tipos de hecho</option>
                      <option value="NARCOTRAFICO">Narcotráfico (6.943)</option>
                      <option value="CAPTURA PERSONA">Captura de Persona (3.177)</option>
                      <option value="DESTRUCCIÓN">Destrucción Material (2.536)</option>
                      <option value="DEPÓSITO ILEGAL">Depósito Ilegal (2.467)</option>
                      <option value="NEUTRALIZACIÓN ARTEFACTO EXPLOSIVO">Neutraliz. Artefacto Explosivo (1.395)</option>
                      <option value="NEUTRALIZACIÓN ACCION CONTRA INFRAESTRUCTURA">Neutraliz. Contra Infraestructura (1.069)</option>
                      <option value="INCAUTACIÓN">Incautación (699)</option>
                      <option value="CONTRABANDO">Contrabando (303)</option>
                      <option value="COMBATES">⚔️ Combates (301)</option>
                      <option value="PRESENTACION VOLUNTARIA">Presentación Voluntaria (246)</option>
                      <option value="RECUPERADO">Recuperado (177)</option>
                      <option value="CALETA">Caleta (81)</option>
                      <option value="NEUTRALIZACIONES ACCIONES TERRORISTAS">Neutraliz. Acciones Terroristas (81)</option>
                      <option value="EXPLORACIÓN Y EXPLOTACIÓN ILÍCITA">Minería / Explotación Ilícita (70)</option>
                      <option value="SOMETIMIENTO A LA JUSTICIA">Sometimiento Justicia (70)</option>
                      <option value="ACTIVACIÓN ARTEFACTO EXPLOSIVO">💣 Activación Explosivo (68)</option>
                      <option value="ACTO TERRORISMO">💥 Acto de Terrorismo (66)</option>
                      <option value="ATAQUE FUERZA PUBLICA">Ataque Fuerza Pública (47)</option>
                      <option value="CAMPAMENTOS">Campamentos Enemigos (35)</option>
                      <option value="BLOQUEOS DISTURBIOS Y MANIFESTACIONES">Disturbios / Bloqueos (22)</option>
                    </select>
                  </div>

                  <div className="flex items-center justify-between gap-1">
                    <span className="text-[10px] text-slate-400 font-mono">Año:</span>
                    <select
                      value={selectedHistoricoYear}
                      onChange={e => setSelectedHistoricoYear(e.target.value)}
                      className="bg-slate-950 text-slate-200 border border-slate-700/80 rounded px-1.5 py-0.5 text-[10px] font-medium outline-none focus:border-amber-500 cursor-pointer"
                    >
                      <option value="2021">2021 (1.531 hechos - Rápido)</option>
                      <option value="2020">2020 (2.891 hechos)</option>
                      <option value="2019">2019 (4.290 hechos)</option>
                      <option value="2018">2018 (3.132 hechos)</option>
                      <option value="2017">2017 (2.831 hechos)</option>
                      <option value="2016">2016 (2.420 hechos)</option>
                      <option value="2015">2015 (1.902 hechos)</option>
                      <option value="TODOS">Todos los años (18.997 - Agrupado Seguro)</option>
                    </select>
                  </div>

                  <div className="flex items-center justify-between gap-1">
                    <span className="text-[10px] text-slate-400 font-mono">Estructura:</span>
                    <select
                      value={selectedHistoricoStructure}
                      onChange={e => setSelectedHistoricoStructure(e.target.value)}
                      className="bg-slate-950 text-slate-200 border border-slate-700/80 rounded px-1.5 py-0.5 text-[10px] font-medium outline-none focus:border-amber-500 cursor-pointer max-w-[155px] truncate"
                    >
                      <option value="TODOS">Todas las estructuras</option>
                      <option value="GAO-r Estructura Oliver Sinisterra">GAO-r Oliver Sinisterra (3.403)</option>
                      <option value="FARC Columna Móvil Daniel Aldana">FARC Daniel Aldana (2.209)</option>
                      <option value="ELN Compañía Elder Santos">ELN Elder Santos (1.537)</option>
                      <option value="ELN Frente José María Becerra">ELN José María Becerra (1.106)</option>
                      <option value="ELN Frente Manuel Vásquez Castaño">ELN Manuel Vásquez (949)</option>
                      <option value="Comandos de la Frontera / Frente 48">Frente 48 / Comandos Frontera (846)</option>
                      <option value="GAO Los Contadores">GAO Los Contadores (820)</option>
                      <option value="ELN Compañía José Luis Cabrera Ruales">ELN José Luis Cabrera (677)</option>
                      <option value="FARC / Disidencias Frente 29">FARC Frente 29 (666)</option>
                      <option value="ELN Milicias Jaime Toño Obando">ELN Jaime Toño Obando (661)</option>
                      <option value="GAO Guerrillas Unidas del Pacífico (GUP)">GAO Guerrillas Unidas Pacífico (451)</option>
                      <option value="Clan del Golfo / AGC">Clan del Golfo / AGC (303)</option>
                      <option value="GAO-r Estructura Carlos Patiño">GAO-r Carlos Patiño (299)</option>
                      <option value="Delincuencia Común / Narcotráfico">Delincuencia Común / Narcotráfico (3.335)</option>
                      <option value="Redes de Narcotráfico">Redes de Narcotráfico (765)</option>
                      <option value="OTRAS ESTRUCTURAS">Otras Estructuras</option>
                    </select>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-300">🎯 Medidas S2 / Calco COA</span>
              <input type="checkbox" checked={showS2COALayer} onChange={e => setShowS2COALayer(e.target.checked)} className="w-4 h-4 accent-amber-500 rounded cursor-pointer" />
            </div>

            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-300">✏️ Gráficos PICC</span>
              <input type="checkbox" checked={showPiccGraphicsLayer} onChange={e => setShowPiccGraphicsLayer(e.target.checked)} className="w-4 h-4 accent-blue-500 rounded cursor-pointer" />
            </div>

            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-300">🎖️ Unidades Propias</span>
              <input type="checkbox" checked={showUnitsLayer} onChange={e => setShowUnitsLayer(e.target.checked)} className="w-4 h-4 accent-sky-500 rounded cursor-pointer" />
            </div>

            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider pt-2 border-t border-slate-800/80">Inteligencia y Sensores</p>

            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-300">📡 Inteligencia (Intel)</span>
              <input type="checkbox" checked={showIntelligenceLayer} onChange={e => setShowIntelligenceLayer(e.target.checked)} className="w-4 h-4 accent-sky-500 rounded cursor-pointer" />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-300">🔥 Hotspots (BMA)</span>
              <input type="checkbox" checked={showHotspotsLayer} onChange={e => setShowHotspotsLayer(e.target.checked)} className="w-4 h-4 accent-sky-500 rounded cursor-pointer" />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-300">📜 Histórico Hotspots</span>
              <input type="checkbox" checked={showHistoricalHotspots} onChange={e => setShowHistoricalHotspots(e.target.checked)} className="w-4 h-4 accent-sky-500 rounded cursor-pointer" />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-300">📢 Noticias OSINT</span>
              <input type="checkbox" checked={showOsintLayer} onChange={e => setShowOsintLayer(e.target.checked)} className="w-4 h-4 accent-sky-500 rounded cursor-pointer" />
            </div>
          </div>

          {/* Acciones de Limpieza y Borrado de Calco */}
          <div className="pt-2 border-t border-slate-800 space-y-1.5">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Borrado de Calco Táctico</p>
            <div className="flex flex-col gap-1.5">
              <button
                onClick={handleClearS2COAPlan}
                className="w-full text-left px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-amber-300 hover:text-amber-200 border border-slate-700/60 rounded text-[11px] font-medium transition flex items-center justify-between"
                title="Eliminar del visor 3D las medidas de coordinación de maniobra S2 y COA"
              >
                <span>🎯 Borrar Calco COA / S2</span>
                <span className="text-[10px] text-slate-400">Limpiar</span>
              </button>
              <button
                onClick={handleClearPiccGraphics}
                className="w-full text-left px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-rose-300 hover:text-rose-200 border border-slate-700/60 rounded text-[11px] font-medium transition flex items-center justify-between"
                title="Eliminar del mapa todos los trazos y símbolos PICC guardados"
              >
                <span>✏️ Borrar Gráficos PICC</span>
                <span className="text-[10px] text-slate-400">Limpiar</span>
              </button>
              <button
                onClick={handleClearAllTacticalCalco}
                className="w-full text-left px-2.5 py-1.5 bg-red-950/40 hover:bg-red-900/60 text-red-300 hover:text-red-200 border border-red-800/60 rounded text-[11px] font-semibold transition flex items-center justify-between"
                title="Limpiar completamente todas las medidas graficadas del visor 3D"
              >
                <span>🗑️ Limpiar Todo el Calco</span>
                <span className="text-[10px] text-red-400 font-bold">Total</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hover Entity Tooltip */}
      {hoveredTooltipInfo && (
        <div 
          className="pointer-events-none fixed z-[100] bg-slate-900/95 backdrop-blur-md border border-slate-700/80 rounded-lg p-3 shadow-2xl transition-opacity duration-150"
          style={{ left: hoveredTooltipInfo.x + 15, top: hoveredTooltipInfo.y + 15 }}
        >
          <div className="text-xs font-bold text-sky-400 mb-1 border-b border-slate-700 pb-1">{hoveredTooltipInfo.title}</div>
          <div className="text-[11px] text-slate-300 space-y-0.5">
            {hoveredTooltipInfo.details.map((detail, idx) => (
              <div key={idx}>{detail}</div>
            ))}
          </div>
        </div>
      )}

      {/* Real-time Cursor Coordinates Display (Aesthetic Tactical HUD) */}
      {cursorInfo && (
        <div className="absolute bottom-4 right-4 z-[99] bg-slate-950/85 backdrop-blur-sm border border-slate-800/80 rounded-lg px-3 py-1.5 shadow-xl text-slate-300 font-mono text-[10px] flex gap-4 select-none">
          <div className="flex items-center">
            <span className="text-slate-500 font-bold mr-1">POS:</span>
            <span>{cursorInfo.lat}, {cursorInfo.lon}</span>
          </div>
          <div className="border-l border-slate-800 pl-4 flex items-center">
            <span className="text-slate-500 font-bold mr-1">DMS:</span>
            <span>{cursorInfo.dmsLat} {cursorInfo.dmsLon}</span>
          </div>
          <div className="border-l border-slate-800 pl-4 flex items-center text-sky-400">
            <span className="text-slate-500 font-bold mr-1">ALT:</span>
            <span>{cursorInfo.elevation} msnm</span>
          </div>
        </div>
      )}

      {/* Top Left Global Toolbar */}
      <div className="absolute top-4 left-4 z-[100] flex gap-2">
        <button 
          onClick={() => setIsControlPanelOpen(!isControlPanelOpen)}
          className={`p-2 rounded-lg border backdrop-blur-md transition-all shadow-lg flex items-center justify-center ${isControlPanelOpen ? 'bg-sky-600/90 border-sky-400/50 text-white' : 'bg-slate-900/80 border-slate-700 text-slate-300 hover:bg-slate-800'}`}
          title={isControlPanelOpen ? 'Ocultar Panel Táctico' : 'Mostrar Panel Táctico'}
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25H12" />
          </svg>
        </button>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`p-2 rounded-lg border backdrop-blur-md transition-all shadow-lg flex items-center justify-center ${showFilters ? 'bg-sky-600/90 border-sky-400/50 text-white' : 'bg-slate-900/80 border-slate-700 text-slate-300 hover:bg-slate-800'}`}
          title="Filtros de Análisis (Hotspots, Inteligencia, OSINT)"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
          </svg>
        </button>
        <button 
          onClick={() => {
            if (!document.fullscreenElement) {
              document.getElementById('simcop-map-container')?.requestFullscreen().catch(() => {});
            } else {
              if (document.exitFullscreen) {
                document.exitFullscreen();
              }
            }
          }}
          className={`p-2 rounded-lg border backdrop-blur-md transition-all shadow-lg flex items-center justify-center ${isFullscreen ? 'bg-sky-600/90 border-sky-400/50 text-white' : 'bg-slate-900/80 border-slate-700 text-slate-300 hover:bg-slate-800'}`}
          title={isFullscreen ? 'Salir de Pantalla Completa' : 'Pantalla Completa'}
        >
          {isFullscreen ? (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 9V4.5M9 9H4.5M9 9 3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5l5.25 5.25" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
            </svg>
          )}
        </button>
        <button
          onClick={() => {
            if (viewerRef.current && !viewerRef.current.isDestroyed()) {
              const height = viewerRef.current.camera.positionCartographic.height;
              viewerRef.current.camera.zoomIn(height * 0.35);
            }
          }}
          className="p-2 rounded-lg border backdrop-blur-md transition-all shadow-lg flex items-center justify-center bg-slate-900/80 border-slate-700 text-slate-300 hover:bg-slate-800"
          title="Acercar Cámara (Zoom In)"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
        </button>
        <button
          onClick={() => {
            if (viewerRef.current && !viewerRef.current.isDestroyed()) {
              const height = viewerRef.current.camera.positionCartographic.height;
              viewerRef.current.camera.zoomOut(height * 0.35);
            }
          }}
          className="p-2 rounded-lg border backdrop-blur-md transition-all shadow-lg flex items-center justify-center bg-slate-900/80 border-slate-700 text-slate-300 hover:bg-slate-800"
          title="Alejar Cámara (Zoom Out)"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14" />
          </svg>
        </button>
      </div>

      {/* Modern Floating Control Panel (Aesthetic Glassmorphism) */}
      <div className={`absolute top-16 left-4 z-[99] bg-slate-950/85 backdrop-blur-md border border-slate-800/80 rounded-xl p-4 w-72 shadow-2xl flex flex-col gap-3 transition-all duration-300 transform origin-top-left ${isControlPanelOpen ? 'scale-100 opacity-100' : 'scale-95 opacity-0 pointer-events-none'}`}>
        <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
          <BoltIcon className="w-5 h-5 text-sky-400" />
          <h3 className="font-bold text-slate-100 text-sm tracking-wide uppercase">Control Táctico 3D</h3>
        </div>

        {/* 3D Camera Controls */}
        <div className="flex flex-col gap-1.5">
          <button
            onClick={reset3DPerspective}
            className="text-xs py-2 px-3 rounded-lg font-bold bg-gradient-to-r from-sky-600 to-blue-700 text-white shadow-md hover:from-sky-500 hover:to-blue-600 transition flex items-center justify-center gap-1.5"
            title="Centra la cámara en vista táctica 3D inclinada sobre las cordilleras de Colombia"
          >
            🎯 Centrar Globo 3D
          </button>
        </div>

        {/* Map Layers Selector */}
        <div className="flex flex-col gap-1.5 pt-1 border-t border-slate-900">
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Capa Base Cartográfica</label>
          <div className="grid grid-cols-3 gap-1">
            <button
              onClick={() => setMapLayer('igac-sat')}
              className={`text-[10px] py-1.5 px-1 rounded font-medium transition text-center ${mapLayer === 'igac-sat' ? 'bg-sky-600 text-white shadow' : 'bg-slate-900 text-slate-300 hover:bg-slate-800'}`}
              title="Satelital de Alta Definición ESRI World Imagery + Etiquetas CartoDB"
            >
              Satélite HD
            </button>
            <button
              onClick={() => setMapLayer('topo')}
              className={`text-[10px] py-1.5 px-1 rounded font-medium transition text-center ${mapLayer === 'topo' ? 'bg-sky-600 text-white shadow' : 'bg-slate-900 text-slate-300 hover:bg-slate-800'}`}
              title="Mapa Topográfico Oficial con curvas de nivel e hidrografía"
            >
              Topográfico
            </button>
            <button
              onClick={() => setMapLayer('vias')}
              className={`text-[10px] py-1.5 px-1 rounded font-medium transition text-center ${mapLayer === 'vias' ? 'bg-sky-600 text-white shadow' : 'bg-slate-900 text-slate-300 hover:bg-slate-800'}`}
              title="Mapa de Vías, Carreteras y Red Vial detallada"
            >
              Vías / Red
            </button>
            <button
              onClick={() => setMapLayer('igac-pol')}
              className={`text-[10px] py-1.5 px-1 rounded font-medium transition text-center ${mapLayer === 'igac-pol' ? 'bg-sky-600 text-white shadow' : 'bg-slate-900 text-slate-300 hover:bg-slate-800'}`}
              title="Cartografía Base Táctica (IGAC / CartoDB Voyager)"
            >
              Cartografía
            </button>
            <button
              onClick={() => setMapLayer('osm')}
              className={`text-[10px] py-1.5 px-1 rounded font-medium transition text-center ${mapLayer === 'osm' ? 'bg-sky-600 text-white shadow' : 'bg-slate-900 text-slate-300 hover:bg-slate-800'}`}
              title="OpenStreetMap Standard"
            >
              OSM
            </button>
          </div>
        </div>

        {/* Terrain and Relief Exaggeration */}
        <div className="flex flex-col gap-2 pt-1 border-t border-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-300">Relieve 3D Cordillera</span>
            <input
              type="checkbox"
              checked={terrainActive}
              onChange={(e) => setTerrainActive(e.target.checked)}
              className="w-4 h-4 accent-sky-500 rounded cursor-pointer"
            />
          </div>

          {terrainActive && (
            <div className="flex items-center justify-between bg-slate-900/60 p-1.5 rounded-lg border border-slate-800 text-[10px]">
              <span className="text-slate-400 font-semibold">Exageración:</span>
              <div className="flex gap-1">
                {[1.0, 1.5, 2.0].map((factor) => (
                  <button
                    key={factor}
                    onClick={() => handleExaggerationChange(factor)}
                    className={`px-2 py-0.5 rounded font-bold transition ${terrainExaggeration === factor ? 'bg-sky-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'}`}
                  >
                    {factor}x
                  </button>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={() => setShowIonModal(true)}
            className="text-[10px] py-1 px-2 rounded font-semibold text-sky-400 bg-sky-950/40 border border-sky-800/50 hover:bg-sky-900/40 transition flex items-center justify-center gap-1"
          >
            🔑 Configurar Token Cesium Ion (HD)
          </button>
        </div>

        {/* Visual Weather FX Selector */}
        <div className="flex flex-col gap-1.5 pt-2 border-t border-slate-900">
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-between">
            <span>Efectos Atmosféricos 3D</span>
            <span className="animate-pulse text-sky-400 text-[9px] font-bold">AUTO-SYNC</span>
          </label>
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-slate-300 bg-slate-900/80 px-3 py-1.5 rounded shadow-inner border border-slate-800 w-full text-center">
              {weatherEffect === 'clear' ? '☀️ Cielo Despejado' : weatherEffect === 'rain' ? '🌧️ Precipitaciones' : weatherEffect === 'storm' ? '⛈️ Tormenta Eléctrica' : '🌫️ Bancos de Niebla'}
            </span>
          </div>
        </div>

        {/* Tactical 3D Tools */}
        <div className="flex flex-col gap-2 pt-2 border-t border-slate-800">
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Análisis Táctico 3D</label>
          
          <button
            onClick={() => {
              setLosToolActive(!losToolActive);
              setLosPoints([]);
              setCoverageDomeActive(false);
            }}
            className={`w-full text-xs py-2 rounded font-semibold transition ${losToolActive ? 'bg-emerald-600 text-white animate-pulse' : 'bg-emerald-950/40 text-emerald-300 border border-emerald-800/60 hover:bg-emerald-900/40'}`}
          >
            {losToolActive ? '📍 Selecciona 2 puntos en el mapa...' : '📐 Calcular Línea de Vista (LOS)'}
          </button>

          <button
            onClick={() => {
              setCoverageDomeActive(!coverageDomeActive);
              setLosToolActive(false);
            }}
            className={`w-full text-xs py-2 rounded font-semibold transition ${coverageDomeActive ? 'bg-amber-600 text-white animate-pulse' : 'bg-amber-950/40 text-amber-300 border border-amber-800/60 hover:bg-amber-900/40'}`}
          >
            {coverageDomeActive ? '📍 Selecciona nodo en el mapa...' : '🔮 Dibujar Domo de Cobertura (15km)'}
          </button>

          <button
            onClick={toggleWindyPanel}
            className={`w-full text-xs py-2 rounded font-semibold transition flex items-center justify-center gap-2 ${showWindyPanel ? 'bg-teal-600 text-white shadow-lg' : 'bg-slate-900 border border-slate-700 text-slate-300 hover:bg-slate-800'}`}
          >
            ☁️ {showWindyPanel ? 'Ocultar Clima (Windy)' : 'Mostrar Clima (Windy)'}
          </button>

          <button
            onClick={() => setNativeRadarActive(!nativeRadarActive)}
            className={`w-full text-xs py-2 rounded font-semibold transition flex items-center justify-center gap-2 ${nativeRadarActive ? 'bg-blue-600 text-white shadow-lg animate-pulse' : 'bg-slate-900 border border-slate-700 text-slate-300 hover:bg-slate-800'}`}
          >
            📡 {nativeRadarActive ? 'Ocultar Radar Nativo 3D' : 'Mostrar Radar Nativo 3D'}
          </button>
        </div>
      </div>

      {/* Cesium Ion Token Modal */}
      {showIonModal && (
        <div className="fixed inset-0 z-[200] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-sky-500/40 rounded-2xl p-6 w-full max-w-md shadow-2xl animate-in fade-in zoom-in-95">
            <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
              <span>⛰️</span> Token Cesium Ion (Terreno HD)
            </h3>
            <p className="text-xs text-slate-400 mb-4 leading-relaxed">
              Ingresa tu clave de acceso de <strong>Cesium Ion</strong> (gratuita en cesium.com) para activar el relieve topográfico 3D de alta definición en todo el planeta (Cesium World Terrain).
            </p>
            <input
              type="text"
              value={ionTokenInput}
              onChange={(e) => setIonTokenInput(e.target.value)}
              placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 font-mono mb-4"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowIonModal(false)}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveIonToken}
                className="px-4 py-2 rounded-lg text-xs font-bold text-white bg-sky-600 hover:bg-sky-500 shadow-lg shadow-sky-600/30 transition"
              >
                Guardar y Recargar Terreno
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Windy Weather Iframe Overlay */}
      {showWindyPanel && (
        <div className="absolute top-4 right-4 z-[99] bg-slate-950/90 backdrop-blur-md border border-teal-500/40 rounded-xl shadow-2xl flex flex-col w-[450px] animate-in fade-in slide-in-from-right-4">
          <div className="flex items-center justify-between p-3 border-b border-slate-800">
            <h3 className="text-teal-400 font-bold text-xs uppercase tracking-wider flex items-center gap-2">
              <span>☁️</span> CLIMA TÁCTICO INTEGRADO (WINDY)
            </h3>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  if (viewerRef.current) {
                    const cameraPos = viewerRef.current.camera.positionCartographic;
                    const lat = Cesium.Math.toDegrees(cameraPos.latitude);
                    const lon = Cesium.Math.toDegrees(cameraPos.longitude);
                    const zoom = Math.max(4, Math.min(18, Math.round(27 - Math.log2(cameraPos.height))));
                    setWindyCoords({ lat, lon, zoom });
                  }
                }}
                className="text-slate-400 hover:text-teal-300 transition text-xs font-semibold px-2"
                title="Sincronizar el widget de Windy con la posición y altitud de la cámara 3D"
              >
                Sincronizar
              </button>
              <button 
                onClick={() => setShowWindyPanel(false)}
                className="text-slate-400 hover:text-red-400 transition"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
          <div className="p-1 h-[600px] w-full">
            <iframe 
              className="w-full h-full rounded-b-lg border-0" 
              src={`https://embed.windy.com/embed2.html?lat=${windyCoords.lat.toFixed(4)}&lon=${windyCoords.lon.toFixed(4)}&zoom=${windyCoords.zoom}&level=surface&overlay=radar&menu=&message=true&marker=true&calendar=now&pressure=&type=map&location=coordinates&detail=&detailLat=${windyCoords.lat.toFixed(4)}&detailLon=${windyCoords.lon.toFixed(4)}&metricWind=default&metricTemp=default&radarRange=&key=TU1juayPvddctGBPMxiEXhhEnAXVnfs3`}
              title="Windy Weather Overlay"
            ></iframe>
          </div>
        </div>
      )}
    </div>
  );
};
