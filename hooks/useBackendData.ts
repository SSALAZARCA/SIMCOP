
import { useState, useEffect, useCallback } from 'react';

import type {
  MilitaryUnit, IntelligenceReport, Alert, GeoLocation, AfterActionReport, Q5Report, UnitHistoryEvent, UseSimulatedDataReturn,
  User, OperationsOrder, ArtilleryPiece, ForwardObserver,
  ActiveFireMission, PendingFireMission, LogisticsRequest, UserTelegramConfig,
  ProjectileType, FiringSolution, NewUnitData, NewHierarchyUnitData, UpdateHierarchyUnitData, UpdateOperationsOrderData, NewOperationsOrderData, UAVAsset, OsintEvent
} from '../types';
import {
  UnitStatus, AlertType, AlertSeverity, UnitSituationINSITOP
} from '../types';

import { unitService } from '../services/unitService';
import { intelService } from '../services/intelService';
import { alertService } from '../services/alertService';
import { userService } from '../services/userService';
import { artilleryService } from '../services/artilleryService';
import { observerService } from '../services/observerService';
import { orderService } from '../services/orderService';
import { aarService } from '../services/aarService';
import { q5Service } from '../services/q5Service';
import { logisticsService } from '../services/logisticsService';
import { historyService } from '../services/historyService';
import { osintService } from '../services/osintService';

import { useHistoryManagement } from './modules/useHistoryManagement';
import { useIntelligenceManagement } from './modules/useIntelligenceManagement';
import { useUnitsManagement } from './modules/useUnitsManagement';
import { useUserManagement } from './modules/useUserManagement';
import { useAlertsManagement } from './modules/useAlertsManagement';
import { useLogisticsManagement } from './modules/useLogisticsManagement';
import { useArtilleryManagement } from './modules/useArtilleryManagement';
import { useOperationsOrdersManagement } from './modules/useOperationsOrdersManagement';
import { useReportManagement } from './modules/useReportManagement';
import { useTacticalOps } from './modules/useTacticalOps';

export const generateRandomId = () => Math.random().toString(36).substring(2, 15);

export const useBackendData = (): UseSimulatedDataReturn => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [userTelegramConfigs, setUserTelegramConfigsInternal] = useState<UserTelegramConfig[]>([]);
  const [osintEvents, setOsintEventsInternal] = useState<OsintEvent[]>([]);
  const [loadingErrors, setLoadingErrors] = useState<string[]>([]);

  const { unitHistoryLog, setUnitHistoryLogInternal, addUnitHistoryEvent } = useHistoryManagement();
  const { alerts, setAlertsInternal, acknowledgeAlert } = useAlertsManagement();
  const { intelligenceReports, setIntelligenceReportsInternal, addIntelReport } = useIntelligenceManagement(setAlertsInternal);
  const { usersInternal, setUsersInternal, login, addUser, updateUser, deleteUser, sendTestTelegramAlert, updateUserTelegramConfig } = useUserManagement(addUnitHistoryEvent, setAlertsInternal, []); // temporary empty units
  const { units, setUnitsInternal, addUnitHierarchy, updateUnitHierarchyDetails, deleteUnitHierarchy, assignCommanderToOrganizationalUnit, updateUnitAo, assignUAVAsset, removeUAVAsset } = useUnitsManagement(addUnitHistoryEvent, setAlertsInternal, usersInternal);
  const { updateUnitLogistics, reportUnitEngaged, reportUnitCeasefire, addManualRoutePoint, markUnitHourlyReport, updateUnitMission, updateUnitSituation, addUnit, processSpotReport, updateUnitAttributes, sendUnitToRetraining, returnUnitFromRetraining, startUnitLeave, startUnitRetraining } = useTacticalOps(addUnitHistoryEvent, setAlertsInternal, units, setUnitsInternal);
  const { logisticsRequests, setLogisticsRequestsInternal, addLogisticsRequest, fulfillLogisticsRequest, submitAmmoExpenditureReport, approveAmmoReport, rejectAmmoReport, logPlatoonNovelty, approvePlatoonNovelty, rejectPlatoonNovelty } = useLogisticsManagement(addUnitHistoryEvent, setAlertsInternal, units);
  const { artilleryPieces, setArtilleryPiecesInternal, forwardObservers, setForwardObserversInternal, activeFireMissions, setActiveFireMissionsInternal, pendingFireMissions, setPendingFireMissionsInternal, addArtilleryPiece, addForwardObserver, confirmShotFired, requestFireMission, acceptFireMission, rejectFireMission, dismissPendingMission } = useArtilleryManagement(addUnitHistoryEvent, setAlertsInternal);
  const { operationsOrders, setOperationsOrdersInternal, addOperationsOrder, updateOperationsOrder, publishOperationsOrder, acknowledgeOperationsOrder } = useOperationsOrdersManagement(addUnitHistoryEvent, setAlertsInternal);
  const { afterActionReports, setAfterActionReportsInternal, q5Reports, setQ5ReportsInternal, q5GeneratingStatus, q5SendingStatus, setQ5SendingStatus, addAfterActionReport, generateAndAddQ5Report, sendQ5ReportViaTelegram } = useReportManagement(addUnitHistoryEvent, setAlertsInternal, units, setUnitsInternal);

  const loadDataFromBackend = async () => {
    setLoadingErrors([]);
    try {
      const results = await Promise.allSettled([
        unitService.getAllUnits(),
        intelService.getAllReports(),
        alertService.getAllAlerts(),
        userService.getAllUsers(),
        artilleryService.getAllPieces(),
        observerService.getAllObservers(),
        orderService.getAllOrders(),
        aarService.getAllReports(),
        q5Service.getAllReports(),
        logisticsService.getAllRequests(),
        historyService.getAllEvents(),
        osintService.getAllEvents()
      ]);

      const errors: string[] = [];
      const [
        resUnits, resIntel, resAlerts, resUsers,
        resArtillery, resObservers, resOrders,
        resAARs, resQ5s, resLogistics, resHistory, resOsint
      ] = results;

      if (resUnits.status === 'fulfilled') setUnitsInternal(resUnits.value); else errors.push("unidades");
      if (resIntel.status === 'fulfilled') setIntelligenceReportsInternal(resIntel.value); else errors.push("inteligencia");
      if (resAlerts.status === 'fulfilled') setAlertsInternal(resAlerts.value); else errors.push("alertas");
      if (resUsers.status === 'fulfilled') setUsersInternal(resUsers.value); else errors.push("usuarios");
      if (resArtillery.status === 'fulfilled') setArtilleryPiecesInternal(resArtillery.value); else errors.push("artillería");
      if (resObservers.status === 'fulfilled') setForwardObserversInternal(resObservers.value); else errors.push("observadores");
      if (resOrders.status === 'fulfilled') setOperationsOrdersInternal(resOrders.value); else errors.push("órdenes");
      if (resAARs.status === 'fulfilled') setAfterActionReportsInternal(resAARs.value); else errors.push("AARs");
      if (resQ5s.status === 'fulfilled') setQ5ReportsInternal(resQ5s.value); else errors.push("reportes Q5");
      if (resLogistics.status === 'fulfilled') setLogisticsRequestsInternal(resLogistics.value); else errors.push("logística");
      if (resHistory.status === 'fulfilled') setUnitHistoryLogInternal(resHistory.value); else errors.push("historial");
      if (resOsint.status === 'fulfilled') setOsintEventsInternal(resOsint.value); else errors.push("OSINT");

      if (errors.length > 0) {
        setLoadingErrors(errors);
        setAlertsInternal(prev => [{
          id: generateRandomId(),
          type: AlertType.ERROR as any,
          message: `Error al cargar: ${errors.join(', ')}. Algunas funciones podrían estar limitadas.`,
          timestamp: Date.now(),
          severity: AlertSeverity.CRITICAL,
          acknowledged: false
        }, ...prev]);
      }

      setIsInitialized(true);
    } catch (error) {
      console.error("Error loading data:", error);
      setIsInitialized(true);
    }
  };

  const refreshOsint = async () => {
    try {
      await osintService.refreshEvents();
      const events = await osintService.getAllEvents();
      setOsintEventsInternal(events);
    } catch (error) {
      console.error("Error refreshing OSINT:", error);
    }
  };

  const verifyOsintEvent = async (id: string, verified: boolean) => {
    try {
      const updated = await osintService.verifyEvent(id, verified);
      setOsintEventsInternal(prev => prev.map(e => e.id === id ? updated : e));
    } catch (error) {
      console.error("Error verifying OSINT event:", error);
    }
  };

  // Removed automatic loading useEffect to prevent 403 storms on startup
  // Data loading is now controlled manually via refreshData exposed below

  return {
    isInitialized,
    refreshData: loadDataFromBackend,
    units,
    intelligenceReports,
    alerts,
    afterActionReports,
    q5Reports,
    unitHistoryLog,
    users: usersInternal,
    operationsOrders,
    artilleryPieces,
    forwardObservers,
    activeFireMissions,
    pendingFireMissions,
    logisticsRequests,
    userTelegramConfigs,
    q5GeneratingStatus,
    q5SendingStatus,
    osintEvents,
    refreshOsint,
    verifyOsintEvent,

    login,
    addUser,
    updateUser,
    deleteUser,
    addIntelReport,
    acknowledgeAlert,
    generateRandomId,
    setAlertsInternal,
    addAfterActionReport,
    generateAndAddQ5Report,
    sendQ5ReportViaTelegram,
    sendTestTelegramAlert,
    addUnit,
    updateUnitLogistics,
    reportUnitEngaged,
    reportUnitCeasefire,
    addManualRoutePoint,
    markUnitHourlyReport,
    updateUnitAttributes,
    sendUnitToRetraining: sendUnitToRetraining as any,
    returnUnitFromRetraining: returnUnitFromRetraining as any,
    startUnitLeave: startUnitLeave as any,
    startUnitRetraining: startUnitRetraining as any,
    updateUnitMission,
    updateUnitSituation,
    processSpotReport,
    addOperationsOrder,
    updateOperationsOrder,
    publishOperationsOrder,
    acknowledgeOperationsOrder,
    submitAmmoExpenditureReport: submitAmmoExpenditureReport as any,
    logPlatoonNovelty: logPlatoonNovelty as any,
    approvePlatoonNovelty: approvePlatoonNovelty as any,
    rejectPlatoonNovelty: rejectPlatoonNovelty as any,
    approveAmmoReport: approveAmmoReport as any,
    rejectAmmoReport: rejectAmmoReport as any,
    addUnitHierarchy,
    updateUnitHierarchyDetails,
    deleteUnitHierarchy,
    assignCommanderToOrganizationalUnit,
    updateUnitAo,
    addArtilleryPiece,
    addForwardObserver,
    fulfillLogisticsRequest,
    addLogisticsRequest,
    confirmShotFired: confirmShotFired as any,
    requestFireMission: requestFireMission as any,
    acceptFireMission: acceptFireMission as any,
    updateUserTelegramConfig: updateUserTelegramConfig as any,
    rejectFireMission: rejectFireMission as any,
    assignUAVAsset,
    removeUAVAsset,
    dismissPendingMission: dismissPendingMission as any,
  };
};