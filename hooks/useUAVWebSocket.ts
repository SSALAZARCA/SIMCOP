
import { useEffect, useState, useRef } from 'react';
import SockJS from 'sockjs-client';
import { Client } from '@stomp/stompjs';
import { UAVTelemetryDTO } from '../types';

import { API_BASE_URL } from '../utils/apiConfig';

export const useUAVWebSocket = (onTelemetryUpdate: (telemetry: UAVTelemetryDTO[]) => void) => {
    const stompClientRef = useRef<Client | null>(null);
    const [connected, setConnected] = useState(false);

    useEffect(() => {
        let baseUrl = API_BASE_URL;
        if (!baseUrl || baseUrl.includes('api.simcop.site')) {
            baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
        }
        const socketUrl = `${baseUrl}/ws`;
        const socket = new SockJS(socketUrl);
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
