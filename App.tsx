

import React, { useState, useCallback, useEffect, useRef } from 'react';
// FIX: Import `Type` for function declaration schema.
import { GoogleGenAI, LiveServerMessage, Modality, Blob as GenaiBlob, Type } from "@google/genai";
import { HeaderComponent } from './components/HeaderComponent';
import { SidebarComponent } from './components/SidebarComponent';
import { Squares2X2Icon } from './components/icons/Squares2X2Icon';
import { MapPinIcon } from './components/icons/MapPinIcon';
import { BellAlertIcon } from './components/icons/BellAlertIcon';
import { ChatBubbleOvalLeftEllipsisIcon } from './components/icons/ChatBubbleOvalLeftEllipsisIcon';
import { ResizableDivider } from './components/ResizableDivider';
import { DashboardView } from './components/DashboardView';
import { UnitsView } from './components/UnitsView';
import { IntelView } from './components/IntelView';
import { AlertsView } from './components/AlertsView';
import { AnalysisView } from './components/AnalysisView';
import { CommunicationsView } from './components/CommunicationsView';
import { ArtilleryViewComponent } from './components/ArtilleryViewComponent';
import { HistoricalViewComponent } from './components/HistoricalViewComponent';
import { Q5ViewComponent } from './components/Q5ViewComponent';
import { RetrainingAreaViewComponent } from './components/RetrainingAreaViewComponent';
import { UnitHistoryViewComponent } from './components/UnitHistoryViewComponent';
import { InsitopViewComponent } from './components/InsitopViewComponent';
import { SpotViewComponent } from './components/SpotViewComponent';
import { ORDOPViewComponent } from './components/ORDOPViewComponent';
import { LoginViewComponent } from './components/LoginViewComponent';
import { UserManagementViewComponent } from './components/UserManagementViewComponent';
import { OrganizationStructureView } from './components/OrganizationStructureView';
import { PlatoonCommanderView } from './components/platoon/PlatoonCommanderView';
import { CompanyCommanderView } from './components/company/CompanyCommanderView';
import { LogisticsViewComponent } from './components/LogisticsViewComponent';
import SettingsView from './components/SettingsView';
import { PersonnelView } from './components/PersonnelView';
import { UAVManagementView } from './components/UAVManagementView';
import { SimpleErrorBoundary } from './components/SimpleErrorBoundary';
import { BMAPanel } from './components/BMAPanel';
import { MobileBottomNavComponent } from './components/MobileBottomNavComponent';
import { useBackendData } from './hooks/useBackendData';
import { getCommandFromGemini, encode, decode, decodeAudioData } from './utils/geminiService';
import { eventBus } from './utils/eventEmitter';
import { ViewType, MapEntityType, UnitStatus, PlantillaType, UserRole, UnitType as UnitTypeEnum, AlertType } from './types';
import type { MilitaryUnit, IntelligenceReport, Alert, SelectedEntity, AfterActionReport, Q5Report, PICCDrawConfig, SpotReportPayload, OperationsOrder, User, TargetSelectionRequest, GeoLocation, ForwardObserver, NewArtilleryPieceData, LogisticsRequest, PendingFireMission, ActiveFireMission, FiringSolution, ProjectileType, UserTelegramConfig, NewUserData, UpdateUserData, Hotspot } from './types';
import { MapDisplayComponent } from './components/MapDisplayComponent';
import { bmaService } from './services/bmaService';
import { uavService } from './services/uavService';
import { apiClient } from './utils/apiClient';
import { userService } from './services/userService';

const SIMCOP_USER_SESSION_KEY = 'simcop_currentUser_id';

// Remove static initialization
// const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
// const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;
// if (!ai) {
//   console.warn("API_KEY de Gemini no está configurada. Las funciones de IA, como el comando por voz, no funcionarán.");
// }

import { configService } from './services/configService';


const App: React.FC = () => {
  const [aiClient, setAiClient] = useState<GoogleGenAI | null>(null);

  // Fetch API Key from backend on mount (for voice features)
  useEffect(() => {
    const initAi = async () => {
      try {
        const apiKey = await configService.getGeminiApiKey();
        if (apiKey) {
          console.log("✅ [App] Gemini API Key loaded for voice features");
          setAiClient(new GoogleGenAI({ apiKey }));
        } else {
          console.warn("⚠️ [App] Gemini API Key not found - voice features disabled");
        }
      } catch (error: any) {
        // Silently handle 403 errors - they happen when not authenticated yet
        if (error.message && !error.message.includes('403')) {
          console.error("❌ [App] Error loading Gemini API Key:", error);
        }
      }
    };
    initAi();
  }, []);

  const [currentView, setCurrentView] = useState<ViewType>(ViewType.DASHBOARD);

  useEffect(() => {
    console.log('Current view changed to:', currentView);
  }, [currentView]);

  const data = useBackendData();
  const {
    units, intelligenceReports, alerts, afterActionReports, q5Reports, operationsOrders,
    artilleryPieces, forwardObservers, activeFireMissions, pendingFireMissions,
    logisticsRequests, userTelegramConfigs,
    q5GeneratingStatus, q5SendingStatus, unitHistoryLog, users, login, addUser: addSystemUser,
    updateUser: updateSystemUser, deleteUser: deleteSystemUser,
    acknowledgeAlert, addIntelReport, addManualRoutePoint, updateUnitLogistics,
    updateUnitAttributes, markUnitHourlyReport, reportUnitEngaged, reportUnitCeasefire,
    addAfterActionReport, sendTestTelegramAlert, addUnit, generateAndAddQ5Report,
    sendQ5ReportViaTelegram, sendUnitToRetraining, returnUnitFromRetraining,
    startUnitLeave, startUnitRetraining, updateUnitMission, updateUnitSituation,
    processSpotReport, addOperationsOrder, updateOperationsOrder, publishOperationsOrder,
    addUnitHierarchy, updateUnitHierarchyDetails, deleteUnitHierarchy, assignCommanderToOrganizationalUnit,
    addArtilleryPiece, acknowledgeOperationsOrder, submitAmmoExpenditureReport, logPlatoonNovelty,
    approvePlatoonNovelty, approveAmmoReport, rejectAmmoReport, rejectPlatoonNovelty,
    fulfillLogisticsRequest, addForwardObserver, confirmShotFired,
    requestFireMission, acceptFireMission, updateUserTelegramConfig,
    rejectFireMission, dismissPendingMission, addLogisticsRequest,
    assignUAVAsset, removeUAVAsset, refreshData
  } = data;



  const [selectedEntity, setSelectedEntity] = useState<SelectedEntity | null>(null);
  const [selectedAAR, setSelectedAAR] = useState<AfterActionReport | null>(null);
  const [selectedQ5Report, setSelectedQ5Report] = useState<Q5Report | null>(null);
  const [selectedORDOP, setSelectedORDOP] = useState<OperationsOrder | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [entityToPanTo, setEntityToPanTo] = useState<SelectedEntity | null>(null);
  const [hotspots, setHotspots] = useState<Hotspot[]>([]);
  const [historicalHotspots, setHistoricalHotspots] = useState<Hotspot[]>([]);

  // Load data when user is authenticated
  useEffect(() => {
    if (currentUser) {
      console.log("User authenticated, refreshing backend data...");
      refreshData();
    }
  }, [currentUser, refreshData]);

  const fetchHotspots = useCallback(() => {
    bmaService.getHotspots()
      .then(setHotspots)
      .catch(console.error);

    bmaService.getHistoricalHotspots(48)
      .then(setHistoricalHotspots)
      .catch(console.error);
  }, []); // Dependencies empty as setters are stable

  useEffect(() => {
    if (!currentUser) return;
    fetchHotspots();
    const interval = setInterval(fetchHotspots, 28800000); // Poll every 8h (3 times a day)
    return () => clearInterval(interval);
  }, [currentUser, fetchHotspots]);

  const [distanceToolActive, setDistanceToolActive] = useState<boolean>(false);
  const [aoiDrawingModeActive, setAoiDrawingModeActive] = useState<boolean>(false);
  const [enemyInfluenceLayerActive, setEnemyInfluenceLayerActive] = useState<boolean>(false);
  const [elevationProfileActive, setElevationProfileActive] = useState<boolean>(false);
  const [piccDrawingConfig, setPiccDrawingConfig] = useState<PICCDrawConfig | null>(null);
  const [activePICCPlantillaContext, setActivePICCPlantillaContext] = useState<PlantillaType | null>(null);
  const [targetSelectionRequest, setTargetSelectionRequest] = useState<TargetSelectionRequest | null>(null);

  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [isMapMaximized, setIsMapMaximized] = useState<boolean>(false);

  // Voice Command State
  const [isVoiceCommandActive, setIsVoiceCommandActive] = useState(false);
  const [isConnectingVoice, setIsConnectingVoice] = useState(false);
  const sessionPromiseRef = useRef<Promise<any> | null>(null);
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const audioWorkletNodeRef = useRef<AudioWorkletNode | null>(null);
  const mediaStreamSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const audioPlaybackSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const nextStartTimeRef = useRef<number>(0);


  const MIN_PANEL_WIDTH = 280;
  const DIVIDER_WIDTH = 8;

  const calculateInitialContentWidth = () => {
    if (typeof window !== 'undefined') {
      if (window.innerWidth < 1024) return 0;
      let initialFraction = 0.33;
      if (window.innerWidth >= 1280) {
        initialFraction = 0.28;
      }
      return Math.max(MIN_PANEL_WIDTH, Math.floor(window.innerWidth * initialFraction));
    }
    return 450;
  };

  const [contentWidth, setContentWidth] = useState<number>(calculateInitialContentWidth);
  // FIX: Initialize useRef with null to prevent using the variable before declaration.
  const mainContainerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const checkSession = async () => {
      const token = apiClient.getToken();
      if (token && !currentUser) {
        try {
          const user = await userService.getCurrentUser();
          setCurrentUser(user);
          eventBus.publish('USER_LOGIN_SUCCESS', user);
          console.log("Session restored for user:", user.username);
        } catch (error) {
          console.warn("Session token invalid or expired.");
          apiClient.setToken('');
        }
      }
    };
    checkSession();
  }, [currentUser]);

  const handleLoginSuccess = useCallback((user: User) => {
    setCurrentUser(user);
    // localStorage.setItem(SIMCOP_USER_SESSION_KEY, user.id); // Disabled for security
    eventBus.publish('USER_LOGIN_SUCCESS', user);
    const loginFailedAlert = alerts.find(a => a.type === AlertType.USER_LOGIN_FAILED && (a.message.includes(user.username) || a.userId === user.id) && !a.acknowledged);
    if (loginFailedAlert) acknowledgeAlert(loginFailedAlert.id);
  }, [alerts, acknowledgeAlert]);

  const handleLogout = useCallback(() => {
    if (currentUser) {
      eventBus.publish('USER_LOGOUT', { userId: currentUser.id, username: currentUser.username });
    }
    setCurrentUser(null);
    apiClient.clearToken();
    localStorage.removeItem(SIMCOP_USER_SESSION_KEY);
    setCurrentView(ViewType.DASHBOARD);
  }, [currentUser]);

  useEffect(() => {
    const onLogoutEvent = () => handleLogout();
    window.addEventListener('simcop-logout', onLogoutEvent);
    return () => window.removeEventListener('simcop-logout', onLogoutEvent);
  }, [handleLogout]);

  useEffect(() => {
    const handleResize = () => {
      const mobileCheck = window.innerWidth < 1024;
      if (mobileCheck !== isMobile) {
        setIsMobile(mobileCheck);
        if (!mobileCheck) {
          setIsMobileNavOpen(false);
          setContentWidth(calculateInitialContentWidth());
        }
      } else if (!mobileCheck) {
        setContentWidth(prevWidth => {
          const newProportionalWidth = calculateInitialContentWidth();
          if (mainContainerRef.current) {
            const mainContainerTotalWidth = mainContainerRef.current.offsetWidth;
            const maxPossibleWidth = mainContainerTotalWidth - MIN_PANEL_WIDTH - DIVIDER_WIDTH;
            return Math.min(newProportionalWidth, maxPossibleWidth);
          }
          return newProportionalWidth;
        });
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isMobile]);

  const handleSelectEntity = useCallback((entity: SelectedEntity | null) => {
    setSelectedEntity(entity);
    setSelectedORDOP(null);
    if (entity?.type === MapEntityType.AAR) {
      const aar = afterActionReports.find(r => r.id === entity.id);
      setSelectedAAR(aar || null);
      setSelectedQ5Report(null);
    } else if (entity?.type === MapEntityType.UNIT) {
      setSelectedAAR(null);
      setSelectedQ5Report(null);
    } else {
      setSelectedAAR(null);
    }
    if (entity && isMobile && currentView !== ViewType.MAP) {
      setCurrentView(ViewType.MAP);
    }
  }, [afterActionReports, isMobile, currentView]);

  const handleSelectAARFromList = useCallback((aar: AfterActionReport) => {
    setSelectedAAR(aar);
    setSelectedEntity({ type: MapEntityType.AAR, id: aar.id });
    setSelectedQ5Report(null);
    setSelectedORDOP(null);
    if (isMobile && currentView !== ViewType.MAP) {
      setCurrentView(ViewType.MAP);
    }
  }, [isMobile, currentView]);

  const handleSelectQ5ReportFromList = useCallback((q5: Q5Report) => {
    setSelectedQ5Report(q5);
    setSelectedORDOP(null);
    const aar = afterActionReports.find(r => r.id === q5.aarId);
    if (aar) {
      setSelectedAAR(aar);
      setSelectedEntity({ type: MapEntityType.AAR, id: aar.id });
    } else {
      setSelectedAAR(null);
      setSelectedEntity(null);
    }
    if (isMobile && currentView !== ViewType.MAP) {
      setCurrentView(ViewType.MAP);
    }
  }, [afterActionReports, isMobile, currentView]);

  const handleSelectORDOPFromList = useCallback((ordop: OperationsOrder) => {
    setSelectedORDOP(ordop);
    setSelectedEntity({ type: MapEntityType.ORDOP, id: ordop.id });
    setSelectedAAR(null);
    setSelectedQ5Report(null);
  }, []);

  const handlePrepareORDOPFromBMA = useCallback((rec: any, intel: any) => {
    // Generate a draft ORDOP from BMA recommendation
    const draftOrder = {
      orderNumber: `BMA-${Date.now().toString().slice(-4)}`,
      title: `Operación de respuesta a: ${intel.title}`,
      issuerId: currentUser?.id || '',
      recipientIds: [], // User needs to select
      status: 'borrador',
      situation: `Respuesta sugerida por BMA ante reporte de inteligencia: ${intel.details}. Unidad recomendada: ${rec.unitName}.`,
      mission: `La unidad ${rec.unitName} procederá a interceptar y neutralizar la amenaza identificada en ${intel.location.lat}, ${intel.location.lon}.`,
      execution: `1. Desplazamiento inmediato al sector.\n2. Establecimiento de contacto.\n3. Reporte de situación cada 15 minutos.`,
      logistics: `Mantener carga básica de munición y combustible.`,
      commandAndSignal: `Comandante de operación: Cmdte ${rec.unitName}. Frecuencia de radio según red de comando.`,
      creationTimestamp: Date.now()
    };

    addOperationsOrder(draftOrder as any);
    setCurrentView(ViewType.ORDOP);
    // The new order will be the last one in the list, or we could find it.
  }, [currentUser, addOperationsOrder]);

  const handleCallForFire = useCallback((requester: ForwardObserver | MilitaryUnit) => {
    setTargetSelectionRequest({ requester });
    // Deactivate other tools
    setDistanceToolActive(false);
    setAoiDrawingModeActive(false);
    setElevationProfileActive(false);
    setPiccDrawingConfig(null);
  }, []);

  const handleTargetSelected = useCallback((location: GeoLocation) => {
    if (targetSelectionRequest) {
      requestFireMission(targetSelectionRequest.requester.id, location);
      setTargetSelectionRequest(null); // Mission request sent, clear the state
    }
  }, [targetSelectionRequest, requestFireMission]);

  const handleCancelFireMission = useCallback(() => {
    setTargetSelectionRequest(null);
  }, []);

  const handleToggleMapMaximize = useCallback(() => {
    setIsMapMaximized(prev => !prev);
  }, []);

  const handleAiCommand = useCallback(async (command: string) => {
    try {
      const result = await getCommandFromGemini(command, units.map(u => u.name));
      if (result && result.name === 'focusOnUnit' && result.args.unitName) {
        const unitNameToFind = result.args.unitName.toLowerCase();
        const foundUnit = units.find(u => u.name.toLowerCase().includes(unitNameToFind));
        if (foundUnit) {
          setEntityToPanTo({ type: MapEntityType.UNIT, id: foundUnit.id });
        } else {
          console.warn(`AI command: Unit "${result.args.unitName}" not found.`);
        }
      }
    } catch (error) {
      console.error("Error processing AI command:", error);
    }
  }, [units]);

  const handleToggleVoiceCommand = useCallback(async () => {
    if (isConnectingVoice) return;

    if (isVoiceCommandActive) {
      if (sessionPromiseRef.current) {
        sessionPromiseRef.current.then(session => {
          session.close();
        });
        sessionPromiseRef.current = null;
      }
      return; // onclose callback will handle state updates
    }

    setIsConnectingVoice(true);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!aiClient) {
        alert("La API KEY de Gemini no está configurada en el backend. Por favor vaya a Configuración y agregue una clave válida.");
        setIsConnectingVoice(false);
        return;
      }

      if (!inputAudioContextRef.current) inputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      if (!outputAudioContextRef.current) outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });

      const sessionPromise = aiClient.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          systemInstruction: {
            parts: [{
              text: `Eres SIMCOP-VOICE, el asistente táctico de mando. Tienes acceso a datos de Batalla (BMA), Clima y Unidades.
              Tu tono es profesional, militar y eficiente.
              Capacidades actuales:
              - Puedes enfocar unidades en el mapa.
              - Puedes informar sobre el clima (ej. 'Hay lluvia intensa, movilidad reducida').
              - Estás al tanto de los Puntos Críticos (hotspots).
              Si el usuario pregunta sobre la situación, resume los puntos clave del BMA.`
            }]
          },
          tools: [{
            functionDeclarations: [
              {
                name: 'focusOnUnit',
                parameters: {
                  type: Type.OBJECT,
                  properties: { unitName: { type: Type.STRING } },
                  required: ['unitName'],
                },
              }
            ]
          }]
        },
        callbacks: {
          onopen: async () => {
            setIsConnectingVoice(false);
            setIsVoiceCommandActive(true);

            const source = inputAudioContextRef.current!.createMediaStreamSource(stream);
            mediaStreamSourceRef.current = source;

            const audioProcessorWorklet = `
              class AudioProcessor extends AudioWorkletProcessor {
                process(inputs) {
                  const inputData = inputs[0][0];
                  if (inputData) {
                    const buffer = new Int16Array(inputData.length);
                    for (let i = 0; i < inputData.length; i++) {
                      buffer[i] = Math.max(-1, Math.min(1, inputData[i])) * 0x7FFF;
                    }
                    this.port.postMessage(buffer, [buffer.buffer]);
                  }
                  return true;
                }
              }
              registerProcessor('audio-processor', AudioProcessor);
            `;

            const blob = new Blob([audioProcessorWorklet], { type: 'application/javascript' });
            const workletURL = URL.createObjectURL(blob);
            let workletNode;

            try {
              await inputAudioContextRef.current!.audioWorklet.addModule(workletURL);
              workletNode = new AudioWorkletNode(inputAudioContextRef.current!, 'audio-processor');
              audioWorkletNodeRef.current = workletNode;
            } catch (e) {
              console.error("Error adding AudioWorklet module:", e);
              stream.getTracks().forEach(track => track.stop());
              if (sessionPromiseRef.current) {
                sessionPromiseRef.current.then(session => session.close());
              }
              return;
            } finally {
              URL.revokeObjectURL(workletURL);
            }

            workletNode.port.onmessage = (event) => {
              const int16Array = event.data as Int16Array;
              const pcmBlob: GenaiBlob = {
                data: encode(new Uint8Array(int16Array.buffer)),
                mimeType: 'audio/pcm;rate=16000',
              };
              if (sessionPromiseRef.current) {
                sessionPromiseRef.current.then((session) => {
                  session.sendRealtimeInput({ media: pcmBlob });
                });
              }
            };
            source.connect(workletNode);
            workletNode.connect(inputAudioContextRef.current!.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
            if (message.serverContent?.modelTurn?.parts[0]?.inlineData?.data) {
              const base64Audio = message.serverContent.modelTurn.parts[0].inlineData.data;
              const outputCtx = outputAudioContextRef.current!;

              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputCtx.currentTime);
              const audioBuffer = await decodeAudioData(decode(base64Audio), outputCtx, 24000, 1);

              const source = outputCtx.createBufferSource();
              source.buffer = audioBuffer;
              source.connect(outputCtx.destination);
              source.addEventListener('ended', () => {
                audioPlaybackSourcesRef.current.delete(source);
              });

              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += audioBuffer.duration;
              audioPlaybackSourcesRef.current.add(source);
            }
            if (message.toolCall?.functionCalls) {
              for (const fc of message.toolCall.functionCalls) {
                if (fc.name === 'focusOnUnit' && fc.args.unitName) {
                  const unitNameToFind = String(fc.args.unitName).toLowerCase();
                  const foundUnitObj = units.find(u => u.name.toLowerCase().includes(unitNameToFind));
                  if (foundUnitObj) {
                    setEntityToPanTo({ type: MapEntityType.UNIT, id: foundUnitObj.id });
                  } else {
                    console.warn(`Voice command: Unit "${fc.args.unitName}" not found.`);
                  }
                }
              }
            }
          },
          onerror: (e: ErrorEvent) => {
            console.error('Voice command error:', e);
            setIsConnectingVoice(false);
            setIsVoiceCommandActive(false);
          },
          onclose: () => {
            stream.getTracks().forEach(track => track.stop());
            audioWorkletNodeRef.current?.disconnect();
            mediaStreamSourceRef.current?.disconnect();
            audioWorkletNodeRef.current = null;
            mediaStreamSourceRef.current = null;
            setIsConnectingVoice(false);
            setIsVoiceCommandActive(false);
          },
        }
      });
      sessionPromiseRef.current = sessionPromise;

    } catch (error) {
      console.error('Error starting voice command session:', error);
      setIsConnectingVoice(false);
      setIsVoiceCommandActive(false);
      alert("No se pudo iniciar el comando por voz. Asegúrese de haber concedido el permiso para el micrófono.");
    }
  }, [isConnectingVoice, isVoiceCommandActive, units]);

  // Fetch BMA Hotspots



  const operationalUnitsForMap = units.filter(u =>
    u.status !== UnitStatus.ON_LEAVE_RETRAINING &&
    (
      u.type === UnitTypeEnum.PLATOON ||
      u.type === UnitTypeEnum.TEAM ||
      u.type === UnitTypeEnum.SQUAD
    )
  );
  const retrainingUnitsForView = units.filter(u => u.status === UnitStatus.ON_LEAVE_RETRAINING);

  const mapDisplayProps = {
    units: operationalUnitsForMap,
    intelligenceReports,
    artilleryPieces,
    forwardObservers,
    activeFireMissions: activeFireMissions as ActiveFireMission[],
    afterActionReports,
    selectedEntity,
    onSelectEntityOnMap: handleSelectEntity,
    distanceToolActive,
    aoiDrawingModeActive,
    enemyInfluenceLayerActive,
    elevationProfileActive,
    piccDrawingConfig,
    onPiccDrawingComplete: () => setPiccDrawingConfig(null),
    activeTemplateContext: activePICCPlantillaContext,
    isTargetSelectionActive: !!targetSelectionRequest,
    onTargetSelected: handleTargetSelected,
    eventBus: eventBus,
    entityToPanTo: entityToPanTo,
    hotspots: hotspots,
    historicalHotspots: historicalHotspots,
    isMaximized: isMapMaximized,
    onToggleMaximize: handleToggleMapMaximize,
  };

  const analysisViewProps = {
    units: operationalUnitsForMap, // Use the same filtered units for analysis context if needed
    intelligenceReports,
    distanceToolActive,
    setDistanceToolActive,
    aoiDrawingModeActive,
    setAoiDrawingModeActive,
    enemyInfluenceLayerActive,
    setEnemyInfluenceLayerActive,
    elevationProfileActive,
    setElevationProfileActive,
    piccDrawingConfig,
    setPiccDrawingConfig,
    onSelectEntityOnMap: handleSelectEntity,
    activeTemplateContext: activePICCPlantillaContext,
    setActiveTemplateContext: setActivePICCPlantillaContext,
    eventBus: eventBus,
  };

  const renderView = () => {
    // Check both enum value and enum key for administrator role
    const isAdmin = currentUser?.role === (UserRole as any).ADMINISTRATOR || currentUser?.role === ('ADMINISTRATOR' as any);

    if (!isAdmin && (currentView === ViewType.USER_MANAGEMENT || currentView === ViewType.SETTINGS)) {
      setCurrentView(ViewType.DASHBOARD);
      return <DashboardView units={units} alerts={alerts} intelCount={intelligenceReports.length} onSelectEntity={handleSelectEntity} currentUser={currentUser} approvePlatoonNovelty={approvePlatoonNovelty} approveAmmoReport={approveAmmoReport} rejectAmmoReport={rejectAmmoReport} rejectPlatoonNovelty={rejectPlatoonNovelty} intelligenceReports={intelligenceReports} allUnits={units} />;
    }

    // Helper to get the enum key from the enum value
    const getViewTypeKey = (viewTypeValue: ViewType): string => {
      const entries = Object.entries(ViewType) as [string, ViewType][];
      const entry = entries.find(([_, value]) => value === viewTypeValue);
      return entry ? entry[0] : viewTypeValue;
    };

    // Check permissions with both enum value (Spanish) and enum key (English)
    if (currentUser && currentView !== ViewType.DASHBOARD && !isAdmin) {
      const hasPermission = currentUser.permissions?.includes(currentView as any) ||
        currentUser.permissions?.includes(getViewTypeKey(currentView) as any);

      if (!hasPermission && currentView !== ViewType.MAP) { // MAP is a special case
        setCurrentView(ViewType.DASHBOARD);
        return <DashboardView units={units} alerts={alerts} intelCount={intelligenceReports.length} onSelectEntity={handleSelectEntity} currentUser={currentUser} approvePlatoonNovelty={approvePlatoonNovelty} approveAmmoReport={approveAmmoReport} rejectAmmoReport={rejectAmmoReport} rejectPlatoonNovelty={rejectPlatoonNovelty} intelligenceReports={intelligenceReports} allUnits={units} />;
      }
    }


    switch (currentView) {
      case ViewType.DASHBOARD:
        return <DashboardView units={units} alerts={alerts} intelCount={intelligenceReports.length} onSelectEntity={handleSelectEntity} currentUser={currentUser} approvePlatoonNovelty={approvePlatoonNovelty} approveAmmoReport={approveAmmoReport} rejectAmmoReport={rejectAmmoReport} rejectPlatoonNovelty={rejectPlatoonNovelty} intelligenceReports={intelligenceReports} allUnits={units} />;
      case ViewType.UNITS:
        return <UnitsView
          allUnits={units}
          units={units.filter(u => u.type === UnitTypeEnum.PLATOON || u.type === UnitTypeEnum.TEAM || u.type === UnitTypeEnum.SQUAD)}
          onSelectUnit={(unit) => handleSelectEntity({ type: MapEntityType.UNIT, id: unit.id })}
          addManualRoutePoint={addManualRoutePoint}
          updateUnitLogistics={updateUnitLogistics}
          updateUnitAttributes={updateUnitAttributes}
          updateUnitMission={updateUnitMission}
          updateUnitSituation={updateUnitSituation}
          addUnit={addUnit}
          sendUnitToRetraining={sendUnitToRetraining}
          artilleryPieces={artilleryPieces}
          targetSelectionRequest={targetSelectionRequest}
          onCallForFire={handleCallForFire}
          onCancelFireMission={handleCancelFireMission}
          pendingFireMissions={pendingFireMissions}
          dismissPendingMission={dismissPendingMission}
        />;
      case ViewType.INTEL:
        return <IntelView intelReports={intelligenceReports} onSelectIntel={(intel) => handleSelectEntity({ type: MapEntityType.INTEL, id: intel.id })} addIntelReport={addIntelReport} />;
      case ViewType.ALERTS:
        return <AlertsView alerts={alerts} acknowledgeAlert={acknowledgeAlert} currentUser={currentUser} approvePlatoonNovelty={approvePlatoonNovelty} approveAmmoReport={approveAmmoReport} rejectAmmoReport={rejectAmmoReport} rejectPlatoonNovelty={rejectPlatoonNovelty} />;
      case ViewType.ANALYSIS:
        return <AnalysisView {...analysisViewProps} />;
      case ViewType.BMA:
        return <BMAPanel
          selectedEntity={selectedEntity}
          intelligenceReports={intelligenceReports}
          hotspots={hotspots}
          historicalHotspots={historicalHotspots}
          units={units}
          onSelectEntityOnMap={handleSelectEntity}
          onPrepareORDOP={handlePrepareORDOPFromBMA}
          onRefreshHotspots={fetchHotspots}
        />;
      case ViewType.COMMUNICATIONS:
        return (
          <CommunicationsView
            units={units.filter(u => u.status !== UnitStatus.ON_LEAVE_RETRAINING)}
            markUnitHourlyReport={markUnitHourlyReport}
            reportUnitEngaged={reportUnitEngaged}
            reportUnitCeasefire={reportUnitCeasefire}
            addAfterActionReport={addAfterActionReport}
            sendTestTelegramAlert={sendTestTelegramAlert}
            currentUser={currentUser}
            updateUserTelegramConfig={updateUserTelegramConfig}
          />
        );
      case ViewType.ARTILLERY_OBSERVATION:
        return <ArtilleryViewComponent
          artilleryPieces={artilleryPieces}
          forwardObservers={forwardObservers}
          activeFireMissions={activeFireMissions as ActiveFireMission[]}
          pendingFireMissions={pendingFireMissions}
          onSelectEntity={(entity) => handleSelectEntity(entity)}
          targetSelectionRequest={targetSelectionRequest}
          onCallForFire={handleCallForFire}
          onCancelFireMission={handleCancelFireMission}
          addArtilleryPiece={addArtilleryPiece}
          addForwardObserver={addForwardObserver}
          allUnits={units}
          allUsers={users}
          acceptFireMission={acceptFireMission}
          currentUser={currentUser}
          updateUserTelegramConfig={updateUserTelegramConfig}
          sendTestTelegramAlert={sendTestTelegramAlert}
          rejectFireMission={rejectFireMission}
          dismissPendingMission={dismissPendingMission}
          confirmShotFired={confirmShotFired}
        />;
      case ViewType.UAV_MANAGEMENT:
        return <UAVManagementView
          units={units}
          onAssignUAV={async (unitId, asset) => {
            const result = await assignUAVAsset(unitId, asset);
            if (result.success) alert("Activo UAV asignado correctamente.");
            else alert("Error al asignar activo UAV: " + result.message);
          }}
          onDeleteUAV={async (unitId, assetId) => {
            const result = await removeUAVAsset(unitId, assetId);
            if (result.success) alert("Activo UAV eliminado correctamente.");
            else alert("Error al eliminar activo UAV: " + result.message);
          }}
          addUnit={addUnit}
        />;
      case ViewType.ORDOP:
        return <ORDOPViewComponent
          operationsOrders={operationsOrders}
          addOperationsOrder={addOperationsOrder}
          updateOperationsOrder={updateOperationsOrder}
          selectedORDOP={selectedORDOP}
          onSelectORDOP={handleSelectORDOPFromList}
          publishOperationsOrder={publishOperationsOrder}
          allUsers={users}
          allUnits={units}
        />;
      case ViewType.ORGANIZATION_STRUCTURE:
        return <OrganizationStructureView
          organizationalUnits={units}
          allUsers={users}
          addUnitHierarchy={addUnitHierarchy}
          updateUnitHierarchyDetails={updateUnitHierarchyDetails}
          deleteUnitHierarchy={deleteUnitHierarchy}
          assignCommanderToOrganizationalUnit={assignCommanderToOrganizationalUnit}
        />;
      case ViewType.HISTORICAL:
        return <HistoricalViewComponent afterActionReports={afterActionReports} units={units} onSelectAAR={handleSelectAARFromList} selectedAAR={selectedAAR} generateAndAddQ5Report={generateAndAddQ5Report} q5Reports={q5Reports} q5GeneratingStatus={q5GeneratingStatus} unitHistoryLog={unitHistoryLog} alerts={alerts} />;
      case ViewType.Q5_REPORT:
        return <Q5ViewComponent q5Reports={q5Reports} selectedQ5Report={selectedQ5Report} onSelectQ5Report={handleSelectQ5ReportFromList} sendQ5ReportViaTelegram={sendQ5ReportViaTelegram} q5SendingStatus={q5SendingStatus} />;
      case ViewType.RETRAINING_AREA:
        return <RetrainingAreaViewComponent retrainingUnits={retrainingUnitsForView} returnUnitFromRetraining={returnUnitFromRetraining} startUnitLeave={startUnitLeave} startUnitRetraining={startUnitRetraining} />;
      case ViewType.UNIT_HISTORY:
        return <UnitHistoryViewComponent units={units} unitHistoryLog={unitHistoryLog} />;
      case ViewType.INSITOP:
        return <InsitopViewComponent operationalUnits={units.filter(u => u.status !== UnitStatus.ON_LEAVE_RETRAINING)} />;
      case ViewType.SPOT:
        return <SpotViewComponent units={units} processSpotReport={processSpotReport} />;
      case ViewType.LOGISTICS:
        return <LogisticsViewComponent requests={logisticsRequests} fulfillRequest={fulfillLogisticsRequest} currentUser={currentUser} allUnits={units} addLogisticsRequest={addLogisticsRequest} updateUnitLogistics={updateUnitLogistics} />;
      case ViewType.USER_MANAGEMENT:
        return <UserManagementViewComponent
          users={users}
          addUser={async (userData: NewUserData) => {
            const result = addSystemUser(userData);
            return result;
          }}
          updateUser={async (userId: string, userData: UpdateUserData) => {
            const result = updateSystemUser(userId, userData);
            return result;
          }}
          deleteUser={async (userId: string, currentAdminUserId: string) => {
            const result = deleteSystemUser(userId, currentAdminUserId);
            return result;
          }}
          currentUser={currentUser}
          allUnits={units}
        />;
      case ViewType.PERSONNEL:
        return <PersonnelView units={units} />;
      case ViewType.SETTINGS:
        return <SettingsView />;
      case ViewType.MAP:
        return <div className="text-gray-400 p-4">Cargando Mapa... (La vista de mapa principal se muestra en el panel derecho en escritorio)</div>;
      default:
        return <DashboardView units={units} alerts={alerts} intelCount={intelligenceReports.length} onSelectEntity={handleSelectEntity} currentUser={currentUser} approvePlatoonNovelty={approvePlatoonNovelty} approveAmmoReport={approveAmmoReport} rejectAmmoReport={rejectAmmoReport} rejectPlatoonNovelty={rejectPlatoonNovelty} intelligenceReports={intelligenceReports} allUnits={units} />;
    }
  };

  const handleDividerDrag = useCallback((deltaX: number) => {
    setContentWidth(prevWidth => {
      if (!mainContainerRef.current) return prevWidth;

      const mainContainerTotalWidth = mainContainerRef.current.offsetWidth;
      let newWidth = prevWidth + deltaX;

      newWidth = Math.max(MIN_PANEL_WIDTH, newWidth);

      const maxContentWidth = mainContainerTotalWidth - MIN_PANEL_WIDTH - DIVIDER_WIDTH;
      newWidth = Math.min(newWidth, maxContentWidth);

      return newWidth;
    });
  }, []);

  if (!currentUser) {
    return <LoginViewComponent onLoginSuccess={handleLoginSuccess} loginFunction={login} />;
  }

  // Role-based rendering logic
  if (currentUser.role === UserRole.COMANDANTE_PELOTON) {
    return (
      <PlatoonCommanderView
        isMobile={isMobile}
        currentUser={currentUser}
        onLogout={handleLogout}
        allUnits={units}
        operationsOrders={operationsOrders}
        artilleryPieces={artilleryPieces}
        forwardObservers={forwardObservers}
        activeFireMissions={activeFireMissions as ActiveFireMission[]}
        unitHistoryLog={unitHistoryLog}
        acknowledgeOperationsOrder={acknowledgeOperationsOrder}
        submitAmmoExpenditureReport={submitAmmoExpenditureReport}
        logPlatoonNovelty={logPlatoonNovelty}
        onCallForFire={handleCallForFire}
        onCancelFireMission={handleCancelFireMission}
        targetSelectionRequest={targetSelectionRequest}
        eventBus={eventBus}
        entityToPanTo={entityToPanTo}
        onTargetSelected={handleTargetSelected}
        pendingFireMissions={pendingFireMissions}
        dismissPendingMission={dismissPendingMission}
      />
    );
  }

  if (currentUser.role === UserRole.COMANDANTE_COMPANIA) {
    return (
      <CompanyCommanderView
        isMobile={isMobile}
        currentUser={currentUser}
        onLogout={handleLogout}
        allUnits={units}
        operationsOrders={operationsOrders}
        alerts={alerts}
        unitHistoryLog={unitHistoryLog}
        acknowledgeOperationsOrder={acknowledgeOperationsOrder}
        approveAmmoReport={approveAmmoReport}
        rejectAmmoReport={rejectAmmoReport}
        approvePlatoonNovelty={approvePlatoonNovelty}
        rejectPlatoonNovelty={rejectPlatoonNovelty}
        eventBus={eventBus}
        entityToPanTo={entityToPanTo}
      />
    );
  }

  const handleSetView = (view: ViewType) => {
    console.log('App: handleSetView called with:', view);
    setCurrentView(view);
  };

  // Default view for other roles
  return (
    <div className="flex flex-col h-screen bg-[#0d1117] text-gray-100 antialiased font-sans selection:bg-blue-500/30">
      <HeaderComponent
        isMobile={isMobile}
        onToggleMobileNav={() => setIsMobileNavOpen(!isMobileNavOpen)}
        currentUser={currentUser}
        onLogout={handleLogout}
        onAiCommand={handleAiCommand}
        onToggleVoiceCommand={handleToggleVoiceCommand}
        isVoiceCommandActive={isVoiceCommandActive}
        isConnectingVoice={isConnectingVoice}
      />
      <div className="flex flex-1 overflow-hidden relative">
        {/* Elite background effect */}
        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_50%_50%,rgba(17,24,39,1)_0%,rgba(13,17,23,1)_100%)]"></div>

        {!isMobile && (
          <SidebarComponent
            currentView={currentView}
            setCurrentView={handleSetView}
            currentUser={currentUser}
          />
        )}
        {isMobile && isMobileNavOpen && (
          <div
            className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-md transition-all animate-in fade-in"
            onClick={() => setIsMobileNavOpen(false)}
          >
            <div
              className="fixed top-0 left-0 h-full z-[70] shadow-2xl animate-in slide-in-from-left duration-300"
              onClick={e => e.stopPropagation()}
            >
              <SidebarComponent
                currentView={currentView}
                setCurrentView={(view) => { setCurrentView(view); setIsMobileNavOpen(false); }}
                currentUser={currentUser}
              />
            </div>
          </div>
        )}

        {isMobile ? (
          <>
            {currentView === ViewType.MAP ? (
              <main className="flex-1 flex h-full w-full relative z-10 pb-16">
                <div className="w-full h-full">
                  <MapDisplayComponent {...mapDisplayProps} />
                </div>
              </main>
            ) : (
              <main className="flex-1 flex p-2 md:p-4 overflow-y-auto h-full w-full relative z-10 pb-20">
                <div className="w-full h-full glass-effect rounded-2xl p-4 shadow-2xl">
                  <SimpleErrorBoundary viewName={currentView || 'Unknown'}>
                    {renderView()}
                  </SimpleErrorBoundary>
                </div>
              </main>
            )}
            <MobileBottomNavComponent
              currentView={currentView}
              setCurrentView={setCurrentView}
              items={[
                { label: 'COCT', view: ViewType.DASHBOARD, icon: Squares2X2Icon },
                { label: 'MAPA', view: ViewType.MAP, icon: MapPinIcon },
                { label: 'ALERTAS', view: ViewType.ALERTS, icon: BellAlertIcon },
                { label: 'COMMS', view: ViewType.COMMUNICATIONS, icon: ChatBubbleOvalLeftEllipsisIcon },
              ]}
            />
          </>
        ) : (
          <main ref={mainContainerRef} className="flex-1 flex overflow-hidden relative z-10">
            <div className={`h-full overflow-hidden flex flex-col soft-transition ${isMapMaximized ? 'w-0 opacity-0 pointer-events-none' : ''}`} style={{ flex: isMapMaximized ? '0 0 0' : `0 0 ${contentWidth}px` }}>
              <div className="flex-1 p-4 md:p-6 overflow-y-auto custom-scrollbar">
                <div className="animate-in fade-in slide-in-from-left-4 duration-500">
                  <SimpleErrorBoundary viewName={currentView || 'Unknown'}>
                    {renderView()}
                  </SimpleErrorBoundary>
                </div>
              </div>
            </div>

            {!isMapMaximized && <ResizableDivider onDrag={handleDividerDrag} />}

            <div className="h-full flex-1 p-2 overflow-hidden">
              <div className="glass-effect rounded-2xl shadow-2xl h-full border border-white/5 overflow-hidden map-container-glow">
                <SimpleErrorBoundary viewName="MapDisplay">
                  <MapDisplayComponent {...mapDisplayProps} />
                </SimpleErrorBoundary>
              </div>
            </div>
          </main>
        )}
      </div>
    </div>
  );
};







export default App;
