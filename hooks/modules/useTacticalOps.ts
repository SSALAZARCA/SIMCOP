
import { useCallback } from 'react';
import { UnitStatus, AlertType, AlertSeverity, MapEntityType, UnitSituationINSITOP } from '../../types';
import type { MilitaryUnit, GeoLocation, Alert, UnitHistoryEvent, RoutePoint, SpotReportPayload, NewUnitData } from '../../types';
import { generateRandomId } from '../useBackendData';
import { decimalToDMS } from '../../utils/coordinateUtils';
import { MAX_ROUTE_HISTORY_LENGTH } from '../../constants';
import { unitService } from '../../services/unitService';

export const useTacticalOps = (
    addUnitHistoryEvent: (event: Omit<UnitHistoryEvent, 'id' | 'timestamp'>) => Promise<void>,
    setAlertsInternal: React.Dispatch<React.SetStateAction<Alert[]>>,
    units: MilitaryUnit[],
    setUnitsInternal: React.Dispatch<React.SetStateAction<MilitaryUnit[]>>
) => {

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

        setAlertsInternal(prev => [{
            id: alertId, type: AlertType.UNIT_ENGAGED, unitId,
            message: `¡ALERTA DE COMBATE! ${unit.name} en contacto.`,
            timestamp: Date.now(), severity: AlertSeverity.CRITICAL, acknowledged: false,
            location: unit.location
        }, ...prev]);
        addUnitHistoryEvent({
            unitId, unitName: unit.name, eventType: "Entró en Combate",
            details: `${unit.name} reporta contacto armado.`,
            location: unit.location
        });
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
    }, [units, addUnitHistoryEvent, setUnitsInternal]);

    const addManualRoutePoint = useCallback(async (unitId: string, location: GeoLocation, timestamp: number) => {
        const unit = units.find(u => u.id === unitId);
        if (!unit) return;

        const newRouteHistory: RoutePoint[] = [{ ...location, timestamp }, ...unit.routeHistory].slice(0, MAX_ROUTE_HISTORY_LENGTH);
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
            const created = await unitService.createUnit({
                ...unitData,
                id: generateRandomId(),
                status: UnitStatus.OPERATIONAL,
                lastMovementTimestamp: Date.now(),
                lastCommunicationTimestamp: Date.now(),
                routeHistory: [],
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
            routeHistory: [{ ...location, timestamp }, ...unit.routeHistory].slice(0, MAX_ROUTE_HISTORY_LENGTH)
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
