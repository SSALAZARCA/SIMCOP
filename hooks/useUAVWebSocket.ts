
import { useEffect, useState, useRef } from 'react';
import SockJS from 'sockjs-client';
import { Client } from '@stomp/stompjs';
import { UAVTelemetryDTO } from '../types';

export const useUAVWebSocket = (onTelemetryUpdate: (telemetry: UAVTelemetryDTO[]) => void) => {
    const stompClientRef = useRef<Client | null>(null);
    const [connected, setConnected] = useState(false);

    useEffect(() => {
        const socket = new SockJS('http://localhost:8080/ws');
        const client = new Client({
            webSocketFactory: () => socket,
            reconnectDelay: 5000,
            onConnect: () => {
                setConnected(true);
                client.subscribe('/topic/uav-telemetry', (message) => {
                    const telemetry: UAVTelemetryDTO[] = JSON.parse(message.body);
                    onTelemetryUpdate(telemetry);
                });
            },
            onDisconnect: () => {
                setConnected(false);
            },
            onStompError: (frame) => {
                console.error('Broker reported error: ' + frame.headers['message']);
                console.error('Additional details: ' + frame.body);
            }
        });

        client.activate();
        stompClientRef.current = client;

        return () => {
            if (stompClientRef.current) {
                stompClientRef.current.deactivate();
            }
        };
    }, [onTelemetryUpdate]);

    return { connected };
};
