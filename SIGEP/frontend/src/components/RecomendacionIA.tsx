import React, { useState } from 'react';
import { Brain, Zap, ArrowRight, CheckCircle, FileText, ChevronDown, ChevronUp, ShieldAlert, Sparkles } from 'lucide-react';
import { useAuth } from '../AuthContext';
import { SIGEP_API_URL } from '../apiConfig';

export default function RecomendacionIA() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [analyzed, setAnalyzed] = useState(false);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  const runAIEngine = () => {
    setLoading(true);
    fetch(`${SIGEP_API_URL}/ai/recommend-transfers`, {
      headers: { 'Authorization': `Bearer ${user.token}` }
    })
      .then(res => res.json())
      .then(data => {
        setRecommendations(data);
        setAnalyzed(true);
        setLoading(false);
        // Expand first assessment by default if available
        if (data && data.length > 0 && data[0].tacticalAssessment) {
          setExpandedIndex(0);
        }
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  };

  if (user.role !== 'ROLE_EJERCITO' && user.role !== 'ROLE_ADMINISTRATOR') return null;

  return (
    <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '2rem', border: '1px solid var(--accent-cyan)', background: 'linear-gradient(45deg, rgba(0, 240, 255, 0.05) 0%, transparent 100%)', borderRadius: '10px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-cyan)', margin: 0, fontSize: '1.25rem' }}>
          <Brain size={24} /> Asesor Táctico de Traslados (IA Generativa & Doctrina G1/S1)
        </h3>
        {!analyzed ? (
          <button onClick={runAIEngine} disabled={loading} className="btn-primary" style={{ background: 'var(--accent-cyan)', color: 'black', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 'bold', padding: '0.6rem 1.2rem' }}>
            {loading ? 'Analizando Red Operacional...' : <><Zap size={16} /> Escanear Tropas y Requerimientos</>}
          </button>
        ) : (
          <button onClick={runAIEngine} disabled={loading} style={{ background: 'transparent', border: '1px solid var(--accent-cyan)', color: 'var(--accent-cyan)', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', padding: '0.4rem 0.8rem', borderRadius: '4px', cursor: 'pointer' }}>
            <Zap size={14} /> Re-ejecutar Análisis
          </button>
        )}
      </div>

      {loading && (
        <div style={{ marginTop: '1.5rem', color: 'var(--accent-cyan)', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div className="spinner" style={{ width: '22px', height: '22px', border: '2px solid transparent', borderTopColor: 'var(--accent-cyan)', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
          <span>Procesando cruzamiento táctico de TOE, Sanidad y redactando Apreciación de Situación con IA...</span>
        </div>
      )}

      {analyzed && (
        <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
          <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '0.92rem' }}>
            El motor de Inteligencia Artificial ha cruzado requerimientos de personal, sanidad física y permanencia en puesto, emitiendo las siguientes recomendaciones de empleo táctico:
          </p>
          
          {recommendations.length === 0 ? (
            <div style={{ padding: '1.2rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', textAlign: 'center', color: 'var(--text-secondary)' }}>
              No se detectaron desbalances críticos inmediatos que requieran rotación forzada.
            </div>
          ) : (
            recommendations.map((rec, i) => (
              <div key={i} style={{ padding: '1.2rem', background: 'rgba(0, 240, 255, 0.04)', borderRadius: '8px', borderLeft: '4px solid var(--accent-cyan)', border: '1px solid rgba(0, 240, 255, 0.15)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '10px' }}>
                  <span style={{ fontWeight: 'bold', color: 'var(--text-primary)', fontSize: '1rem' }}>
                    {rec.soldier.rank} {rec.soldier.name} (ID: {rec.soldier.id})
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--alert-warning)', fontWeight: 'bold', fontSize: '0.9rem' }}>
                    <span>{rec.sourceUnit}</span>
                    <ArrowRight size={16} />
                    <span style={{ color: 'var(--accent-cyan)' }}>{rec.targetUnit}</span>
                  </div>
                </div>
                
                <div style={{ display: 'flex', gap: '10px', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '12px', flexWrap: 'wrap' }}>
                  <span style={{ background: 'rgba(255,255,255,0.08)', padding: '3px 10px', borderRadius: '12px' }}>Esp: {rec.soldier.moceCode}</span>
                  <span style={{ background: 'rgba(255,255,255,0.08)', padding: '3px 10px', borderRadius: '12px' }}>Curso: {rec.soldier.cursosCombate}</span>
                  <span style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', padding: '3px 10px', borderRadius: '12px', border: '1px solid rgba(16, 185, 129, 0.3)' }}>Sanidad: {rec.soldier.healthStatus || 'APTO'}</span>
                  <span style={{ background: 'rgba(255,255,255,0.08)', padding: '3px 10px', borderRadius: '12px' }}>Permanencia: {rec.soldier.timeInPosition} meses</span>
                </div>
                
                <p style={{ margin: '0 0 12px 0', fontSize: '0.9rem', color: 'var(--text-primary)', lineHeight: '1.4' }}>
                  {rec.reason}
                </p>

                {/* Apreciación Táctica Generativa (LLM / Fallback Doctrinal) */}
                {rec.tacticalAssessment && (
                  <div style={{ marginTop: '10px', marginBottom: '12px', background: 'rgba(15, 23, 42, 0.75)', borderRadius: '6px', border: '1px solid rgba(0, 240, 255, 0.25)', overflow: 'hidden' }}>
                    <div 
                      onClick={() => setExpandedIndex(expandedIndex === i ? null : i)}
                      style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'rgba(0, 240, 255, 0.08)', cursor: 'pointer' }}
                    >
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--accent-cyan)' }}>
                        <Sparkles size={15} /> Apreciación Táctica de Situación (G1/S1 - IA Generativa)
                      </span>
                      {expandedIndex === i ? <ChevronUp size={16} color="var(--accent-cyan)" /> : <ChevronDown size={16} color="var(--accent-cyan)" />}
                    </div>
                    {expandedIndex === i && (
                      <div style={{ padding: '12px', fontSize: '0.84rem', color: '#e2e8f0', whiteSpace: 'pre-wrap', lineHeight: '1.5', fontFamily: 'monospace', background: 'rgba(0,0,0,0.3)' }}>
                        {rec.tacticalAssessment}
                      </div>
                    )}
                  </div>
                )}
                
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
                  <button className="btn-primary" style={{ fontSize: '0.8rem', padding: '0.45rem 1rem' }}>
                    Generar Orden de Traslado
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
