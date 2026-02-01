import React, { useState, useEffect } from 'react';
import {
    SignalIcon,
    VideoCameraIcon,
    CrosshairsIcon,
    PlusCircleIcon,
    TrashIcon,
    PaperAirplaneIcon,
    XMarkIcon
} from './icons';
import { uavService, UAVTelemetry } from '../services/uavService';
import { useUAVWebSocket } from '../hooks/useUAVWebSocket';
import { MilitaryUnit, UAVAsset, UnitType, UnitStatus, NewUnitData } from '../types';

interface UAVManagementViewProps {
    units: MilitaryUnit[];
    onAssignUAV: (unitId: string, asset: UAVAsset) => void;
    onDeleteUAV: (unitId: string, assetId: string) => void;
    addUnit: (unitData: NewUnitData) => void;
}

// Inline Modal for simplicity, similar to ArtilleryCreationModal
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
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center backdrop-blur-sm">
            <div className="bg-gray-800 rounded-lg p-6 w-96 border border-cyan-500 shadow-2xl">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold text-cyan-400">Crear Equipo UAV</h3>
                    <button onClick={onClose}><XMarkIcon className="w-5 h-5 text-gray-400 hover:text-white" /></button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-xs text-gray-400 mb-1">Nombre del Equipo</label>
                        <input
                            value={name} onChange={e => setName(e.target.value)}
                            className="w-full bg-gray-700 border border-gray-600 rounded p-2 text-white"
                            placeholder="Ej. Garra Alpha" required
                        />
                    </div>
                    <div>
                        <label className="block text-xs text-gray-400 mb-1">Tipo de Equipo</label>
                        <select
                            value={type} onChange={e => setType(e.target.value as UnitType)}
                            className="w-full bg-gray-700 border border-gray-600 rounded p-2 text-white"
                        >
                            <option value={UnitType.UAV_INTEL_TEAM}>Equipo Intel (ISR)</option>
                            <option value={UnitType.UAV_ATTACK_TEAM}>Equipo Ataque (Loitering)</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs text-gray-400 mb-1">Unidad Superior (Mando)</label>
                        <select
                            value={parentId} onChange={e => setParentId(e.target.value)}
                            className="w-full bg-gray-700 border border-gray-600 rounded p-2 text-white"
                            required
                        >
                            <option value="">Seleccione Unidad...</option>
                            {parentUnits.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                        </select>
                    </div>
                    <button type="submit" className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-2 rounded">
                        Crear Equipo
                    </button>
                </form>
            </div>
        </div>
    );
};

export const UAVManagementView: React.FC<UAVManagementViewProps> = ({ units, onAssignUAV, onDeleteUAV, addUnit }) => {
    const [selectedUnitId, setSelectedUnitId] = useState<string>('');
    const [newAssetType, setNewAssetType] = useState<'ATTACK' | 'INTEL' | 'SPECIALIZED'>('INTEL');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [uavUnits, setUavUnits] = useState<MilitaryUnit[]>([]);
    const [telemetryData, setTelemetryData] = useState<UAVTelemetry[]>([]);

    // Filter potential parent units (Battalions, Companies)
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
            equipment: ['Control Station', 'Antenna'],
            capabilities: ['ISR', 'Target Acquisition'],
            ammoLevel: 100,
            daysOfSupply: 30,
            fuelLevel: 100
        };
        addUnit(newData);
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

    const handleCreateAsset = () => {
        if (!selectedUnitId) return;
        const parentUnit = units.find(u => u.id === selectedUnitId);
        if (!parentUnit) return;

        const newAsset: UAVAsset = {
            id: `UAV-${Math.floor(Math.random() * 10000)}`,
            type: newAssetType,
            batteryStatus: 100,
            currentPayload: newAssetType === 'ATTACK' ? 2 : 0, // 2 Missiles default
            operationalRadius: newAssetType === 'INTEL' ? 15 : 10, // km
            location: parentUnit.location, // Initialize with parent location
        };
        // Ideally fetch unit location, but assignment logic handles it
        onAssignUAV(selectedUnitId, newAsset);
    };

    return (
        <div className="flex h-full bg-gray-900 text-gray-100 p-6 gap-6">
            {/* Left Panel: Inventory */}
            <div className="w-1/3 flex flex-col space-y-4">
                <div className="flex justify-between items-center">
                    <h2 className="text-xl font-bold text-cyan-400 flex items-center">
                        <SignalIcon className="w-6 h-6 mr-2" />
                        Equipos UAV
                    </h2>
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="bg-cyan-600 hover:bg-cyan-500 text-white text-xs px-3 py-1 rounded flex items-center"
                    >
                        <PlusCircleIcon className="w-4 h-4 mr-1" /> Nuevo Equipo
                    </button>
                </div>

                <div className="bg-gray-800 p-4 rounded-lg shadow-lg border border-gray-700">
                    <h3 className="text-sm font-semibold mb-3 text-gray-300">Asignar Nuevo Dron a Equipo</h3>
                    <div className="space-y-3">
                        <div>
                            <label className="block text-xs text-gray-500 mb-1">Unidad Operadora</label>
                            <select
                                value={selectedUnitId}
                                onChange={(e) => setSelectedUnitId(e.target.value)}
                                className="w-full bg-gray-700 border border-gray-600 rounded p-2 text-sm text-white"
                            >
                                <option value="">Seleccione Unidad...</option>
                                {units.map(u => (
                                    <option key={u.id} value={u.id}>{u.name} ({u.type})</option>
                                ))}
                            </select>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label className="block text-xs text-gray-500 mb-1">Tipo de Activo</label>
                                <select
                                    value={newAssetType}
                                    onChange={(e) => setNewAssetType(e.target.value as any)}
                                    className="w-full bg-gray-700 border border-gray-600 rounded p-2 text-sm text-white"
                                >
                                    <option value="INTEL">Inteligencia (ISR)</option>
                                    <option value="ATTACK">Ataque (Loitering)</option>
                                    <option value="SPECIALIZED">Especializado (Térmico/EWAR)</option>
                                </select>
                            </div>
                            <div className="flex items-end">
                                <button
                                    onClick={handleCreateAsset}
                                    disabled={!selectedUnitId}
                                    className="w-full bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-2 px-4 rounded flex items-center justify-center transition-colors"
                                >
                                    <PlusCircleIcon className="w-5 h-5 mr-1" />
                                    Asignar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar">
                    {uavUnits.length === 0 && (
                        <p className="text-gray-500 text-center italic mt-10">No hay unidades con activos UAV asignados.</p>
                    )}
                    {uavUnits.map(unit => (
                        <div key={unit.id} className="bg-gray-800 border-l-4 border-cyan-500 rounded p-3">
                            <div className="flex justify-between items-start mb-2">
                                <h4 className="font-bold text-sm">{unit.name}</h4>
                                <span className="text-[10px] bg-gray-700 px-2 py-0.5 rounded text-gray-300">{unit.type}</span>
                            </div>
                            <div className="space-y-2">
                                {unit.uavAssets?.map((asset, idx) => (
                                    <div key={idx} className="flex justify-between items-center bg-gray-900/50 p-2 rounded text-xs border border-gray-700">
                                        <div className="flex items-center gap-2">
                                            {asset.type === 'ATTACK' ?
                                                <CrosshairsIcon className="w-4 h-4 text-red-400" /> :
                                                <VideoCameraIcon className="w-4 h-4 text-green-400" />
                                            }
                                            <div>
                                                <p className="font-bold text-cyan-200">{asset.id}</p>
                                                <p className="text-[10px] text-gray-500">{asset.type} | Rng: {asset.operationalRadius}km</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <div className="text-right">
                                                <div className="flex items-center text-[10px] text-green-400">
                                                    <span>{asset.batteryStatus}%</span>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => onDeleteUAV(unit.id, asset.id)}
                                                className="text-red-500 hover:text-red-300"
                                            >
                                                <TrashIcon className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Right Panel: Operations Monitor */}
            <div className="flex-1 flex flex-col bg-gray-800 rounded-lg p-4 shadow-lg border border-gray-700">
                <h3 className="text-lg font-bold text-gray-200 mb-4 flex items-center">
                    <PaperAirplaneIcon className="w-5 h-5 mr-2" />
                    Monitor de Operaciones Aéreas
                </h3>

                <div className="flex-1 bg-black/40 rounded border border-gray-600 flex items-center justify-center relative overflow-hidden">
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')] opacity-20"></div>
                    {telemetryData.length === 0 ? (
                        <div className="text-center">
                            <SignalIcon className="w-16 h-16 text-cyan-900/40 mx-auto mb-2" />
                            <p className="text-gray-500 text-sm">Esperando señal de telemetría...</p>
                        </div>
                    ) : (
                        <div className="w-full h-full p-4 overflow-y-auto z-10">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {telemetryData.map(t => (
                                    <div key={t.uavId} className="bg-gray-900/80 border border-cyan-500/30 p-3 rounded shadow-lg backdrop-blur hover:border-cyan-400 transition-colors cursor-pointer">
                                        <div className="flex justify-between text-xs font-bold text-cyan-400 mb-2">
                                            <span>{t.uavId}</span>
                                            <span className={t.status === 'ON_STATION' ? 'text-green-400' : 'text-yellow-400'}>{t.status}</span>
                                        </div>
                                        <div className="text-[10px] text-gray-400 mb-2 font-mono">
                                            LAT: {typeof t.location?.lat === 'number' ? t.location.lat.toFixed(5) : 'N/A'} <br />
                                            LON: {typeof t.location?.lon === 'number' ? t.location.lon.toFixed(5) : 'N/A'}
                                        </div>
                                        <div className="flex gap-2 items-center">
                                            <div className="h-2 w-full bg-gray-700 rounded-full overflow-hidden">
                                                <div className="h-full bg-gradient-to-r from-green-500 to-green-300" style={{ width: `${t.batteryLevel}%` }}></div>
                                            </div>
                                            <span className={`text-xs font-mono w-8 text-right ${t.batteryLevel < 20 ? 'text-red-500 font-bold' : 'text-gray-300'}`}>{t.batteryLevel}%</span>
                                        </div>
                                        {t.streamUrl && (
                                            <div className="mt-2 text-[10px] text-cyan-600 truncate">
                                                Stream: {t.streamUrl}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <div className="h-32 mt-4 grid grid-cols-4 gap-4">
                    <div className="bg-gray-700/50 p-3 rounded border border-gray-600 flex flex-col justify-center items-center">
                        <p className="text-xs text-gray-400 uppercase tracking-widest text-center">Activos en Vuelo</p>
                        <p className="text-3xl font-bold text-green-400 mt-1">{telemetryData.length}</p>
                    </div>
                    <div className="bg-gray-700/50 p-3 rounded border border-gray-600 flex flex-col justify-center items-center">
                        <p className="text-xs text-gray-400 uppercase tracking-widest text-center">En Estación</p>
                        <p className="text-3xl font-bold text-yellow-400 mt-1">{telemetryData.filter(t => t.status === 'ON_STATION').length}</p>
                    </div>
                    <div className="bg-gray-700/50 p-3 rounded border border-gray-600 flex flex-col justify-center items-center">
                        <p className="text-xs text-gray-400 uppercase tracking-widest text-center">Batería Crítica</p>
                        <p className="text-3xl font-bold text-red-400 mt-1">{telemetryData.filter(t => t.batteryLevel < 20).length}</p>
                    </div>
                    <div className="bg-gray-700/50 p-3 rounded border border-gray-600 flex flex-col justify-center items-center">
                        <p className="text-xs text-gray-400 uppercase tracking-widest text-center">Disponibilidad</p>
                        <p className="text-3xl font-bold text-cyan-400 mt-1">100%</p>
                    </div>
                </div>
            </div>

            <CreateUAVTeamModal
                isOpen={showCreateModal}
                onClose={() => setShowCreateModal(false)}
                onCreate={handleCreateTeam}
                parentUnits={parentUnits}
            />
        </div>
    );
};
