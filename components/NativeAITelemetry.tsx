import React, { useState, useEffect } from 'react';
import { Activity, Clock, Cpu, CheckCircle, Thermometer, Database, Zap } from 'lucide-react';

interface TelemetryData {
    status: string;
    model_backend: string;
    model_loaded: boolean;
    model_path?: string;
    gpu_available: boolean;
    gpu_name: string | null;
    gpu_temperature_c: number | null;
    vram_used_mb: number | null;
    vram_total_mb: number | null;
    uptime_seconds: number;
    total_queries_processed: number;
    last_inference_latency_ms: number;
    tokens_per_second: number;
    average_confidence_score: number;
    active_modules: string[];
    active_models?: string[];
}

interface NativeAITelemetryProps {
    endpoint: string;
}

const BACKEND_LABELS: Record<string, { label: string; color: string; icon: string }> = {
    llama_cpp:  { label: 'GGUF · llama.cpp', color: '#10b981', icon: '🧠' },
    onnx:       { label: 'ONNX · runtime',   color: '#38bdf8', icon: '⚡' },
    heuristic:  { label: 'Heurístico',        color: '#f59e0b', icon: '📐' },
};

const tempColor = (t: number | null): string => {
    if (t === null) return '#64748b';
    if (t < 60)  return '#10b981';
    if (t < 80)  return '#f59e0b';
    return '#ef4444';
};

const NativeAITelemetry: React.FC<NativeAITelemetryProps> = ({ endpoint }) => {
    const [kpis, setKpis] = useState<TelemetryData | null>(null);
    const [error, setError] = useState<boolean>(false);

    useEffect(() => {
        const fetchKpis = async () => {
            try {
                const baseUrl = endpoint.endsWith('/') ? endpoint.slice(0, -1) : endpoint;
                const response = await fetch(`${baseUrl}/api/v1/system/kpis`);
                if (!response.ok) throw new Error('Network error');
                const data = await response.json();
                setKpis(data);
                setError(false);
            } catch (err) {
                console.error('Error leyendo telemetría de IA Nativa:', err);
                setError(true);
            }
        };
        fetchKpis();
        const interval = setInterval(fetchKpis, 5000);
        return () => clearInterval(interval);
    }, [endpoint]);

    if (error) {
        return (
            <div style={{ marginTop: '1.5rem', backgroundColor: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', padding: '1.5rem', color: '#f87171', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <Activity size={24} className="animate-pulse" />
                <div>
                    <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>Error de Telemetría</h4>
                    <p style={{ margin: 0, fontSize: '0.875rem', opacity: 0.8 }}>No se pudo conectar al endpoint: {endpoint}</p>
                </div>
            </div>
        );
    }

    if (!kpis) {
        return (
            <div style={{ marginTop: '1.5rem', backgroundColor: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: '8px', padding: '1.5rem', color: '#a7f3d0', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <Activity size={24} className="animate-spin" />
                <span>Estableciendo enlace con Motor IA...</span>
            </div>
        );
    }

    const backendInfo = BACKEND_LABELS[kpis.model_backend] ?? { label: kpis.model_backend, color: '#94a3b8', icon: '?' };
    const modules = kpis.active_modules ?? kpis.active_models ?? [];

    return (
        <div style={{ marginTop: '1.5rem', background: 'linear-gradient(180deg, rgba(15,23,42,0.8) 0%, rgba(2,6,23,0.9) 100%)', border: '1px solid #1e293b', boxShadow: '0 4px 20px -2px rgba(16,185,129,0.15)', borderRadius: '12px', padding: '1.5rem', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, right: 0, width: '150px', height: '150px', background: 'radial-gradient(circle, rgba(16,185,129,0.1) 0%, rgba(0,0,0,0) 70%)', pointerEvents: 'none' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem', borderBottom: '1px solid #334155', paddingBottom: '0.75rem' }}>
                <Activity size={20} color="#10b981" />
                <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#f8fafc', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    HUD Telemetría — Motor IA
                </h3>
                <span style={{ fontSize: '0.75rem', color: backendInfo.color, backgroundColor: `${backendInfo.color}1a`, padding: '4px 10px', borderRadius: '999px', border: `1px solid ${backendInfo.color}4d`, fontWeight: 600 }}>
                    {backendInfo.icon} {backendInfo.label}
                </span>
                <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', color: '#34d399', backgroundColor: 'rgba(16,185,129,0.1)', padding: '4px 8px', borderRadius: '999px', border: '1px solid rgba(52,211,153,0.3)' }}>
                    <span style={{ width: '8px', height: '8px', backgroundColor: '#34d399', borderRadius: '50%', display: 'inline-block' }} />
                    {kpis.status.toUpperCase()}
                </span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1rem' }}>
                <div style={{ backgroundColor: '#0f172a', padding: '1rem', borderRadius: '8px', border: '1px solid #1e293b' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#94a3b8', fontSize: '0.75rem', marginBottom: '0.5rem', textTransform: 'uppercase' }}><Clock size={14} /> Latencia IA</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: kpis.last_inference_latency_ms < 2000 ? '#10b981' : '#fbbf24' }}>
                        {kpis.last_inference_latency_ms.toFixed(0)} <span style={{ fontSize: '0.875rem', color: '#64748b', fontWeight: 'normal' }}>ms</span>
                    </div>
                </div>
                <div style={{ backgroundColor: '#0f172a', padding: '1rem', borderRadius: '8px', border: '1px solid #1e293b' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#94a3b8', fontSize: '0.75rem', marginBottom: '0.5rem', textTransform: 'uppercase' }}><Zap size={14} /> Tokens/s</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: kpis.tokens_per_second > 0 ? '#38bdf8' : '#64748b' }}>
                        {kpis.tokens_per_second > 0 ? kpis.tokens_per_second.toFixed(1) : '—'}
                        {kpis.tokens_per_second > 0 && <span style={{ fontSize: '0.875rem', color: '#64748b', fontWeight: 'normal' }}> t/s</span>}
                    </div>
                </div>
                <div style={{ backgroundColor: '#0f172a', padding: '1rem', borderRadius: '8px', border: '1px solid #1e293b' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#94a3b8', fontSize: '0.75rem', marginBottom: '0.5rem', textTransform: 'uppercase' }}><CheckCircle size={14} /> Confianza</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: kpis.average_confidence_score > 90 ? '#10b981' : '#38bdf8' }}>
                        {kpis.average_confidence_score.toFixed(1)} <span style={{ fontSize: '0.875rem', color: '#64748b', fontWeight: 'normal' }}>%</span>
                    </div>
                </div>
                <div style={{ backgroundColor: '#0f172a', padding: '1rem', borderRadius: '8px', border: '1px solid #1e293b' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#94a3b8', fontSize: '0.75rem', marginBottom: '0.5rem', textTransform: 'uppercase' }}><Cpu size={14} /> Consultas</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#f8fafc' }}>{kpis.total_queries_processed}</div>
                </div>
                <div style={{ backgroundColor: '#0f172a', padding: '1rem', borderRadius: '8px', border: '1px solid #1e293b' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#94a3b8', fontSize: '0.75rem', marginBottom: '0.5rem', textTransform: 'uppercase' }}><Thermometer size={14} /> Temp. GPU</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: tempColor(kpis.gpu_temperature_c) }}>
                        {kpis.gpu_temperature_c !== null ? `${kpis.gpu_temperature_c}C` : 'CPU'}
                    </div>
                </div>
                <div style={{ backgroundColor: '#0f172a', padding: '1rem', borderRadius: '8px', border: '1px solid #1e293b' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#94a3b8', fontSize: '0.75rem', marginBottom: '0.5rem', textTransform: 'uppercase' }}><Database size={14} /> VRAM</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#f8fafc' }}>
                        {kpis.vram_used_mb !== null
                            ? <>{kpis.vram_used_mb} <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 'normal' }}>/ {kpis.vram_total_mb} MB</span></>
                            : <span style={{ fontSize: '0.875rem', color: '#64748b' }}>N/A (CPU)</span>
                        }
                    </div>
                </div>
                <div style={{ backgroundColor: '#0f172a', padding: '1rem', borderRadius: '8px', border: '1px solid #1e293b' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#94a3b8', fontSize: '0.75rem', marginBottom: '0.5rem', textTransform: 'uppercase' }}><Activity size={14} /> Uptime</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#f8fafc' }}>
                        {Math.floor(kpis.uptime_seconds / 60)} <span style={{ fontSize: '0.875rem', color: '#64748b', fontWeight: 'normal' }}>min</span>
                    </div>
                </div>
            </div>
            <div style={{ marginTop: '1rem', fontSize: '0.75rem', color: '#64748b', display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
                <strong style={{ color: '#94a3b8' }}>Modulos activos:</strong>
                {modules.map((mod, i) => (
                    <span key={i} style={{ backgroundColor: 'rgba(56,189,248,0.1)', color: '#38bdf8', padding: '2px 6px', borderRadius: '4px' }}>{mod}</span>
                ))}
            </div>
        </div>
    );
};

export default NativeAITelemetry;
