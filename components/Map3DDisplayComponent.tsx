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
  osintLayerActive = false,
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
  const [showIntelligenceLayer, setShowIntelligenceLayer] = useState<boolean>(true);
  const [showHotspotsLayer, setShowHotspotsLayer] = useState<boolean>(true);
  const [showHistoricalHotspots, setShowHistoricalHotspots] = useState<boolean>(false);
  const [showOsintLayer, setShowOsintLayer] = useState<boolean>(true);
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
      url: 'https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}.png',
      subdomains: ['a', 'b', 'c', 'd'],
      credit: '© CartoDB, © OpenStreetMap',
      hasAlphaChannel: true,
      maximumLevel: 20,
      enablePickFeatures: false
    });

    const viewer = new Cesium.Viewer(containerRef.current, {
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
      shouldAnimate: true
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
              PICCElementType.CONTROL_CHECKPOINT, PICCElementType.OBSTACLE_DEMOLITION_PLANNED
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
      } else if (latestProps.current.onSelectEntityOnMap) {
        // Did not click a valid entity, clear selection if we didn't click a cluster
        const isClusterClick = Cesium.defined(pickedObject) && pickedObject.id && Array.isArray(pickedObject.id);
        if (!isClusterClick) {
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
      
      // 1. Hover side-expansion for clusters
      let isHoveringCluster = Cesium.defined(pickedObject) && pickedObject.id && Array.isArray(pickedObject.id);
      let isHoveringExpandedUnit = Cesium.defined(pickedObject) && pickedObject.id && pickedObject.id.id && pickedObject.id.id.startsWith('expanded-hover-');
      
      if (isHoveringCluster) {
          const clusteredEntities = pickedObject.id;
          const clusterPrimitive = pickedObject.primitive;
          
          if (!expandedHoverStateRef.current || expandedHoverStateRef.current.clusterPrimitive !== clusterPrimitive) {
              if (expandedHoverStateRef.current) {
                 expandedHoverStateRef.current.entities.forEach(e => viewer.entities.remove(e));
                 expandedHoverStateRef.current = null;
              }
              
              let cartesianPos = clusterPrimitive?.position;
              if (cartesianPos) {
                  const expandedEntities: Cesium.Entity[] = [];
                  const baseHorizontalOffset = 30; // Start 30px to the right of the cluster
                  const spacing = 50; // 50px between each unit
                  
                  clusteredEntities.forEach((entity: Cesium.Entity, index: number) => {
                      const offsetX = baseHorizontalOffset + (index * spacing);
                      const expandedEntity = viewer.entities.add({
                          id: `expanded-hover-${entity.id}`,
                          position: cartesianPos, // Exact same 3D position
                          billboard: {
                              image: entity.billboard?.image,
                              heightReference: entity.billboard?.heightReference,
                              horizontalOrigin: entity.billboard?.horizontalOrigin,
                              verticalOrigin: entity.billboard?.verticalOrigin,
                              scaleByDistance: entity.billboard?.scaleByDistance,
                              disableDepthTestDistance: entity.billboard?.disableDepthTestDistance,
                              pixelOffset: new Cesium.Cartesian2(offsetX, 0) // Shift to the right
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
                              disableDepthTestDistance: entity.label?.disableDepthTestDistance,
                              heightReference: entity.label?.heightReference,
                              pixelOffset: new Cesium.Cartesian2(offsetX, 25) // Shift to the right, keep vertical offset
                          }
                      });
                      expandedEntities.push(expandedEntity);
                  });
                  
                  expandedHoverStateRef.current = {
                      clusterPrimitive: clusterPrimitive,
                      entities: expandedEntities,
                      basePosition: cartesianPos
                  };
              }
          }
      } else if (!isHoveringExpandedUnit && expandedHoverStateRef.current) {
          expandedHoverStateRef.current.entities.forEach(e => viewer.entities.remove(e));
          expandedHoverStateRef.current = null;
      }

      // 2. Standard Tooltip logic
      if (pickedObject && pickedObject.id && pickedObject.id.properties) {
        const props = pickedObject.id.properties;
        if (props.hasProperty('tooltipTitle')) {
          setHoveredTooltipInfo({
            x: movement.endPosition.x,
            y: movement.endPosition.y,
            title: props.tooltipTitle.getValue(),
            details: props.tooltipDetails ? props.tooltipDetails.getValue().filter(Boolean) : []
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
          
          const res = await fetch(`${API_BASE_URL}/api/weather/current?lat=${lat}&lon=${lon}`);
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
        url: 'https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}.png',
        subdomains: ['a', 'b', 'c', 'd'],
        credit: '© CartoDB, © OpenStreetMap',
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
      // Cartografía Base Oficial (IGAC / CartoDB Voyager)
      Cesium.ArcGisMapServerImageryProvider.fromUrl(
        'https://mapas.igac.gov.co/server/rest/services/carto/Colombia_Base/MapServer',
        { credit: '© Instituto Geográfico Agustín Codazzi (IGAC) - Cartografía Base Oficial', enablePickFeatures: false }
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

  // Capas de radar y satélite obsoletas removidas

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
      PICCElementType.NFA_AREA, PICCElementType.RFA_AREA, PICCElementType.CONTROL_AREA_GENERIC
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
      PICCElementType.NFA_AREA, PICCElementType.RFA_AREA, PICCElementType.CONTROL_AREA_GENERIC
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
    };

    const tokenNew = eventBus.subscribe('newCOAPlan', handleNewCOAPlan);
    const tokenRender = eventBus.subscribe('renderCOAGraphics', handleRenderCOAGraphics);
    const tokenClear = eventBus.subscribe('clearCOALayer', handleClearCOA);

    return () => {
      eventBus.unsubscribe(tokenNew);
      eventBus.unsubscribe(tokenRender);
      eventBus.unsubscribe(tokenClear);
    };
  }, [eventBus]);

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

    units.forEach(unit => {
      if (!unit || !unit.location) return;

      const sidc = generateUnitSIDC(unit);
      const symbol = new ms.Symbol(sidc, {
        size: 40,
        outlineColor: 'white',
        outlineWidth: 4,
        infoFields: false // Strictly disable native Milsymbol side-text
      });
      const canvas = symbol.asCanvas();
      const iconUrl = canvas.toDataURL();

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

    // 11. Render OSINT Events if active
    if (osintLayerActive && showOsintLayer) {
      osintEvents.forEach((osint, idx) => {
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
            tooltipDetails: [
              `Fuente: ${osint.sourceName}`,
              `Fiabilidad: ${(osint.confidenceScore * 100).toFixed(0)}%`,
              osint.verified ? '✓ VERIFICADO' : '⚠️ NO VERIFICADO',
              osint.summary.substring(0, 100) + (osint.summary.length > 100 ? '...' : '')
            ]
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

    // 12. Render Loaded PICC operational graphics
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

    // 13. Render Course of Action (COA) Plans
    if (currentCOAPlan) {
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
    showIntelligenceLayer,
    showHotspotsLayer,
    showHistoricalHotspots,
    showOsintLayer,
    loadedPiccGraphics,
    currentCOAPlan,
    selectedUnitForDome,
    coverageDomeActive
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
    PICCElementType.CONTROL_CHECKPOINT, PICCElementType.OBSTACLE_DEMOLITION_PLANNED
  ].includes(piccDrawingConfig.type as PICCElementType) : false;

  const isPolygon = piccDrawingConfig ? [
    PICCElementType.FRIENDLY_ASSEMBLY_AREA, PICCElementType.FRIENDLY_OBJECTIVE,
    PICCElementType.NFA_AREA, PICCElementType.RFA_AREA, PICCElementType.CONTROL_AREA_GENERIC
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
        <div className="absolute top-16 left-[9.5rem] z-[100] bg-slate-950/90 backdrop-blur-md border border-slate-800/80 rounded-xl p-4 w-60 shadow-2xl flex flex-col gap-3 animate-in fade-in slide-in-from-top-2">
          <h4 className="text-sm font-semibold text-slate-200 border-b border-slate-700 pb-2">Filtros de Capa</h4>
          
          <div className="space-y-3 pt-1">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Capas de Inteligencia</p>
            
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-300">Inteligencia (Intel)</span>
              <input type="checkbox" checked={showIntelligenceLayer} onChange={e => setShowIntelligenceLayer(e.target.checked)} className="w-4 h-4 accent-sky-500 rounded cursor-pointer" />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-300">Hotspots (BMA)</span>
              <input type="checkbox" checked={showHotspotsLayer} onChange={e => setShowHotspotsLayer(e.target.checked)} className="w-4 h-4 accent-sky-500 rounded cursor-pointer" />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-300">Histórico Hotspots</span>
              <input type="checkbox" checked={showHistoricalHotspots} onChange={e => setShowHistoricalHotspots(e.target.checked)} className="w-4 h-4 accent-sky-500 rounded cursor-pointer" />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-300">Noticias OSINT (IA)</span>
              <input type="checkbox" checked={showOsintLayer} onChange={e => setShowOsintLayer(e.target.checked)} className="w-4 h-4 accent-sky-500 rounded cursor-pointer" />
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
