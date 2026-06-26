
import { useState, useEffect, useCallback } from 'react';
import type { UAVAsset } from '../types';
import type { MilitaryUnit, IntelligenceReport, Alert, GeoLocation, RoutePoint, AfterActionReport, NewUnitData, Q5Report, Q5ContentPayload, UnitHistoryEvent, UnitHistoryEventType, INSITOPReport, UnitINSITOPDetail, UseSimulatedDataReturn, PersonnelStrengthINSITOP, CommanderDetailsINSITOP, UnitIdentificationINSITOP, LocationDetailsINSITOP, VehiclesAndMotorcyclesINSITOP, PersonnelBreakdown, CommanderInfo, SpotReportPayload, OperationsOrder, NewOperationsOrderData, UpdateOperationsOrderData, User, NewUserData, UpdateUserData, NewHierarchyUnitData, UpdateHierarchyUnitData, ArtilleryPiece, ForwardObserver, FireMission, AmmoStock, AmmoType, NewArtilleryPieceData, LogisticsRequest, NewForwardObserverData, ProjectileType, FiringSolution, PendingFireMission, ActiveFireMission, UserTelegramConfig } from '../types';
import { UnitType, UnitStatus, IntelligenceSourceType, IntelligenceReliability, IntelligenceCredibility, AlertType, AlertSeverity, MoraleLevel, MapEntityType, UnitSituationINSITOP, OperationsOrderStatus, OperationsOrderClassification, UserRole, ViewType, ArtilleryType, ArtilleryStatus, ForwardObserverStatus, LogisticsRequestStatus } from '../types';
import {
  NO_MOVEMENT_THRESHOLD_MS, DANGEROUS_ROUTINE_MIN_REPETITIONS, DANGEROUS_ROUTINE_SEQUENCE_LENGTH,
  DANGEROUS_ROUTINE_MAX_HISTORY_CHECK, SIMULATION_UPDATE_INTERVAL_MS, MAX_ROUTE_HISTORY_LENGTH,
  UNIT_NAMES_PREFIX, UNIT_NAMES_SUFFIX_COMPANY, UNIT_NAMES_SUFFIX_PLATOON, UNIT_NAMES_SUFFIX_TEAM,
  COMMANDERS, EQUIPMENT_LIST, CAPABILITIES_LIST, INTEL_TITLES, INTEL_KEYWORDS,
  INTEL_SOURCE_DETAILS_HUMINT, INTEL_SOURCE_DETAILS_SIGINT, INTEL_SOURCE_DETAILS_IMINT, INTEL_SOURCE_DETAILS_OSINT, MAP_BOUNDS,
  COMMUNICATION_REPORT_INTERVAL_MS, COMMUNICATION_OVERDUE_THRESHOLD_MS,
  TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID, MISSION_TYPES, USER_ROLE_TO_RANK_ABBREVIATION, CAPABILITY_TO_FUNCTION_ID_APP6,
  PRIMARY_UNIT_ROLES_APP6, ARTILLERY_TYPE_DETAILS
} from '../constants';
import { decimalToDMS } from '../utils/coordinateUtils';
import { generateQ5ReportContentFromAAR } from '../utils/geminiService';
import { calculateDistanceAndBearing, calculateDistanceAndAzimuth } from '../utils/ballistics';

export const generateRandomId = () => Math.random().toString(36).substring(2, 15);

const APP_STATE_LOCAL_STORAGE_KEY = 'simcopAppState_v1';
const HASH_SALT = "_simcop_ultra_secure_salt_string_for_simulation_only_do_not_use_in_prod"; // Simulated salt

interface AppState {
  users: User[];
  units: MilitaryUnit[];
  intelligenceReports: IntelligenceReport[];
  alerts: Alert[];
  afterActionReports: AfterActionReport[];
  q5Reports: Q5Report[];
  operationsOrders: OperationsOrder[];
  unitHistoryLog: UnitHistoryEvent[];
  artilleryPieces: ArtilleryPiece[];
  forwardObservers: ForwardObserver[];
  activeFireMissions: ActiveFireMission[];
  pendingFireMissions: PendingFireMission[];
  logisticsRequests: LogisticsRequest[];
  userTelegramConfigs: UserTelegramConfig[];
}

const getRandomLocation = (): GeoLocation => ({
  lat: MAP_BOUNDS.MIN_LAT + Math.random() * (MAP_BOUNDS.MAX_LAT - MAP_BOUNDS.MIN_LAT),
  lon: MAP_BOUNDS.MIN_LON + Math.random() * (MAP_BOUNDS.MAX_LON - MAP_BOUNDS.MIN_LON),
});

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const MAX_UNIT_HISTORY_EVENTS = 200;


const escapeTelegramMarkdownV2 = (text: string): string => {
  if (!text) return '';
  // Escapes characters required by Telegram's MarkdownV2 parser using a regular expression
  // The characters to escape are: _ * [ ] ( ) ~ ` > # + - = | { } . !
  return text.replace(/([_*\[\]()~`>#+\-=|{}.!])/g, '\\$1');
};

const sendTelegramMessage = async (messageText: string, chatId?: string): Promise<boolean> => {
  const targetChatId = chatId || TELEGRAM_CHAT_ID;
  if (!TELEGRAM_BOT_TOKEN) {
    console.error("TELEGRAM_BOT_TOKEN not set.");
    return false;
  }
  if (!targetChatId) {
    console.error("TELEGRAM_CHAT_ID not set.");
    return false;
  }
  const telegramApiUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
  const payload = {
    chat_id: targetChatId,
    text: messageText,
    parse_mode: 'MarkdownV2',
  };
  try {
    const response = await fetch(telegramApiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const responseData = await response.json();
    if (!response.ok || !responseData.ok) {
      console.error(
        'Telegram notification failed:',
        response.status,
        responseData?.description || response.statusText,
        'Payload:',
        JSON.stringify(payload, null, 2) // Enhanced logging for easier debugging
      );
      return false;
    }
    return true;
  } catch (error) {
    console.error('Error sending Telegram notification:', error);
    return false;
  }
};

const generatePersonnelBreakdown = (type: UnitType): PersonnelBreakdown => {
  switch (type) {
    case UnitType.DIVISION:
      return { officers: 10, ncos: 30, professionalSoldiers: 50, slRegulars: 20 };
    case UnitType.BRIGADE:
      return { officers: 5, ncos: 20, professionalSoldiers: 40, slRegulars: 15 };
    case UnitType.BATTALION:
    case UnitType.COMPANY:
      return {
        officers: Math.floor(Math.random() * 3) + 2,
        ncos: Math.floor(Math.random() * 11) + 10,
        professionalSoldiers: Math.floor(Math.random() * 51) + 50,
        slRegulars: Math.floor(Math.random() * 21) + 20,
      };
    case UnitType.PLATOON:
      return {
        officers: 1,
        ncos: Math.floor(Math.random() * 3) + 3,
        professionalSoldiers: Math.floor(Math.random() * 11) + 20,
        slRegulars: Math.floor(Math.random() * 11) + 5,
      };
    case UnitType.TEAM:
    case UnitType.SQUAD:
      return {
        officers: 0,
        ncos: Math.floor(Math.random() * 2) + 1,
        professionalSoldiers: Math.floor(Math.random() * 6) + 5,
        slRegulars: Math.floor(Math.random() * 3),
      };
    case UnitType.COMMAND_POST:
      return {
        officers: Math.floor(Math.random() * 2) + 1,
        ncos: Math.floor(Math.random() * 3) + 2,
        professionalSoldiers: Math.floor(Math.random() * 6) + 5,
        slRegulars: Math.floor(Math.random() * 3),
      };
    default:
      return { officers: 0, ncos: 1, professionalSoldiers: 8, slRegulars: 2 };
  }
};

const hashPassword = (password: string): string => {
  return password + HASH_SALT;
};

const createDefaultAdminUser = (): User => {
  return {
    id: 'default-admin-001', // Fixed ID for consistency
    username: 'santiago.salazar',
    displayName: 'Santiago Salazar',
    hashedPassword: hashPassword('ssc841209'),
    role: UserRole.ADMINISTRATOR,
    permissions: Object.values(ViewType),
    assignedUnitId: null,
  };
};

const loadStateFromLocalStorage = (): AppState | null => {
  try {
    const serializedState = localStorage.getItem(APP_STATE_LOCAL_STORAGE_KEY);
    if (serializedState === null) {
      return null;
    }
    return JSON.parse(serializedState) as AppState;
  } catch (error) {
    console.warn("Error loading state from localStorage:", error);
    return null;
  }
};

const saveStateToLocalStorage = (state: AppState) => {
  try {
    const serializedState = JSON.stringify(state);
    localStorage.setItem(APP_STATE_LOCAL_STORAGE_KEY, serializedState);
  } catch (error) {
    console.warn("Error saving state to localStorage:", error);
  }
};

const formatHechos = (hechosValue: string | { [key: string]: any } | undefined): string => {
  if (!hechosValue) return "No especificado";
  if (typeof hechosValue === 'string') return hechosValue;

  const formatObject = (obj: any, indentLevel = 0): string => {
    let result = '';
    const indent = '  '.repeat(indentLevel);
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        const value = obj[key];
        // Format key: descripcionCronologica -> Descripción Cronológica
        const formattedKey = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
          result += `${indent}${formattedKey}:\n${formatObject(value, indentLevel + 1)}`;
        } else {
          result += `${indent}- ${formattedKey}: ${value}\n`;
        }
      }
    }
    return result;
  };

  if (typeof hechosValue === 'object' && hechosValue !== null) {
    return formatObject(hechosValue).trim();
  }

  return "Contenido de 'hechos' en formato inválido.";
};

const getAmmoTypeFromProjectile = (projectile: ProjectileType): AmmoType => {
  const upperProjectile = projectile.toUpperCase();
  if (upperProjectile.includes('SMOKE') || upperProjectile.includes('L47') || upperProjectile.includes('M722') || upperProjectile.includes('Y12-SMK')) return 'SMOKE';
  if (upperProjectile.includes('ILLUM') || upperProjectile.includes('M485') || upperProjectile.includes('L48') || upperProjectile.includes('M821') || upperProjectile.includes('Y12-ILL')) return 'ILLUM';
  // Default to HE for all other types, including RAP and Penetrator rounds
  return 'HE';
};


export const useSimulatedData = (): UseSimulatedDataReturn => {
  const [isInitialized, setIsInitialized] = useState(false);

  const [usersInternal, setUsersInternal] = useState<User[]>([]);
  const [units, setUnitsInternal] = useState<MilitaryUnit[]>([]);
  const [intelligenceReports, setIntelligenceReportsInternal] = useState<IntelligenceReport[]>([]);
  const [alerts, setAlertsInternal] = useState<Alert[]>([]);
  const [afterActionReports, setAfterActionReportsInternal] = useState<AfterActionReport[]>([]);
  const [q5Reports, setQ5ReportsInternal] = useState<Q5Report[]>([]);
  const [operationsOrders, setOperationsOrdersInternal] = useState<OperationsOrder[]>([]);
  const [unitHistoryLog, setUnitHistoryLogInternal] = useState<UnitHistoryEvent[]>([]);
  const [artilleryPieces, setArtilleryPiecesInternal] = useState<ArtilleryPiece[]>([]);
  const [forwardObservers, setForwardObserversInternal] = useState<ForwardObserver[]>([]);
  const [activeFireMissions, setActiveFireMissionsInternal] = useState<ActiveFireMission[]>([]);
  const [pendingFireMissions, setPendingFireMissionsInternal] = useState<PendingFireMission[]>([]);
  const [logisticsRequests, setLogisticsRequestsInternal] = useState<LogisticsRequest[]>([]);
  const [userTelegramConfigs, setUserTelegramConfigsInternal] = useState<UserTelegramConfig[]>([]);


  const [q5GeneratingStatus, setQ5GeneratingStatus] = useState<{ [aarId: string]: boolean }>({});
  const [q5SendingStatus, setQ5SendingStatus] = useState<{ [q5Id: string]: boolean }>({});

  const saveCurrentState = useCallback(() => {
    if (!isInitialized) return;
    const currentState: AppState = {
      users: usersInternal,
      units,
      intelligenceReports,
      alerts,
      afterActionReports,
      q5Reports,
      operationsOrders,
      unitHistoryLog,
      artilleryPieces,
      forwardObservers,
      activeFireMissions,
      pendingFireMissions,
      logisticsRequests,
      userTelegramConfigs,
    };
    saveStateToLocalStorage(currentState);
  }, [isInitialized, usersInternal, units, intelligenceReports, alerts, afterActionReports, q5Reports, operationsOrders, unitHistoryLog, artilleryPieces, forwardObservers, activeFireMissions, pendingFireMissions, logisticsRequests, userTelegramConfigs]);


  useEffect(() => {
    try {
      const loadedState = loadStateFromLocalStorage();
      if (loadedState) {
        const adminExists = loadedState.users && loadedState.users.some(u => u.role === UserRole.ADMINISTRATOR);
        const usersToSet = (loadedState.users && loadedState.users.length > 0)
          ? (adminExists ? loadedState.users : [createDefaultAdminUser(), ...loadedState.users.filter(u => u.role !== UserRole.ADMINISTRATOR)])
          : [createDefaultAdminUser()];

        const usersWithAssignmentField = usersToSet.map(u => ({
          ...u,
          assignedUnitId: u.assignedUnitId === undefined ? null : u.assignedUnitId,
        }));
        setUsersInternal(usersWithAssignmentField);

        const unitsWithParentId = (loadedState.units || []).map(u => ({ ...u, parentId: u.parentId === undefined ? null : u.parentId }));

        setUnitsInternal(unitsWithParentId);
        setIntelligenceReportsInternal(loadedState.intelligenceReports || []);
        setAlertsInternal(loadedState.alerts || []);
        setAfterActionReportsInternal(loadedState.afterActionReports || []);
        setQ5ReportsInternal(loadedState.q5Reports || []);
        setOperationsOrdersInternal(loadedState.operationsOrders || []);
        setUnitHistoryLogInternal(loadedState.unitHistoryLog || []);

        const migratedArtillery = (loadedState.artilleryPieces || []).map(p => ({
          ...p,
          commanderId: p.commanderId || 'unassigned',
          directorTiroId: p.directorTiroId || 'unassigned'
        }));
        setArtilleryPiecesInternal(migratedArtillery);

        setForwardObserversInternal(loadedState.forwardObservers || []);
        setActiveFireMissionsInternal(loadedState.activeFireMissions || []);
        setPendingFireMissionsInternal(loadedState.pendingFireMissions || []);
        setLogisticsRequestsInternal(loadedState.logisticsRequests || []);
        setUserTelegramConfigsInternal(loadedState.userTelegramConfigs || []);
      } else {
        // Initialize with a clean slate, except for the default admin user.
        const usersToSet = [
          createDefaultAdminUser(),
        ];
        setUsersInternal(usersToSet);

        setUnitsInternal([]);
        setIntelligenceReportsInternal([]);
        setAlertsInternal([]);
        setAfterActionReportsInternal([]);
        setQ5ReportsInternal([]);
        setOperationsOrdersInternal([]);
        setUnitHistoryLogInternal([]);
        setArtilleryPiecesInternal([]);
        setForwardObserversInternal([]);
        setActiveFireMissionsInternal([]);
        setPendingFireMissionsInternal([]);
        setLogisticsRequestsInternal([]);
        setUserTelegramConfigsInternal([]);
      }
    } catch (error) {
      console.error("CRITICAL ERROR during useSimulatedData initial setup:", error);
      // Fallback to known good defaults if initial setup fails catastrophically
      setUsersInternal([createDefaultAdminUser()]);
      setUnitsInternal([]);
      setIntelligenceReportsInternal([]);
      setAlertsInternal([]);
      setAfterActionReportsInternal([]);
      setOperationsOrdersInternal([]);
      setUnitHistoryLogInternal([]);
      setArtilleryPiecesInternal([]);
      setForwardObserversInternal([]);
      setActiveFireMissionsInternal([]);
      setPendingFireMissionsInternal([]);
      setLogisticsRequestsInternal([]);
      setUserTelegramConfigsInternal([]);
    } finally {
      setIsInitialized(true);
    }
  }, []);

  useEffect(() => {
    if (isInitialized) {
      saveCurrentState();
    }
  }, [isInitialized, saveCurrentState]);

  const addUnitHistoryEvent = useCallback((eventData: Omit<UnitHistoryEvent, 'id' | 'timestamp'>) => {
    setUnitHistoryLogInternal(prevLog => {
      const newEvent: UnitHistoryEvent = {
        ...eventData,
        id: generateRandomId(),
        timestamp: Date.now(),
      };
      const updatedLog = [newEvent, ...prevLog].sort((a, b) => b.timestamp - a.timestamp);
      return updatedLog.length > MAX_UNIT_HISTORY_EVENTS ? updatedLog.slice(0, MAX_UNIT_HISTORY_EVENTS) : updatedLog;
    });
  }, [setUnitHistoryLogInternal]);

  const login = useCallback((username: string, passwordAttempt: string): User | null => {
    const user = usersInternal.find(u => u.username.toLowerCase() === username.toLowerCase());
    if (user && user.hashedPassword === hashPassword(passwordAttempt)) {
      const { hashedPassword, ...userToReturn } = user;
      addUnitHistoryEvent({
        eventType: "Inicio de Sesión Exitoso",
        userId: userToReturn.id,
        username: userToReturn.username,
        details: `Usuario ${userToReturn.username} inició sesión.`
      });
      return userToReturn as User;
    }
    addUnitHistoryEvent({
      eventType: "Intento de Inicio de Sesión Fallido",
      username: username,
      details: `Intento fallido de inicio de sesión para el usuario: ${username}.`
    });
    setAlertsInternal(prev => [{
      id: generateRandomId(), type: AlertType.USER_LOGIN_FAILED, userId: user?.id,
      message: `Intento de inicio de sesión fallido para ${username}.`,
      timestamp: Date.now(), severity: AlertSeverity.MEDIUM, acknowledged: false,
    }, ...prev].sort((a, b) => b.timestamp - a.timestamp).slice(0, 50));
    // FIX: Add missing return statement for failed login case.
    return null;
  }, [usersInternal, addUnitHistoryEvent, setAlertsInternal]);

  const addUser = useCallback((userData: NewUserData): { success: boolean, message?: string } => {
    if (usersInternal.some(u => u.username.toLowerCase() === userData.username.toLowerCase())) {
      const message = `Error: El nombre de usuario '${userData.username}' ya existe.`;
      setAlertsInternal(prev => [{ id: generateRandomId(), type: AlertType.USER_ACTION_FAILED, message, timestamp: Date.now(), severity: AlertSeverity.MEDIUM, acknowledged: false }, ...prev]);
      return { success: false, message };
    }
    if (!userData.password) {
      const message = "Error: La contraseña es requerida para crear un nuevo usuario.";
      setAlertsInternal(prev => [{ id: generateRandomId(), type: AlertType.USER_ACTION_FAILED, message, timestamp: Date.now(), severity: AlertSeverity.MEDIUM, acknowledged: false }, ...prev]);
      return { success: false, message };
    }

    const newUser: User = {
      id: generateRandomId(),
      username: userData.username,
      displayName: userData.displayName,
      hashedPassword: hashPassword(userData.password),
      role: userData.role,
      permissions: userData.permissions,
      assignedUnitId: userData.assignedUnitId || null,
    };
    setUsersInternal(prev => [...prev, newUser]);
    const assignedUnit = newUser.assignedUnitId ? units.find(u => u.id === newUser.assignedUnitId) : null;
    const assignedUnitInfo = assignedUnit ? ` Asignado a: ${assignedUnit.name} (${assignedUnit.type})` : '';

    addUnitHistoryEvent({
      eventType: "Usuario Creado",
      userId: newUser.id,
      username: newUser.username,
      details: `Usuario ${newUser.username} (${newUser.displayName}) creado con rol ${newUser.role}.${assignedUnitInfo} Permisos: ${newUser.permissions.join(', ') || 'Ninguno'}.`
    });
    setAlertsInternal(prev => [{
      id: generateRandomId(), type: AlertType.USER_CREATED, userId: newUser.id,
      message: `Usuario ${newUser.username} creado exitosamente.${assignedUnitInfo}`,
      timestamp: Date.now(), severity: AlertSeverity.INFO, acknowledged: false,
    }, ...prev].sort((a, b) => b.timestamp - a.timestamp).slice(0, 50));
    return { success: true };
  }, [usersInternal, units, addUnitHistoryEvent, setAlertsInternal]);

  const updateUser = useCallback((userId: string, userData: UpdateUserData): { success: boolean, message?: string } => {
    const userIndex = usersInternal.findIndex(u => u.id === userId);
    if (userIndex === -1) {
      const message = `Error: Usuario con ID ${userId} no encontrado para actualizar.`;
      setAlertsInternal(prev => [{ id: generateRandomId(), type: AlertType.USER_ACTION_FAILED, message, timestamp: Date.now(), severity: AlertSeverity.MEDIUM, acknowledged: false }, ...prev]);
      return { success: false, message };
    }

    const oldUser = usersInternal[userIndex];
    const updatedUserPartial = { ...userData };
    const updatedUserFull: User = {
      ...oldUser,
      displayName: updatedUserPartial.displayName ?? oldUser.displayName,
      role: updatedUserPartial.role ?? oldUser.role,
      permissions: updatedUserPartial.permissions ?? oldUser.permissions,
      assignedUnitId: updatedUserPartial.assignedUnitId !== undefined ? updatedUserPartial.assignedUnitId : oldUser.assignedUnitId,
    };

    if (oldUser.role === UserRole.ADMINISTRATOR && updatedUserFull.role !== UserRole.ADMINISTRATOR) {
      const adminCount = usersInternal.filter(u => u.role === UserRole.ADMINISTRATOR).length;
      if (adminCount <= 1) {
        const message = `Error: No se puede cambiar el rol del último administrador. Debe haber al menos un administrador.`;
        setAlertsInternal(prev => [{ id: generateRandomId(), type: AlertType.USER_ACTION_FAILED, userId: oldUser.id, message, timestamp: Date.now(), severity: AlertSeverity.MEDIUM, acknowledged: false }, ...prev]);
        return { success: false, message };
      }
    }

    setUsersInternal(prev => prev.map(u => u.id === userId ? updatedUserFull : u));
    const oldAssignedUnit = oldUser.assignedUnitId ? units.find(u => u.id === oldUser.assignedUnitId) : null;
    const newAssignedUnit = updatedUserFull.assignedUnitId ? units.find(u => u.id === updatedUserFull.assignedUnitId) : null;
    const oldAssignedUnitInfo = oldAssignedUnit ? `${oldAssignedUnit.name} (${oldAssignedUnit.type})` : 'Ninguna';
    const newAssignedUnitInfo = newAssignedUnit ? `${newAssignedUnit.name} (${newAssignedUnit.type})` : 'Ninguna';

    addUnitHistoryEvent({
      eventType: "Usuario Actualizado",
      userId: updatedUserFull.id,
      username: updatedUserFull.username,
      details: `Usuario ${updatedUserFull.username} actualizado. Nombre: ${updatedUserFull.displayName}, Rol: ${updatedUserFull.role}, Asignado a: ${newAssignedUnitInfo}, Permisos: ${updatedUserFull.permissions.join(', ') || 'Ninguno'}.`,
      oldValue: `Rol: ${oldUser.role}, Asignado a: ${oldAssignedUnitInfo}, Permisos: ${oldUser.permissions.join(', ') || 'Ninguno'}`,
      newValue: `Rol: ${updatedUserFull.role}, Asignado a: ${newAssignedUnitInfo}, Permisos: ${updatedUserFull.permissions.join(', ') || 'Ninguno'}`,
    });
    setAlertsInternal(prev => [{
      id: generateRandomId(), type: AlertType.USER_UPDATED, userId: updatedUserFull.id,
      message: `Usuario ${updatedUserFull.username} actualizado exitosamente.`,
      timestamp: Date.now(), severity: AlertSeverity.INFO, acknowledged: false,
    }, ...prev].sort((a, b) => b.timestamp - a.timestamp).slice(0, 50));
    return { success: true };
  }, [usersInternal, units, addUnitHistoryEvent, setAlertsInternal]);

  const deleteUser = useCallback((userIdToDelete: string, currentAdminUserId: string): { success: boolean, message?: string } => {
    if (userIdToDelete === currentAdminUserId) {
      const message = "Error: No puede eliminar su propia cuenta de administrador.";
      setAlertsInternal(prev => [{ id: generateRandomId(), type: AlertType.USER_ACTION_FAILED, userId: currentAdminUserId, message, timestamp: Date.now(), severity: AlertSeverity.MEDIUM, acknowledged: false }, ...prev]);
      return { success: false, message };
    }

    const userToDelete = usersInternal.find(u => u.id === userIdToDelete);
    if (!userToDelete) {
      const message = `Error: Usuario con ID ${userIdToDelete} no encontrado para eliminar.`;
      setAlertsInternal(prev => [{ id: generateRandomId(), type: AlertType.USER_ACTION_FAILED, message, timestamp: Date.now(), severity: AlertSeverity.MEDIUM, acknowledged: false }, ...prev]);
      return { success: false, message };
    }

    if (userToDelete.role === UserRole.ADMINISTRATOR) {
      const adminCount = usersInternal.filter(u => u.role === UserRole.ADMINISTRATOR).length;
      if (adminCount <= 1) {
        const message = "Error: No se puede eliminar al último administrador. Debe haber al menos un administrador.";
        setAlertsInternal(prev => [{ id: generateRandomId(), type: AlertType.USER_ACTION_FAILED, userId: userToDelete.id, message, timestamp: Date.now(), severity: AlertSeverity.MEDIUM, acknowledged: false }, ...prev]);
        return { success: false, message };
      }
    }

    setUsersInternal(prev => prev.filter(u => u.id !== userIdToDelete));
    addUnitHistoryEvent({
      eventType: "Usuario Eliminado",
      userId: userToDelete.id,
      username: userToDelete.username,
      details: `Usuario ${userToDelete.username} (${userToDelete.displayName}) ha sido eliminado por el administrador (ID: ${currentAdminUserId.substring(0, 6)}...).`
    });
    setAlertsInternal(prev => [{
      id: generateRandomId(), type: AlertType.USER_DELETED, userId: userToDelete.id,
      message: `Usuario ${userToDelete.username} eliminado exitosamente.`,
      timestamp: Date.now(), severity: AlertSeverity.INFO, acknowledged: false,
    }, ...prev].sort((a, b) => b.timestamp - a.timestamp).slice(0, 50));
    return { success: true };
  }, [usersInternal, addUnitHistoryEvent, setAlertsInternal]);

  const addUnitHierarchy = useCallback((unitData: NewHierarchyUnitData): { success: boolean, message?: string, newUnit?: MilitaryUnit } => {
    if (units.some(u => u.name.toLowerCase() === unitData.name.toLowerCase() && u.parentId === unitData.parentId)) {
      const message = `Error: Ya existe una unidad organizacional con el nombre '${unitData.name}' bajo el mismo superior.`;
      setAlertsInternal(prev => [{ id: generateRandomId(), type: AlertType.ORGANIZATION_UNIT_CREATED, message, timestamp: Date.now(), severity: AlertSeverity.MEDIUM, acknowledged: false }, ...prev]);
      return { success: false, message };
    }

    const now = Date.now();
    const personnelBreakdown = generatePersonnelBreakdown(unitData.type);
    const commanderInfo = { rank: "N/A", name: "Por Asignar" };

    const newUnit: MilitaryUnit = {
      id: generateRandomId(),
      name: unitData.name,
      type: unitData.type,
      parentId: unitData.parentId,
      commander: commanderInfo,
      personnelBreakdown,
      equipment: [],
      capabilities: [],
      location: { lat: 0, lon: 0 },
      status: UnitStatus.MAINTENANCE,
      unitSituationType: UnitSituationINSITOP.ORGANICA,
      lastMovementTimestamp: now,
      lastCommunicationTimestamp: now,
      lastHourlyReportTimestamp: now,
      routeHistory: [],
      ammoLevel: 100,
      daysOfSupply: 30,
      lastResupplyDate: now,
    };

    setUnitsInternal(prevUnits => [newUnit, ...prevUnits]);
    addUnitHistoryEvent({
      eventType: "Unidad Organizacional Creada",
      unitId: newUnit.id,
      unitName: newUnit.name,
      details: `Unidad organizacional ${newUnit.name} (${newUnit.type}) creada. Superior ID: ${newUnit.parentId || 'Ninguno'}.`,
      relatedEntityId: newUnit.id,
      relatedEntityType: MapEntityType.ORGANIZATION_UNIT,
    });
    setAlertsInternal(prev => [{
      id: generateRandomId(), type: AlertType.ORGANIZATION_UNIT_CREATED, unitId: newUnit.id,
      message: `Unidad organizacional ${newUnit.name} creada.`,
      timestamp: Date.now(), severity: AlertSeverity.INFO, acknowledged: false,
    }, ...prev].sort((a, b) => b.timestamp - a.timestamp).slice(0, 50));
    return { success: true, newUnit, message: `Unidad ${newUnit.name} creada exitosamente.` };
  }, [units, addUnitHistoryEvent, setAlertsInternal]);

  const updateUnitHierarchyDetails = useCallback((unitId: string, updateData: UpdateHierarchyUnitData): { success: boolean, message?: string } => {
    const unitIndex = units.findIndex(u => u.id === unitId);
    if (unitIndex === -1) {
      const message = `Error: Unidad organizacional con ID ${unitId} no encontrada para actualizar.`;
      setAlertsInternal(prev => [{ id: generateRandomId(), type: AlertType.ORGANIZATION_UNIT_UPDATED, message, timestamp: Date.now(), severity: AlertSeverity.MEDIUM, acknowledged: false }, ...prev]);
      return { success: false, message };
    }

    const oldUnit = units[unitIndex];
    const updatedUnit = { ...oldUnit, ...updateData };

    if (updateData.name && units.some(u => u.id !== unitId && u.name.toLowerCase() === updateData.name?.toLowerCase() && u.parentId === oldUnit.parentId)) {
      const message = `Error: Ya existe otra unidad con el nombre '${updateData.name}' bajo el mismo superior.`;
      setAlertsInternal(prev => [{ id: generateRandomId(), type: AlertType.ORGANIZATION_UNIT_UPDATED, message, timestamp: Date.now(), severity: AlertSeverity.MEDIUM, acknowledged: false }, ...prev]);
      return { success: false, message };
    }

    setUnitsInternal(prev => prev.map(u => u.id === unitId ? updatedUnit : u));
    addUnitHistoryEvent({
      eventType: "Unidad Organizacional Actualizada",
      unitId: updatedUnit.id,
      unitName: updatedUnit.name,
      details: `Detalles de unidad organizacional ${updatedUnit.name} actualizados.`,
      oldValue: `Nombre: ${oldUnit.name}, Tipo: ${oldUnit.type}`,
      newValue: `Nombre: ${updatedUnit.name}, Tipo: ${updatedUnit.type}`,
      relatedEntityType: MapEntityType.ORGANIZATION_UNIT,
    });
    setAlertsInternal(prev => [{
      id: generateRandomId(), type: AlertType.ORGANIZATION_UNIT_UPDATED, unitId: updatedUnit.id,
      message: `Unidad organizacional ${updatedUnit.name} actualizada.`,
      timestamp: Date.now(), severity: AlertSeverity.INFO, acknowledged: false,
    }, ...prev].sort((a, b) => b.timestamp - a.timestamp).slice(0, 50));
    return { success: true, message: `Unidad ${updatedUnit.name} actualizada exitosamente.` };
  }, [units, addUnitHistoryEvent, setAlertsInternal]);

  const deleteUnitHierarchy = useCallback((unitId: string): { success: boolean, message?: string } => {
    const unitToDelete = units.find(u => u.id === unitId);
    if (!unitToDelete) {
      const message = `Error: Unidad organizacional con ID ${unitId} no encontrada para eliminar.`;
      setAlertsInternal(prev => [{ id: generateRandomId(), type: AlertType.ORGANIZATION_UNIT_DELETED, message, timestamp: Date.now(), severity: AlertSeverity.MEDIUM, acknowledged: false }, ...prev]);
      return { success: false, message };
    }

    const hasChildren = units.some(u => u.parentId === unitId);
    if (hasChildren) {
      const childUnitExamples = units
        .filter(u => u.parentId === unitId)
        .slice(0, 3)
        .map(u => `${u.name} (${u.type})`)
        .join(', ');

      const message = `Error: No se puede eliminar la unidad "${unitToDelete.name}" porque tiene subunidades asignadas (ej: ${childUnitExamples}). Asegúrese de que todas las subunidades organizacionales (en "Estructura de Fuerza") y las unidades tácticas (en "Unidades") que dependen de esta unidad sean eliminadas o reasignadas primero.`;
      setAlertsInternal(prev => [{ id: generateRandomId(), type: AlertType.ORGANIZATION_UNIT_DELETED, unitId: unitToDelete.id, message, timestamp: Date.now(), severity: AlertSeverity.MEDIUM, acknowledged: false }, ...prev].sort((a, b) => b.timestamp - a.timestamp).slice(0, 50));
      return { success: false, message };
    }

    setUnitsInternal(prev => prev.filter(u => u.id !== unitId));
    addUnitHistoryEvent({
      eventType: "Unidad Organizacional Eliminada",
      unitId: unitToDelete.id,
      unitName: unitToDelete.name,
      details: `Unidad organizacional ${unitToDelete.name} (${unitToDelete.type}) eliminada.`,
      relatedEntityType: MapEntityType.ORGANIZATION_UNIT,
    });
    setAlertsInternal(prev => [{
      id: generateRandomId(), type: AlertType.ORGANIZATION_UNIT_DELETED, unitId: unitToDelete.id,
      message: `Unidad organizacional ${unitToDelete.name} eliminada exitosamente.`,
      timestamp: Date.now(), severity: AlertSeverity.INFO, acknowledged: false,
    }, ...prev].sort((a, b) => b.timestamp - a.timestamp).slice(0, 50));
    return { success: true, message: `Unidad ${unitToDelete.name} eliminada exitosamente.` };
  }, [units, addUnitHistoryEvent, setAlertsInternal]);

  const assignCommanderToOrganizationalUnit = useCallback((unitId: string, userId: string): { success: boolean, message?: string } => {
    const unitIndex = units.findIndex(u => u.id === unitId);
    const user = usersInternal.find(u => u.id === userId);

    if (unitIndex === -1) {
      return { success: false, message: `Unidad organizacional con ID ${unitId} no encontrada.` };
    }
    if (!user) {
      return { success: false, message: `Usuario con ID ${userId} no encontrado.` };
    }

    const unitToUpdate = units[unitIndex];
    const oldCommanderName = unitToUpdate.commander.name;
    const oldCommanderRank = unitToUpdate.commander.rank;

    const newRank = USER_ROLE_TO_RANK_ABBREVIATION[user.role] || "N/A";

    const updatedUnit: MilitaryUnit = {
      ...unitToUpdate,
      commander: {
        name: user.displayName,
        rank: newRank,
      },
    };

    setUnitsInternal(prevUnits => {
      const newUnits = [...prevUnits];
      newUnits[unitIndex] = updatedUnit;
      return newUnits;
    });

    addUnitHistoryEvent({
      eventType: "Asignación de Comandante",
      unitId: unitToUpdate.id,
      unitName: unitToUpdate.name,
      userId: user.id,
      username: user.username,
      details: `Usuario ${user.username} (${user.displayName}, ${user.role}) asignado como comandante de ${unitToUpdate.name} (${unitToUpdate.type}).`,
      oldValue: `Cmdte. ${oldCommanderName} (${oldCommanderRank})`,
      newValue: `Cmdte. ${user.displayName} (${newRank})`,
      relatedEntityType: MapEntityType.ORGANIZATION_UNIT,
    });

    setAlertsInternal(prev => [{
      id: generateRandomId(),
      type: AlertType.COMMANDER_ASSIGNED,
      unitId: unitToUpdate.id,
      userId: user.id,
      message: `Comandante ${user.displayName} (${newRank}) asignado a la unidad ${unitToUpdate.name}.`,
      timestamp: Date.now(),
      severity: AlertSeverity.INFO,
      acknowledged: false,
    }, ...prev].sort((a, b) => b.timestamp - a.timestamp).slice(0, 50));

    return { success: true, message: `Comandante asignado a ${unitToUpdate.name}.` };
  }, [units, usersInternal, addUnitHistoryEvent, setUnitsInternal, setAlertsInternal]);


  const acknowledgeAlert = useCallback((alertId: string) => {
    setAlertsInternal(prevAlerts => prevAlerts.map(alert =>
      alert.id === alertId ? { ...alert, acknowledged: true } : alert
    ));
  }, [setAlertsInternal]);

  const addIntelReport = useCallback((reportData: Omit<IntelligenceReport, 'id' | 'reportTimestamp'>) => {
    const newReport: IntelligenceReport = {
      ...reportData,
      id: generateRandomId(),
      reportTimestamp: Date.now(),
    };
    setIntelligenceReportsInternal(prev => [newReport, ...prev].slice(0, 100));
    const highPriority =
      newReport.reliability === IntelligenceReliability.A ||
      newReport.credibility === IntelligenceCredibility.ONE ||
      (newReport.keywords.some(kw => ["emboscada", "amenaza inminente", "ataque"].includes(kw.toLowerCase())) &&
        (newReport.reliability <= IntelligenceReliability.C && newReport.credibility <= IntelligenceCredibility.THREE));
    if (highPriority || Math.random() < 0.2) {
      setAlertsInternal(prev => [{
        id: generateRandomId(),
        type: AlertType.HIGH_PRIORITY_INTEL,
        intelId: newReport.id,
        message: `Inteligencia de alta prioridad recibida: ${newReport.title}`,
        timestamp: Date.now(),
        severity: highPriority ? AlertSeverity.CRITICAL : AlertSeverity.HIGH,
        acknowledged: false,
        location: newReport.location,
      }, ...prev].sort((a, b) => b.timestamp - a.timestamp).slice(0, 50));
    }
  }, [setIntelligenceReportsInternal, setAlertsInternal]);

  const addManualRoutePoint = useCallback((unitId: string, location: GeoLocation, timestamp: number) => {
    const unit = units.find(u => u.id === unitId);
    if (!unit) return;
    addUnitHistoryEvent({
      unitId,
      unitName: unit.name,
      eventType: "Punto de Ruta Manual",
      details: `Punto de ruta añadido manualmente en ${decimalToDMS(location)} a las ${new Date(timestamp).toLocaleTimeString('es-ES')}.`,
      location
    });
    setUnitsInternal(prevUnits =>
      prevUnits.map(u => {
        if (u.id === unitId) {
          const newRouteHistory: RoutePoint[] = [{ ...location, timestamp }, ...u.routeHistory];
          if (newRouteHistory.length > MAX_ROUTE_HISTORY_LENGTH) {
            newRouteHistory.pop();
          }
          return {
            ...u,
            location,
            lastMovementTimestamp: timestamp,
            routeHistory: newRouteHistory,
            status: UnitStatus.STATIC,
          };
        }
        return u;
      })
    );
  }, [units, addUnitHistoryEvent, setUnitsInternal]);

  const updateUnitLogistics = useCallback((unitId: string, logisticsData: { fuelLevel?: number | string; ammoLevel?: number | string; daysOfSupply?: number | string; }) => {
    const unit = units.find(u => u.id === unitId);
    if (!unit) return;
    const detailsArray: string[] = [];
    if (logisticsData.fuelLevel !== undefined) detailsArray.push(`Combustible a ${logisticsData.fuelLevel}%`);
    if (logisticsData.ammoLevel !== undefined) detailsArray.push(`Munición a ${logisticsData.ammoLevel}%`);
    if (logisticsData.daysOfSupply !== undefined) detailsArray.push(`Suministros a ${logisticsData.daysOfSupply} días`);

    addUnitHistoryEvent({
      unitId,
      unitName: unit.name,
      eventType: "Actualización Logística",
      details: `Logística actualizada: ${detailsArray.join(', ')}.`,
    });
    setUnitsInternal(prevUnits =>
      prevUnits.map(u => {
        if (u.id === unitId) {
          const updatedUnit = { ...u };
          if (logisticsData.fuelLevel !== undefined) updatedUnit.fuelLevel = Number(logisticsData.fuelLevel);
          if (logisticsData.ammoLevel !== undefined) updatedUnit.ammoLevel = Number(logisticsData.ammoLevel);
          if (logisticsData.daysOfSupply !== undefined) {
            updatedUnit.daysOfSupply = Number(logisticsData.daysOfSupply);
            updatedUnit.lastResupplyDate = Date.now();
          }
          if (updatedUnit.status === UnitStatus.LOW_SUPPLIES && (updatedUnit.ammoLevel ?? 100) > 20 && (updatedUnit.daysOfSupply ?? 7) > 3) {
            updatedUnit.status = UnitStatus.OPERATIONAL;
          }
          return updatedUnit;
        }
        return u;
      })
    );
  }, [units, addUnitHistoryEvent, setUnitsInternal]);

  const updateUnitAttributes = useCallback((unitId: string, attributes: { equipment?: string[]; capabilities?: string[] }) => {
    const unit = units.find(u => u.id === unitId);
    if (!unit) return;
    let details = "Atributos de unidad actualizados. ";
    if (attributes.equipment) details += `Nuevo equipo: ${attributes.equipment.join(', ') || 'ninguno'}. `;
    if (attributes.capabilities) details += `Nuevas capacidades: ${attributes.capabilities.join(', ') || 'ninguna'}.`;

    addUnitHistoryEvent({
      unitId,
      unitName: unit.name,
      eventType: "Atributos Actualizados",
      details: details,
    });
    setUnitsInternal(prevUnits =>
      prevUnits.map(u => {
        if (u.id === unitId) {
          return {
            ...u,
            equipment: attributes.equipment ?? u.equipment,
            capabilities: attributes.capabilities ?? u.capabilities,
          };
        }
        return u;
      })
    );
  }, [units, addUnitHistoryEvent, setUnitsInternal]);

  const updateUnitMission = useCallback((unitId: string, missionSigla: string) => {
    setUnitsInternal(prevUnits => prevUnits.map(u => {
      if (u.id === unitId) {
        addUnitHistoryEvent({
          unitId,
          unitName: u.name,
          eventType: "Cambio de Misión",
          details: `Nueva misión asignada: ${missionSigla}.`,
          oldValue: u.currentMission,
          newValue: missionSigla,
        });
        return { ...u, currentMission: missionSigla };
      }
      return u;
    }));
  }, [addUnitHistoryEvent, setUnitsInternal]);

  const updateUnitSituation = useCallback((unitId: string, newSituation: UnitSituationINSITOP) => {
    setUnitsInternal(prevUnits => prevUnits.map(u => {
      if (u.id === unitId) {
        addUnitHistoryEvent({
          unitId,
          unitName: u.name,
          eventType: "Cambio de Situación de Unidad",
          details: `Nueva situación de unidad: ${newSituation}.`,
          oldValue: u.unitSituationType,
          newValue: newSituation,
        });
        return { ...u, unitSituationType: newSituation };
      }
      return u;
    }));
  }, [addUnitHistoryEvent, setUnitsInternal]);


  const markUnitHourlyReport = useCallback((unitId: string) => {
    const unit = units.find(u => u.id === unitId);
    if (!unit) return;
    addUnitHistoryEvent({
      unitId,
      unitName: unit.name,
      eventType: "Reporte Horario Marcado",
      details: `Reporte horario para ${unit.name} marcado como recibido.`
    });
    setUnitsInternal(prevUnits =>
      prevUnits.map(u => {
        if (u.id === unitId) {
          const updatedUnit = { ...u, lastHourlyReportTimestamp: Date.now() };
          if (u.status === UnitStatus.NO_COMMUNICATION) {
            updatedUnit.status = UnitStatus.OPERATIONAL;
          }
          return updatedUnit;
        }
        return u;
      })
    );
    setAlertsInternal(prevAlerts =>
      prevAlerts.map(a => a.unitId === unitId && (a.type === AlertType.COMMUNICATION_LOST || a.type === AlertType.HOURLY_REPORT_MISSED) ? { ...a, acknowledged: true } : a)
    );
  }, [units, addUnitHistoryEvent, setUnitsInternal, setAlertsInternal]);

  const reportUnitEngaged = useCallback((unitId: string) => {
    const unit = units.find(u => u.id === unitId);
    if (!unit || unit.status === UnitStatus.ENGAGED) return;

    const alertId = generateRandomId();
    addUnitHistoryEvent({
      unitId,
      unitName: unit.name,
      eventType: "Entró en Combate",
      details: `${unit.name} ha reportado entrar en combate.`,
      location: unit.location,
      relatedEntityId: alertId,
    });
    setUnitsInternal(prevUnits =>
      prevUnits.map(u => u.id === unitId ? { ...u, status: UnitStatus.ENGAGED } : u)
    );
    setAlertsInternal(prev => [{
      id: alertId,
      type: AlertType.UNIT_ENGAGED,
      unitId: unitId,
      message: `¡ALERTA DE COMBATE! ${unit.name} ha entrado en contacto armado.`,
      timestamp: Date.now(),
      severity: AlertSeverity.CRITICAL,
      acknowledged: false,
      location: unit.location
    }, ...prev].sort((a, b) => b.timestamp - a.timestamp).slice(0, 50));
  }, [units, addUnitHistoryEvent, setUnitsInternal, setAlertsInternal]);

  const reportUnitCeasefire = useCallback((unitId: string) => {
    const unit = units.find(u => u.id === unitId);
    if (!unit || unit.status !== UnitStatus.ENGAGED) return;
    addUnitHistoryEvent({
      unitId,
      unitName: unit.name,
      eventType: "Cese de Combate",
      details: `${unit.name} ha reportado cese de combate. Pendiente reporte post-combate (AAR).`,
      location: unit.location,
    });
    setUnitsInternal(prevUnits =>
      prevUnits.map(u => u.id === unitId ? {
        ...u,
        status: UnitStatus.AAR_PENDING,
        combatEndTimestamp: Date.now(),
        combatEndLocation: u.location,
      } : u)
    );
    // Find the original combat alert and acknowledge it
    setAlertsInternal(prevAlerts => {
      const combatAlert = prevAlerts.find(a => a.unitId === unitId && a.type === AlertType.UNIT_ENGAGED && !a.acknowledged);
      if (combatAlert) {
        return prevAlerts.map(a => a.id === combatAlert.id ? { ...a, acknowledged: true } : a);
      }
      return prevAlerts;
    });
  }, [units, addUnitHistoryEvent, setUnitsInternal, setAlertsInternal]);

  const addAfterActionReport = useCallback((aarData: Omit<AfterActionReport, 'id' | 'reportTimestamp' | 'unitName'>) => {
    const unit = units.find(u => u.id === aarData.unitId);
    if (!unit) return;

    // Find the original combat alert to link it to the AAR
    const originalCombatAlert = alerts.find(a => a.unitId === aarData.unitId && a.type === AlertType.UNIT_ENGAGED && !a.acknowledged);

    const newAAR: AfterActionReport = {
      ...aarData,
      id: generateRandomId(),
      reportTimestamp: Date.now(),
      unitName: unit.name,
      originalCombatAlertId: originalCombatAlert?.id
    };
    setAfterActionReportsInternal(prev => [newAAR, ...prev].slice(0, 100));
    setUnitsInternal(prevUnits => prevUnits.map(u =>
      u.id === aarData.unitId ? { ...u, status: UnitStatus.OPERATIONAL, combatEndTimestamp: undefined, combatEndLocation: undefined } : u
    ));
    addUnitHistoryEvent({
      unitId: unit.id,
      unitName: unit.name,
      eventType: "AAR Registrado",
      details: `Reporte Post-Combate (AAR) registrado. Bajas propias (KIA/WIA/MIA): ${aarData.casualtiesKia}/${aarData.casualtiesWia}/${aarData.casualtiesMia}. Munición gastada: ${aarData.ammunitionExpendedPercent}%.`,
      location: aarData.location,
      relatedEntityId: newAAR.id,
      relatedEntityType: MapEntityType.AAR
    });
  }, [units, alerts, setAfterActionReportsInternal, setUnitsInternal, addUnitHistoryEvent]);

  const generateAndAddQ5Report = useCallback(async (aarId: string) => {
    const aar = afterActionReports.find(a => a.id === aarId);
    if (!aar) {
      console.error("AAR not found for Q5 generation");
      return;
    }
    setQ5GeneratingStatus(prev => ({ ...prev, [aarId]: true }));
    try {
      const q5Content = await generateQ5ReportContentFromAAR(aar);
      if (q5Content.que && q5Content.que.startsWith("Error:")) {
        throw new Error(q5Content.que);
      }

      const newQ5: Q5Report = {
        id: `Q5-${generateRandomId()}`,
        aarId,
        unitId: aar.unitId,
        unitName: aar.unitName,
        reportTimestamp: Date.now(),
        que: q5Content.que || "No generado",
        quien: q5Content.quien || "No generado",
        cuando: q5Content.cuando || "No generado",
        donde: q5Content.donde || "No generado",
        hechos: formatHechos(q5Content.hechos),
        accionesSubsiguientes: q5Content.accionesSubsiguientes || "No generado",
      };
      setQ5ReportsInternal(prev => [newQ5, ...prev]);
      addUnitHistoryEvent({
        unitId: aar.unitId,
        unitName: aar.unitName,
        eventType: "Reporte Q5 Generado",
        details: `Reporte Q5 generado a partir de AAR. Evento: ${newQ5.que}`,
        relatedEntityId: newQ5.id,
      });
      setAlertsInternal(prev => [{
        id: generateRandomId(),
        type: AlertType.Q5_GENERATED,
        unitId: aar.unitId,
        q5Id: newQ5.id,
        message: `Reporte Q5 para ${aar.unitName} generado exitosamente.`,
        timestamp: Date.now(),
        severity: AlertSeverity.INFO,
        acknowledged: false,
      }, ...prev].sort((a, b) => b.timestamp - a.timestamp).slice(0, 50));
    } catch (error) {
      console.error("Error generating Q5:", error);
      setAlertsInternal(prev => [{
        id: generateRandomId(),
        type: AlertType.Q5_GENERATION_FAILED,
        unitId: aar.unitId,
        message: `Fallo al generar reporte Q5 para ${aar.unitName}: ${error instanceof Error ? error.message : 'Error desconocido'}.`,
        timestamp: Date.now(),
        severity: AlertSeverity.MEDIUM,
        acknowledged: false,
      }, ...prev].sort((a, b) => b.timestamp - a.timestamp).slice(0, 50));
    } finally {
      setQ5GeneratingStatus(prev => ({ ...prev, [aarId]: false }));
    }
  }, [afterActionReports, addUnitHistoryEvent, setAlertsInternal, setQ5ReportsInternal]);

  const sendQ5ReportViaTelegram = useCallback(async (q5Report: Q5Report, chatId?: string) => {
    setQ5SendingStatus(prev => ({ ...prev, [q5Report.id]: true }));

    const formattedMessage = `
*--- REPORTE Q5 (SIMCOP AI) ---*

*UNIDAD:* ${escapeTelegramMarkdownV2(q5Report.unitName)}
*FECHA REPORTE:* ${escapeTelegramMarkdownV2(new Date(q5Report.reportTimestamp).toLocaleString('es-CO', { timeZone: 'America/Bogota' }))}
*ID AAR:* \`${escapeTelegramMarkdownV2(q5Report.aarId.substring(0, 8))}\`
-----------------------------------

*1\\. ¿QUÉ?:*
${escapeTelegramMarkdownV2(q5Report.que)}

*2\\. ¿QUIÉN?:*
${escapeTelegramMarkdownV2(q5Report.quien)}

*3\\. ¿CUÁNDO?:*
${escapeTelegramMarkdownV2(q5Report.cuando)}

*4\\. ¿DÓNDE?:*
${escapeTelegramMarkdownV2(q5Report.donde)}

*5\\. HECHOS:*
\`\`\`
${escapeTelegramMarkdownV2(q5Report.hechos)}
\`\`\`

*6\\. ACCIONES SUBSIGUIENTES:*
${escapeTelegramMarkdownV2(q5Report.accionesSubsiguientes)}

-----------------------------------
_Este es un reporte generado automáticamente por el Sistema Integrado de Mando y Control Operacional \(SIMCOP\)\\._
    `;

    const success = await sendTelegramMessage(formattedMessage, chatId);

    setAlertsInternal(prev => [{
      id: generateRandomId(),
      type: success ? AlertType.Q5_TELEGRAM_SENT : AlertType.Q5_TELEGRAM_FAILED,
      unitId: q5Report.unitId,
      q5Id: q5Report.id,
      message: `Reporte Q5 para ${q5Report.unitName} ${success ? 'enviado a Telegram' : 'falló al enviar a Telegram'}.`,
      timestamp: Date.now(),
      severity: success ? AlertSeverity.INFO : AlertSeverity.MEDIUM,
      acknowledged: false,
    }, ...prev].sort((a, b) => b.timestamp - a.timestamp).slice(0, 50));

    setQ5SendingStatus(prev => ({ ...prev, [q5Report.id]: false }));
  }, [setAlertsInternal]);

  const sendTestTelegramAlert = useCallback(async (chatId?: string): Promise<boolean> => {
    const testMessage = `
*--- PRUEBA DE NOTIFICACIÓN SIMCOP ---*

Este es un mensaje de prueba enviado desde el Sistema Integrado de Mando y Control Operacional \(SIMCOP\)\\.
Fecha y Hora: ${escapeTelegramMarkdownV2(new Date().toLocaleString('es-CO', { timeZone: 'America/Bogota' }))}

Si recibe este mensaje, la conexión con Telegram está funcionando correctamente para el Chat ID configurado\\.
        `;
    console.log(`Enviando mensaje de prueba a Chat ID: ${chatId || TELEGRAM_CHAT_ID}`);
    return await sendTelegramMessage(testMessage, chatId);
  }, []);

  const sendUnitToRetraining = useCallback((unitId: string) => {
    const unit = units.find(u => u.id === unitId);
    if (!unit) return;

    addUnitHistoryEvent({
      unitId,
      unitName: unit.name,
      eventType: "Enviada a Permiso/Reentrenamiento",
      details: `La unidad ${unit.name} fue enviada al área de permiso/reentrenamiento y está temporalmente fuera del mapa operacional.`
    });

    setUnitsInternal(prevUnits =>
      prevUnits.map(u => u.id === unitId ? { ...u, status: UnitStatus.ON_LEAVE_RETRAINING, leaveStartDate: undefined, leaveDurationDays: undefined, retrainingStartDate: undefined, retrainingFocus: undefined, retrainingDurationDays: undefined } : u)
    );

    setAlertsInternal(prev => [{
      id: generateRandomId(),
      type: AlertType.UNIT_TO_RETRAINING,
      unitId,
      message: `Unidad ${unit.name} enviada al área de permiso/reentrenamiento.`,
      timestamp: Date.now(),
      severity: AlertSeverity.INFO,
      acknowledged: false
    }, ...prev].sort((a, b) => b.timestamp - a.timestamp).slice(0, 50));
  }, [units, addUnitHistoryEvent, setUnitsInternal, setAlertsInternal]);

  const returnUnitFromRetraining = useCallback((unitId: string) => {
    const unit = units.find(u => u.id === unitId);
    if (!unit) return;

    addUnitHistoryEvent({
      unitId,
      unitName: unit.name,
      eventType: "Reintegrada de Permiso/Reentrenamiento",
      details: `La unidad ${unit.name} ha sido reintegrada al área de operaciones.`
    });

    setUnitsInternal(prevUnits =>
      prevUnits.map(u => u.id === unitId ? { ...u, status: UnitStatus.OPERATIONAL, leaveStartDate: undefined, leaveDurationDays: undefined, retrainingStartDate: undefined, retrainingFocus: undefined, retrainingDurationDays: undefined } : u)
    );

    setAlertsInternal(prev => [{
      id: generateRandomId(),
      type: AlertType.UNIT_RETURNED_FROM_RETRAINING,
      unitId,
      message: `Unidad ${unit.name} reintegrada a operaciones.`,
      timestamp: Date.now(),
      severity: AlertSeverity.INFO,
      acknowledged: false
    }, ...prev].sort((a, b) => b.timestamp - a.timestamp).slice(0, 50));
  }, [units, addUnitHistoryEvent, setUnitsInternal, setAlertsInternal]);

  const startUnitLeave = useCallback((unitId: string, durationDays: number) => {
    const unit = units.find(u => u.id === unitId);
    if (!unit) return;

    const now = Date.now();
    addUnitHistoryEvent({
      unitId,
      unitName: unit.name,
      eventType: "Inicio de Permiso",
      details: `Se inició un permiso de ${durationDays} días para la unidad ${unit.name}.`
    });

    setUnitsInternal(prevUnits =>
      prevUnits.map(u => u.id === unitId ? { ...u, leaveStartDate: now, leaveDurationDays: durationDays, retrainingStartDate: undefined, retrainingFocus: undefined, retrainingDurationDays: undefined } : u)
    );
    setAlertsInternal(prev => [{
      id: generateRandomId(), type: AlertType.UNIT_LEAVE_STARTED, unitId,
      message: `Permiso de ${durationDays} días iniciado para ${unit.name}.`,
      timestamp: now, severity: AlertSeverity.INFO, acknowledged: false
    }, ...prev].sort((a, b) => b.timestamp - a.timestamp).slice(0, 50));
  }, [units, addUnitHistoryEvent, setUnitsInternal, setAlertsInternal]);

  const startUnitRetraining = useCallback((unitId: string, focus: string, durationDays: number) => {
    const unit = units.find(u => u.id === unitId);
    if (!unit) return;

    const now = Date.now();
    addUnitHistoryEvent({
      unitId,
      unitName: unit.name,
      eventType: "Inicio de Reentrenamiento",
      details: `Se inició un reentrenamiento de ${durationDays} días para la unidad ${unit.name}. Foco: ${focus}.`
    });

    setUnitsInternal(prevUnits =>
      prevUnits.map(u => u.id === unitId ? { ...u, leaveStartDate: undefined, leaveDurationDays: undefined, retrainingStartDate: now, retrainingFocus: focus, retrainingDurationDays: durationDays } : u)
    );
    setAlertsInternal(prev => [{
      id: generateRandomId(), type: AlertType.UNIT_RETRAINING_STARTED, unitId,
      message: `Reentrenamiento de ${durationDays} días (Foco: ${focus}) iniciado para ${unit.name}.`,
      timestamp: now, severity: AlertSeverity.INFO, acknowledged: false
    }, ...prev].sort((a, b) => b.timestamp - a.timestamp).slice(0, 50));
  }, [units, addUnitHistoryEvent, setUnitsInternal, setAlertsInternal]);


  const addUnit = useCallback((unitData: NewUnitData) => {
    const now = Date.now();
    const newUnit: MilitaryUnit = {
      ...unitData,
      id: generateRandomId(),
      status: UnitStatus.OPERATIONAL,
      lastMovementTimestamp: now,
      lastCommunicationTimestamp: now,
      lastHourlyReportTimestamp: now,
      routeHistory: [{ ...unitData.location, timestamp: now }],
      lastResupplyDate: now,
      unitSituationType: UnitSituationINSITOP.ORGANICA,
      currentMission: MISSION_TYPES[0].sigla,
    };
    setUnitsInternal(prevUnits => [newUnit, ...prevUnits]);
    addUnitHistoryEvent({
      unitId: newUnit.id,
      unitName: newUnit.name,
      eventType: "Unidad Creada",
      details: `Nueva unidad ${newUnit.name} (${newUnit.type}) agregada al sistema en ${decimalToDMS(newUnit.location)}.`,
      location: newUnit.location,
      relatedEntityId: newUnit.id,
      relatedEntityType: MapEntityType.UNIT,
    });
  }, [addUnitHistoryEvent, setUnitsInternal]);

  const processSpotReport = useCallback((spotData: SpotReportPayload) => {
    const unit = units.find(u => u.id === spotData.unitId);
    if (!unit) {
      console.warn(`[useSimulatedData] Received SPOT report for unknown unitId: ${spotData.unitId}`);
      return;
    }

    setUnitsInternal(prevUnits => prevUnits.map(u => {
      if (u.id === spotData.unitId) {
        const newRouteHistory = [{ ...spotData.location, timestamp: spotData.timestamp }, ...u.routeHistory].slice(0, MAX_ROUTE_HISTORY_LENGTH);
        const status = (u.location.lat === spotData.location.lat && u.location.lon === spotData.location.lon) ? UnitStatus.STATIC : UnitStatus.MOVING;
        return {
          ...u,
          location: spotData.location,
          lastMovementTimestamp: spotData.timestamp,
          lastCommunicationTimestamp: spotData.timestamp, // SPOT report counts as communication
          routeHistory: newRouteHistory,
          status: (u.status === UnitStatus.ENGAGED || u.status === UnitStatus.AAR_PENDING) ? u.status : status,
        };
      }
      return u;
    }));

    addUnitHistoryEvent({
      unitId: unit.id,
      unitName: unit.name,
      eventType: "Reporte SPOT Recibido",
      details: `Reporte de posicionamiento SPOT recibido. Nueva ubicación: ${decimalToDMS(spotData.location)}.`,
      location: spotData.location,
    });
  }, [units, addUnitHistoryEvent, setUnitsInternal]);

  const addOperationsOrder = useCallback((orderData: NewOperationsOrderData) => {
    const newOrder: OperationsOrder = {
      ...orderData,
      id: `ORDOP-${generateRandomId()}`,
      status: OperationsOrderStatus.BORRADOR,
      issuedTimestamp: Date.now(),
      recipientUserIds: [],
      acknowledgements: [],
    };
    setOperationsOrdersInternal(prev => [newOrder, ...prev]);
    addUnitHistoryEvent({
      eventType: "Orden de Operaciones Creada",
      details: `Nueva Orden de Operaciones "${newOrder.title}" creada como borrador.`,
      relatedEntityId: newOrder.id,
      relatedEntityType: MapEntityType.ORDOP,
    });
    setAlertsInternal(prev => [{
      id: generateRandomId(), type: AlertType.ORDOP_CREATED, ordopId: newOrder.id,
      message: `Orden de Operaciones "${newOrder.title}" creada.`,
      timestamp: Date.now(), severity: AlertSeverity.INFO, acknowledged: false,
    }, ...prev].sort((a, b) => b.timestamp - a.timestamp).slice(0, 50));
  }, [addUnitHistoryEvent, setAlertsInternal, setOperationsOrdersInternal]);

  const updateOperationsOrder = useCallback((orderId: string, orderData: UpdateOperationsOrderData): { success: boolean, message?: string } => {
    const orderIndex = operationsOrders.findIndex(o => o.id === orderId);
    if (orderIndex === -1) {
      return { success: false, message: `Error: Orden con ID ${orderId} no encontrada.` };
    }
    if (operationsOrders[orderIndex].status !== OperationsOrderStatus.BORRADOR) {
      return { success: false, message: "Error: Solo se pueden editar órdenes en estado de Borrador." };
    }
    const updatedOrder = { ...operationsOrders[orderIndex], ...orderData };
    setOperationsOrdersInternal(prev => prev.map(o => o.id === orderId ? updatedOrder : o));
    addUnitHistoryEvent({
      eventType: "Orden de Operaciones Actualizada",
      details: `Orden de Operaciones "${updatedOrder.title}" actualizada.`,
      relatedEntityId: updatedOrder.id,
      relatedEntityType: MapEntityType.ORDOP,
    });
    setAlertsInternal(prev => [{
      id: generateRandomId(), type: AlertType.ORDOP_UPDATED, ordopId: updatedOrder.id,
      message: `Orden de Operaciones "${updatedOrder.title}" actualizada.`,
      timestamp: Date.now(), severity: AlertSeverity.INFO, acknowledged: false,
    }, ...prev].sort((a, b) => b.timestamp - a.timestamp).slice(0, 50));
    return { success: true, message: `Orden "${updatedOrder.title}" actualizada exitosamente.` };
  }, [operationsOrders, addUnitHistoryEvent, setAlertsInternal, setOperationsOrdersInternal]);

  const publishOperationsOrder = useCallback((orderId: string, selectedUserIds: string[]): { success: boolean, message?: string } => {
    const orderIndex = operationsOrders.findIndex(o => o.id === orderId);
    if (orderIndex === -1) {
      return { success: false, message: `Error: Orden con ID ${orderId} no encontrada.` };
    }
    if (operationsOrders[orderIndex].status !== OperationsOrderStatus.BORRADOR) {
      return { success: false, message: "Error: Solo se pueden publicar órdenes en estado de Borrador." };
    }
    const publishedOrder = { ...operationsOrders[orderIndex], status: OperationsOrderStatus.PUBLICADA, recipientUserIds: selectedUserIds };
    setOperationsOrdersInternal(prev => prev.map(o => o.id === orderId ? publishedOrder : o));
    addUnitHistoryEvent({
      eventType: "Orden de Operaciones Publicada",
      details: `Orden de Operaciones "${publishedOrder.title}" publicada y enviada a ${selectedUserIds.length} destinatarios.`,
      relatedEntityId: publishedOrder.id,
      relatedEntityType: MapEntityType.ORDOP,
    });
    setAlertsInternal(prev => [{
      id: generateRandomId(), type: AlertType.ORDOP_PUBLISHED, ordopId: publishedOrder.id,
      message: `¡Nueva Orden de Operaciones! "${publishedOrder.title}" ha sido publicada.`,
      timestamp: Date.now(), severity: AlertSeverity.HIGH, acknowledged: false,
    }, ...prev].sort((a, b) => b.timestamp - a.timestamp).slice(0, 50));
    return { success: true, message: `Orden "${publishedOrder.title}" publicada y distribuida a ${selectedUserIds.length} destinatarios.` };
  }, [operationsOrders, addUnitHistoryEvent, setAlertsInternal, setOperationsOrdersInternal]);

  const acknowledgeOperationsOrder = useCallback((orderId: string, userId: string) => {
    setOperationsOrdersInternal(prevOrders => prevOrders.map(order => {
      if (order.id === orderId && !order.acknowledgements.some(ack => ack.userId === userId)) {
        const user = usersInternal.find(u => u.id === userId);
        addUnitHistoryEvent({
          eventType: "Orden de Operaciones Recibida",
          userId,
          username: user?.username,
          details: `Usuario ${user?.displayName || 'Desconocido'} confirmó recibo de la ORDEN DE OPERACIONES "${order.title}".`,
          relatedEntityId: order.id,
          relatedEntityType: MapEntityType.ORDOP,
        });
        return { ...order, acknowledgements: [...order.acknowledgements, { userId, timestamp: Date.now() }] };
      }
      return order;
    }));
  }, [usersInternal, addUnitHistoryEvent, setOperationsOrdersInternal]);

  const submitAmmoExpenditureReport = useCallback((unitId: string, userId: string, amount: number, justification: string) => {
    const unit = units.find(u => u.id === unitId);
    if (!unit) return;

    const alertId = generateRandomId();
    const payload = {
      unitId,
      unitName: unit.name,
      userId,
      amount,
      justification
    };

    setAlertsInternal(prev => [{
      id: alertId,
      type: AlertType.AMMO_REPORT_PENDING,
      unitId,
      message: `Reporte de gasto de munición (${amount}%) de ${unit.name} pendiente de aprobación.`,
      timestamp: Date.now(),
      severity: AlertSeverity.MEDIUM,
      acknowledged: false,
      data: payload
    }, ...prev].sort((a, b) => b.timestamp - a.timestamp).slice(0, 50));

    addUnitHistoryEvent({
      unitId,
      unitName: unit.name,
      eventType: "Reporte de Munición Enviado",
      details: `Reporte de gasto de ${amount}% de munición enviado para aprobación. Justificación: ${justification}`,
    });
  }, [units, addUnitHistoryEvent, setAlertsInternal]);

  const logPlatoonNovelty = useCallback((unitId: string, userId: string, details: string, isLogisticsRequest: boolean) => {
    const unit = units.find(u => u.id === unitId);
    if (!unit) return;

    const alertId = generateRandomId();
    const payload = { unitId, unitName: unit.name, userId, details, isLogisticsRequest };

    setAlertsInternal(prev => [{
      id: alertId,
      type: AlertType.PLATOON_NOVELTY_PENDING,
      unitId,
      message: `Novedad de ${unit.name} pendiente de aprobación: "${details.substring(0, 50)}..."`,
      timestamp: Date.now(),
      severity: AlertSeverity.LOW,
      acknowledged: false,
      data: payload
    }, ...prev].sort((a, b) => b.timestamp - a.timestamp).slice(0, 50));

    addUnitHistoryEvent({
      unitId,
      unitName: unit.name,
      eventType: "Novedad de Pelotón",
      details: `Novedad enviada para aprobación: ${details}${isLogisticsRequest ? ' (Marcada como Req. Log.)' : ''}`,
    });
  }, [units, addUnitHistoryEvent, setAlertsInternal]);

  const approvePlatoonNovelty = useCallback((alertId: string, approverUserId: string) => {
    const alert = alerts.find(a => a.id === alertId);
    if (!alert || !alert.data) return;

    const { unitId, unitName, details, isLogisticsRequest } = alert.data;
    const approver = usersInternal.find(u => u.id === approverUserId);

    addUnitHistoryEvent({
      unitId,
      unitName,
      eventType: isLogisticsRequest ? "Novedad de Pelotón Aprobada (Req. Log.)" : "Novedad de Pelotón Aprobada",
      details: `Novedad aprobada por ${approver?.displayName || 'Cmdte.'}: ${details}`,
    });

    // If it's a logistics request, create a formal logistics request
    if (isLogisticsRequest) {
      addLogisticsRequest(unitId, `Requerimiento originado de novedad de pelotón: ${details}`);
    }

    setAlertsInternal(prev => prev.map(a => a.id === alertId ? { ...a, acknowledged: true } : a));
  }, [alerts, usersInternal, addUnitHistoryEvent, setAlertsInternal]);

  const rejectPlatoonNovelty = useCallback((alertId: string, approverUserId: string, reason: string) => {
    const alert = alerts.find(a => a.id === alertId);
    if (!alert || !alert.data) return;

    const { unitId, unitName, details } = alert.data;
    const approver = usersInternal.find(u => u.id === approverUserId);

    addUnitHistoryEvent({
      unitId,
      unitName,
      eventType: "Novedad de Pelotón Rechazada",
      details: `Novedad rechazada por ${approver?.displayName || 'Cmdte.'}. Motivo: ${reason}. Novedad original: "${details}"`,
    });
    setAlertsInternal(prev => prev.map(a => a.id === alertId ? { ...a, acknowledged: true } : a));
  }, [alerts, usersInternal, addUnitHistoryEvent, setAlertsInternal]);

  const approveAmmoReport = useCallback((alertId: string, approverUserId: string) => {
    const alert = alerts.find(a => a.id === alertId);
    if (!alert || !alert.data) return;

    const { unitId, unitName, amount } = alert.data;
    const approver = usersInternal.find(u => u.id === approverUserId);

    addUnitHistoryEvent({
      unitId,
      unitName,
      eventType: "Reporte de Munición Aprobado",
      details: `Reporte de gasto de ${amount}% de munición aprobado por ${approver?.displayName || 'Cmdte.'}. Se actualiza el nivel de munición de la unidad.`,
    });

    setUnitsInternal(prevUnits => prevUnits.map(u => {
      if (u.id === unitId) {
        const currentAmmo = u.ammoLevel ?? 100;
        const newAmmoLevel = Math.max(0, currentAmmo - amount);
        return { ...u, ammoLevel: newAmmoLevel };
      }
      return u;
    }));

    setAlertsInternal(prev => prev.map(a => a.id === alertId ? { ...a, acknowledged: true } : a));

  }, [alerts, usersInternal, addUnitHistoryEvent, setAlertsInternal, setUnitsInternal]);

  const rejectAmmoReport = useCallback((alertId: string, approverUserId: string, reason: string) => {
    const alert = alerts.find(a => a.id === alertId);
    if (!alert || !alert.data) return;

    const { unitId, unitName, amount } = alert.data;
    const approver = usersInternal.find(u => u.id === approverUserId);

    addUnitHistoryEvent({
      unitId,
      unitName,
      eventType: "Reporte de Munición Rechazado",
      details: `Reporte de gasto de ${amount}% de munición rechazado por ${approver?.displayName || 'Cmdte.'}. Motivo: ${reason}`,
    });

    setAlertsInternal(prev => prev.map(a => a.id === alertId ? { ...a, acknowledged: true } : a));

  }, [alerts, usersInternal, addUnitHistoryEvent, setAlertsInternal]);

  const addArtilleryPiece = useCallback((pieceData: NewArtilleryPieceData) => {
    const details = ARTILLERY_TYPE_DETAILS[pieceData.type];
    const newPiece: ArtilleryPiece = {
      id: `ARTY-${generateRandomId()}`,
      name: pieceData.name,
      type: pieceData.type,
      location: pieceData.location,
      status: ArtilleryStatus.READY,
      ammunition: [
        { type: 'HE', quantity: pieceData.initialAmmunition.he },
        { type: 'SMOKE', quantity: pieceData.initialAmmunition.smoke },
        { type: 'ILLUM', quantity: pieceData.initialAmmunition.illum }
      ],
      minRange: details.minRange,
      maxRange: details.maxRange,
      assignedUnitId: pieceData.assignedUnitId,
      commanderId: pieceData.commanderId,
      directorTiroId: pieceData.directorTiroId,
    };
    setArtilleryPiecesInternal(prev => [...prev, newPiece]);
    addUnitHistoryEvent({
      eventType: "Pieza de Artillería Creada",
      details: `Nueva pieza de artillería "${newPiece.name}" (${newPiece.type}) creada y asignada a la unidad ID ${newPiece.assignedUnitId}.`,
      relatedEntityId: newPiece.id,
      relatedEntityType: MapEntityType.ARTILLERY,
      location: newPiece.location
    });
    setAlertsInternal(prev => [{
      id: generateRandomId(), type: AlertType.ARTILLERY_PIECE_CREATED,
      message: `Pieza de artillería "${newPiece.name}" creada y lista para operar.`,
      timestamp: Date.now(), severity: AlertSeverity.INFO, acknowledged: false,
    }, ...prev].sort((a, b) => b.timestamp - a.timestamp).slice(0, 50));
  }, [addUnitHistoryEvent, setAlertsInternal, setArtilleryPiecesInternal]);

  const addForwardObserver = useCallback((observerData: NewForwardObserverData) => {
    const newObserver: ForwardObserver = {
      id: `OA-${generateRandomId()}`,
      callsign: observerData.callsign,
      location: observerData.location,
      status: ForwardObserverStatus.OPERATIONAL,
      assignedUnitId: observerData.assignedUnitId,
      commanderId: observerData.commanderId,
    };
    setForwardObserversInternal(prev => [...prev, newObserver]);
    addUnitHistoryEvent({
      eventType: "Observador Adelantado Creado",
      details: `Nuevo Observador Adelantado (OA) con indicativo "${newObserver.callsign}" creado y asignado a la unidad ID ${newObserver.assignedUnitId}.`,
      relatedEntityId: newObserver.id,
      relatedEntityType: MapEntityType.FORWARD_OBSERVER,
      location: newObserver.location
    });
    setAlertsInternal(prev => [{
      id: generateRandomId(), type: AlertType.FORWARD_OBSERVER_CREATED,
      message: `Observador Adelantado "${newObserver.callsign}" creado y operacional.`,
      timestamp: Date.now(), severity: AlertSeverity.INFO, acknowledged: false,
    }, ...prev].sort((a, b) => b.timestamp - a.timestamp).slice(0, 50));
  }, [addUnitHistoryEvent, setAlertsInternal, setForwardObserversInternal]);

  const addLogisticsRequest = useCallback((unitId: string, details: string) => {
    // FIX: Use `units` which is the correct state variable name.
    const unit = units.find(u => u.id === unitId);
    if (!unit) return;

    const newRequest: LogisticsRequest = {
      id: `LOGREQ-${generateRandomId()}`,
      originatingUnitId: unitId,
      originatingUnitName: unit.name,
      details,
      requestTimestamp: Date.now(),
      status: LogisticsRequestStatus.PENDING,
    };
    setLogisticsRequestsInternal(prev => [newRequest, ...prev]);

    const alertId = generateRandomId();
    newRequest.relatedAlertId = alertId;

    addUnitHistoryEvent({
      unitId, unitName: unit.name, eventType: "Requerimiento Logístico Creado",
      details: `Nuevo requerimiento logístico creado: "${details}"`,
      relatedEntityId: newRequest.id, relatedEntityType: 'LOGISTICS_REQUEST',
    });
    setAlertsInternal(prev => [{
      id: alertId, type: AlertType.LOGISTICS_REQUEST_PENDING,
      unitId: unitId,
      message: `Nuevo requerimiento logístico de ${unit.name}: "${details.substring(0, 50)}..."`,
      timestamp: Date.now(), severity: AlertSeverity.LOW, acknowledged: false
    }, ...prev]);
  }, [units, addUnitHistoryEvent, setLogisticsRequestsInternal, setAlertsInternal]);

  const fulfillLogisticsRequest = useCallback((requestId: string, userId: string) => {
    const request = logisticsRequests.find(r => r.id === requestId);
    if (!request) return;

    const user = usersInternal.find(u => u.id === userId);

    setLogisticsRequestsInternal(prev => prev.map(r =>
      r.id === requestId
        ? { ...r, status: LogisticsRequestStatus.FULFILLED, fulfilledTimestamp: Date.now(), fulfilledByUserId: userId }
        : r
    ));

    addUnitHistoryEvent({
      unitId: request.originatingUnitId,
      unitName: request.originatingUnitName,
      eventType: "Requerimiento Logístico Satisfecho",
      details: `Requerimiento logístico "${request.details.substring(0, 50)}..." satisfecho por ${user?.displayName || 'Logística'}.`,
      relatedEntityId: requestId,
      relatedEntityType: 'LOGISTICS_REQUEST'
    });

    // Acknowledge the original alert
    if (request.relatedAlertId) {
      acknowledgeAlert(request.relatedAlertId);
    }

    setAlertsInternal(prev => [{
      id: generateRandomId(), type: AlertType.LOGISTICS_REQUEST_FULFILLED,
      unitId: request.originatingUnitId,
      message: `Requerimiento logístico para ${request.originatingUnitName} ha sido marcado como satisfecho.`,
      timestamp: Date.now(), severity: AlertSeverity.INFO, acknowledged: false
    }, ...prev]);
  }, [logisticsRequests, usersInternal, acknowledgeAlert, addUnitHistoryEvent, setLogisticsRequestsInternal, setAlertsInternal]);

  const requestFireMission = useCallback((requesterId: string, target: GeoLocation) => {
    // Find best available artillery piece
    const availablePieces = artilleryPieces.filter(p => p.status === ArtilleryStatus.READY && p.ammunition.some(a => a.type === 'HE' && a.quantity > 0));
    let bestPiece: ArtilleryPiece | null = null;
    let minDistance = Infinity;

    for (const piece of availablePieces) {
      const { distance } = calculateDistanceAndAzimuth(piece.location, target);
      if (distance >= piece.minRange && distance <= piece.maxRange) {
        if (distance < minDistance) {
          minDistance = distance;
          bestPiece = piece;
        }
      }
    }

    const newPendingMission: PendingFireMission = {
      id: `PFM-${generateRandomId()}`,
      requesterId,
      target,
      requestTimestamp: Date.now(),
      assignedArtilleryId: bestPiece ? bestPiece.id : null,
      status: bestPiece ? 'pending' : 'no_assets',
      rejectionReason: bestPiece ? undefined : 'No hay piezas de artillería en rango o disponibles.',
    };

    setPendingFireMissionsInternal(prev => [newPendingMission, ...prev]);

    // FIX: Use `units` which is the correct state variable name.
    const requester = units.find(u => u.id === requesterId) || forwardObservers.find(o => o.id === requesterId);
    const requesterName = requester ? ('name' in requester ? requester.name : requester.callsign) : 'Desconocido';

    addUnitHistoryEvent({
      eventType: "Solicitud de Misión de Fuego Recibida",
      unitId: bestPiece?.assignedUnitId,
      details: `Solicitud de fuego recibida de ${requesterName} en ${decimalToDMS(target)}. ${bestPiece ? `Asignada a ${bestPiece.name}.` : 'SIN PIEZAS DISPONIBLES.'}`,
      relatedEntityId: newPendingMission.id,
      location: target,
    });

    if (bestPiece) {
      // FIX: Use `usersInternal` which is the correct state variable name.
      const fdo = usersInternal.find(u => u.id === bestPiece.directorTiroId);
      const config = userTelegramConfigs.find(c => c.userId === fdo?.id);
      if (fdo && config?.telegramChatId) {
        const message = `
*--- NUEVA MISIÓN DE FUEGO ASIGNADA ---*

*Pieza:* ${escapeTelegramMarkdownV2(bestPiece.name)}
*Tipo:* ${escapeTelegramMarkdownV2(bestPiece.type)}
*Solicitante:* ${escapeTelegramMarkdownV2(requesterName)}
*Blanco:* ${escapeTelegramMarkdownV2(decimalToDMS(target))}

Por favor, acceda a SIMCOP para procesar la misión\\.
            `;
        sendTelegramMessage(message, config.telegramChatId);
      }
    }

  }, [artilleryPieces, units, forwardObservers, userTelegramConfigs, addUnitHistoryEvent, usersInternal, setPendingFireMissionsInternal]);

  const acceptFireMission = useCallback((pendingMissionId: string, artilleryId: string, projectileType: ProjectileType, charge: number, isMrsi: boolean, firingSolution: FiringSolution) => {
    const pendingMission = pendingFireMissions.find(p => p.id === pendingMissionId);
    const piece = artilleryPieces.find(p => p.id === artilleryId);
    if (!pendingMission || !piece) return;

    const newActiveMission: ActiveFireMission = {
      id: pendingMission.id, // Reuse ID for tracking
      artilleryId,
      requesterId: pendingMission.requesterId,
      target: pendingMission.target,
      status: 'active',
      fireTimestamp: Date.now(),
      projectileType,
      charge,
      isMrsi,
    };

    setPendingFireMissionsInternal(prev => prev.filter(p => p.id !== pendingMissionId));
    setActiveFireMissionsInternal(prev => [newActiveMission, ...prev]);
    setArtilleryPiecesInternal(prev => prev.map(p => p.id === artilleryId ? { ...p, status: ArtilleryStatus.FIRING } : p));

    addUnitHistoryEvent({
      eventType: "Misión de Fuego Iniciada",
      details: `Misión de fuego iniciada por ${piece.name} hacia blanco en ${decimalToDMS(pendingMission.target)}.`,
      relatedEntityId: newActiveMission.id,
      location: pendingMission.target
    });

  }, [pendingFireMissions, artilleryPieces, addUnitHistoryEvent, setPendingFireMissionsInternal, setActiveFireMissionsInternal, setArtilleryPiecesInternal]);

  const rejectFireMission = useCallback((pendingMissionId: string, rejectorUserId: string, reason: string) => {
    const mission = pendingFireMissions.find(m => m.id === pendingMissionId);
    if (!mission) return;

    setPendingFireMissionsInternal(prev => prev.map(m => m.id === pendingMissionId ? { ...m, status: 'rejected', rejectionReason: reason } : m));

    // FIX: Use `usersInternal` which is the correct state variable name.
    const rejector = usersInternal.find(u => u.id === rejectorUserId);
    addUnitHistoryEvent({
      eventType: "Misión de Fuego Rechazada",
      details: `Misión de fuego rechazada por ${rejector?.displayName || 'CDT'}. Motivo: ${reason}`,
      relatedEntityId: mission.id,
      location: mission.target
    });
  }, [pendingFireMissions, usersInternal, addUnitHistoryEvent, setPendingFireMissionsInternal]);

  const dismissPendingMission = useCallback((missionId: string) => {
    setPendingFireMissionsInternal(prev => prev.filter(m => m.id !== missionId));
  }, [setPendingFireMissionsInternal]);

  const confirmShotFired = useCallback((missionId: string) => {
    const mission = activeFireMissions.find(m => m.id === missionId);
    if (!mission) return;

    setArtilleryPiecesInternal(prev => prev.map(p => {
      if (p.id === mission.artilleryId) {
        const ammoType = getAmmoTypeFromProjectile(mission.projectileType);
        const newAmmunition = p.ammunition.map(a => {
          if (a.type === ammoType) {
            return { ...a, quantity: Math.max(0, a.quantity - 1) };
          }
          return a;
        });
        return { ...p, status: ArtilleryStatus.READY, ammunition: newAmmunition };
      }
      return p;
    }));

    setActiveFireMissionsInternal(prev => prev.map(m => m.id === missionId ? { ...m, status: 'complete', completedTimestamp: Date.now() } : m));

    addUnitHistoryEvent({
      eventType: "Misión de Fuego Completada",
      details: `Disparo confirmado para la misión de fuego en ${decimalToDMS(mission.target)}.`,
      relatedEntityId: mission.id,
      location: mission.target
    });

    // Auto-remove completed mission after a delay
    setTimeout(() => {
      setActiveFireMissionsInternal(prev => prev.filter(m => m.id !== missionId));
    }, 30000);

  }, [activeFireMissions, addUnitHistoryEvent, setActiveFireMissionsInternal, setArtilleryPiecesInternal]);

  const updateUserTelegramConfig = useCallback((userId: string, chatId: string) => {
    setUserTelegramConfigsInternal(prev => {
      const existingConfigIndex = prev.findIndex(c => c.userId === userId);
      if (existingConfigIndex > -1) {
        const updatedConfigs = [...prev];
        updatedConfigs[existingConfigIndex] = { userId, telegramChatId: chatId };
        return updatedConfigs;
      } else {
        return [...prev, { userId, telegramChatId: chatId }];
      }
    });
  }, [setUserTelegramConfigsInternal]);

  const assignUAVAsset = useCallback(async (unitId: string, asset: UAVAsset) => {
    setUnitsInternal(prev => prev.map(u => {
      if (u.id === unitId) {
        return { ...u, uavAssets: [...(u.uavAssets || []), asset] };
      }
      return u;
    }));
    addUnitHistoryEvent({
      unitId,
      unitName: units.find(u => u.id === unitId)?.name || 'Unknown',
      eventType: "Activo UAV Asignado" as any,
      details: `Nuevo activo UAV (${asset.type}) asignado. ID: ${asset.id}`,
    });
    return { success: true };
  }, [units, setUnitsInternal, addUnitHistoryEvent]);

  const removeUAVAsset = useCallback(async (unitId: string, assetId: string) => {
    setUnitsInternal(prev => prev.map(u => {
      if (u.id === unitId) {
        return { ...u, uavAssets: (u.uavAssets || []).filter(a => a.id !== assetId) };
      }
      return u;
    }));
    addUnitHistoryEvent({
      unitId,
      unitName: units.find(u => u.id === unitId)?.name || 'Unknown',
      eventType: "Activo UAV Eliminado" as any,
      details: `Activo UAV eliminado. ID: ${assetId}`,
    });
    return { success: true };
  }, [units, setUnitsInternal, addUnitHistoryEvent]);


  return {
    users: usersInternal,
    login: async (u, p) => login(u, p),
    addUser: async (d) => addUser(d),
    updateUser: async (id, d) => updateUser(id, d),
    deleteUser: async (id, adminId) => deleteUser(id, adminId),
    units,
    intelligenceReports,
    alerts,

    afterActionReports,
    q5Reports,
    operationsOrders,
    artilleryPieces,
    forwardObservers,
    activeFireMissions,
    pendingFireMissions,
    logisticsRequests,
    userTelegramConfigs,
    q5GeneratingStatus,
    q5SendingStatus,
    unitHistoryLog,
    acknowledgeAlert,
    addIntelReport,
    addManualRoutePoint,
    updateUnitLogistics,
    updateUnitAttributes,
    markUnitHourlyReport,
    reportUnitEngaged,
    reportUnitCeasefire,
    addAfterActionReport,
    sendTestTelegramAlert,
    addUnit,
    generateAndAddQ5Report,
    sendQ5ReportViaTelegram,
    sendUnitToRetraining,
    returnUnitFromRetraining,
    startUnitLeave,
    startUnitRetraining,
    updateUnitMission,
    updateUnitSituation,
    processSpotReport,
    addOperationsOrder,
    updateOperationsOrder,
    publishOperationsOrder,
    acknowledgeOperationsOrder,
    submitAmmoExpenditureReport,
    logPlatoonNovelty,
    approvePlatoonNovelty,
    rejectPlatoonNovelty,
    approveAmmoReport,
    rejectAmmoReport,
    addUnitHierarchy,
    updateUnitHierarchyDetails,
    deleteUnitHierarchy,
    assignCommanderToOrganizationalUnit,
    addArtilleryPiece,
    addForwardObserver,
    fulfillLogisticsRequest,
    addLogisticsRequest,
    confirmShotFired,
    requestFireMission,
    acceptFireMission,
    updateUserTelegramConfig,
    rejectFireMission,
    dismissPendingMission,
    assignUAVAsset,
    removeUAVAsset,
  };
};