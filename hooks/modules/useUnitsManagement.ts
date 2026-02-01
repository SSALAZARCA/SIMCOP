
import { useState, useCallback } from 'react';
import type { MilitaryUnit, NewHierarchyUnitData, UpdateHierarchyUnitData, Alert, UnitHistoryEvent, UAVAsset, PersonnelBreakdown } from '../../types';
import { UnitStatus, UnitSituationINSITOP, MapEntityType, AlertType, AlertSeverity } from '../../types';
import { uavService } from '../../services/uavService';
import { unitService } from '../../services/unitService';
import { generateRandomId } from '../useBackendData';
import { USER_ROLE_TO_RANK_ABBREVIATION } from '../../constants';

// Internal helper for personnel breakdown matching the type
const generatePersonnelBreakdown = (type: string): PersonnelBreakdown => ({
    officers: 1,
    ncos: 4,
    professionalSoldiers: 12,
    slRegulars: 20
});

export const useUnitsManagement = (
    addUnitHistoryEvent: (event: Omit<UnitHistoryEvent, 'id' | 'timestamp'>) => Promise<void>,
    setAlertsInternal: React.Dispatch<React.SetStateAction<Alert[]>>,
    usersInternal: any[]
) => {
    const [units, setUnitsInternal] = useState<MilitaryUnit[]>([]);

    const addUnitHierarchy = useCallback(async (unitData: NewHierarchyUnitData): Promise<{ success: boolean, message?: string, newUnit?: MilitaryUnit }> => {
        if (units.some(u => u.name.toLowerCase() === unitData.name.toLowerCase() && u.parentId === unitData.parentId)) {
            const message = `Error: Ya existe una unidad organizacional con el nombre '${unitData.name}' bajo el mismo superior.`;
            setAlertsInternal(prev => [{ id: generateRandomId(), type: AlertType.ORGANIZATION_UNIT_CREATED, message, timestamp: Date.now(), severity: AlertSeverity.MEDIUM, acknowledged: false }, ...prev]);
            return { success: false, message };
        }

        const now = Date.now();
        const personnelBreakdown = generatePersonnelBreakdown(unitData.type);
        const commanderInfo = { rank: "N/A", name: "Por Asignar" };

        const newUnitSkeleton: any = {
            name: unitData.name,
            type: unitData.type,
            parentId: unitData.parentId,
            commander: commanderInfo,
            personnelBreakdown,
            equipment: [],
            capabilities: [],
            location: { lat: 0, lon: 0 },
            status: UnitStatus.MAINTENANCE,
            currentMission: unitData.currentMission,
            unitSituationType: unitData.unitSituationType,
            lastMovementTimestamp: now,
            lastCommunicationTimestamp: now,
            lastHourlyReportTimestamp: now,
            routeHistory: [],
            ammoLevel: 100,
            daysOfSupply: 30,
            lastResupplyDate: now,
            toe: unitData.toe
        };

        try {
            const createdUnit = await unitService.createUnit(newUnitSkeleton);
            setUnitsInternal(prevUnits => [createdUnit, ...prevUnits]);
            addUnitHistoryEvent({
                eventType: "Unidad Organizacional Creada",
                unitId: createdUnit.id,
                unitName: createdUnit.name,
                details: `Unidad organizacional ${createdUnit.name} (${createdUnit.type}) creada.`,
                relatedEntityId: createdUnit.id,
                relatedEntityType: MapEntityType.ORGANIZATION_UNIT,
            });
            setAlertsInternal(prev => [{
                id: generateRandomId(), type: AlertType.ORGANIZATION_UNIT_CREATED, unitId: createdUnit.id,
                message: `Unidad organizacional ${createdUnit.name} creada.`,
                timestamp: Date.now(), severity: AlertSeverity.INFO, acknowledged: false,
            }, ...prev].sort((a, b) => b.timestamp - a.timestamp).slice(0, 50));
            return { success: true, newUnit: createdUnit, message: `Unidad ${createdUnit.name} creada exitosamente.` };
        } catch (error) {
            console.error("Error creating hierarchy unit:", error);
            return { success: false, message: "Error al guardar en el servidor." };
        }
    }, [units, addUnitHistoryEvent, setAlertsInternal]);

    const updateUnitHierarchyDetails = useCallback(async (unitId: string, updateData: UpdateHierarchyUnitData): Promise<{ success: boolean, message?: string }> => {
        const unitIndex = units.findIndex(u => u.id === unitId);
        if (unitIndex === -1) {
            return { success: false, message: "Unidad no encontrada." };
        }

        const oldUnit = units[unitIndex];
        const updatedUnitData = {
            ...oldUnit,
            ...updateData,
            toe: updateData.toe || oldUnit.toe
        };

        try {
            const savedUnit = await unitService.updateUnit(unitId, updatedUnitData);
            setUnitsInternal(prev => prev.map(u => u.id === unitId ? savedUnit : u));
            addUnitHistoryEvent({
                eventType: "Unidad Organizacional Actualizada",
                unitId: savedUnit.id,
                unitName: savedUnit.name,
                details: `Detalles de unidad organizacional ${savedUnit.name} actualizados.`,
                relatedEntityType: MapEntityType.ORGANIZATION_UNIT,
            });
            return { success: true, message: `Unidad ${savedUnit.name} actualizada exitosamente.` };
        } catch (error) {
            console.error("Error updating hierarchy unit:", error);
            return { success: false, message: "Error al actualizar en el servidor." };
        }
    }, [units, addUnitHistoryEvent]);

    const deleteUnitHierarchy = useCallback(async (unitId: string): Promise<{ success: boolean, message?: string }> => {
        const unitToDelete = units.find(u => u.id === unitId);
        if (!unitToDelete) return { success: false, message: "No encontrada." };

        const hasChildren = units.some(u => u.parentId === unitId);
        if (hasChildren) return { success: false, message: "Tiene unidades dependientes." };

        try {
            await unitService.deleteUnit(unitId);
            setUnitsInternal(prev => prev.filter(u => u.id !== unitId));
            addUnitHistoryEvent({
                eventType: "Unidad Organizacional Eliminada",
                unitId: unitToDelete.id,
                unitName: unitToDelete.name,
                details: `Eliminada.`,
                relatedEntityType: MapEntityType.ORGANIZATION_UNIT,
            });
            return { success: true, message: "Eliminada Correctamente." };
        } catch (error) {
            console.error("Error deleting hierarchy unit:", error);
            return { success: false, message: "Error al eliminar en el servidor." };
        }
    }, [units, addUnitHistoryEvent]);

    const assignCommanderToOrganizationalUnit = useCallback(async (unitId: string, userId: string): Promise<{ success: boolean, message?: string }> => {
        const unitIndex = units.findIndex(u => u.id === unitId);
        const user = usersInternal.find(u => u.id === userId);

        if (unitIndex === -1 || !user) return { success: false, message: "Error." };

        const unitToUpdate = units[unitIndex];
        const newRank = (USER_ROLE_TO_RANK_ABBREVIATION as any)[user.role] || "N/A";

        const updatedUnitData: MilitaryUnit = {
            ...unitToUpdate,
            commander: { name: user.displayName, rank: newRank },
        };

        try {
            const savedUnit = await unitService.updateUnit(unitId, updatedUnitData);
            setUnitsInternal(prev => prev.map(u => u.id === unitId ? savedUnit : u));
            return { success: true, message: "Comandante asignado." };
        } catch (error) {
            console.error("Error assigning commander:", error);
            return { success: false, message: "Error al guardar en el servidor." };
        }
    }, [units, usersInternal]);

    const assignUAVAsset = useCallback(async (unitId: string, asset: UAVAsset) => {
        try {
            await uavService.assignAsset(unitId, asset);
            setUnitsInternal(prev => prev.map(u => u.id === unitId ? { ...u, uavAssets: [...(u.uavAssets || []), asset] } : u));
            return { success: true };
        } catch (e) {
            return { success: false, message: 'Error.' };
        }
    }, []);

    const removeUAVAsset = useCallback(async (unitId: string, assetId: string) => {
        try {
            await uavService.deleteAsset(unitId, assetId);
            setUnitsInternal(prev => prev.map(u => u.id === unitId ? { ...u, uavAssets: (u.uavAssets || []).filter(a => a.id !== assetId) } : u));
            return { success: true };
        } catch (e) {
            return { success: false, message: 'Error.' };
        }
    }, []);

    return {
        units,
        setUnitsInternal,
        addUnitHierarchy,
        updateUnitHierarchyDetails,
        deleteUnitHierarchy,
        assignCommanderToOrganizationalUnit,
        assignUAVAsset,
        removeUAVAsset
    };
};
