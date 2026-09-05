import React, { useState, useEffect } from 'react';
import { useAuth } from '../AuthContext';
import { SIGEP_API_URL } from '../apiConfig';
import { Users, ShieldAlert, Activity, ArrowRightLeft, TrendingDown, Target, FileText } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

export default function DashboardNacional({ unitId, role }: { unitId: string, role: string }) {
  const { user } = useAuth();
  const [toeData, setToeData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${SIGEP_API_URL}/analysis/toe`, {
      headers: {
        'Authorization': `Bearer ${user.token}`
      }
    })
      .then(res => res.json())
      .then(data => {
        setToeData(data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, [user.token]);

  const totalToe = toeData.reduce((acc, curr) => acc + curr.TOE, 0);
  const totalReal = toeData.reduce((acc, curr) => acc + curr.Real, 0);
  const totalDeficit = totalReal - totalToe;

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* Header Panel */}
      <div className="glass-panel" style={{ padding: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'linear-gradient(135deg, rgba(20, 30, 48, 0.9) 0%, rgba(36, 59, 85, 0.9) 100%)' }}>
        <div>
          <h2 style={{ color: 'var(--accent-cyan)', fontSize: '2rem', margin: 0, textTransform: 'uppercase', letterSpacing: '2px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Activity size={32} />
            Módulo de Análisis TOE ({unitId})
          </h2>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem', fontSize: '1.1rem' }}>
            Sincronizado en tiempo real con la base de datos táctica de SIMCOP
          </p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: 'var(--text-primary)', fontFamily: 'Orbitron' }}>
            {loading ? 'Sincronizando...' : totalReal.toLocaleString()}
          </div>
          <div style={{ color: 'var(--alert-warning)', display: 'flex', alignItems: 'center', gap: '5px', justifyContent: 'flex-end' }}>
            <TrendingDown size={18} /> Déficit Total: {totalDeficit.toLocaleString()}
          </div>
        </div>
      </div>

      {/* KPI Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.5rem' }}>
        <div className="glass-panel" style={{ padding: '1.5rem', borderTop: '4px solid var(--accent-cyan)' }}>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', textTransform: 'uppercase' }}>Fuerza Autorizada (TOE SIMCOP)</p>
          <h3 style={{ fontSize: '2rem', margin: '0.5rem 0', fontFamily: 'Orbitron' }}>{totalToe.toLocaleString()}</h3>
        </div>
        <div className="glass-panel" style={{ padding: '1.5rem', borderTop: '4px solid #a855f7' }}>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', textTransform: 'uppercase' }}>Fuerza Física Real (SIGEP)</p>
          <h3 style={{ fontSize: '2rem', margin: '0.5rem 0', fontFamily: 'Orbitron' }}>{totalReal.toLocaleString()}</h3>
        </div>
        <div className="glass-panel" style={{ padding: '1.5rem', borderTop: '4px solid var(--alert-warning)' }}>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', textTransform: 'uppercase' }}>Ocupación de Plantilla</p>
          <h3 style={{ fontSize: '2rem', margin: '0.5rem 0', fontFamily: 'Orbitron' }}>
            {totalToe > 0 ? ((totalReal / totalToe) * 100).toFixed(1) : 0}%
          </h3>
        </div>
        <div className="glass-panel" style={{ padding: '1.5rem', borderTop: '4px solid var(--alert-danger)' }}>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', textTransform: 'uppercase' }}>Unidades Sincronizadas</p>
          <h3 style={{ fontSize: '2rem', margin: '0.5rem 0', fontFamily: 'Orbitron', color: 'var(--alert-success)' }}>
            {toeData.length}
          </h3>
        </div>
      </div>

      {/* TOE Comparison Chart */}
      <div className="glass-panel" style={{ padding: '2rem' }}>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '2rem', color: 'var(--text-primary)' }}>
          <Target size={24} color="var(--accent-cyan)" />
          Análisis de Capacidad por Unidad (Live API)
        </h3>
        <div style={{ height: '400px' }}>
          {loading ? (
            <div style={{ display: 'flex', height: '100%', justifyContent: 'center', alignItems: 'center', color: 'var(--accent-cyan)' }}>
              Descargando unidades desde SIMCOP...
            </div>
          ) : toeData.length === 0 ? (
            <div style={{ display: 'flex', height: '100%', justifyContent: 'center', alignItems: 'center', color: 'var(--alert-warning)' }}>
              No se encontraron unidades en SIMCOP para su jurisdicción ({unitId}).
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={toeData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis dataKey="name" stroke="var(--text-secondary)" tick={{fontSize: 12}} />
                <YAxis stroke="var(--text-secondary)" />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'rgba(10, 15, 30, 0.9)', borderColor: 'var(--accent-cyan)', borderRadius: '8px' }}
                  itemStyle={{ color: 'var(--text-primary)' }}
                />
                <Legend />
                <Bar dataKey="TOE" name="Autorizado (SIMCOP)" fill="rgba(255,255,255,0.2)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Real" name="Físico (SIGEP)" fill="var(--accent-cyan)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}
