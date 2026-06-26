import React, { useState, useEffect } from 'react';
import { useAuth } from '../AuthContext';
import { ShieldAlert, AlertTriangle, Info, Download } from 'lucide-react';

export default function Recomendaciones({ unitId, role }: { unitId: string, role: string }) {
  const { user } = useAuth();
  const [alertas, setAlertas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // 1. Cargar Parámetros Dinámicos (Protegido por trycatch)
        let CRITICAL = 85;
        let WARNING = 95;
        try {
          const resParams = await fetch('http://localhost:4000/api/parameters', {
            headers: { 'Authorization': `Bearer ${user.token}` }
          });
          if (resParams.ok) {
            const params = await resParams.json();
            CRITICAL = parseInt(params.CRITICAL_DEFICIT_THRESHOLD || '85');
            WARNING = parseInt(params.WARNING_DEFICIT_THRESHOLD || '95');
          }
        } catch (e) {
          console.warn("No se pudo cargar parámetros dinámicos, usando defaults");
        }

        // 2. Buscar el TOE real para generar alertas
        const resToe = await fetch('http://localhost:4000/api/analysis/toe-balance/' + unitId, {
          headers: { 'Authorization': `Bearer ${user.token}` }
        });
        
        if (resToe.ok) {
          const data = await resToe.json();
          const nuevasAlertas: any[] = [];
          
          // data es List<ToeBalanceDTO> (mosCode, required, actual)
          data.forEach((u: any) => {
            if (u.required > 0) {
              const porcentaje = (u.actual / u.required) * 100;
              if (porcentaje < CRITICAL) {
                nuevasAlertas.push({ tipo: 'CRÍTICO', mensaje: `Déficit crítico del ${(100 - porcentaje).toFixed(1)}% en especialidad ${u.mosCode}. Se superó el umbral configurado de alerta roja (< ${CRITICAL}%).`, impacto: 'Alto' });
              } else if (porcentaje < WARNING) {
                nuevasAlertas.push({ tipo: 'ADVERTENCIA', mensaje: `Capacidad mermada (${porcentaje.toFixed(1)}%) en especialidad ${u.mosCode}. Límite doctrinal fijado en ${WARNING}%.`, impacto: 'Medio' });
              } else if (porcentaje >= 100) {
                nuevasAlertas.push({ tipo: 'INFO', mensaje: `Niveles óptimos (o superávit) en especialidad ${u.mosCode}. Capacidad de apoyo a otras unidades.`, impacto: 'Bajo' });
              }
            }
          });
          setAlertas(nuevasAlertas);
        }
      } catch (err) {
        console.error("Error en motor de recomendaciones:", err);
      } finally {
        setLoading(false);
      }
    };
    
    if (user && user.token) {
      fetchData();
    } else {
      setLoading(false);
    }
  }, [user, unitId]);

  return (
    <div className="fade-in" style={{ padding: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '2rem', color: 'var(--text-primary)' }}>
          <AlertTriangle size={32} color="var(--alert-danger)" />
          Motor de Recomendaciones (AI Assist)
        </h2>
        <button className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <Download size={16} /> Exportar
        </button>
      </div>

      <div style={{ display: 'grid', gap: '1.5rem' }}>
        {loading ? (
           <div style={{ color: 'var(--accent-cyan)' }}>Calculando inteligencia de fuerza en vivo...</div>
        ) : alertas.length === 0 ? (
           <div style={{ color: 'var(--text-secondary)' }}>No se detectaron anomalías en el pie de fuerza actual de su jurisdicción.</div>
        ) : alertas.map((alerta, i) => (
          <div key={i} className="glass-panel" style={{ padding: '1.5rem', display: 'flex', gap: '1.5rem', alignItems: 'flex-start', borderLeft: `4px solid ${alerta.tipo === 'CRÍTICO' ? 'var(--alert-danger)' : alerta.tipo === 'ADVERTENCIA' ? 'var(--alert-warning)' : 'var(--accent-cyan)'}` }}>
            {alerta.tipo === 'CRÍTICO' ? <ShieldAlert size={32} color="var(--alert-danger)" /> : alerta.tipo === 'ADVERTENCIA' ? <AlertTriangle size={32} color="var(--alert-warning)" /> : <Info size={32} color="var(--accent-cyan)" />}
            <div>
              <h4 style={{ color: alerta.tipo === 'CRÍTICO' ? 'var(--alert-danger)' : alerta.tipo === 'ADVERTENCIA' ? 'var(--alert-warning)' : 'var(--accent-cyan)', margin: '0 0 0.5rem 0' }}>
                {alerta.tipo} - IMPACTO: {alerta.impacto}
              </h4>
              <p style={{ color: 'var(--text-primary)', margin: 0, fontSize: '1.1rem', lineHeight: '1.5' }}>
                {alerta.mensaje}
              </p>
              <div style={{ marginTop: '1rem', display: 'flex', gap: '1rem' }}>
                <button className="btn-primary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}>Aplicar Acción Sugerida</button>
                <button className="btn-primary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', background: 'transparent', border: 'none', color: 'var(--text-secondary)' }}>Ignorar</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
