
import { useCallback, useEffect, useRef } from 'react';
import { UnitStatus, AlertType, AlertSeverity, MapEntityType, UnitSituationINSITOP } from '../../types';
import type { MilitaryUnit, GeoLocation, Alert, UnitHistoryEvent, RoutePoint, SpotReportPayload, NewUnitData } from '../../types';
import { generateRandomId } from '../../utils/idUtils';
import { decimalToDMS } from '../../utils/coordinateUtils';
import { MAX_ROUTE_HISTORY_LENGTH, COMMUNICATION_OVERDUE_THRESHOLD_MS } from '../../constants';
import { unitService } from '../../services/unitService';
import { userService } from '../../services/userService';

export const useTacticalOps = (
    addUnitHistoryEvent: (event: Omit<UnitHistoryEvent, 'id' | 'timestamp'>) => Promise<void>,
    setAlertsInternal: React.Dispatch<React.SetStateAction<Alert[]>>,
    units: MilitaryUnit[],
    setUnitsInternal: React.Dispatch<React.SetStateAction<MilitaryUnit[]>>
) => {

    const unitsRef = useRef(units);
    useEffect(() => {
        unitsRef.current = units;
    }, [units]);

    const alertedUnitsRef = useRef<Set<string>>(new Set());

    // Background checker for overdue communications
    useEffect(() => {
        const intervalId = setInterval(() => {
            const currentUnits = unitsRef.current;
            const now = Date.now();

            currentUnits.forEach(unit => {
                const timeSinceLastReport = now - (unit.lastHourlyReportTimestamp || unit.lastCommunicationTimestamp || now);

                if (timeSinceLastReport > COMMUNICATION_OVERDUE_THRESHOLD_MS) {
                    if (unit.status !== UnitStatus.NO_COMMUNICATION && unit.status !== UnitStatus.ENGAGED) {
                        if (!alertedUnitsRef.current.has(unit.id)) {
                            alertedUnitsRef.current.add(unit.id);
                            
                            const dmsLocation = unit.location ? `${unit.location.lat}, ${unit.location.lon}` : "No disponible";
                            const telegramMessage = `⚠️ *REPORTE VENCIDO* ⚠️\n\n*Unidad:* ${unit.name}\n*ID Unidad:* ${unit.id.substring(0,8)}...\n*Estado Anterior:* ${unit.status}\n*Última Ubicación:* \`${dmsLocation}\`\n*Hora:* ${new Date().toLocaleString('es-ES')}\n\nNo se ha recibido reporte de la unidad después del tiempo límite.`;
                            userService.broadcastTacticalAlert(telegramMessage).catch(e => console.error("Error broadcasting overdue alert", e));

                            // Local alert and state change
                            setAlertsInternal(prev => [{
                                id: generateRandomId(), type: AlertType.COMMUNICATION_LOST, unitId: unit.id,
                                message: `¡ALERTA! Comunicación vencida para ${unit.name}.`,
                                timestamp: Date.now(), severity: AlertSeverity.HIGH, acknowledged: false,
                                location: unit.location
                            }, ...prev]);

                            addUnitHistoryEvent({
                                unitId: unit.id, unitName: unit.name, eventType: "Reporte Vencido" as any,
                                details: `Se excedió el tiempo límite sin recibir reporte de ${unit.name}. Estado cambiado a NO_COMMUNICATION.`,
                                location: unit.location
                            });

                            const updatedUnit = { ...unit, status: UnitStatus.NO_COMMUNICATION };
                            setUnitsInternal(prev => prev.map(u => u.id === unit.id ? updatedUnit : u));
                            unitService.updateUnit(unit.id, updatedUnit).catch(e => console.error(e));
                        }
                    }
                } else if (unit.status === UnitStatus.OPERATIONAL) {
                    // Reset if the unit is back to normal
                    if (alertedUnitsRef.current.has(unit.id)) {
                        alertedUnitsRef.current.delete(unit.id);
                    }
                }
            });
        }, 10000); // Check every 10 seconds

        return () => clearInterval(intervalId);
    }, [setAlertsInternal, setUnitsInternal, addUnitHistoryEvent]);

    const updateUnitLogistics = useCallback(async (unitId: string, logisticsData: any) => {
        const unit = units.find(u => u.id === unitId);
        if (!unit) return;
        const updatedUnit = { ...unit, ...logisticsData };
        if (logisticsData.daysOfSupply !== undefined) updatedUnit.lastResupplyDate = Date.now();

        setUnitsInternal(prev => prev.map(u => u.id === unitId ? updatedUnit : u));
        await unitService.updateUnit(unitId, updatedUnit);

        addUnitHistoryEvent({
            unitId, unitName: unit.name,
            eventType: "Actualización Logística",
            details: "Datos logísticos actualizados."
        });
    }, [units, addUnitHistoryEvent, setUnitsInternal]);

    const reportUnitEngaged = useCallback(async (unitId: string) => {
        const unit = units.find(u => u.id === unitId);
        if (!unit || unit.status === UnitStatus.ENGAGED) return;

        const alertId = generateRandomId();
        const updatedUnit = { ...unit, status: UnitStatus.ENGAGED };
        setUnitsInternal(prev => prev.map(u => u.id === unitId ? updatedUnit : u));
        await unitService.updateUnit(unitId, updatedUnit);

        const alertMessage = `¡ALERTA DE COMBATE! ${unit.name} en contacto.`;
        
        setAlertsInternal(prev => [{
            id: alertId, type: AlertType.UNIT_ENGAGED, unitId,
            message: alertMessage,
            timestamp: Date.now(), severity: AlertSeverity.CRITICAL, acknowledged: false,
            location: unit.location
        }, ...prev]);
        
        addUnitHistoryEvent({
            unitId, unitName: unit.name, eventType: "Entró en Combate",
            details: `${unit.name} reporta contacto armado.`,
            location: unit.location
        });

        // Broadcast to Telegram
        try {
            const dmsLocation = unit.location ? `${unit.location.lat}, ${unit.location.lon}` : "No disponible";
            const telegramMessage = `🚨 *ALERTA DE COMBATE* 🚨\n\n*Unidad:* ${unit.name}\n*ID Unidad:* ${unit.id.substring(0,8)}...\n*Estado:* EN COMBATE\n*Ubicación:* \`${dmsLocation}\`\n*Hora:* ${new Date().toLocaleString('es-ES')}\n\nPor favor, tome acción inmediata.`;
            await userService.broadcastTacticalAlert(telegramMessage);
        } catch (e) {
            console.error("Error broadcasting combat alert to Telegram:", e);
        }
    }, [units, addUnitHistoryEvent, setUnitsInternal, setAlertsInternal]);

    const reportUnitCeasefire = useCallback(async (unitId: string) => {
        const unit = units.find(u => u.id === unitId);
        if (!unit || unit.status !== UnitStatus.ENGAGED) return;

        const updatedUnit = {
            ...unit, status: UnitStatus.AAR_PENDING,
            combatEndTimestamp: Date.now(), combatEndLocation: unit.location
        };
        setUnitsInternal(prev => prev.map(u => u.id === unitId ? updatedUnit : u));
        await unitService.updateUnit(unitId, updatedUnit);

        addUnitHistoryEvent({
            unitId, unitName: unit.name, eventType: "Cese de Combate",
            details: `${unit.name} reporta fin de contacto. AAR pendiente.`
        });

        // Broadcast to Telegram
        try {

            const telegramMessage = `✅ *FIN DE COMBATE* ✅\n\n*Unidad:* ${unit.name}\n*Estado:* PENDIENTE AAR\n*Hora:* ${new Date().toLocaleString('es-ES')}`;
            await userService.broadcastTacticalAlert(telegramMessage);
        } catch (e) {
            console.error("Error broadcasting ceasefire alert to Telegram:", e);
        }
    }, [units, addUnitHistoryEvent, setUnitsInternal]);

    const addManualRoutePoint = useCallback(async (unitId: string, location: GeoLocation, timestamp: number) => {
        const unit = units.find(u => u.id === unitId);
        if (!unit) return;

        const newRouteHistory: RoutePoint[] = [{ ...location, timestamp }, ...(unit.routeHistory || [])].slice(0, MAX_ROUTE_HISTORY_LENGTH);
        const updatedUnit = {
            ...unit,
            location,
            lastMovementTimestamp: timestamp,
            routeHistory: newRouteHistory,
            status: UnitStatus.STATIC,
        };

        setUnitsInternal(prev => prev.map(u => u.id === unitId ? updatedUnit : u));
        await unitService.updateUnit(unitId, updatedUnit);

        addUnitHistoryEvent({
            unitId, unitName: unit.name, eventType: "Punto de Ruta Manual",
            details: `Ruta manual en ${decimalToDMS(location)}.`,
            location
        });
    }, [units, addUnitHistoryEvent, setUnitsInternal]);

    const markUnitHourlyReport = useCallback(async (unitId: string) => {
        const unit = units.find(u => u.id === unitId);
        if (!unit) return;
        const updatedUnit = { ...unit, lastHourlyReportTimestamp: Date.now() };
        if (unit.status === UnitStatus.NO_COMMUNICATION) updatedUnit.status = UnitStatus.OPERATIONAL;

        setUnitsInternal(prev => prev.map(u => u.id === unitId ? updatedUnit : u));
        await unitService.updateUnit(unitId, updatedUnit);

        addUnitHistoryEvent({
            unitId, unitName: unit.name, eventType: "Reporte Horario Marcado",
            details: "Reporte horario recibido exitosamente."
        });
    }, [units, addUnitHistoryEvent, setUnitsInternal]);

    const updateUnitMission = useCallback(async (unitId: string, mission: string) => {
        const unit = units.find(u => u.id === unitId);
        if (!unit) return;
        const updatedUnit = { ...unit, currentMission: mission };
        setUnitsInternal(prev => prev.map(u => u.id === unitId ? updatedUnit : u));
        await unitService.updateUnit(unitId, updatedUnit);

        addUnitHistoryEvent({ unitId, unitName: unit.name, eventType: "Cambio de Misión", details: `Misión: ${mission}` });
    }, [units, setUnitsInternal, addUnitHistoryEvent]);

    const updateUnitSituation = useCallback(async (unitId: string, sit: UnitSituationINSITOP) => {
        const unit = units.find(u => u.id === unitId);
        if (!unit) return;
        const updatedUnit = { ...unit, unitSituationType: sit };
        setUnitsInternal(prev => prev.map(u => u.id === unitId ? updatedUnit : u));
        await unitService.updateUnit(unitId, updatedUnit);
    }, [units, setUnitsInternal]);

    const addUnit = useCallback(async (unitData: NewUnitData) => {
        try {
            const now = Date.now();
            const created = await unitService.createUnit({
                ...unitData,
                status: UnitStatus.OPERATIONAL,
                lastMovementTimestamp: now,
                lastCommunicationTimestamp: now,
                routeHistory: [{ lat: unitData.location.lat, lon: unitData.location.lon, timestamp: now }],
                currentMission: unitData.currentMission,
                unitSituationType: unitData.unitSituationType,
            } as any);
            setUnitsInternal(prev => [created, ...prev]);
            addUnitHistoryEvent({ eventType: "Unidad Creada", unitId: created.id, unitName: created.name, details: `Unidad ${created.name} agregada.` });
        } catch (e) {
            console.error(e);
        }
    }, [addUnitHistoryEvent, setUnitsInternal]);

    const processSpotReport = useCallback(async (spotData: SpotReportPayload) => {
        const { unitId, location, timestamp } = spotData;
        const unit = units.find(u => u.id === unitId);
        if (!unit) return;

        const updatedUnit = {
            ...unit,
            location,
            lastMovementTimestamp: timestamp,
            status: UnitStatus.MOVING,
            routeHistory: [{ ...location, timestamp }, ...(unit.routeHistory || [])].slice(0, MAX_ROUTE_HISTORY_LENGTH)
        };

        setUnitsInternal(prev => prev.map(u => u.id === unitId ? updatedUnit : u));
        await unitService.updateUnit(unitId, updatedUnit);

        addUnitHistoryEvent({
            unitId, unitName: unit.name, eventType: "Reporte SPOT Recibido",
            details: `Seguimiento SPOT: ${decimalToDMS(location)}`,
            location
        });
    }, [units, addUnitHistoryEvent, setUnitsInternal]);

    const updateUnitAttributes = useCallback(async (unitId: string, attributes: Partial<MilitaryUnit>) => {
        const unit = units.find(u => u.id === unitId);
        if (!unit) return;
        const updatedUnit = { ...unit, ...attributes };
        setUnitsInternal(prev => prev.map(u => u.id === unitId ? updatedUnit : u));
        await unitService.updateUnit(unitId, updatedUnit);
        addUnitHistoryEvent({
            unitId, unitName: unit.name, eventType: "Atributos Actualizados",
            details: "Información técnica y capacidades actualizadas."
        });
    }, [units, setUnitsInternal, addUnitHistoryEvent]);

    const sendUnitToRetraining = useCallback(async (unitId: string, focus = "Entrenamiento General", duration = 7) => {
        const unit = units.find(u => u.id === unitId);
        if (!unit) return;
        const updatedUnit = {
            ...unit,
            status: UnitStatus.ON_LEAVE_RETRAINING,
            retrainingFocus: focus,
            retrainingDurationDays: duration,
            retrainingStartDate: Date.now()
        };
        setUnitsInternal(prev => prev.map(u => u.id === unitId ? updatedUnit : u));
        await unitService.updateUnit(unitId, updatedUnit);
        addUnitHistoryEvent({
            unitId, unitName: unit.name, eventType: "Enviada a Permiso/Reentrenamiento",
            details: `Enviada a reentrenamiento enfocado en: ${focus} por ${duration} días.`
        });
    }, [units, setUnitsInternal, addUnitHistoryEvent]);

    const returnUnitFromRetraining = useCallback(async (unitId: string) => {
        const unit = units.find(u => u.id === unitId);
        if (!unit) return;
        const updatedUnit = {
            ...unit,
            status: UnitStatus.OPERATIONAL,
            retrainingFocus: undefined,
            retrainingDurationDays: undefined,
            retrainingStartDate: undefined,
            leaveStartDate: undefined,
            leaveDurationDays: undefined
        };
        setUnitsInternal(prev => prev.map(u => u.id === unitId ? updatedUnit : u));
        await unitService.updateUnit(unitId, updatedUnit);
        addUnitHistoryEvent({
            unitId, unitName: unit.name, eventType: "Reintegrada de Permiso/Reentrenamiento",
            details: "Unidad reintegrada a operaciones normales."
        });
    }, [units, setUnitsInternal, addUnitHistoryEvent]);

    const startUnitLeave = useCallback(async (unitId: string, duration: number) => {
        const unit = units.find(u => u.id === unitId);
        if (!unit) return;
        const updatedUnit = {
            ...unit,
            status: UnitStatus.ON_LEAVE_RETRAINING,
            leaveStartDate: Date.now(),
            leaveDurationDays: duration
        };
        setUnitsInternal(prev => prev.map(u => u.id === unitId ? updatedUnit : u));
        await unitService.updateUnit(unitId, updatedUnit);
        addUnitHistoryEvent({
            unitId, unitName: unit.name, eventType: "Inicio de Permiso",
            details: `Inicia periodo de permiso por ${duration} días.`
        });
    }, [units, setUnitsInternal, addUnitHistoryEvent]);

    const startUnitRetraining = useCallback(async (unitId: string, focus: string, duration: number) => {
        await sendUnitToRetraining(unitId, focus, duration);
    }, [sendUnitToRetraining]);

    return {
        updateUnitLogistics,
        reportUnitEngaged,
        reportUnitCeasefire,
        addManualRoutePoint,
        markUnitHourlyReport,
        updateUnitMission,
        updateUnitSituation,
        addUnit,
        processSpotReport,
        updateUnitAttributes,
        sendUnitToRetraining,
        returnUnitFromRetraining,
        startUnitLeave,
        startUnitRetraining
    };
};
