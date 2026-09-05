import React, { useEffect, useState } from 'react';
import { useAuth } from '../AuthContext';
import { SIGEP_API_URL } from '../apiConfig';

export default function Dashboard({ role }: { role: string }) {
  const [personnel, setPersonnel] = useState([]);
  const { user } = useAuth();

  useEffect(() => {
    fetch(`${SIGEP_API_URL}/personnel`, {
      headers: {
        'Authorization': `Bearer ${user.token}`
      }
    })
      .then(res => res.json())
      .then(data => setPersonnel(data))
      .catch(err => console.error(err));
  }, [user.token]);

  return (
    <div className="fade-in">
      <div className="glass-panel" style={{ padding: '2rem' }}>
        <h2 style={{ color: 'var(--text-primary)', marginBottom: '1.5rem', fontSize: '1.5rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.5rem' }}>
          {role === 'ROLE_EJERCITO' ? 'Estado Nacional de Personal (TOE vs Real)' : 
           role === 'ROLE_DIVISION' ? 'Mapa Regional de Efectivos' : 
           role === 'ROLE_BRIGADA' ? 'Matriz de Especialidades' : 'Ficha Digital y Parte Diario'}
        </h2>
        
        <div className="dashboard-grid">
          <div className="glass-panel kpi-card">
            <h3 className="kpi-title">Total Efectivos Activos</h3>
            <p className="kpi-value">{personnel.length || 0}</p>
          </div>
          <div className="glass-panel kpi-card success">
            <h3 className="kpi-title">Altas del Mes</h3>
            <p className="kpi-value">0</p>
          </div>
          <div className="glass-panel kpi-card danger">
            <h3 className="kpi-title">Traslados en Proceso</h3>
            <p className="kpi-value">0</p>
          </div>
        </div>

        <h3 style={{ color: 'var(--accent-cyan)', marginBottom: '1rem', marginTop: '2rem', fontSize: '1.2rem', textTransform: 'uppercase' }}>
          Catálogo de Efectivos
        </h3>
        
        <div className="data-table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>ID Militar</th>
                <th>Grado y Nombres</th>
                <th>Especialidad (MOS)</th>
                <th>Unidad Actual</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {personnel.map((p: any) => (
                <tr key={p.id}>
                  <td style={{ fontFamily: 'Orbitron', color: 'var(--accent-cyan)' }}>{p.id}</td>
                  <td style={{ fontWeight: 600 }}>{p.rank} {p.name}</td>
                  <td>{p.mosCode || 'N/A'}</td>
                  <td>{p.unitId}</td>
                  <td>
                    <span className={`badge ${p.status === 'ACTIVE' ? 'active' : 'transit'}`}>
                      {p.status}
                    </span>
                  </td>
                </tr>
              ))}
              {personnel.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
                    No hay efectivos registrados o no tiene permisos para verlos.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
