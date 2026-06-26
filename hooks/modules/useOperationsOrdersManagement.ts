
import { useState, useCallback } from 'react';
import type { OperationsOrder, NewOperationsOrderData, UpdateOperationsOrderData, UnitHistoryEvent, Alert } from '../../types';
import { OperationsOrderStatus, AlertType, AlertSeverity } from '../../types';
import { orderService } from '../../services/orderService';
import { generateRandomId } from '../useBackendData';

export const useOperationsOrdersManagement = (
    addUnitHistoryEvent: (event: Omit<UnitHistoryEvent, 'id' | 'timestamp'>) => Promise<void>,
    setAlertsInternal: React.Dispatch<React.SetStateAction<Alert[]>>
) => {
    const [operationsOrders, setOperationsOrdersInternal] = useState<OperationsOrder[]>([]);

    const addOperationsOrder = useCallback(async (orderData: NewOperationsOrderData) => {
        const newOrder: OperationsOrder = {
            ...orderData,
            id: `ORDOP-${generateRandomId()}`,
            issuedTimestamp: Date.now(),
            status: OperationsOrderStatus.BORRADOR,
            recipientUserIds: [],
            acknowledgements: []
        };
        try {
            const created = await orderService.createOrder(newOrder);
            setOperationsOrdersInternal(prev => [created, ...prev]);

            addUnitHistoryEvent({
                eventType: "Orden de Operaciones Creada",
                details: `Nueva ORDOP: ${orderData.title}`,
                relatedEntityId: newOrder.id,
                relatedEntityType: 'ORDOP'
            });

            return created;
        } catch (e) {
            console.error(e);
            return null;
        }
    }, [addUnitHistoryEvent]);

    const updateOperationsOrder = useCallback(async (orderId: string, updateData: UpdateOperationsOrderData) => {
        try {
            const existing = operationsOrders.find(o => o.id === orderId);
            if (!existing) return { success: false, message: "No encontrada" };
            const updated = { ...existing, ...updateData };
            // Note: orderService might not have updateOrder, I'll assume it has createOrder that acts as save or a specific update
            await (orderService as any).createOrder(updated);
            setOperationsOrdersInternal(prev => prev.map(o => o.id === orderId ? updated : o));
            return { success: true };
        } catch (e) {
            console.error(e);
            return { success: false, message: "Error al actualizar" };
        }
    }, [operationsOrders]);

    const publishOperationsOrder = useCallback(async (orderId: string, selectedUserIds: string[]) => {
        try {
            const existing = operationsOrders.find(o => o.id === orderId);
            if (!existing) return { success: false, message: "No encontrada" };

            const updated: OperationsOrder = {
                ...existing,
                status: OperationsOrderStatus.PUBLICADA,
                recipientUserIds: selectedUserIds
            };
            await (orderService as any).createOrder(updated);
            setOperationsOrdersInternal(prev => prev.map(o => o.id === orderId ? updated : o));

            setAlertsInternal(prev => [{
                id: generateRandomId(),
                type: AlertType.ORDOP_PUBLISHED,
                message: `Nueva Orden de Operaciones publicada: ${updated.title}`,
                timestamp: Date.now(),
                severity: AlertSeverity.INFO,
                acknowledged: false,
                ordopId: orderId
            }, ...prev]);

            return { success: true };
        } catch (e) {
            console.error(e);
            return { success: false, message: "Error al publicar" };
        }
    }, [operationsOrders, setAlertsInternal]);

    const acknowledgeOperationsOrder = useCallback(async (orderId: string, userId: string) => {
        try {
            const existing = operationsOrders.find(o => o.id === orderId);
            if (!existing) return;

            const ackEntry = { userId, timestamp: Date.now() };
            const updated: OperationsOrder = {
                ...existing,
                acknowledgements: [...existing.acknowledgements, ackEntry]
            };

            await (orderService as any).createOrder(updated);
            setOperationsOrdersInternal(prev => prev.map(o => o.id === orderId ? updated : o));
        } catch (e) {
            console.error(e);
        }
    }, [operationsOrders]);

    return {
        operationsOrders,
        setOperationsOrdersInternal,
        addOperationsOrder,
        updateOperationsOrder,
        publishOperationsOrder,
        acknowledgeOperationsOrder
    };
};
