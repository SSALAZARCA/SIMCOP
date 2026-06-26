import React, { useState } from 'react';
import { Brain, Zap, ArrowRight, CheckCircle } from 'lucide-react';
import { useAuth } from '../AuthContext';

export default function RecomendacionIA() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [analyzed, setAnalyzed] = useState(false);

  const runAIEngine = () => {
    setLoading(true);
    fetch(`http://localhost:4000/api/ai/recommend-transfers`, {
      headers: { 'Authorization': `Bearer ${user.token}` }
    })
      .then(res => res.json())
      .then(data => {
        setRecommendations(data);
        setAnalyzed(true);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  };

  if (user.role !== 'ROLE_EJERCITO' && user.role !== 'ROLE_ADMINISTRATOR') return null;

  return (
    <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '2rem', border: '1px solid var(--accent-cyan)', background: 'linear-gradient(45deg, rgba(0, 240, 255, 0.05) 0%, transparent 100%)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-cyan)', margin: 0 }}>
          <Brain size={24} /> Asesor Táctico de Traslados (IA)
        </h3>
        {!analyzed && (
          <button onClick={runAIEngine} disabled={loading} className="btn-primary" style={{ background: 'var(--accent-cyan)', color: 'black', display: 'flex', alignItems: 'center', gap: '5px' }}>
            {loading ? 'Analizando Red Nacional...' : <><Zap size={16} /> Escanear Tropas y Déficits</>}
          </button>
        )}
      </div>

      {loading && (
        <div style={{ marginTop: '1.5rem', color: 'var(--accent-cyan)', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div className="spinner" style={{ width: '20px', height: '20px', border: '2px solid transparent', borderTopColor: 'var(--accent-cyan)', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
          Cruzando Datos de Sanidad, Especialidad y TOE Autorizado...
        </div>
      )}

      {analyzed && (
        <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <p style={{ color: 'var(--text-secondary)' }}>El motor de IA ha detectado oportunidades estratégicas para equilibrar las unidades sin afectar alertas amarillas:</p>
          
          {recommendations.map((rec, i) => (
            <div key={i} style={{ padding: '1rem', background: 'rgba(0, 240, 255, 0.05)', borderRadius: '8px', borderLeft: '4px solid var(--accent-cyan)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <span style={{ fontWeight: 'bold', color: 'var(--text-primary)' }}>{rec.soldier.rank} {rec.soldier.name} (ID: {rec.soldier.id})</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--alert-warning)', fontWeight: 'bold' }}>
                  {rec.sourceUnit} <ArrowRight size={16} /> {rec.targetUnit}
                </div>
              </div>
              
              <div style={{ display: 'flex', gap: '15px', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '10px' }}>
                <span style={{ background: 'rgba(255,255,255,0.1)', padding: '2px 8px', borderRadius: '12px' }}>Esp: {rec.soldier.moceCode}</span>
                <span style={{ background: 'rgba(255,255,255,0.1)', padding: '2px 8px', borderRadius: '12px' }}>Curso: {rec.soldier.cursosCombate}</span>
                <span style={{ background: 'rgba(16, 185, 129, 0.2)', color: '#10b981', padding: '2px 8px', borderRadius: '12px' }}>Sanidad: {rec.soldier.healthStatus}</span>
              </div>
              
              <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-primary)' }}>{rec.reason}</p>
              
              <button className="btn-primary" style={{ marginTop: '10px', fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}>
                Generar Orden de Traslado
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
