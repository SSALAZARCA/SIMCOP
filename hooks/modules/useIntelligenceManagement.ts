
import { useState, useCallback } from 'react';
import type { IntelligenceReport, Alert } from '../../types';
import { AlertType, AlertSeverity, IntelligenceReliability, IntelligenceCredibility } from '../../types';
import { intelService } from '../../services/intelService';
import { generateRandomId } from '../useBackendData';

export const useIntelligenceManagement = (
    setAlertsInternal: React.Dispatch<React.SetStateAction<Alert[]>>
) => {
    const [intelligenceReports, setIntelligenceReportsInternal] = useState<IntelligenceReport[]>([]);

    const addIntelReport = useCallback(async (reportData: Omit<IntelligenceReport, 'id' | 'reportTimestamp'>) => {
        const newReport: IntelligenceReport = {
            ...reportData,
            id: generateRandomId(),
            reportTimestamp: Date.now(),
        };

        try {
            const createdReport = await intelService.createReport(newReport);
            setIntelligenceReportsInternal(prev => [createdReport, ...prev].slice(0, 100));

            const highPriority =
                createdReport.reliability === IntelligenceReliability.A ||
                createdReport.credibility === IntelligenceCredibility.ONE ||
                (createdReport.keywords.some(kw => ["emboscada", "amenaza inminente", "ataque"].includes(kw.toLowerCase())) &&
                    (createdReport.reliability <= IntelligenceReliability.C && createdReport.credibility <= IntelligenceCredibility.THREE));

            if (highPriority || Math.random() < 0.2) {
                setAlertsInternal(prev => [{
                    id: generateRandomId(),
                    type: AlertType.HIGH_PRIORITY_INTEL,
                    intelId: createdReport.id,
                    message: `Inteligencia de alta prioridad recibida: ${createdReport.title}`,
                    timestamp: Date.now(),
                    severity: highPriority ? AlertSeverity.CRITICAL : AlertSeverity.HIGH,
                    acknowledged: false,
                    location: createdReport.location,
                }, ...prev].sort((a, b) => b.timestamp - a.timestamp).slice(0, 50));
            }
        } catch (error) {
            console.error("Error creating intel report:", error);
        }
    }, [setAlertsInternal]);

    return {
        intelligenceReports,
        setIntelligenceReportsInternal,
        addIntelReport
    };
};
