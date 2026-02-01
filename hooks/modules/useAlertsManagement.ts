
import { useState, useCallback } from 'react';
import type { Alert } from '../../types';
import { alertService } from '../../services/alertService';

export const useAlertsManagement = () => {
    const [alerts, setAlertsInternal] = useState<Alert[]>([]);

    const acknowledgeAlert = useCallback(async (alertId: string) => {
        try {
            await alertService.acknowledgeAlert(alertId);
            setAlertsInternal(prevAlerts => prevAlerts.map(alert =>
                alert.id === alertId ? { ...alert, acknowledged: true } : alert
            ));
        } catch (e) {
            console.error("Failed to acknowledge alert in backend, updating locally anyway.");
            setAlertsInternal(prevAlerts => prevAlerts.map(alert =>
                alert.id === alertId ? { ...alert, acknowledged: true } : alert
            ));
        }
    }, []);

    return {
        alerts,
        setAlertsInternal,
        acknowledgeAlert
    };
};
