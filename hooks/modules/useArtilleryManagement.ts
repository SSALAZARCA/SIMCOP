
import { useState, useCallback, useEffect } from 'react';
import type { ArtilleryPiece, ForwardObserver, ActiveFireMission, PendingFireMission, UnitHistoryEvent, NewArtilleryPieceData, NewForwardObserverData, Alert, GeoLocation, ProjectileType, FiringSolution } from '../../types';
import { ArtilleryStatus, ForwardObserverStatus, AlertType, AlertSeverity } from '../../types';
import { artilleryService } from '../../services/artilleryService';
import { observerService } from '../../services/observerService';
import { fireMissionService, FireMission, FireMissionStatus } from '../../services/fireMissionService';
import { generateRandomId } from '../../utils/idUtils';

export const useArtilleryManagement = (
    addUnitHistoryEvent: (event: Omit<UnitHistoryEvent, 'id' | 'timestamp'>) => Promise<void>,
    setAlertsInternal: React.Dispatch<React.SetStateAction<Alert[]>>
) => {
    const [artilleryPieces, setArtilleryPiecesInternal] = useState<ArtilleryPiece[]>([]);
    const [forwardObservers, setForwardObserversInternal] = useState<ForwardObserver[]>([]);

    // We map backend missions to frontend types (Pending/Active) for compatibility
    const [rawMissions, setRawMissions] = useState<FireMission[]>([]);

    const safeRawMissions = Array.isArray(rawMissions) ? rawMissions : [];

    const pendingFireMissions: PendingFireMission[] = safeRawMissions
        .filter(m => m.status === FireMissionStatus.PENDING || m.status === FireMissionStatus.REJECTED || m.status === FireMissionStatus.APPROVED) // KEEP REJECTED visibly so user sees feedback
        .map(m => ({
            id: m.id,
            target: m.targetLocation,
            assignedArtilleryId: m.assignedArtilleryId || null,
            requesterId: m.requesterId,
            requestTimestamp: m.requestTimestamp,
            status: m.status === FireMissionStatus.REJECTED ? 'rejected' : (m.status === FireMissionStatus.APPROVED ? 'approved' : 'pending'), // map simplified status
            rejectionReason: m.rejectionReason
        }));

    const activeFireMissions: ActiveFireMission[] = safeRawMissions
        .filter(m => m.status === FireMissionStatus.ACTIVE || m.status === FireMissionStatus.APPROVED) // APPROVED acts as active-ready roughly
        .map(m => ({
            id: m.id,
            target: m.targetLocation,
            requesterId: m.requesterId,
            artilleryId: m.assignedArtilleryId!,
            status: 'active',
            fireTimestamp: m.fireTimestamp || Date.now(),
            projectileType: (m.projectileType as any) || 'HE',
            charge: m.charge || 1,
            isMrsi: false
        }));

    // Polling Loop
    useEffect(() => {
        const fetchMissions = async () => {
            const token = localStorage.getItem('simcop_auth_token');
            if (!token) return;

            try {
                const data = await fireMissionService.getAll();
                if (Array.isArray(data)) {
                    setRawMissions(data);
                } else {
                    console.error("fetchMissions returned non-array:", data);
                }
            } catch (e) {
                console.error("Polling error", e);
            }
        };

        fetchMissions(); // initial
        const interval = setInterval(fetchMissions, 5000); // Polling slower (5s) for stability
        return () => clearInterval(interval);
    }, []);

    const addArtilleryPiece = useCallback(async (pieceData: NewArtilleryPieceData) => {
        try {
            const piece: ArtilleryPiece = {
                ...pieceData as any,
                id: generateRandomId(),
                status: ArtilleryStatus.READY,
                ammunition: [
                    { type: 'HE', quantity: pieceData.initialAmmunition.he },
                    { type: 'SMOKE', quantity: pieceData.initialAmmunition.smoke },
                    { type: 'ILLUM', quantity: pieceData.initialAmmunition.illum },
                ],
                minRange: 1000,
                maxRange: 15000,
            };
            const newPiece = await artilleryService.createPiece(piece);
            setArtilleryPiecesInternal(prev => [...prev, newPiece]);
            return { success: true };
        } catch (e) {
            return { success: false, message: 'Error al agregar pieza' };
        }
    }, []);

    const addForwardObserver = useCallback(async (observerData: NewForwardObserverData) => {
        try {
            const observer: ForwardObserver = {
                ...observerData,
                id: generateRandomId(),
                status: ForwardObserverStatus.OPERATIONAL,
            };
            const newObserver = await observerService.createObserver(observer);
            setForwardObserversInternal(prev => [...prev, newObserver]);
            return { success: true };
        } catch (e) {
            return { success: false, message: 'Error al agregar observador' };
        }
    }, []);

    const confirmShotFired = useCallback(async (missionId: string) => {
        // Backend update
        await fireMissionService.updateStatus(missionId, FireMissionStatus.ACTIVE);

        addUnitHistoryEvent({
            eventType: "Misión de Fuego Iniciada",
            details: `Disparo confirmado para misión ${missionId}.`
        });

        // Optimistic update
        const missions = await fireMissionService.getAll();
        setRawMissions(missions);

    }, [addUnitHistoryEvent]);

    const requestFireMission = useCallback(async (requesterId: string, target: GeoLocation, artilleryId?: string) => {
        try {
            const newMission = await fireMissionService.create({
                requesterId,
                targetLocation: target,
                assignedArtilleryId: artilleryId
            });

            setAlertsInternal(prev => [{
                id: generateRandomId(), type: AlertType.FIRE_MISSION_REQUESTED,
                message: `Solicitud de fuego recibida (ID: ${newMission.id.substring(0, 4)})`,
                timestamp: Date.now(), severity: AlertSeverity.HIGH, acknowledged: false
            }, ...prev]);

            // Refetch immediately
            const missions = await fireMissionService.getAll();
            setRawMissions(missions);

            return { success: true };
        } catch (e) {
            return { success: false, message: "Error al solicitar fuego" };
        }
    }, [setAlertsInternal]);

    const acceptFireMission = useCallback(async (missionId: string, artilleryId?: string, projectileType?: ProjectileType, charge?: number, isMrsi?: boolean, firingSolution?: FiringSolution) => {
        try {
            if (artilleryId) {
                await fireMissionService.assignArtillery(missionId, artilleryId, projectileType, charge);
            } else {
                await fireMissionService.updateStatus(missionId, FireMissionStatus.APPROVED);
            }
            
            // Optionally we could send firing solution to the piece via another API or websocket here.
            // For now, assigning the piece marks it as APPROVED and updates the frontend.
            
            const missions = await fireMissionService.getAll();
            setRawMissions(missions);
            
            setAlertsInternal(prev => [{
                id: crypto.randomUUID(), type: AlertType.INFO,
                message: `Misión ${missionId.substring(0,6)} procesada y enviada a la pieza asignada.`,
                timestamp: Date.now(), severity: AlertSeverity.INFO, acknowledged: false
            }, ...prev]);
            
            return { success: true };
        } catch (error) {
            console.error("Error accepting fire mission:", error);
            return { success: false, message: "Error al asignar pieza" };
        }
    }, [setAlertsInternal]);

    const rejectFireMission = useCallback(async (missionId: string) => {
        await fireMissionService.updateStatus(missionId, FireMissionStatus.REJECTED, "Rechazada por CDT");
        const missions = await fireMissionService.getAll();
        setRawMissions(missions);
        return { success: true };
    }, []);

    const dismissPendingMission = useCallback(async (missionId: string) => {
        // This is just "hiding" the notification for rejected.
        // Or cancelling.
        // Let's implement as Cancelled.
        await fireMissionService.updateStatus(missionId, FireMissionStatus.CANCELLED);
        const missions = await fireMissionService.getAll();
        setRawMissions(missions);
    }, []);

    const deleteArtilleryPiece = useCallback(async (id: string) => {
        try {
            await artilleryService.deletePiece(id);
            setArtilleryPiecesInternal(prev => prev.filter(p => p.id !== id));
            return { success: true };
        } catch (e) {
            return { success: false, message: 'Error deleting piece' };
        }
    }, []);

    const deleteForwardObserver = useCallback(async (id: string) => {
        try {
            await observerService.deleteObserver(id);
            setForwardObserversInternal(prev => prev.filter(o => o.id !== id));
            return { success: true };
        } catch (e) {
            return { success: false, message: 'Error deleting observer' };
        }
    }, []);

    return {
        artilleryPieces,
        setArtilleryPiecesInternal,
        forwardObservers,
        setForwardObserversInternal,
        activeFireMissions,
        setActiveFireMissionsInternal: () => { }, // No-op, managed by polling mostly
        pendingFireMissions,
        setPendingFireMissionsInternal: () => { }, // No-op
        addArtilleryPiece,
        addForwardObserver,
        deleteArtilleryPiece,
        deleteForwardObserver,
        confirmShotFired,
        requestFireMission,
        acceptFireMission,
        rejectFireMission,
        dismissPendingMission
    };
};
