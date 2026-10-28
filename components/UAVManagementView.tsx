import React, { useState, useEffect } from 'react';
import {
    SignalIcon,
    VideoCameraIcon,
    CrosshairsIcon,
    PlusCircleIcon,
    TrashIcon,
    PaperAirplaneIcon,
    XMarkIcon,
    BoltIcon,
    WifiIcon,
    EyeIcon,
    ClipboardDocumentCheckIcon,
    ArrowPathIcon,
    CheckCircleIcon
} from './icons';
import { uavService } from '../services/uavService';
import { useUAVWebSocket } from '../hooks/useUAVWebSocket';
import { MilitaryUnit, UAVAsset, UnitType, NewUnitData, UnitSituationINSITOP, UAVTelemetryDTO } from '../types';

interface UAVManagementViewProps {
    units: MilitaryUnit[];
    onAssignUAV: (unitId: string, asset: UAVAsset) => Promise<{ success: boolean; message?: string; }>;
    onDeleteUAV: (unitId: string, assetId: string) => Promise<{ success: boolean; message?: string; }>;
    addUnit: (unitData: NewUnitData) => void;
}

// Modal para crear Equipo UAV (Tropa táctica operadora)
const CreateUAVTeamModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onCreate: (name: string, type: UnitType, parentId: string) => void;
    parentUnits: MilitaryUnit[];
}> = ({ isOpen, onClose, onCreate, parentUnits }) => {
    const [name, setName] = useState('');
    const [type, setType] = useState<UnitType>(UnitType.UAV_INTEL_TEAM);
    const [parentId, setParentId] = useState('');

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onCreate(name, type, parentId);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center backdrop-blur-sm p-4">
            <div className="bg-gray-900 rounded-lg p-6 w-full max-w-md border border-cyan-500 shadow-2xl">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold text-cyan-400 flex items-center gap-2">
                        <PaperAirplaneIcon className="w-5 h-5 text-cyan-400" />
                        Crear Nuevo Equipo UAV
                    </h3>
                    <button onClick={onClose}><XMarkIcon className="w-5 h-5 text-gray-400 hover:text-white" /></button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-xs font-semibold text-gray-300 mb-1">Nombre del Equipo Táctico</label>
                        <input
                            value={name} onChange={e => setName(e.target.value)}
                            className="w-full bg-gray-800 border border-gray-700 focus:border-cyan-500 rounded p-2 text-white text-sm"
                            placeholder="Ej. Garra Alpha - Patrulla ISR" required
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-gray-300 mb-1">Especialidad de la Unidad</label>
                        <select
                            value={type} onChange={e => setType(e.target.value as UnitType)}
                            className="w-full bg-gray-800 border border-gray-700 focus:border-cyan-500 rounded p-2 text-white text-sm"
                        >
                            <option value={UnitType.UAV_INTEL_TEAM}>Equipo Intel (ISR / Reconocimiento Óptico)</option>
                            <option value={UnitType.UAV_ATTACK_TEAM}>Equipo Ataque (Loitering Munition / Kamikaze)</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-gray-300 mb-1">Unidad Superior (Puesto de Mando)</label>
                        <select
                            value={parentId} onChange={e => setParentId(e.target.value)}
                            className="w-full bg-gray-800 border border-gray-700 focus:border-cyan-500 rounded p-2 text-white text-sm"
                            required
                        >
                            <option value="">Seleccione Puesto de Mando...</option>
                            {parentUnits.map(u => <option key={u.id} value={u.id}>{u.name} ({u.type})</option>)}
                        </select>
                    </div>
                    <button type="submit" className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-2.5 rounded transition-colors shadow-lg shadow-cyan-600/30">
                        Desplegar Equipo UAV
                    </button>
                </form>
            </div>
        </div>
    );
};

// Modal de Conexión de UAV / GCS (Ground Control Station)
const ConnectUAVModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    units: MilitaryUnit[];
    onConnect: (unitId: string, asset: Partial<UAVAsset>) => Promise<void>;
}> = ({ isOpen, onClose, units, onConnect }) => {
    const [unitId, setUnitId] = useState('');
    const [modelName, setModelName] = useState('DJI Matrice 300 RTK');
    const [uavId, setUavId] = useState(`UAV-${Math.floor(1000 + Math.random() * 9000)}`);
    const [type, setType] = useState<'INTEL' | 'ATTACK' | 'SPECIALIZED'>('INTEL');
    const [protocol, setProtocol] = useState<'MAVLINK' | 'RTSP' | 'WEBHOOK' | 'SIMULATED'>('SIMULATED');
    const [ipAddress, setIpAddress] = useState('192.168.1.120');
    const [port, setPort] = useState(14550);
    const [streamUrl, setStreamUrl] = useState('');
    const [cameraMode, setCameraMode] = useState<'EO' | 'FLIR' | 'NVG'>('EO');
    const [operationalRadius, setOperationalRadius] = useState(15);
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (!isOpen) return null;

    const handlePresetChange = (preset: string) => {
        setModelName(preset);
        if (preset.includes('DJI') || preset.includes('Autel')) {
            setProtocol('RTSP');
            setStreamUrl('rtsp://192.168.1.120:8554/live');
            setType('INTEL');
            setCameraMode('EO');
        } else if (preset.includes('Puma') || preset.includes('Bayraktar') || preset.includes('PX4')) {
            setProtocol('MAVLINK');
            setPort(14550);
            setType('INTEL');
            setCameraMode('FLIR');
        } else if (preset.includes('Loitering') || preset.includes('FPV Kamikaze')) {
            setType('ATTACK');
            setProtocol('WEBHOOK');
            setCameraMode('EO');
        } else {
            setProtocol('SIMULATED');
            setType('INTEL');
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!unitId) return;
        setIsSubmitting(true);
        try {
            await onConnect(unitId, {
                id: uavId,
                modelName,
                type,
                connectionProtocol: protocol,
                ipAddress: protocol === 'MAVLINK' || protocol === 'WEBHOOK' ? ipAddress : undefined,
                port: protocol === 'MAVLINK' ? port : undefined,
                streamUrl: protocol === 'RTSP' ? streamUrl : undefined,
                cameraMode,
                operationalRadius,
                batteryStatus: 100,
                currentPayload: type === 'ATTACK' ? 2 : 0,
                flightStatus: 'ON_STATION',
                signalStrength: 98,
                satellites: 14
            });
            onClose();
        } catch (err) {
            console.error('Error al conectar UAV:', err);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center backdrop-blur-md p-4 overflow-y-auto">
            <div className="bg-gray-900 border border-cyan-500 rounded-xl p-6 w-full max-w-2xl shadow-2xl my-8">
                <div className="flex justify-between items-center pb-4 border-b border-gray-800">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-cyan-950/80 rounded-lg border border-cyan-500/50">
                            <WifiIcon className="w-6 h-6 text-cyan-400" />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-white tracking-wide">Vincular Dron / Estación GCS</h3>
                            <p className="text-xs text-cyan-400/80">Protocolos MAVLink, RTSP Stream, Ingesta Webhook REST y Simulación</p>
                        </div>
                    </div>
                    <button onClick={onClose}><XMarkIcon className="w-6 h-6 text-gray-400 hover:text-white" /></button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5 mt-5">
                    {/* Unidad Militar Asignada */}
                    <div>
                        <label className="block text-xs font-semibold text-gray-300 uppercase mb-1">
                            Unidad Operadora Responsable <span className="text-red-400">*</span>
                        </label>
                        <select
                            value={unitId}
                            onChange={(e) => setUnitId(e.target.value)}
                            required
                            className="w-full bg-gray-800 border border-gray-700 focus:border-cyan-500 rounded-lg p-2.5 text-white text-sm"
                        >
                            <option value="">Seleccione Unidad Operadora...</option>
                            {units.map(u => (
                                <option key={u.id} value={u.id}>{u.name} — {u.type} (Coord: {u.location?.lat.toFixed(3)}, {u.location?.lon.toFixed(3)})</option>
                            ))}
                        </select>
                    </div>

                    {/* Presets Rápidos */}
                    <div>
                        <label className="block text-xs font-semibold text-gray-400 mb-1">Presets Tácticos Rápidos</label>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            {[
                                'DJI Matrice 300 RTK',
                                'Skydio X2D Mil',
                                'RQ-20 Puma ISR',
                                'FPV Kamikaze Ataque'
                            ].map((preset) => (
                                <button
                                    key={preset}
                                    type="button"
                                    onClick={() => handlePresetChange(preset)}
                                    className={`text-xs py-1.5 px-2 rounded border text-left truncate transition-colors ${
                                        modelName === preset
                                            ? 'bg-cyan-900/40 border-cyan-400 text-cyan-300 font-semibold'
                                            : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600'
                                    }`}
                                >
                                    {preset}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-semibold text-gray-300 mb-1">Nombre / Modelo Aeronave</label>
                            <input
                                value={modelName}
                                onChange={(e) => setModelName(e.target.value)}
                                className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2.5 text-white text-sm"
                                placeholder="Ej. DJI Matrice 300 / Puma AE"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-300 mb-1">Identificador Táctico (Callsign)</label>
                            <input
                                value={uavId}
                                onChange={(e) => setUavId(e.target.value)}
                                className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2.5 text-white font-mono text-sm uppercase"
                                placeholder="Ej. UAV-CONDOR-01"
                                required
                            />
                        </div>
                    </div>

                    {/* Protocolo de Enlace */}
                    <div>
                        <label className="block text-xs font-semibold text-gray-300 mb-1">Protocolo de Comunicación</label>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            {[
                                { id: 'SIMULATED', name: 'Simulador', desc: 'Vuelo asistido' },
                                { id: 'MAVLINK', name: 'MAVLink/UDP', desc: 'PX4/Ardupilot' },
                                { id: 'RTSP', name: 'RTSP Video', desc: 'Stream H.264/HLS' },
                                { id: 'WEBHOOK', name: 'Webhook REST', desc: 'Raspberry Pi / RPI' }
                            ].map((p) => (
                                <button
                                    key={p.id}
                                    type="button"
                                    onClick={() => setProtocol(p.id as any)}
                                    className={`p-2.5 rounded-lg border text-left transition-all ${
                                        protocol === p.id
                                            ? 'bg-cyan-900/50 border-cyan-400 text-white shadow-lg shadow-cyan-900/30 ring-1 ring-cyan-400'
                                            : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600'
                                    }`}
                                >
                                    <div className="font-bold text-xs">{p.name}</div>
                                    <div className="text-[10px] text-gray-400">{p.desc}</div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Campos dinámicos según protocolo */}
                    {protocol === 'MAVLINK' && (
                        <div className="grid grid-cols-2 gap-4 p-3 bg-gray-800/80 rounded-lg border border-cyan-900/50">
                            <div>
                                <label className="block text-xs text-cyan-300 mb-1">Dirección IP de Enlace / Telemetría</label>
                                <input
                                    value={ipAddress}
                                    onChange={(e) => setIpAddress(e.target.value)}
                                    className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white text-xs font-mono"
                                    placeholder="0.0.0.0 o IP de dron"
                                />
                            </div>
                            <div>
                                <label className="block text-xs text-cyan-300 mb-1">Puerto UDP MAVLink</label>
                                <input
                                    type="number"
                                    value={port}
                                    onChange={(e) => setPort(Number(e.target.value))}
                                    className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white text-xs font-mono"
                                    placeholder="14550"
                                />
                            </div>
                        </div>
                    )}

                    {protocol === 'RTSP' && (
                        <div className="p-3 bg-gray-800/80 rounded-lg border border-cyan-900/50">
                            <label className="block text-xs text-cyan-300 mb-1">URL de Transmisión RTSP / HLS / WebRTC</label>
                            <input
                                value={streamUrl}
                                onChange={(e) => setStreamUrl(e.target.value)}
                                className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white text-xs font-mono"
                                placeholder="rtsp://192.168.1.120:8554/live o http://..."
                            />
                        </div>
                    )}

                    {protocol === 'WEBHOOK' && (
                        <div className="p-3 bg-gray-800/80 rounded-lg border border-cyan-900/50 text-xs text-gray-300">
                            <p className="font-semibold text-cyan-300 mb-1">Ingesta Webhook REST</p>
                            <p className="text-[11px] text-gray-400">
                                Al conectar, se generará un Token de telemetría y podrás copiar el script en Python o el comando cURL para transmitir desde Raspberry Pi, Jetson Nano o microcontrolador.
                            </p>
                        </div>
                    )}

                    {/* Sensor y Rol */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-xs font-semibold text-gray-300 mb-1">Tipo Operativo</label>
                            <select
                                value={type}
                                onChange={(e) => setType(e.target.value as any)}
                                className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-white text-xs"
                            >
                                <option value="INTEL">Inteligencia (ISR)</option>
                                <option value="ATTACK">Ataque (Loitering)</option>
                                <option value="SPECIALIZED">Especializado (Térmico/EWAR)</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-300 mb-1">Sensor Principal</label>
                            <select
                                value={cameraMode}
                                onChange={(e) => setCameraMode(e.target.value as any)}
                                className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-white text-xs"
                            >
                                <option value="EO">EO Color Diurno (HD)</option>
                                <option value="FLIR">FLIR Infrarrojo Térmico</option>
                                <option value="NVG">NVG Visión Nocturna</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-300 mb-1">Radio Operacional (km)</label>
                            <input
                                type="number"
                                value={operationalRadius}
                                onChange={(e) => setOperationalRadius(Number(e.target.value))}
                                className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-white text-xs"
                                min={1}
                                max={150}
                            />
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-3 border-t border-gray-800">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-sm font-semibold transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={!unitId || isSubmitting}
                            className="px-5 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:opacity-50 text-white rounded-lg text-sm font-bold shadow-lg shadow-cyan-600/30 flex items-center gap-2 transition-all"
                        >
                            {isSubmitting ? (
                                <>
                                    <ArrowPathIcon className="w-4 h-4 animate-spin" />
                                    Conectando...
                                </>
                            ) : (
                                <>
                                    <WifiIcon className="w-4 h-4" />
                                    Establecer Enlace y Desplegar
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// Modal Guía de Enlace y Telemetría Script (cURL & Python)
const UAVGuideModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    guideData: any;
}> = ({ isOpen, onClose, guideData }) => {
    const [copiedCurl, setCopiedCurl] = useState(false);
    const [copiedPy, setCopiedPy] = useState(false);

    if (!isOpen || !guideData) return null;

    const copyToClipboard = (text: string, isPy: boolean) => {
        navigator.clipboard.writeText(text);
        if (isPy) {
            setCopiedPy(true);
            setTimeout(() => setCopiedPy(false), 2000);
        } else {
            setCopiedCurl(true);
            setTimeout(() => setCopiedCurl(false), 2000);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center backdrop-blur-md p-4 overflow-y-auto">
            <div className="bg-gray-900 border border-cyan-500/80 rounded-xl p-6 w-full max-w-3xl shadow-2xl my-6">
                <div className="flex justify-between items-center pb-4 border-b border-gray-800">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-cyan-950/80 rounded-lg border border-cyan-500/50">
                            <ClipboardDocumentCheckIcon className="w-6 h-6 text-cyan-400" />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-white tracking-wide">
                                Guía de Enlace Táctico: {guideData.uavId}
                            </h3>
                            <p className="text-xs text-cyan-400/80 font-mono">
                                Modelo: {guideData.modelName} | Protocolo: {guideData.connectionProtocol}
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose}><XMarkIcon className="w-6 h-6 text-gray-400 hover:text-white" /></button>
                </div>

                <div className="space-y-4 mt-4 text-xs">
                    {/* Parámetros de Enlace */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-gray-800/70 p-3 rounded-lg border border-gray-700">
                        <div>
                            <span className="text-gray-400 block text-[10px] uppercase">Token Telemetría</span>
                            <span className="font-mono text-cyan-300 font-bold">{guideData.telemetryToken || 'ACTIVO-LOCAL'}</span>
                        </div>
                        <div>
                            <span className="text-gray-400 block text-[10px] uppercase">Frecuencia / WebSocket</span>
                            <span className="font-mono text-emerald-400 font-bold">2.5s / STOMP</span>
                        </div>
                        <div>
                            <span className="text-gray-400 block text-[10px] uppercase">Puerto MAVLink</span>
                            <span className="font-mono text-amber-300 font-bold">{guideData.mavlinkPort || 14550} UDP</span>
                        </div>
                        <div>
                            <span className="text-gray-400 block text-[10px] uppercase">Tópico WebSocket</span>
                            <span className="font-mono text-purple-300 font-bold">/topic/uav-telemetry</span>
                        </div>
                    </div>

                    {/* Endpoint Ingesta */}
                    <div className="bg-gray-800/80 p-3 rounded-lg border border-gray-700">
                        <span className="text-gray-400 block text-[10px] uppercase mb-1">Endpoint de Ingesta REST</span>
                        <code className="text-cyan-300 font-mono bg-black/60 px-2 py-1 rounded block truncate">
                            POST {guideData.telemetryEndpoint || '/api/uav/telemetry'}
                        </code>
                    </div>

                    {/* Snippet cURL */}
                    <div className="bg-gray-950 p-3.5 rounded-lg border border-gray-800 font-mono relative">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-cyan-400 font-bold text-[11px]">Prueba Rápida cURL</span>
                            <button
                                onClick={() => copyToClipboard(guideData.curlSnippet || '', false)}
                                className="flex items-center gap-1 bg-cyan-900/60 hover:bg-cyan-800 text-cyan-200 px-2.5 py-1 rounded text-[10px] transition-colors"
                            >
                                {copiedCurl ? <CheckCircleIcon className="w-3.5 h-3.5 text-green-400" /> : <ClipboardDocumentCheckIcon className="w-3.5 h-3.5" />}
                                {copiedCurl ? '¡Copiado!' : 'Copiar cURL'}
                            </button>
                        </div>
                        <pre className="text-gray-300 text-[11px] overflow-x-auto whitespace-pre-wrap">
                            {guideData.curlSnippet}
                        </pre>
                    </div>

                    {/* Script Python */}
                    <div className="bg-gray-950 p-3.5 rounded-lg border border-gray-800 font-mono relative">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-emerald-400 font-bold text-[11px]">Script Python para Raspberry Pi / Jetson Nano</span>
                            <button
                                onClick={() => copyToClipboard(guideData.pythonTelemetryScript || '', true)}
                                className="flex items-center gap-1 bg-emerald-900/60 hover:bg-emerald-800 text-emerald-200 px-2.5 py-1 rounded text-[10px] transition-colors"
                            >
                                {copiedPy ? <CheckCircleIcon className="w-3.5 h-3.5 text-green-400" /> : <ClipboardDocumentCheckIcon className="w-3.5 h-3.5" />}
                                {copiedPy ? '¡Copiado!' : 'Copiar Script Python'}
                            </button>
                        </div>
                        <pre className="text-gray-300 text-[11px] max-h-48 overflow-y-auto whitespace-pre-wrap custom-scrollbar">
                            {guideData.pythonTelemetryScript}
                        </pre>
                    </div>
                </div>

                <div className="flex justify-end mt-4 pt-3 border-t border-gray-800">
                    <button
                        onClick={onClose}
                        className="px-5 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-bold transition-colors"
                    >
                        Entendido / Cerrar
                    </button>
                </div>
            </div>
        </div>
    );
};

export const UAVManagementView: React.FC<UAVManagementViewProps> = ({ units, onAssignUAV, onDeleteUAV, addUnit }) => {
    const [selectedUnitId, setSelectedUnitId] = useState<string>('');
    const [newAssetType, setNewAssetType] = useState<'ATTACK' | 'INTEL' | 'SPECIALIZED'>('INTEL');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showConnectModal, setShowConnectModal] = useState(false);
    const [showGuideModal, setShowGuideModal] = useState(false);
    const [guideData, setGuideData] = useState<any>(null);
    const [uavUnits, setUavUnits] = useState<MilitaryUnit[]>([]);
    const [telemetryData, setTelemetryData] = useState<UAVTelemetryDTO[]>([]);
    const [selectedUavId, setSelectedUavId] = useState<string>('');
    const [actionMessage, setActionMessage] = useState<{ text: string; isError?: boolean } | null>(null);

    // Filter potential parent units (Battalions, Companies, Brigades)
    const parentUnits = units.filter(u => u.type === UnitType.BATTALION || u.type === UnitType.COMPANY || u.type === UnitType.BRIGADE);

    const handleCreateTeam = (name: string, type: UnitType, parentId: string) => {
        const parent = units.find(u => u.id === parentId);
        if (!parent) return;

        const newData: NewUnitData = {
            name,
            type,
            parentId: parentId,
            commander: { rank: 'N/A', name: 'Por Asignar' },
            personnelBreakdown: { officers: 0, ncos: 1, professionalSoldiers: 3, slRegulars: 0 },
            location: parent.location,
            equipment: ['Control Station', 'Antenna', 'GCS Tactical Link'],
            capabilities: ['ISR', 'Target Acquisition', 'Artillery Spotting'],
            ammoLevel: 100,
            daysOfSupply: 30,
            fuelLevel: 100,
            currentMission: 'ISR - Vigilancia UAV y Designación',
            unitSituationType: UnitSituationINSITOP.ORGANICA
        };
        addUnit(newData);
        setActionMessage({ text: `✅ Equipo ${name} desplegado con éxito.` });
        setTimeout(() => setActionMessage(null), 4000);
    };

    useEffect(() => {
        // Filter units that have UAV assets or are UAV teams
        const withUavs = units.filter(u =>
            (u.uavAssets && u.uavAssets.length > 0) ||
            u.type === UnitType.UAV_ATTACK_TEAM ||
            u.type === UnitType.UAV_INTEL_TEAM
        );
        setUavUnits(withUavs);
    }, [units]);

    // WebSocket Telemetry
    useUAVWebSocket(setTelemetryData);

    // Initial Telemetry Fetch
    useEffect(() => {
        uavService.getTelemetry()
            .then(data => {
                if (data && data.length > 0) {
                    setTelemetryData(data);
                }
            })
            .catch(err => console.warn('Aviso: telemetría inicial aún no disponible', err));
    }, []);

    // Seleccionar primer UAV disponible si no hay seleccionado
    useEffect(() => {
        if (!selectedUavId && telemetryData.length > 0) {
            setSelectedUavId(telemetryData[0].uavId);
        } else if (!selectedUavId && uavUnits.length > 0) {
            const firstWithAsset = uavUnits.find(u => u.uavAssets && u.uavAssets.length > 0);
            if (firstWithAsset?.uavAssets?.[0]) {
                setSelectedUavId(firstWithAsset.uavAssets[0].id);
            }
        }
    }, [telemetryData, uavUnits, selectedUavId]);

    const handleCreateAsset = () => {
        if (!selectedUnitId) return;
        const parentUnit = units.find(u => u.id === selectedUnitId);
        if (!parentUnit) return;

        const newAsset: UAVAsset = {
            id: `UAV-${Math.floor(1000 + Math.random() * 9000)}`,
            modelName: newAssetType === 'ATTACK' ? 'Switchblade 600' : 'DJI Matrice 300 RTK',
            type: newAssetType,
            connectionProtocol: 'SIMULATED',
            batteryStatus: 100,
            currentPayload: newAssetType === 'ATTACK' ? 2 : 0,
            operationalRadius: newAssetType === 'INTEL' ? 15 : 10,
            location: parentUnit.location,
            altitudeMeters: 450,
            speedKmh: 65,
            headingDegrees: 180,
            cameraMode: 'EO',
            flightStatus: 'ON_STATION',
            signalStrength: 95,
            satellites: 16
        };
        onAssignUAV(selectedUnitId, newAsset);
        setSelectedUavId(newAsset.id);
        setActionMessage({ text: `✅ Activo ${newAsset.id} asignado a la unidad.` });
        setTimeout(() => setActionMessage(null), 4000);
    };

    const handleConnectFromModal = async (targetUnitId: string, asset: Partial<UAVAsset>) => {
        try {
            const connected = await uavService.connectUAV(targetUnitId, asset);
            setSelectedUavId(connected.id);
            setActionMessage({ text: `📡 Dron ${connected.id} (${connected.modelName}) conectado en protocolo ${connected.connectionProtocol}.` });
            setTimeout(() => setActionMessage(null), 5000);
        } catch (err: any) {
            setActionMessage({ text: `❌ Error conectando UAV: ${err.message}`, isError: true });
            setTimeout(() => setActionMessage(null), 5000);
        }
    };

    const handleOpenGuide = async (uavId: string) => {
        try {
            const guide = await uavService.getConnectionGuide(uavId);
            setGuideData(guide);
            setShowGuideModal(true);
        } catch (err: any) {
            setActionMessage({ text: `❌ Error al consultar guía de conexión: ${err.message}`, isError: true });
            setTimeout(() => setActionMessage(null), 4000);
        }
    };

    const handleSendCommand = async (command: string, params?: Record<string, any>) => {
        if (!selectedUavId) return;
        try {
            const res = await uavService.sendCommand(selectedUavId, command, params);
            setActionMessage({ text: res.message || `Comando ${command} ejecutado con éxito.` });
            setTimeout(() => setActionMessage(null), 5000);
        } catch (err: any) {
            setActionMessage({ text: `❌ Error al ejecutar ${command}: ${err.message}`, isError: true });
            setTimeout(() => setActionMessage(null), 5000);
        }
    };

    // Obtener datos del dron seleccionado
    const activeTelemetry = telemetryData.find(t => t.uavId === selectedUavId);
    let activeAsset: UAVAsset | undefined;
    for (const unit of units) {
        if (unit.uavAssets) {
            const found = unit.uavAssets.find(a => a.id === selectedUavId);
            if (found) {
                activeAsset = found;
                break;
            }
        }
    }

    const currentAltitude = activeTelemetry?.altitude ?? activeAsset?.altitudeMeters ?? 450;
    const currentSpeed = activeTelemetry?.speed ?? activeAsset?.speedKmh ?? 65;
    const currentHeading = activeTelemetry?.heading ?? activeAsset?.headingDegrees ?? 120;
    const currentCameraMode = activeTelemetry?.cameraMode ?? activeAsset?.cameraMode ?? 'EO';
    const currentSatellites = activeTelemetry?.satellites ?? activeAsset?.satellites ?? 16;
    const currentSignal = activeTelemetry?.signalStrength ?? activeAsset?.signalStrength ?? 98;
    const currentLat = activeTelemetry?.location?.lat ?? activeAsset?.location?.lat ?? 4.7110;
    const currentLon = activeTelemetry?.location?.lon ?? activeAsset?.location?.lon ?? -74.0721;
    const currentBattery = activeTelemetry?.batteryLevel ?? activeAsset?.batteryStatus ?? 100;
    const currentStatus = activeTelemetry?.status ?? activeAsset?.flightStatus ?? 'ON_STATION';

    return (
        <div className="flex flex-col lg:flex-row h-full bg-[#0a0e17] text-gray-100 p-4 gap-4 overflow-y-auto">
            {/* Notificación Flotante */}
            {actionMessage && (
                <div className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-2xl text-xs font-bold border transition-all ${
                    actionMessage.isError
                        ? 'bg-red-950/90 border-red-500 text-red-200'
                        : 'bg-emerald-950/90 border-emerald-500 text-emerald-200'
                }`}>
                    {actionMessage.text}
                </div>
            )}

            {/* Panel Izquierdo: Gestión de Flota y Enlace */}
            <div className="w-full lg:w-96 flex flex-col space-y-4 shrink-0">
                {/* Cabecera y Botón de Enlace GCS */}
                <div className="bg-gray-900/90 p-4 rounded-xl border border-cyan-500/40 shadow-xl">
                    <div className="flex justify-between items-center mb-3">
                        <h2 className="text-lg font-bold text-cyan-400 flex items-center gap-2">
                            <SignalIcon className="w-5 h-5 text-cyan-400" />
                            GCS Flota UAV
                        </h2>
                        <button
                            onClick={() => setShowCreateModal(true)}
                            className="bg-gray-800 hover:bg-gray-700 text-cyan-300 border border-cyan-500/30 text-xs px-2.5 py-1 rounded-md flex items-center gap-1 transition-colors"
                        >
                            <PlusCircleIcon className="w-3.5 h-3.5" /> Equipo
                        </button>
                    </div>

                    <button
                        onClick={() => setShowConnectModal(true)}
                        className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold py-2.5 px-3 rounded-lg text-xs flex items-center justify-center gap-2 shadow-lg shadow-cyan-600/30 transition-all"
                    >
                        <WifiIcon className="w-4 h-4" />
                        Vincular Dron / Estación GCS
                    </button>
                </div>

                {/* Despliegue Rápido a Unidad */}
                <div className="bg-gray-900/80 p-4 rounded-xl border border-gray-800 shadow-lg">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Despliegue Rápido de Dron</h3>
                    <div className="space-y-2.5">
                        <div>
                            <select
                                value={selectedUnitId}
                                onChange={(e) => setSelectedUnitId(e.target.value)}
                                className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-xs text-white"
                            >
                                <option value="">Seleccione Unidad Operadora...</option>
                                {units.map(u => (
                                    <option key={u.id} value={u.id}>{u.name} ({u.type})</option>
                                ))}
                            </select>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <select
                                value={newAssetType}
                                onChange={(e) => setNewAssetType(e.target.value as any)}
                                className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-xs text-white"
                            >
                                <option value="INTEL">ISR Óptico</option>
                                <option value="ATTACK">Ataque Loitering</option>
                                <option value="SPECIALIZED">FLIR Térmico</option>
                            </select>
                            <button
                                onClick={handleCreateAsset}
                                disabled={!selectedUnitId}
                                className="bg-cyan-700 hover:bg-cyan-600 disabled:opacity-40 text-white text-xs font-bold py-2 px-3 rounded-lg transition-colors flex items-center justify-center gap-1"
                            >
                                <PlusCircleIcon className="w-4 h-4" /> Asignar
                            </button>
                        </div>
                    </div>
                </div>

                {/* Lista de Unidades y Activos UAV */}
                <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar max-h-[500px]">
                    <div className="text-xs font-bold uppercase tracking-wider text-gray-400 px-1">
                        Aeronaves en Mando ({uavUnits.reduce((acc, u) => acc + (u.uavAssets?.length || 0), 0)})
                    </div>

                    {uavUnits.length === 0 && (
                        <div className="bg-gray-900/50 p-6 rounded-xl border border-dashed border-gray-800 text-center text-gray-500 text-xs">
                            No hay aeronaves UAV asignadas aún. Haz clic en "Vincular Dron / Estación GCS" para conectar.
                        </div>
                    )}

                    {uavUnits.map(unit => (
                        <div key={unit.id} className="bg-gray-900/80 border border-gray-800 rounded-xl p-3 shadow-md">
                            <div className="flex justify-between items-start mb-2">
                                <div>
                                    <h4 className="font-bold text-xs text-gray-200">{unit.name}</h4>
                                    <span className="text-[10px] text-cyan-400 font-mono">{unit.type}</span>
                                </div>
                                <span className="text-[9px] bg-gray-800 border border-gray-700 px-1.5 py-0.5 rounded text-gray-400">
                                    {unit.uavAssets?.length || 0} UAVs
                                </span>
                            </div>

                            <div className="space-y-2 mt-2">
                                {unit.uavAssets?.map((asset) => {
                                    const isSelected = selectedUavId === asset.id;
                                    return (
                                        <div
                                            key={asset.id}
                                            onClick={() => setSelectedUavId(asset.id)}
                                            className={`p-2.5 rounded-lg border transition-all cursor-pointer ${
                                                isSelected
                                                    ? 'bg-cyan-950/60 border-cyan-400 shadow-md ring-1 ring-cyan-400/50'
                                                    : 'bg-gray-800/60 border-gray-700 hover:border-gray-600'
                                            }`}
                                        >
                                            <div className="flex justify-between items-center">
                                                <div className="flex items-center gap-2">
                                                    {asset.type === 'ATTACK' ? (
                                                        <CrosshairsIcon className="w-4 h-4 text-red-400 shrink-0" />
                                                    ) : (
                                                        <VideoCameraIcon className="w-4 h-4 text-emerald-400 shrink-0" />
                                                    )}
                                                    <div>
                                                        <p className="font-bold text-xs text-white">{asset.id}</p>
                                                        <p className="text-[10px] text-gray-400">
                                                            {asset.modelName || asset.type} • {asset.connectionProtocol || 'SIMULADO'}
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-2">
                                                    <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                                                        (asset.batteryStatus || 100) < 25 ? 'bg-red-950 text-red-400' : 'bg-emerald-950 text-emerald-400'
                                                    }`}>
                                                        {asset.batteryStatus || 100}%
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="flex justify-between items-center mt-2 pt-2 border-t border-gray-800 text-[10px]">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleOpenGuide(asset.id);
                                                    }}
                                                    className="text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-semibold"
                                                >
                                                    <ClipboardDocumentCheckIcon className="w-3.5 h-3.5" />
                                                    Guía Enlace
                                                </button>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        onDeleteUAV(unit.id, asset.id);
                                                    }}
                                                    className="text-red-400 hover:text-red-300 flex items-center gap-1"
                                                >
                                                    <TrashIcon className="w-3.5 h-3.5" />
                                                    Desvincular
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Panel Central y Derecho: GCS HUD Video Feed y Centro Táctico */}
            <div className="flex-1 flex flex-col space-y-4">
                {/* Barra Superior del Dron Enfocado */}
                <div className="bg-gray-900/90 p-4 rounded-xl border border-gray-800 shadow-xl flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <div className="w-3 h-3 bg-emerald-500 rounded-full animate-ping absolute"></div>
                            <div className="w-3 h-3 bg-emerald-500 rounded-full relative"></div>
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="text-base font-bold text-white tracking-wide">
                                    {selectedUavId || 'SELECCIONE AERONAVE'}
                                </h3>
                                <span className="text-[10px] font-mono bg-cyan-950 text-cyan-300 border border-cyan-800 px-2 py-0.5 rounded">
                                    {activeAsset?.modelName || 'UAV TÁCTICO'}
                                </span>
                            </div>
                            <p className="text-xs text-gray-400 font-mono">
                                Estado: <span className="text-emerald-400 font-semibold">{currentStatus}</span> | Protocolo: {activeAsset?.connectionProtocol || 'SIMULADO'}
                            </p>
                        </div>
                    </div>

                    {/* Telemetría Compacta */}
                    <div className="flex items-center gap-3 text-xs font-mono">
                        <div className="bg-gray-800/80 px-3 py-1.5 rounded-lg border border-gray-700">
                            <span className="text-gray-400 block text-[9px]">ALTITUD AGL</span>
                            <span className="text-cyan-300 font-bold">{Math.round(currentAltitude)} m</span>
                        </div>
                        <div className="bg-gray-800/80 px-3 py-1.5 rounded-lg border border-gray-700">
                            <span className="text-gray-400 block text-[9px]">VELOCIDAD GS</span>
                            <span className="text-cyan-300 font-bold">{Math.round(currentSpeed)} km/h</span>
                        </div>
                        <div className="bg-gray-800/80 px-3 py-1.5 rounded-lg border border-gray-700">
                            <span className="text-gray-400 block text-[9px]">RUMBO HDG</span>
                            <span className="text-cyan-300 font-bold">{Math.round(currentHeading)}°</span>
                        </div>
                        <div className="bg-gray-800/80 px-3 py-1.5 rounded-lg border border-gray-700">
                            <span className="text-gray-400 block text-[9px]">BATERÍA</span>
                            <span className={`font-bold ${currentBattery < 20 ? 'text-red-400' : 'text-emerald-400'}`}>
                                {currentBattery}%
                            </span>
                        </div>
                    </div>
                </div>

                {/* VISOR HUD MILITAR TÁCTICO */}
                <div className="flex-1 bg-black rounded-xl border-2 border-cyan-500/60 shadow-2xl relative overflow-hidden min-h-[460px] flex flex-col justify-between">
                    {/* Filtros visuales de cámara (EO / FLIR / NVG) */}
                    <div className={`absolute inset-0 transition-all pointer-events-none ${
                        currentCameraMode === 'NVG'
                            ? 'bg-emerald-950/40 mix-blend-color-burn [background:radial-gradient(circle,rgba(16,185,129,0.15)_0%,rgba(6,78,59,0.7)_100%)]'
                            : currentCameraMode === 'FLIR'
                            ? 'bg-slate-900/50 [background:radial-gradient(circle,rgba(255,255,255,0.08)_0%,rgba(15,23,42,0.8)_100%)] contrast-150 grayscale'
                            : 'bg-blue-950/15'
                    }`}></div>

                    {/* Scanlines y Grid de Sensor */}
                    <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%)] bg-[length:100%_4px] opacity-40"></div>

                    {/* Top HUD Bar */}
                    <div className="relative z-10 p-4 flex justify-between items-start text-xs font-mono">
                        <div className="space-y-1">
                            <div className="flex items-center gap-2">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                    currentCameraMode === 'NVG' ? 'bg-emerald-500 text-black' :
                                    currentCameraMode === 'FLIR' ? 'bg-amber-400 text-black' : 'bg-cyan-500 text-black'
                                }`}>
                                    MODO SENSOR: {currentCameraMode}
                                </span>
                                <span className="bg-black/60 border border-gray-700 px-2 py-0.5 rounded text-gray-300">
                                    SAT: {currentSatellites} (3D-FIX)
                                </span>
                                <span className="bg-black/60 border border-gray-700 px-2 py-0.5 rounded text-gray-300">
                                    LINK: {currentSignal}% (-64 dBm)
                                </span>
                            </div>
                            <div className="text-[11px] text-cyan-400 bg-black/50 px-2 py-1 rounded inline-block">
                                LAT: {currentLat.toFixed(5)}° N | LON: {currentLon.toFixed(5)}° W
                            </div>
                        </div>

                        {/* Brújula Azimutal Superior */}
                        <div className="bg-black/70 border border-cyan-500/50 rounded-lg px-4 py-1.5 text-center">
                            <span className="text-[10px] text-gray-400 block">BRÚJULA ACIMUT</span>
                            <span className="text-cyan-300 font-bold text-sm tracking-widest">
                                {Math.round(currentHeading)}° {
                                    currentHeading >= 337.5 || currentHeading < 22.5 ? 'N' :
                                    currentHeading >= 22.5 && currentHeading < 67.5 ? 'NE' :
                                    currentHeading >= 67.5 && currentHeading < 112.5 ? 'E' :
                                    currentHeading >= 112.5 && currentHeading < 157.5 ? 'SE' :
                                    currentHeading >= 157.5 && currentHeading < 202.5 ? 'S' :
                                    currentHeading >= 202.5 && currentHeading < 247.5 ? 'SW' :
                                    currentHeading >= 247.5 && currentHeading < 292.5 ? 'W' : 'NW'
                                }
                            </span>
                        </div>
                    </div>

                    {/* CENTRO: Retícula Militar Táctica de Sensor */}
                    <div className="relative z-10 flex-1 flex items-center justify-center pointer-events-none">
                        <div className="relative flex items-center justify-center">
                            {/* Círculo Exterior */}
                            <div className="w-56 h-56 rounded-full border border-cyan-500/30 flex items-center justify-center animate-pulse">
                                {/* Círculo Interior */}
                                <div className="w-40 h-40 rounded-full border border-dashed border-cyan-400/40"></div>
                            </div>

                            {/* Cruz Retícula */}
                            <div className="absolute w-72 h-[1px] bg-cyan-400/50"></div>
                            <div className="absolute h-72 w-[1px] bg-cyan-400/50"></div>

                            {/* Mil Dots */}
                            <div className="absolute w-2 h-2 border border-cyan-400"></div>

                            {/* Horizonte Artificial / Pitch Marks */}
                            <div className="absolute -translate-y-8 flex items-center gap-8">
                                <div className="w-6 h-[1.5px] bg-cyan-400/60"></div>
                                <span className="text-[9px] font-mono text-cyan-400/80">+10</span>
                                <div className="w-6 h-[1.5px] bg-cyan-400/60"></div>
                            </div>
                            <div className="absolute translate-y-8 flex items-center gap-8">
                                <div className="w-6 h-[1.5px] bg-cyan-400/60"></div>
                                <span className="text-[9px] font-mono text-cyan-400/80">-10</span>
                                <div className="w-6 h-[1.5px] bg-cyan-400/60"></div>
                            </div>

                            {/* Coordenadas en Cruz de Mira */}
                            <div className="absolute translate-y-16 bg-black/80 border border-cyan-500/60 px-3 py-1 rounded text-center">
                                <span className="text-[9px] text-amber-400 font-bold block uppercase tracking-wider">🎯 BLANCO EN MIRA</span>
                                <span className="text-[11px] font-mono text-white">
                                    {currentLat.toFixed(5)}, {currentLon.toFixed(5)}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Barra Inferior del HUD con Coordenadas y Controles Rápidos */}
                    <div className="relative z-10 p-4 bg-gradient-to-t from-black/90 via-black/70 to-transparent flex flex-wrap justify-between items-end gap-3">
                        <div className="space-y-1">
                            <span className="text-[10px] font-mono text-gray-400 block">PAYLOAD STATUS: ARMED & READY</span>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => handleSendCommand('CAMERA_MODE', { mode: 'EO' })}
                                    className={`px-3 py-1 rounded text-xs font-mono font-bold transition-all ${
                                        currentCameraMode === 'EO' ? 'bg-cyan-500 text-black shadow-lg shadow-cyan-500/30' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                                    }`}
                                >
                                    EO Diurno
                                </button>
                                <button
                                    onClick={() => handleSendCommand('CAMERA_MODE', { mode: 'FLIR' })}
                                    className={`px-3 py-1 rounded text-xs font-mono font-bold transition-all ${
                                        currentCameraMode === 'FLIR' ? 'bg-amber-400 text-black shadow-lg shadow-amber-400/30' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                                    }`}
                                >
                                    FLIR Térmico
                                </button>
                                <button
                                    onClick={() => handleSendCommand('CAMERA_MODE', { mode: 'NVG' })}
                                    className={`px-3 py-1 rounded text-xs font-mono font-bold transition-all ${
                                        currentCameraMode === 'NVG' ? 'bg-emerald-400 text-black shadow-lg shadow-emerald-400/30' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                                    }`}
                                >
                                    NVG Nocturno
                                </button>
                            </div>
                        </div>

                        {/* BOTÓN DESIGNAR BLANCO PARA ARTILLERÍA */}
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => handleSendCommand('DESIGNATE_TARGET', { lat: currentLat, lon: currentLon })}
                                className="bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 text-white font-extrabold px-5 py-2.5 rounded-lg text-xs tracking-wider uppercase shadow-xl shadow-red-600/40 flex items-center gap-2 border border-red-400 transition-all hover:scale-105 active:scale-95"
                            >
                                <CrosshairsIcon className="w-4 h-4" />
                                🎯 Designar Blanco para Artillería (CDT)
                            </button>
                        </div>
                    </div>
                </div>

                {/* Barra de Comandos de Vuelo In-Flight */}
                <div className="bg-gray-900/90 p-4 rounded-xl border border-gray-800 shadow-xl">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center gap-2">
                            <BoltIcon className="w-4 h-4 text-cyan-400" />
                            Comandos de Vuelo Táctico
                        </span>
                        <span className="text-[11px] font-mono text-gray-400">
                            Aeronave activa: <strong className="text-cyan-300">{selectedUavId || 'Ninguna'}</strong>
                        </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <button
                            onClick={() => handleSendCommand('ORBIT')}
                            disabled={!selectedUavId}
                            className="bg-gray-800 hover:bg-cyan-950/60 border border-gray-700 hover:border-cyan-500/50 p-2.5 rounded-lg text-left transition-all disabled:opacity-50"
                        >
                            <span className="text-xs font-bold text-cyan-300 block">🔄 Órbita / Loiter</span>
                            <span className="text-[10px] text-gray-400">Mantener patrulla circular</span>
                        </button>

                        <button
                            onClick={() => handleSendCommand('PATROL')}
                            disabled={!selectedUavId}
                            className="bg-gray-800 hover:bg-emerald-950/60 border border-gray-700 hover:border-emerald-500/50 p-2.5 rounded-lg text-left transition-all disabled:opacity-50"
                        >
                            <span className="text-xs font-bold text-emerald-300 block">📍 Patrulla ISR</span>
                            <span className="text-[10px] text-gray-400">Barrido táctico del sector</span>
                        </button>

                        <button
                            onClick={() => handleSendCommand('RTH')}
                            disabled={!selectedUavId}
                            className="bg-gray-800 hover:bg-amber-950/60 border border-gray-700 hover:border-amber-500/50 p-2.5 rounded-lg text-left transition-all disabled:opacity-50"
                        >
                            <span className="text-xs font-bold text-amber-300 block">🏠 Return to Home (RTH)</span>
                            <span className="text-[10px] text-gray-400">Regreso de emergencia a base</span>
                        </button>

                        <button
                            onClick={() => selectedUavId && handleOpenGuide(selectedUavId)}
                            disabled={!selectedUavId}
                            className="bg-gray-800 hover:bg-purple-950/60 border border-gray-700 hover:border-purple-500/50 p-2.5 rounded-lg text-left transition-all disabled:opacity-50"
                        >
                            <span className="text-xs font-bold text-purple-300 block">📋 Guía y Script Telemetría</span>
                            <span className="text-[10px] text-gray-400">cURL / Python para RPi</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Modales */}
            <CreateUAVTeamModal
                isOpen={showCreateModal}
                onClose={() => setShowCreateModal(false)}
                onCreate={handleCreateTeam}
                parentUnits={parentUnits}
            />

            <ConnectUAVModal
                isOpen={showConnectModal}
                onClose={() => setShowConnectModal(false)}
                units={units}
                onConnect={handleConnectFromModal}
            />

            <UAVGuideModal
                isOpen={showGuideModal}
                onClose={() => setShowGuideModal(false)}
                guideData={guideData}
            />
        </div>
    );
};