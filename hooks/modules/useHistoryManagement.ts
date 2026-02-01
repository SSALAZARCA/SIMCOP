
import { useState, useCallback } from 'react';
import type { UnitHistoryEvent } from '../../types';
import { historyService } from '../../services/historyService';
import { generateRandomId } from '../useBackendData';

const MAX_UNIT_HISTORY_EVENTS = 200;

export const useHistoryManagement = () => {
    const [unitHistoryLog, setUnitHistoryLogInternal] = useState<UnitHistoryEvent[]>([]);

    const addUnitHistoryEvent = useCallback(async (eventData: Omit<UnitHistoryEvent, 'id' | 'timestamp'>) => {
        const newEvent: UnitHistoryEvent = {
            ...eventData,
            id: generateRandomId(),
            timestamp: Date.now(),
        };
        try {
            setUnitHistoryLogInternal(prevLog => {
                const updatedLog = [newEvent, ...prevLog].sort((a, b) => b.timestamp - a.timestamp);
                return updatedLog.length > MAX_UNIT_HISTORY_EVENTS ? updatedLog.slice(0, MAX_UNIT_HISTORY_EVENTS) : updatedLog;
            });
            await historyService.createEvent(newEvent);
        } catch (error) {
            console.error("Error creating history event:", error);
        }
    }, []);

    return {
        unitHistoryLog,
        setUnitHistoryLogInternal,
        addUnitHistoryEvent
    };
};
