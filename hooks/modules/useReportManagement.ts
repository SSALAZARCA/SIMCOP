
import { useState, useCallback } from 'react';
import type { AfterActionReport, Q5Report, MilitaryUnit, UnitHistoryEvent, Alert } from '../../types';
import { UnitStatus, MapEntityType, AlertType, AlertSeverity } from '../../types';
import { aarService } from '../../services/aarService';
import { q5Service } from '../../services/q5Service';
import { unitService } from '../../services/unitService';
import { generateRandomId } from '../useBackendData';
import { generateQ5ReportContentFromAAR } from '../../utils/geminiService';

export const useReportManagement = (
    addUnitHistoryEvent: (event: Omit<UnitHistoryEvent, 'id' | 'timestamp'>) => Promise<void>,
    setAlertsInternal: React.Dispatch<React.SetStateAction<Alert[]>>,
    units: MilitaryUnit[],
    setUnitsInternal: React.Dispatch<React.SetStateAction<MilitaryUnit[]>>
) => {
    const [afterActionReports, setAfterActionReportsInternal] = useState<AfterActionReport[]>([]);
    const [q5Reports, setQ5ReportsInternal] = useState<Q5Report[]>([]);
    const [q5GeneratingStatus, setQ5GeneratingStatus] = useState<{ [aarId: string]: boolean }>({});
    const [q5SendingStatus, setQ5SendingStatus] = useState<{ [q5Id: string]: boolean }>({});

    const addAfterActionReport = useCallback(async (aarData: Omit<AfterActionReport, 'id' | 'reportTimestamp' | 'unitName'>) => {
        const unit = units.find(u => u.id === aarData.unitId);
        if (!unit) return;

        const newAAR: AfterActionReport = {
            ...aarData,
            id: generateRandomId(),
            reportTimestamp: Date.now(),
            unitName: unit.name,
        };

        try {
            const createdAAR = await aarService.createReport(newAAR);
            setAfterActionReportsInternal(prev => [createdAAR, ...prev].slice(0, 100));

            const updatedUnit = { ...unit, status: UnitStatus.OPERATIONAL, combatEndTimestamp: undefined, combatEndLocation: undefined };
            setUnitsInternal(prevUnits => prevUnits.map(u => u.id === unit.id ? updatedUnit : u));
            await unitService.updateUnit(unit.id, updatedUnit);

            addUnitHistoryEvent({
                unitId: unit.id,
                unitName: unit.name,
                eventType: "AAR Registrado",
                details: `Reporte Post-Combate (AAR) registrado.`,
                relatedEntityId: createdAAR.id,
                relatedEntityType: MapEntityType.AAR
            });
        } catch (error) {
            console.error("Error creating AAR:", error);
        }
    }, [units, addUnitHistoryEvent, setUnitsInternal]);

    const generateAndAddQ5Report = useCallback(async (aarId: string) => {
        const aar = afterActionReports.find(a => a.id === aarId);
        if (!aar) return;

        setQ5GeneratingStatus(prev => ({ ...prev, [aarId]: true }));
        try {
            const content = await generateQ5ReportContentFromAAR(aar);
            const newQ5: Q5Report = {
                id: `Q5-${generateRandomId()}`,
                aarId,
                unitId: aar.unitId,
                unitName: aar.unitName,
                reportTimestamp: Date.now(),
                que: content.que || "No especificado",
                quien: content.quien || "No especificado",
                cuando: content.cuando || "No especificado",
                donde: content.donde || "No especificado",
                hechos: typeof content.hechos === 'string' ? content.hechos : JSON.stringify(content.hechos || {}),
                accionesSubsiguientes: content.accionesSubsiguientes || "No especificado",
            };

            const createdQ5 = await q5Service.createReport(newQ5);
            setQ5ReportsInternal(prev => [createdQ5, ...prev].slice(0, 100));

            setAlertsInternal(prev => [{
                id: generateRandomId(),
                type: AlertType.Q5_GENERATED,
                message: `Nuevo Reporte Q5 generado para ${aar.unitName}`,
                timestamp: Date.now(),
                severity: AlertSeverity.INFO,
                acknowledged: false,
                q5Id: newQ5.id
            }, ...prev]);
        } catch (error) {
            console.error("Error generating Q5:", error);
        } finally {
            setQ5GeneratingStatus(prev => ({ ...prev, [aarId]: false }));
        }
    }, [afterActionReports, setAlertsInternal]);

    const sendQ5ReportViaTelegram = useCallback(async (q5Id: string) => {
        const q5 = q5Reports.find(r => r.id === q5Id);
        if (!q5) return;

        setQ5SendingStatus(prev => ({ ...prev, [q5Id]: true }));
        try {
            // Simulation of Telegram API call
            await new Promise(resolve => setTimeout(resolve, 1500));

            setAlertsInternal(prev => [{
                id: generateRandomId(),
                type: AlertType.Q5_TELEGRAM_SENT,
                message: `Reporte Q5 para ${q5.unitName} enviado a Telegram`,
                timestamp: Date.now(),
                severity: AlertSeverity.INFO,
                acknowledged: false
            }, ...prev]);
        } catch (error) {
            console.error("Error sending Q5 via Telegram:", error);
        } finally {
            setQ5SendingStatus(prev => ({ ...prev, [q5Id]: false }));
        }
    }, [q5Reports, setAlertsInternal]);

    return {
        afterActionReports,
        setAfterActionReportsInternal,
        q5Reports,
        setQ5ReportsInternal,
        q5GeneratingStatus,
        q5SendingStatus,
        setQ5SendingStatus,
        addAfterActionReport,
        generateAndAddQ5Report,
        sendQ5ReportViaTelegram
    };
};
