import React, { useState, useEffect } from 'react';
import { Activity, Clock, Cpu, CheckCircle } from 'lucide-react';

interface TelemetryData {
    status: string;
    uptime_seconds: number;
    total_queries_processed: number;
    last_inference_latency_ms: number;
    average_confidence_score: number;
    active_models: string[];
}

interface NativeAITelemetryProps {
    endpoint: string;
}

const NativeAITelemetry: React.FC<NativeAITelemetryProps> = ({ endpoint }) => {
    const [kpis, setKpis] = useState<TelemetryData | null>(null);
    const [error, setError] = useState<boolean>(false);

    useEffect(() => {
        const fetchKpis = async () => {
            try {
                // Determine base URL, removing trailing slash
                const baseUrl = endpoint.endsWith('/') ? endpoint.slice(0, -1) : endpoint;
                const response = await fetch(`${baseUrl}/api/v1/system/kpis`);
                
                if (!response.ok) throw new Error("Network error");
                
                const data = await response.json();
                setKpis(data);
                setError(false);
            } catch (err) {
                console.error("Error leyendo telemetría de IA Nativa:", err);
                setError(true);
            }
        };

        // Fetch immediately and then poll every 5 seconds
        fetchKpis();
        const interval = setInterval(fetchKpis, 5000);
        return () => clearInterval(interval);
    }, [endpoint]);

    if (error) {
        return (
            <div style={{
                marginTop: '1.5rem',
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: '8px',
                padding: '1.5rem',
                color: '#f87171',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
            }}>
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
            <div style={{
                marginTop: '1.5rem',
                backgroundColor: 'rgba(16, 185, 129, 0.05)',
                border: '1px solid rgba(16, 185, 129, 0.2)',
                borderRadius: '8px',
                padding: '1.5rem',
                color: '#a7f3d0',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
            }}>
                <Activity size={24} className="animate-spin" />
                <span>Estableciendo enlace de telemetría con Motor INT8...</span>
            </div>
        );
    }

    return (
        <div style={{
            marginTop: '1.5rem',
            background: 'linear-gradient(180deg, rgba(15, 23, 42, 0.8) 0%, rgba(2, 6, 23, 0.9) 100%)',
            border: '1px solid #1e293b',
            boxShadow: '0 4px 20px -2px rgba(16, 185, 129, 0.15)',
            borderRadius: '12px',
            padding: '1.5rem',
            position: 'relative',
            overflow: 'hidden',
        }}>
            {/* Animated background pulse */}
            <div style={{
                position: 'absolute',
                top: 0,
                right: 0,
                width: '150px',
                height: '150px',
                background: 'radial-gradient(circle, rgba(16,185,129,0.1) 0%, rgba(0,0,0,0) 70%)',
                animation: 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                pointerEvents: 'none'
            }} />

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem', borderBottom: '1px solid #334155', paddingBottom: '0.75rem' }}>
                <Activity size={20} color="#10b981" />
                <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#f8fafc', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    HUD Telemetría - Motor INT8
                </h3>
                <span style={{ 
                    marginLeft: 'auto', 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '4px',
                    fontSize: '0.75rem',
                    color: '#34d399',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    padding: '4px 8px',
                    borderRadius: '999px',
                    border: '1px solid rgba(52, 211, 153, 0.3)'
                }}>
                    <span style={{ width: '8px', height: '8px', backgroundColor: '#34d399', borderRadius: '50%', display: 'inline-block' }} />
                    {kpis.status.toUpperCase()}
                </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem' }}>
                
                {/* Latency */}
                <div style={{ backgroundColor: '#0f172a', padding: '1rem', borderRadius: '8px', border: '1px solid #1e293b' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#94a3b8', fontSize: '0.75rem', marginBottom: '0.5rem', textTransform: 'uppercase' }}>
                        <Clock size={14} /> Latencia IA
                    </div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: kpis.last_inference_latency_ms < 1000 ? '#10b981' : '#fbbf24' }}>
                        {kpis.last_inference_latency_ms.toFixed(1)} <span style={{ fontSize: '0.875rem', color: '#64748b', fontWeight: 'normal' }}>ms</span>
                    </div>
                </div>

                {/* Confidence */}
                <div style={{ backgroundColor: '#0f172a', padding: '1rem', borderRadius: '8px', border: '1px solid #1e293b' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#94a3b8', fontSize: '0.75rem', marginBottom: '0.5rem', textTransform: 'uppercase' }}>
                        <CheckCircle size={14} /> Confianza
                    </div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: kpis.average_confidence_score > 90 ? '#10b981' : '#38bdf8' }}>
                        {kpis.average_confidence_score.toFixed(1)} <span style={{ fontSize: '0.875rem', color: '#64748b', fontWeight: 'normal' }}>%</span>
                    </div>
                </div>

                {/* Queries */}
                <div style={{ backgroundColor: '#0f172a', padding: '1rem', borderRadius: '8px', border: '1px solid #1e293b' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#94a3b8', fontSize: '0.75rem', marginBottom: '0.5rem', textTransform: 'uppercase' }}>
                        <Cpu size={14} /> Consultas
                    </div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#f8fafc' }}>
                        {kpis.total_queries_processed}
                    </div>
                </div>

                {/* Uptime */}
                <div style={{ backgroundColor: '#0f172a', padding: '1rem', borderRadius: '8px', border: '1px solid #1e293b' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#94a3b8', fontSize: '0.75rem', marginBottom: '0.5rem', textTransform: 'uppercase' }}>
                        <Activity size={14} /> Uptime
                    </div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#f8fafc' }}>
                        {Math.floor(kpis.uptime_seconds / 60)} <span style={{ fontSize: '0.875rem', color: '#64748b', fontWeight: 'normal' }}>Min</span>
                    </div>
                </div>

            </div>

            <div style={{ marginTop: '1rem', fontSize: '0.75rem', color: '#64748b', display: 'flex', gap: '1rem' }}>
                <strong>Modelos Activos en VRAM:</strong>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {kpis.active_models.map((mod, i) => (
                        <span key={i} style={{ backgroundColor: 'rgba(56, 189, 248, 0.1)', color: '#38bdf8', padding: '2px 6px', borderRadius: '4px' }}>
                            {mod}
                        </span>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default NativeAITelemetry;
