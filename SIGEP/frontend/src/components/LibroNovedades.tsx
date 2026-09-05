import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { SIGEP_API_URL } from '../apiConfig';

export default function LibroNovedades({ unitId, userToken, soldiers, onUpdate }: { unitId: string, userToken: string, soldiers: any[], onUpdate: () => void }) {
  const [novedades, setNovedades] = useState([]);
  const [formData, setFormData] = useState({
    soldierId: '',
    tipo: 'ALTA',
    descripcion: ''
  });

  const fetchNovedades = async () => {
    try {
      const res = await axios.get(`${SIGEP_API_URL}/personnel/unit/${unitId}/novedades`, {
        headers: { Authorization: `Bearer ${userToken}` }
      });
      setNovedades(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (unitId) fetchNovedades();
  }, [unitId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await axios.post(`${SIGEP_API_URL}/personnel/novedades`, {
        ...formData,
        unitId,
        registradoPor: 'S1/G1'
      }, {
        headers: { Authorization: `Bearer ${userToken}` }
      });
      setFormData({ soldierId: '', tipo: 'ALTA', descripcion: '' });
      fetchNovedades();
      onUpdate(); // Refrescar soldados
    } catch (err) {
      console.error(err);
      alert('Error registrando novedad');
    }
  };

  return (
    <div style={{ padding: '1rem' }}>
      <h3 style={{ color: 'var(--accent-cyan)', marginBottom: '1rem' }}>Libro de Novedades Diario</h3>
      
      <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
        <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '1rem', alignItems: 'end' }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Soldado</label>
            <select required value={formData.soldierId} onChange={e => setFormData({...formData, soldierId: e.target.value})} style={{ width: '100%', padding: '0.8rem', background: 'rgba(0,0,0,0.5)', border: '1px solid var(--glass-border)', color: 'white', borderRadius: '4px' }}>
              <option value="">Seleccione Soldado...</option>
              {soldiers.map(s => <option key={s.id} value={s.id}>{s.rank} {s.name} - {s.id}</option>)}
            </select>
          </div>
          
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Tipo de Novedad</label>
            <select required value={formData.tipo} onChange={e => setFormData({...formData, tipo: e.target.value})} style={{ width: '100%', padding: '0.8rem', background: 'rgba(0,0,0,0.5)', border: '1px solid var(--glass-border)', color: 'white', borderRadius: '4px' }}>
              <option value="ALTA">Alta / Incorporación</option>
              <option value="BAJA">Baja / Retiro</option>
              <option value="PERMISO">Permiso Regular</option>
              <option value="VACACIONES">Vacaciones</option>
              <option value="LICENCIA_MEDICA">Licencia Médica</option>
              <option value="SANCION_DISCIPLINARIA">Sanción Disciplinaria</option>
              <option value="TRASLADO">Traslado a otra unidad</option>
            </select>
          </div>
          
          <div style={{ flex: 2 }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Descripción / Justificación</label>
            <input required type="text" value={formData.descripcion} onChange={e => setFormData({...formData, descripcion: e.target.value})} placeholder="Detalles de la novedad..." style={{ width: '100%', padding: '0.8rem', background: 'rgba(0,0,0,0.5)', border: '1px solid var(--glass-border)', color: 'white', borderRadius: '4px' }} />
          </div>
          
          <button type="submit" className="btn-primary" style={{ padding: '0.8rem 2rem', height: '45px' }}>Registrar</button>
        </form>
      </div>

      <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', color: 'var(--text-primary)' }}>
          <thead>
            <tr style={{ background: 'rgba(255,255,255,0.05)', textAlign: 'left' }}>
              <th style={{ padding: '1rem', borderBottom: '1px solid var(--glass-border)' }}>Fecha</th>
              <th style={{ padding: '1rem', borderBottom: '1px solid var(--glass-border)' }}>Soldado ID</th>
              <th style={{ padding: '1rem', borderBottom: '1px solid var(--glass-border)' }}>Tipo</th>
              <th style={{ padding: '1rem', borderBottom: '1px solid var(--glass-border)' }}>Descripción</th>
            </tr>
          </thead>
          <tbody>
            {novedades.map((n: any) => (
              <tr key={n.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <td style={{ padding: '1rem' }}>{new Date(n.fecha).toLocaleString()}</td>
                <td style={{ padding: '1rem' }}>{n.soldierId}</td>
                <td style={{ padding: '1rem' }}>
                  <span style={{ 
                    padding: '0.3rem 0.6rem', borderRadius: '4px', fontSize: '0.8rem',
                    background: n.tipo === 'ALTA' ? 'rgba(16,185,129,0.2)' : n.tipo === 'BAJA' ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.1)',
                    color: n.tipo === 'ALTA' ? '#10b981' : n.tipo === 'BAJA' ? '#ef4444' : '#fff'
                  }}>
                    {n.tipo}
                  </span>
                </td>
                <td style={{ padding: '1rem' }}>{n.descripcion}</td>
              </tr>
            ))}
            {novedades.length === 0 && (
              <tr><td colSpan={4} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>No hay novedades registradas en esta unidad.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
