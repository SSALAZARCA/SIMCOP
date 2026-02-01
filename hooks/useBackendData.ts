
import { useState, useEffect, useCallback } from 'react';

import type {
  MilitaryUnit, IntelligenceReport, Alert, GeoLocation, AfterActionReport, Q5Report, UnitHistoryEvent, UseSimulatedDataReturn,
  User, OperationsOrder, ArtilleryPiece, ForwardObserver,
  ActiveFireMission, PendingFireMission, LogisticsRequest, UserTelegramConfig,
  ProjectileType, FiringSolution, NewUnitData, NewHierarchyUnitData, UpdateHierarchyUnitData, UpdateOperationsOrderData, NewOperationsOrderData, UAVAsset
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

  const { unitHistoryLog, setUnitHistoryLogInternal, addUnitHistoryEvent } = useHistoryManagement();
  const { alerts, setAlertsInternal, acknowledgeAlert } = useAlertsManagement();
  const { intelligenceReports, setIntelligenceReportsInternal, addIntelReport } = useIntelligenceManagement(setAlertsInternal);
  const { usersInternal, setUsersInternal, login, addUser, updateUser, deleteUser, sendTestTelegramAlert, updateUserTelegramConfig } = useUserManagement(addUnitHistoryEvent, setAlertsInternal, []); // temporary empty units
  const { units, setUnitsInternal, addUnitHierarchy, updateUnitHierarchyDetails, deleteUnitHierarchy, assignCommanderToOrganizationalUnit, assignUAVAsset, removeUAVAsset } = useUnitsManagement(addUnitHistoryEvent, setAlertsInternal, usersInternal);
  const { updateUnitLogistics, reportUnitEngaged, reportUnitCeasefire, addManualRoutePoint, markUnitHourlyReport, updateUnitMission, updateUnitSituation, addUnit, processSpotReport, updateUnitAttributes, sendUnitToRetraining, returnUnitFromRetraining, startUnitLeave, startUnitRetraining } = useTacticalOps(addUnitHistoryEvent, setAlertsInternal, units, setUnitsInternal);
  const { logisticsRequests, setLogisticsRequestsInternal, addLogisticsRequest, fulfillLogisticsRequest, submitAmmoExpenditureReport, approveAmmoReport, rejectAmmoReport, logPlatoonNovelty, approvePlatoonNovelty, rejectPlatoonNovelty } = useLogisticsManagement(addUnitHistoryEvent, setAlertsInternal, units);
  const { artilleryPieces, setArtilleryPiecesInternal, forwardObservers, setForwardObserversInternal, activeFireMissions, setActiveFireMissionsInternal, pendingFireMissions, setPendingFireMissionsInternal, addArtilleryPiece, addForwardObserver, confirmShotFired, requestFireMission, acceptFireMission, rejectFireMission, dismissPendingMission } = useArtilleryManagement(addUnitHistoryEvent, setAlertsInternal);
  const { operationsOrders, setOperationsOrdersInternal, addOperationsOrder, updateOperationsOrder, publishOperationsOrder, acknowledgeOperationsOrder } = useOperationsOrdersManagement(addUnitHistoryEvent, setAlertsInternal);
  const { afterActionReports, setAfterActionReportsInternal, q5Reports, setQ5ReportsInternal, q5GeneratingStatus, q5SendingStatus, setQ5SendingStatus, addAfterActionReport, generateAndAddQ5Report, sendQ5ReportViaTelegram } = useReportManagement(addUnitHistoryEvent, setAlertsInternal, units, setUnitsInternal);

  const loadDataFromBackend = async () => {
    try {
      const [
        fetchedUnits, fetchedIntel, fetchedAlerts, fetchedUsers,
        fetchedArtillery, fetchedObservers, fetchedOrders,
        fetchedAARs, fetchedQ5s, fetchedLogistics, fetchedHistory
      ] = await Promise.all([
        unitService.getAllUnits().catch(e => []),
        intelService.getAllReports().catch(e => []),
        alertService.getAllAlerts().catch(e => []),
        userService.getAllUsers().catch(e => []),
        artilleryService.getAllPieces().catch(e => []),
        observerService.getAllObservers().catch(e => []),
        orderService.getAllOrders().catch(e => []),
        aarService.getAllReports().catch(e => []),
        q5Service.getAllReports().catch(e => []),
        logisticsService.getAllRequests().catch(e => []),
        historyService.getAllEvents().catch(e => [])
      ]);

      setUnitsInternal(fetchedUnits);
      setIntelligenceReportsInternal(fetchedIntel);
      setAlertsInternal(fetchedAlerts);
      setUsersInternal(fetchedUsers);
      setArtilleryPiecesInternal(fetchedArtillery);
      setForwardObserversInternal(fetchedObservers);
      setOperationsOrdersInternal(fetchedOrders);
      setAfterActionReportsInternal(fetchedAARs);
      setQ5ReportsInternal(fetchedQ5s);
      setLogisticsRequestsInternal(fetchedLogistics);
      setUnitHistoryLogInternal(fetchedHistory);
      setIsInitialized(true);
    } catch (error) {
      console.error("Error loading data:", error);
      setIsInitialized(true);
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

    login,
    addUser,
    updateUser,
    deleteUser,
    addIntelReport,
    acknowledgeAlert,
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