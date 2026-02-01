import React, { useState, useEffect } from 'react';
import { ShieldCheckIcon, TruckIcon, ExclamationTriangleIcon, CloudIcon, ClipboardDocumentCheckIcon, SparklesIcon, CrosshairsIcon, LightBulbIcon, ShieldExclamationIcon, ClockIcon, MapPinIcon, ArrowPathIcon } from './icons';
import { bmaService } from '../services/bmaService';
import { weatherService } from '../services/weatherService';
import { BMARecommendation, LogisticsPrediction, IntelligenceReport, MapEntityType, SelectedEntity, Hotspot, WeatherInfo, MilitaryUnit } from '../types';
import { getBMASituationBrief, simulateBMAInterception } from '../utils/geminiService';
import { uavService } from '../services/uavService';
import { SignalIcon, VideoCameraIcon, WifiIcon } from './icons';

interface BMAPanelProps {
    selectedEntity: SelectedEntity | null;
    intelligenceReports: IntelligenceReport[];
    hotspots: Hotspot[];
    historicalHotspots: Hotspot[];
    units: MilitaryUnit[];
    onSelectEntityOnMap?: (entity: SelectedEntity) => void;
    onPrepareORDOP?: (recommendation: BMARecommendation, intel: IntelligenceReport) => void;
    onRefreshHotspots?: () => void;
}

export const BMAPanel: React.FC<BMAPanelProps> = ({
    selectedEntity,
    intelligenceReports,
    hotspots,
    historicalHotspots,
    units,
    onSelectEntityOnMap,
    onPrepareORDOP,
    onRefreshHotspots
}) => {
    const [recommendations, setRecommendations] = useState<BMARecommendation[]>([]);
    const [logistics, setLogistics] = useState<LogisticsPrediction[]>([]);
    const [loading, setLoading] = useState(false);
    const [requestingUnitId, setRequestingUnitId] = useState<string | null>(null);
    const [weather, setWeather] = useState<WeatherInfo | null>(null);
    const [checklist, setChecklist] = useState<string[]>([]);
    const [missionType, setMissionType] = useState<string>('ataque');
    const [aiBrief, setAiBrief] = useState<string | null>(null);
    const [loadingBrief, setLoadingBrief] = useState(false);
    const [simulationResult, setSimulationResult] = useState<string | null>(null);
    const [simulatingId, setSimulatingId] = useState<string | null>(null);
    const [feedback, setFeedback] = useState<{ type: 'success' | 'error', msg: string } | null>(null);
    const [activeMission, setActiveMission] = useState<any>(null);

    // Poll active UAV missions
    useEffect(() => {
        const fetchMissions = async () => {
            try {
                const missions = await uavService.getActiveMissions();
                // Filter mission relevant to current view (simply show first valid one for demo)
                const relevant = missions.find(m => m.status === 'ON_STATION' || m.status === 'EN_ROUTE');
                setActiveMission(relevant);
            } catch (e) { console.error(e); }
        };
        const interval = setInterval(fetchMissions, 5000);
        return () => clearInterval(interval);
    }, []);

    const handleRequestUAV = async (type: 'STRIKE' | 'RECON') => {
        if (!selectedEntity || !selectedEntity.id) return;

        // Find nearest UAV capable unit (simplified for demo: pick first available)
        const targetLoc = selectedIntel?.location || { lat: 0, lon: 0 };
        const supportUnits = await uavService.getAvailableSupport(targetLoc.lat, targetLoc.lon, type);

        if (supportUnits.length > 0) {
            await uavService.requestSupport({
                requesterId: 'PLT-ALPHA-1', // Mock requester
                droneUnitId: supportUnits[0].id,
                type: type,
                target: targetLoc,
                details: `Support requested against threat ${selectedIntel?.title}`
            });
            setFeedback({ type: 'success', msg: `Apoyo UAV (${type}) solicitado a ${supportUnits[0].name}` });
        } else {
            setFeedback({ type: 'error', msg: 'No hay activos UAV disponibles en rango.' });
        }
    };

    const selectedIntel = selectedEntity?.type === MapEntityType.INTEL
        ? intelligenceReports.find(i => i.id === selectedEntity.id)
        : null;

    useEffect(() => {
        if (selectedIntel) {
            setLoading(true);
            bmaService.getRecommendations(selectedIntel.id)
                .then(setRecommendations)
                .catch(console.error)
                .finally(() => setLoading(false));
        } else {
            setRecommendations([]);
        }
    }, [selectedIntel]);

    const handleRefreshLogistics = () => {
        setLogistics(prev => []); // Optional: clear or keep old while loading? Better keep old.
        bmaService.getLogisticsPredictions()
            .then(setLogistics)
            .catch(console.error);
    };

    useEffect(() => {
        handleRefreshLogistics();
        const interval = setInterval(handleRefreshLogistics, 28800000); // Poll every 8h
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        // Fetch weather for the region (arbitrary coordinates if nothing selected)
        const lat = selectedIntel?.location.lat || 4.6097;
        const lon = selectedIntel?.location.lon || -74.0817;
        weatherService.getCurrentWeather(lat, lon)
            .then(setWeather)
            .catch(console.error);
    }, [selectedIntel]);

    useEffect(() => {
        if (selectedIntel) {
            const reasoning = recommendations[0]?.reasoning.toLowerCase() || "";
            if (reasoning.includes('defensa')) setMissionType('defensa');
            else if (reasoning.includes('reconocimiento') || reasoning.includes('avistamiento')) setMissionType('reconocimiento');
            else setMissionType('ataque');
        }
    }, [selectedIntel, recommendations]);

    useEffect(() => {
        bmaService.getDoctrinalChecklist(missionType)
            .then(setChecklist)
            .catch(console.error);
    }, [missionType]);

    const handleGenerateBrief = () => {
        setLoadingBrief(true);
        getBMASituationBrief(selectedIntel, recommendations, weather, hotspots, logistics)
            .then(setAiBrief)
            .catch(console.error)
            .finally(() => setLoadingBrief(false));
    };

    // Auto-clear brief if context changes drastically, but don't re-generate automatically
    useEffect(() => {
        setAiBrief(null);
    }, [selectedIntel?.id]);

    return (
        <div className="flex flex-col space-y-6 h-full overflow-y-auto pr-2 custom-scrollbar pb-10">
            {/* AI Briefing Section */}
            <div className="bg-gradient-to-br from-indigo-900/60 to-blue-900/40 p-5 rounded-xl shadow-xl border border-indigo-500/30 backdrop-blur-md">
                <div className="flex justify-between items-center mb-3">
                    <h3 className="text-xs font-black text-indigo-300 flex items-center uppercase tracking-widest">
                        <SparklesIcon className="w-4 h-4 mr-2 text-yellow-400 animate-pulse" />
                        Inteligencia Artificial BMA
                    </h3>
                    <button
                        onClick={handleGenerateBrief}
                        disabled={loadingBrief}
                        className="text-[9px] bg-indigo-500/20 hover:bg-indigo-500/40 disabled:opacity-50 text-indigo-200 px-2 py-1 rounded border border-indigo-500/30 transition-colors uppercase font-bold tracking-wider"
                    >
                        {loadingBrief ? 'Generando...' : (aiBrief ? 'Actualizar' : 'Generar Resumen')}
                    </button>
                </div>
                {loadingBrief ? (
                    <div className="flex items-center space-x-3 py-2">
                        <div className="flex space-x-1">
                            <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
                            <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
                            <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" />
                        </div>
                        <span className="text-[10px] text-indigo-300/70 font-medium italic">Sintetizando panorama táctico...</span>
                    </div>
                ) : aiBrief ? (
                    <div className="text-[11px] text-indigo-50 leading-relaxed italic border-l-2 border-indigo-400/50 pl-4 py-1">
                        {aiBrief.split('\n').map((line, i) => (
                            <p key={i} className={line.startsWith('-') ? 'mt-2 flex items-start' : ''}>
                                {line.startsWith('-') && <span className="mr-2 text-indigo-400">•</span>}
                                {line.startsWith('-') ? line.substring(1).trim() : line}
                            </p>
                        ))}
                    </div>
                ) : (
                    <p className="text-[11px] text-gray-500 italic py-2">Sin datos suficientes para generación de síntesis.</p>
                )}
            </div>

            {/* WTP Section */}
            <div className="bg-gray-800/80 p-5 rounded-xl shadow-lg border border-gray-700/50 border-l-4 border-blue-500">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-sm font-bold text-blue-100 flex items-center">
                        <ShieldCheckIcon className="w-5 h-5 mr-2 text-blue-400" />
                        Recomendación (WTP)
                    </h3>
                    {selectedIntel && (
                        <span className="text-[10px] bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-full font-bold">
                            ACTIVO
                        </span>
                    )}
                </div>

                {!selectedIntel ? (
                    <div className="text-center py-6 border-2 border-dashed border-gray-700 rounded-lg">
                        <CrosshairsIcon className="w-8 h-8 mx-auto text-gray-600 mb-2 opacity-50" />
                        <p className="text-xs text-gray-500 italic">Seleccione objetivo en mapa</p>
                    </div>
                ) : loading ? (
                    <div className="space-y-3 py-2">
                        <div className="h-10 bg-gray-700/50 rounded animate-pulse" />
                        <div className="h-10 bg-gray-700/30 rounded animate-pulse" />
                    </div>
                ) : recommendations.length > 0 ? (
                    <div className="space-y-4">
                        <div className="p-3 rounded-lg bg-blue-900/20 border border-blue-800/50">
                            <p className="text-[10px] text-blue-300 font-medium mb-1 uppercase tracking-tighter">Amenaza Analizada</p>
                            <p className="text-sm font-bold text-white">{selectedIntel.title}</p>
                        </div>

                        {recommendations.map((rec, idx) => (
                            <div key={rec.unitId} className={`p-4 rounded-xl border transition-all ${idx === 0 ? 'bg-blue-900/30 border-blue-600 shadow-blue-900/20' : 'bg-gray-700/50 border-gray-600'}`}>
                                <div className="flex justify-between items-start mb-3">
                                    <div className="flex-1">
                                        <h4 className="font-black text-gray-50 uppercase tracking-tight text-xs">{rec.unitName}</h4>
                                        <div className="mt-2 flex items-center gap-2">
                                            <div className="w-1.5 h-1.5 rounded-full bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.8)]" />
                                            <p className="text-[11px] text-blue-50 font-medium leading-tight">{rec.reasoning}</p>
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-end shrink-0 ml-2">
                                        <span className="text-sm font-black text-blue-400">{Math.round(rec.score)}%</span>
                                        <span className="text-[9px] font-bold text-gray-500 uppercase">Tto: {Math.round(rec.estimatedTimeToIntercept)}m</span>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 pt-3 border-t border-gray-600/50 mt-2">
                                    <button
                                        onClick={() => onSelectEntityOnMap && onSelectEntityOnMap({ type: MapEntityType.UNIT, id: rec.unitId })}
                                        className="flex-1 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300 text-[10px] font-bold rounded-lg transition-colors border border-gray-600"
                                    >
                                        VER MAPA
                                    </button>
                                    <button
                                        onClick={() => onPrepareORDOP && onPrepareORDOP(rec, selectedIntel)}
                                        className="flex-1 py-1.5 bg-emerald-600/20 hover:bg-emerald-600 text-emerald-400 hover:text-white text-[10px] font-bold rounded-lg transition-all border border-emerald-600/30"
                                    >
                                        ORDOP
                                    </button>
                                    <button
                                        onClick={async () => {
                                            const unit = units.find(u => u.id === rec.unitId);
                                            if (!unit || !selectedIntel) return;
                                            setSimulatingId(rec.unitId);
                                            setSimulationResult(null);
                                            try {
                                                const res = await simulateBMAInterception(unit, selectedIntel, weather);
                                                setSimulationResult(res.text);
                                            } catch (e) { console.error(e); }
                                            finally { setSimulatingId(null); }
                                        }}
                                        className="flex-1 py-1.5 bg-indigo-600/20 hover:bg-indigo-600 text-indigo-400 hover:text-white text-[10px] font-bold rounded-lg transition-all border border-indigo-600/30 flex items-center justify-center gap-1"
                                    >
                                        {simulatingId === rec.unitId ? '...' : (
                                            <>
                                                <SparklesIcon className="w-3 h-3" />
                                                SIMULAR
                                            </>
                                        )}
                                    </button>
                                </div>

                                {simulationResult && simulatingId === null && recommendations[0].unitId === rec.unitId && (
                                    <div className="mt-3 p-3 bg-indigo-900/50 border border-indigo-500/50 rounded-lg text-[10px] text-indigo-50 italic animate-in fade-in slide-in-from-top-2">
                                        <p className="font-black text-indigo-300 mb-2 flex items-center uppercase tracking-tighter">
                                            <SparklesIcon className="w-3 h-3 mr-2" /> Reporte de Simulación Tactical-AI:
                                        </p>
                                        {simulationResult}
                                        <button
                                            onClick={() => setSimulationResult(null)}
                                            className="mt-3 text-[9px] font-black text-indigo-400 hover:text-indigo-200 uppercase tracking-widest block w-full text-right"
                                        >
                                            [ Cerrar ]
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="p-4 bg-yellow-900/10 border border-yellow-700/30 rounded-lg">
                        <p className="text-xs text-yellow-500 font-bold flex items-center justify-center gap-2">
                            <ExclamationTriangleIcon className="w-4 h-4" />
                            Sin unidades operacionales en rango
                        </p>
                    </div>
                )}
            </div>

            {/* Logistics Section */}
            <div className="bg-gray-800/80 p-5 rounded-xl shadow-lg border border-gray-700/50 border-l-4 border-orange-500">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-sm font-bold text-orange-200 flex items-center">
                        <TruckIcon className="w-5 h-5 mr-3 text-orange-400" />
                        Logística Predictiva
                    </h3>
                    <button
                        onClick={handleRefreshLogistics}
                        title="Actualizar Logística"
                        className="p-1 hover:bg-orange-500/20 rounded text-orange-400/50 hover:text-orange-300 transition-colors"
                    >
                        <ArrowPathIcon className="w-4 h-4" />
                    </button>
                </div>
                {logistics.length > 0 ? (
                    <div className="space-y-3">
                        {logistics.map(log => (
                            <div key={log.unitId} className="p-4 bg-gray-900/40 rounded-xl border border-gray-700/50 hover:border-orange-500/30 transition-all group">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-gray-100 font-black text-xs uppercase tracking-tight">{log.unitName}</span>
                                    <span className={`text-[9px] px-2 py-0.5 rounded-full font-black tracking-tighter shadow-sm ${log.status === 'CRÍTICO' ? 'bg-red-600 text-white' : 'bg-orange-600 text-white'}`}>
                                        {log.status}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between text-[11px] text-gray-400 mb-3">
                                    <span>Abastecimiento</span>
                                    <span className="text-orange-400 font-black">{log.daysRemaining.toFixed(1)} DÍAS</span>
                                </div>
                                <div className="p-2 text-[10px] text-orange-100 bg-orange-950/30 border border-orange-500/20 rounded-lg italic leading-tight mb-3">
                                    <span className="font-bold mr-1">R:</span> {log.recommendation}
                                </div>
                                <button
                                    onClick={async () => {
                                        setRequestingUnitId(log.unitId);
                                        try {
                                            await bmaService.requestResupply(log.unitId);
                                            setFeedback({ type: 'success', msg: `Suministros solicitados para ${log.unitName}` });
                                            setTimeout(() => setFeedback(null), 3000);
                                        } catch (e) {
                                            setFeedback({ type: 'error', msg: 'Fallo en solicitud de reabastecimiento' });
                                            setTimeout(() => setFeedback(null), 3000);
                                        } finally {
                                            setRequestingUnitId(null);
                                        }
                                    }}
                                    disabled={requestingUnitId === log.unitId}
                                    className="w-full py-2 bg-orange-600 hover:bg-orange-500 disabled:bg-gray-700 disabled:text-gray-500 text-white text-[10px] font-black rounded-lg uppercase transition-all shadow-md active:scale-95 flex items-center justify-center gap-2"
                                >
                                    {requestingUnitId === log.unitId ? (
                                        <div className="animate-spin h-3 w-3 border-2 border-white/30 border-t-white rounded-full"></div>
                                    ) : 'Enviar Suministros'}
                                </button>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-6 border-2 border-dashed border-gray-700 rounded-xl bg-green-500/5">
                        <ShieldCheckIcon className="w-8 h-8 text-green-500/20 mb-2" />
                        <p className="text-xs text-green-400 font-bold uppercase tracking-tight">Abastecimiento Óptimo</p>
                        <p className="text-[9px] text-gray-500 mt-1">Sin alertas de suministro detectadas</p>
                    </div>
                )}
            </div>

            {/* Weather Impact Section */}
            <div className={`bg-gray-800/80 p-5 rounded-xl shadow-lg border border-gray-700/50 border-l-4 ${weather?.operationalImpact ? 'border-red-500' : 'border-cyan-400'}`}>
                <h3 className="text-sm font-bold text-cyan-100 mb-4 flex items-center">
                    <CloudIcon className="w-5 h-5 mr-3 text-cyan-400" />
                    Condiciones Meteorológicas
                </h3>
                {weather ? (
                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-3 bg-gray-900/40 rounded-lg border border-gray-700/50">
                            <p className="text-[8px] text-gray-500 uppercase font-black mb-1">Cielo</p>
                            <p className="text-xs font-bold text-white uppercase">{weather.condition}</p>
                        </div>
                        <div className="p-3 bg-gray-900/40 rounded-lg border border-gray-700/50">
                            <p className="text-[8px] text-gray-500 uppercase font-black mb-1">Temperatura</p>
                            <p className="text-xs font-bold text-white">{Math.round(weather.temperature)}°C</p>
                        </div>
                        <div className="p-3 bg-gray-900/40 rounded-lg border border-gray-700/50">
                            <p className="text-[8px] text-gray-500 uppercase font-black mb-1">Ataque Viento</p>
                            <p className="text-xs font-bold text-white">{Math.round(weather.windSpeed)} KM/H</p>
                        </div>
                        <div className="p-3 bg-gray-900/40 rounded-lg border border-gray-700/50">
                            <p className="text-[8px] text-gray-500 uppercase font-black mb-1">Humedad</p>
                            <p className="text-xs font-bold text-white">{Math.round(weather.humidity)}%</p>
                        </div>
                        {weather.operationalImpact && (
                            <div className="col-span-2 mt-2 p-3 bg-red-900/30 border border-red-500/30 rounded-xl flex items-start gap-3">
                                <ExclamationTriangleIcon className="w-5 h-5 text-red-500 shrink-0" />
                                <div className="space-y-1">
                                    <p className="text-[10px] font-black text-red-400 uppercase tracking-wider">Restricción Operacional</p>
                                    <p className="text-[10px] text-red-100 leading-snug">
                                        Degradación crítica en activos aéreos y visibilidad de drones. Se recomienda extremar precauciones en reconocimiento.
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="flex items-center justify-center py-8 text-gray-500 animate-pulse">
                        <span className="text-xs font-bold uppercase tracking-widest italic">Sincronizando Satélites...</span>
                    </div>
                )}
            </div>

            {/* UAV Support Section */}
            {(selectedEntity?.type === MapEntityType.UNIT || selectedEntity?.type === MapEntityType.INTEL) && (
                <div className="bg-gray-800/80 p-5 rounded-xl shadow-lg border border-gray-700/50 border-l-4 border-cyan-500 overflow-hidden">
                    <h3 className="text-sm font-bold text-cyan-200 mb-4 flex items-center">
                        <SignalIcon className="w-5 h-5 mr-3 text-cyan-400" />
                        Ojos en el Aire (ISR)
                    </h3>

                    {/* Active Feed (Simulation) */}
                    {activeMission && activeMission.status === 'ON_STATION' && (
                        <div className="mb-4 bg-black rounded-xl border border-cyan-800 shadow-2xl overflow-hidden relative group">
                            <div className="absolute top-3 left-3 flex items-center gap-2 z-10">
                                <span className="bg-red-600 text-white text-[9px] font-black px-2 py-0.5 rounded animate-pulse flex items-center shadow-lg">
                                    <span className="w-1.5 h-1.5 bg-white rounded-full mr-1.5"></span> LIVE
                                </span>
                                <span className="text-cyan-400 text-[10px] font-mono bg-black/70 backdrop-blur-sm px-2 py-0.5 rounded border border-cyan-500/30 uppercase">FLIR-01 MOD: {activeMission.type}</span>
                            </div>
                            <img
                                src="https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExMjR4b3J6ZzF6c3R4Z3J6Z3J6Z3J6Z3J6Z3J6Z3J6/3o7TKrExqBAt5jVsUE/giphy.gif"
                                alt="UAV Feed"
                                className="w-full h-52 object-cover opacity-70 contrast-125 saturate-50"
                            />
                            <div className="absolute inset-0 pointer-events-none border-[1px] border-cyan-500/20 m-2"></div>
                            <div className="absolute bottom-3 left-3 right-3 flex justify-between text-[10px] text-green-400 font-mono font-black drop-shadow-md">
                                <span className="bg-black/40 px-1 rounded">ALT: 1,540 FT</span>
                                <span className="bg-black/40 px-1 rounded">GS: 45 KTS</span>
                                <span className="bg-black/40 px-1 rounded">BAT: 78%</span>
                            </div>
                        </div>
                    )}

                    {!activeMission ? (
                        <div className="flex gap-3">
                            <button
                                onClick={() => handleRequestUAV('RECON')}
                                className="flex-1 bg-cyan-900/40 hover:bg-cyan-600 text-cyan-100 text-[10px] font-black py-3 rounded-xl border border-cyan-700/50 flex flex-col items-center gap-2 transition-all active:scale-95 uppercase tracking-tighter"
                            >
                                <VideoCameraIcon className="w-6 h-6 text-cyan-400" />
                                RECON-INTEL
                            </button>
                            <button
                                onClick={() => handleRequestUAV('STRIKE')}
                                className="flex-1 bg-red-900/30 hover:bg-red-700 text-red-100 text-[10px] font-black py-3 rounded-xl border border-red-700/50 flex flex-col items-center gap-2 transition-all active:scale-95 uppercase tracking-tighter"
                            >
                                <CrosshairsIcon className="w-6 h-6 text-red-500" />
                                APOYO FUEGO
                            </button>
                        </div>
                    ) : (
                        <div className="bg-cyan-900/30 p-4 rounded-xl border border-cyan-700/50 flex items-center justify-between">
                            <div>
                                <p className="text-xs text-cyan-50 font-black uppercase tracking-tight">{activeMission.type} EN CURSO</p>
                                <p className="text-[10px] text-gray-400 font-bold mt-1">STATUS: <span className="text-yellow-400">{activeMission.status}</span></p>
                            </div>
                            <div className="text-right">
                                <span className="text-[10px] font-black text-cyan-400 animate-pulse">SISTEMA ACTIVO</span>
                                <p className="text-[9px] text-gray-500 mt-1 uppercase font-bold">ETA: 2m 30s</p>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Doctrinal Checklist Section */}
            <div className="bg-gray-800/80 p-5 rounded-xl shadow-lg border border-gray-700/50 border-l-4 border-emerald-500">
                <div className="flex justify-between items-center mb-5">
                    <h3 className="text-sm font-bold text-emerald-100 flex items-center">
                        <ClipboardDocumentCheckIcon className="w-5 h-5 mr-3 text-emerald-400" />
                        Guía Doctrinal
                    </h3>
                    <select
                        value={missionType}
                        onChange={(e) => setMissionType(e.target.value)}
                        className="bg-gray-900 text-emerald-400 text-[10px] font-black uppercase tracking-tighter border border-emerald-500/30 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-all"
                    >
                        <option value="ataque">ATAQUE</option>
                        <option value="defensa">DEFENSA</option>
                        <option value="reconocimiento">RECONOCIMIENTO</option>
                        <option value="estabilidad">ESTABILIDAD</option>
                    </select>
                </div>
                {checklist.length > 0 ? (
                    <div className="space-y-3">
                        {checklist.map((item, idx) => (
                            <div key={idx} className="flex items-start group">
                                <span className="w-5 h-5 rounded-lg bg-emerald-950 text-emerald-400 flex items-center justify-center text-[9px] font-black mr-3 mt-0.5 border border-emerald-500/20 group-hover:bg-emerald-500 group-hover:text-white transition-colors uppercase">{idx + 1}</span>
                                <p className="text-[11px] text-gray-300 font-medium leading-tight group-hover:text-white transition-colors">{item}</p>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-6 bg-gray-900/40 rounded-xl border border-dashed border-gray-700">
                        <p className="text-[10px] text-gray-500 italic uppercase font-bold tracking-widest">Defina tipo de misión</p>
                    </div>
                )}
            </div>

            {/* Hotspots Section */}
            <div className="bg-gray-800/80 p-5 rounded-xl shadow-lg border border-gray-700/50 border-l-4 border-purple-500">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-sm font-bold text-purple-100 flex items-center">
                        <CrosshairsIcon className="w-5 h-5 mr-3 text-purple-400" />
                        Puntos Críticos (POL)
                    </h3>
                    {onRefreshHotspots && (
                        <button
                            onClick={onRefreshHotspots}
                            title="Actualizar Puntos Críticos"
                            className="p-1 hover:bg-purple-500/20 rounded text-purple-400/50 hover:text-purple-300 transition-colors"
                        >
                            <ArrowPathIcon className="w-4 h-4" />
                        </button>
                    )}
                </div>
                <div className="space-y-5">
                    {/* Current Hotspots */}
                    <div>
                        <p className="text-[9px] text-gray-500 uppercase font-black mb-3 tracking-widest flex items-center">
                            <span className="w-1.5 h-1.5 bg-red-500 rounded-full mr-2 animate-ping" />
                            Amenazas Actuales (24H)
                        </p>
                        {hotspots.length > 0 ? (
                            <div className="space-y-3">
                                {hotspots.map((hotspot, idx) => (
                                    <div key={idx} className="p-4 bg-purple-900/20 border border-purple-800/50 rounded-xl flex justify-between items-center group hover:bg-purple-900/30 transition-all">
                                        <div className="flex-1 mr-4">
                                            <p className="text-[11px] text-white font-bold leading-tight">{hotspot.description}</p>
                                            <div className="mt-2 flex items-center gap-3">
                                                <span className="text-[9px] text-purple-300 font-black uppercase tracking-tighter bg-purple-500/20 px-1.5 py-0.5 rounded italic">INTENSIDAD: {hotspot.intensity} REPORTE(S)</span>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => onSelectEntityOnMap && onSelectEntityOnMap({ type: MapEntityType.INTEL, id: 'hotspot-' + idx } as any)}
                                            className="p-2.5 bg-purple-800/50 hover:bg-purple-600 rounded-xl text-purple-300 hover:text-white transition-all border border-purple-600/50 shadow-inner active:scale-90"
                                            title="Localizar en Mapa"
                                        >
                                            <MapPinIcon className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-6 bg-purple-900/5 rounded-xl border border-dashed border-purple-900/30">
                                <p className="text-[10px] text-gray-600 italic font-bold uppercase tracking-widest">Zona bajo control</p>
                            </div>
                        )}
                    </div>

                    {/* Historical Trends */}
                    <div className="border-t border-gray-700 pt-4">
                        <p className="text-[9px] text-gray-500 uppercase font-black mb-3 tracking-widest flex items-center uppercase gap-2">
                            <ClockIcon className="w-3 h-3 text-gray-500" />
                            Series Históricas (48H)
                        </p>
                        {historicalHotspots.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                                {historicalHotspots.slice(0, 4).map((h, i) => (
                                    <div key={i} className="text-[9px] bg-gray-900 text-gray-400 font-bold px-3 py-1.5 rounded-lg border border-gray-800 italic flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 bg-purple-500 rounded-full" />
                                        SECTOR {i + 1}
                                    </div>
                                ))}
                                {historicalHotspots.length > 4 && (
                                    <div className="text-[9px] bg-purple-900/40 text-purple-300 font-black px-2 py-1.5 rounded-lg border border-purple-500/20">
                                        +{historicalHotspots.length - 4} ÁREAS
                                    </div>
                                )}
                            </div>
                        ) : (
                            <p className="text-[9px] text-gray-600 italic font-medium">Bajo volumen de datos para proyección histórica.</p>
                        )}
                    </div>
                </div>
            </div>

            {/* Feedback Toast */}
            {feedback && (
                <div className={`fixed bottom-6 right-6 p-4 rounded-2xl shadow-2xl text-white text-[11px] font-black animate-in slide-in-from-bottom border-t-2 z-[9999] flex items-center gap-3 backdrop-blur-md ${feedback.type === 'success' ? 'bg-emerald-900/90 border-emerald-400' : 'bg-red-900/90 border-red-400'}`}>
                    {feedback.type === 'success' ? <ShieldCheckIcon className="w-5 h-5" /> : <ExclamationTriangleIcon className="w-5 h-5" />}
                    {feedback.msg.toUpperCase()}
                </div>
            )}
        </div>
    );
};
