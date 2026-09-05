import React, { useState, useEffect } from 'react';
import { useAuth } from '../AuthContext';
import { SIGEP_API_URL } from '../apiConfig';
import { Target, CheckCircle2, Check, X } from 'lucide-react';
import RecomendacionIA from './RecomendacionIA';

export default function TrasladoSoldados({ unitId, role }: { unitId: string, role: string }) {
  const { user } = useAuth();
  const [transfers, setTransfers] = useState<any[]>([]);
  const [formData, setFormData] = useState({ soldierId: 'LOTE-', destinationUnitId: '', volume: 'escuadra' });
  const [loading, setLoading] = useState(false);

  const fetchTransfers = () => {
    fetch(`${SIGEP_API_URL}/transfers?rankCategory=SOLDADO`, {
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
          soldierId: formData.soldierId + '-' + Date.now().toString().slice(-4), // Simula un Lote ID único
          soldierName: 'Relevo ' + formData.volume,
          rankCategory: 'SOLDADO',
          originUnitId: unitId,
          destinationUnitId: formData.destinationUnitId,
          impactLevel: formData.volume === 'peloton' ? 'ALTO' : 'MEDIO'
        })
      });
      setFormData({ ...formData, soldierId: 'LOTE-', destinationUnitId: '' });
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
        <Target size={32} color="#10b981" />
        Gestión de Base (Soldados)
      </h2>

      <RecomendacionIA />

      <div className="glass-panel" style={{ padding: '2rem', marginBottom: '2rem', borderTop: '4px solid #10b981' }}>
        <h3 style={{ color: 'var(--text-secondary)', marginBottom: '1rem', textTransform: 'uppercase' }}>Movimientos Masivos / Relevos</h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '2rem' }}>
          Gestione rotaciones de escuadras o pelotones enteros. Jurisdicción: <strong>{unitId}</strong>.
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1.5rem', alignItems: 'end' }}>
          <div>
            <label className="form-label">Tipo de Movimiento</label>
            <select className="form-control" value={formData.volume} onChange={e => setFormData({...formData, volume: e.target.value})}>
              <option value="individual">Soldado Individual</option>
              <option value="escuadra">Escuadra (10 hombres)</option>
              <option value="peloton">Pelotón (30-40 hombres)</option>
            </select>
          </div>
          <div>
            <label className="form-label">Unidad Receptora (Destino)</label>
            <input required type="text" className="form-control" placeholder="Ej. BAEEV4" value={formData.destinationUnitId} onChange={e => setFormData({...formData, destinationUnitId: e.target.value})} />
          </div>
          <div>
            <button disabled={loading} type="submit" className="btn-primary" style={{ width: '100%', background: 'rgba(245, 158, 11, 0.1)', borderColor: 'var(--alert-warning)', color: 'var(--alert-warning)' }}>
              {loading ? 'Procesando...' : <>Procesar Relevo <CheckCircle2 size={16} style={{ display: 'inline', marginLeft: '5px' }} /></>}
            </button>
          </div>
        </form>
      </div>

      <div className="glass-panel" style={{ padding: '2rem' }}>
        <h3 style={{ color: 'var(--text-secondary)', marginBottom: '1rem', textTransform: 'uppercase' }}>Bandeja de Relevos ({unitId})</h3>
        <table className="data-table">
          <thead>
            <tr>
              <th>ID Lote</th>
              <th>Volumen</th>
              <th>Destino</th>
              <th>Impacto Operacional</th>
              <th>Estado</th>
              <th>Acción</th>
            </tr>
          </thead>
          <tbody>
            {transfers.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                  No hay movimientos masivos de tropa en su jurisdicción.
                </td>
              </tr>
            ) : (
              transfers.map(t => (
                <tr key={t.id}>
                  <td>{t.soldierId}</td>
                  <td>{t.soldierName}</td>
                  <td>{t.destinationUnitId}</td>
                  <td style={{ color: t.impactLevel === 'ALTO' ? 'var(--alert-danger)' : 'var(--alert-warning)' }}>{t.impactLevel}</td>
                  <td style={{ 
                    color: t.status === 'APPROVED' ? 'var(--alert-success)' : 
                           t.status === 'REJECTED' ? 'var(--alert-danger)' : 'var(--alert-warning)' 
                  }}>{t.status}</td>
                  <td>
                    {(role === 'ROLE_EJERCITO' || role === 'ROLE_DIVISION' || role === 'ROLE_BRIGADA') && t.status === 'PENDING_APPROVAL' && (
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
