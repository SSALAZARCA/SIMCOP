import React, { useState, useEffect } from 'react';
import { useAuth } from '../AuthContext';
import { SIGEP_API_URL } from '../apiConfig';
import { Users, ArrowRight, Check, X } from 'lucide-react';
import RecomendacionIA from './RecomendacionIA';

export default function TrasladoSuboficiales({ unitId, role }: { unitId: string, role: string }) {
  const { user } = useAuth();
  const [transfers, setTransfers] = useState<any[]>([]);
  const [formData, setFormData] = useState({ soldierId: '', destinationUnitId: '' });
  const [loading, setLoading] = useState(false);

  const fetchTransfers = () => {
    fetch(`${SIGEP_API_URL}/transfers?rankCategory=SUBOFICIAL`, {
      headers: { 'Authorization': `Bearer ${user.token}` }
    })
      .then(res => res.json())
      .then(data => setTransfers(data))
      .catch(console.error);
  };

  useEffect(() => {
    fetchTransfers();
  }, [user.token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await fetch(`${SIGEP_API_URL}/transfers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`
        },
        body: JSON.stringify({
          soldierId: formData.soldierId,
          soldierName: 'Suboficial ' + formData.soldierId,
          rankCategory: 'SUBOFICIAL',
          originUnitId: unitId,
          destinationUnitId: formData.destinationUnitId,
          impactLevel: 'MEDIO'
        })
      });
      setFormData({ soldierId: '', destinationUnitId: '' });
      fetchTransfers();
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const updateStatus = async (id: string, newStatus: string) => {
    await fetch(`${SIGEP_API_URL}/transfers/${id}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${user.token}`
      },
      body: JSON.stringify({ status: newStatus })
    });
    fetchTransfers();
  };

  return (
    <div className="fade-in" style={{ padding: '2rem' }}>
      <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '2rem', marginBottom: '2rem', color: 'var(--text-primary)' }}>
        <Users size={32} color="var(--accent-cyan)" />
        Gestión de Mandos Medios (Suboficiales)
      </h2>

      <RecomendacionIA />

      <div className="glass-panel" style={{ padding: '2rem', marginBottom: '2rem', borderTop: '4px solid #a855f7' }}>
        <h3 style={{ color: 'var(--text-secondary)', marginBottom: '1rem', textTransform: 'uppercase' }}>Movimiento Operacional</h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '2rem' }}>
          El traslado de Suboficiales puede ser aprobado a nivel División o Brigada dependiendo de la especialidad (MOS). Jurisdicción: <strong>{unitId}</strong>.
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1.5rem', alignItems: 'end' }}>
          <div>
            <label className="form-label">ID del Suboficial</label>
            <input required type="text" className="form-control" placeholder="Ej. SU-1928" value={formData.soldierId} onChange={e => setFormData({...formData, soldierId: e.target.value})} />
          </div>
          <div>
            <label className="form-label">Unidad Destino</label>
            <input required type="text" className="form-control" placeholder="Ej. BAEEV4" value={formData.destinationUnitId} onChange={e => setFormData({...formData, destinationUnitId: e.target.value})} />
          </div>
          <div>
            <button disabled={loading} type="submit" className="btn-primary" style={{ width: '100%', background: 'rgba(168, 85, 247, 0.1)', borderColor: '#a855f7', color: '#a855f7' }}>
              {loading ? 'Procesando...' : <>Proponer Traslado a B1 <ArrowRight size={16} style={{ display: 'inline', marginLeft: '5px' }} /></>}
            </button>
          </div>
        </form>
      </div>

      <div className="glass-panel" style={{ padding: '2rem' }}>
        <h3 style={{ color: 'var(--text-secondary)', marginBottom: '1rem', textTransform: 'uppercase' }}>Workflow Activo ({unitId})</h3>
        <table className="data-table">
          <thead>
            <tr>
              <th>Fecha Solicitud</th>
              <th>ID Suboficial</th>
              <th>Destino</th>
              <th>Validación TOE</th>
              <th>Estado Comando</th>
              <th>Acción</th>
            </tr>
          </thead>
          <tbody>
            {transfers.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                  No hay traslados de suboficiales pendientes en su jurisdicción.
                </td>
              </tr>
            ) : (
              transfers.map(t => (
                <tr key={t.id}>
                  <td>{new Date(t.createdAt).toLocaleDateString()}</td>
                  <td>{t.soldierId}</td>
                  <td>{t.destinationUnitId}</td>
                  <td style={{ color: 'var(--accent-cyan)' }}>Verificado</td>
                  <td style={{ 
                    color: t.status === 'APPROVED' ? 'var(--alert-success)' : 
                           t.status === 'REJECTED' ? 'var(--alert-danger)' : 'var(--alert-warning)' 
                  }}>{t.status}</td>
                  <td>
                    {(role === 'ROLE_EJERCITO' || role === 'ROLE_DIVISION') && t.status === 'PENDING_APPROVAL' && (
                      <div style={{ display: 'flex', gap: '5px' }}>
                        <button onClick={() => updateStatus(t.id, 'APPROVED')} className="btn-primary" style={{ padding: '0.2rem', background: 'var(--alert-success)' }} title="Aprobar"><Check size={16}/></button>
                        <button onClick={() => updateStatus(t.id, 'REJECTED')} className="btn-primary" style={{ padding: '0.2rem', background: 'var(--alert-danger)' }} title="Rechazar"><X size={16}/></button>
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
