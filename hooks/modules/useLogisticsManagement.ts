
import { useState, useCallback } from 'react';
import type { LogisticsRequest, MilitaryUnit, UnitHistoryEvent, Alert } from '../../types';
import { LogisticsRequestStatus, AlertType, AlertSeverity } from '../../types';
import { logisticsService } from '../../services/logisticsService';
import { generateRandomId } from '../useBackendData';

export const useLogisticsManagement = (
    addUnitHistoryEvent: (event: Omit<UnitHistoryEvent, 'id' | 'timestamp'>) => Promise<void>,
    setAlertsInternal: React.Dispatch<React.SetStateAction<Alert[]>>,
    units: MilitaryUnit[]
) => {
    const [logisticsRequests, setLogisticsRequestsInternal] = useState<LogisticsRequest[]>([]);

    const addLogisticsRequest = useCallback(async (unitId: string, details: string) => {
        const unit = units.find(u => u.id === unitId);
        const newRequest: LogisticsRequest = {
            id: generateRandomId(),
            originatingUnitId: unitId,
            originatingUnitName: unit?.name || 'Unidad Desconocida',
            details: details,
            requestTimestamp: Date.now(),
            status: LogisticsRequestStatus.PENDING,
        };

        try {
            const createdRequest = await logisticsService.createRequest(newRequest);
            setLogisticsRequestsInternal(prev => [createdRequest, ...prev]);

            addUnitHistoryEvent({
                unitId,
                unitName: unit?.name || 'Unknown',
                eventType: "Requerimiento Logístico Creado",
                details: `Solicitud logística: ${details}`,
            });
        } catch (error) {
            console.error("Error creating logistics request:", error);
        }
    }, [units, addUnitHistoryEvent]);

    const fulfillLogisticsRequest = useCallback(async (requestId: string, userId: string) => {
        try {
            const existing = logisticsRequests.find(r => r.id === requestId);
            if (!existing) return;

            const updatedRequest: LogisticsRequest = {
                ...existing,
                status: LogisticsRequestStatus.FULFILLED,
                fulfilledTimestamp: Date.now(),
                fulfilledByUserId: userId
            };

            await logisticsService.updateRequest(requestId, updatedRequest);
            setLogisticsRequestsInternal(prev => prev.map(r => r.id === requestId ? updatedRequest : r));

            addUnitHistoryEvent({
                unitId: existing.originatingUnitId,
                unitName: existing.originatingUnitName,
                eventType: "Requerimiento Logístico Satisfecha" as any, // Match type enum or cast
                details: `Solicitud logística satisfecha.`,
            });
        } catch (error) {
            console.error("Error fulfilling logistics request:", error);
        }
    }, [logisticsRequests, addUnitHistoryEvent]);

    const submitAmmoExpenditureReport = useCallback(async (report: any) => {
        // Mock implementation of ammo report submission
        console.log("Ammo report submitted:", report);
        return { success: true };
    }, []);

    const approveAmmoReport = useCallback(async (reportId: string) => {
        console.log("Ammo report approved:", reportId);
    }, []);

    const rejectAmmoReport = useCallback(async (reportId: string, reason: string) => {
        console.log("Ammo report rejected:", reportId, reason);
    }, []);

    const logPlatoonNovelty = useCallback(async (novelty: any) => {
        console.log("Platoon novelty logged:", novelty);
        return { success: true };
    }, []);

    const approvePlatoonNovelty = useCallback(async (noveltyId: string) => {
        console.log("Novelty approved:", noveltyId);
    }, []);

    const rejectPlatoonNovelty = useCallback(async (noveltyId: string, reason: string) => {
        console.log("Novelty rejected:", noveltyId, reason);
    }, []);

    return {
        logisticsRequests,
        setLogisticsRequestsInternal,
        addLogisticsRequest,
        fulfillLogisticsRequest,
        submitAmmoExpenditureReport,
        approveAmmoReport,
        rejectAmmoReport,
        logPlatoonNovelty,
        approvePlatoonNovelty,
        rejectPlatoonNovelty
    };
};
