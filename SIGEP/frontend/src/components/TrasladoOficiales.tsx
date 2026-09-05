import React, { useState, useEffect } from 'react';
import { useAuth } from '../AuthContext';
import { SIGEP_API_URL } from '../apiConfig';
import { Shield, ArrowRight, Check, X, UserPlus, FileText, CheckCircle, XCircle, Search } from 'lucide-react';
import RecomendacionIA from './RecomendacionIA';
import TransferViabilityModal from './TransferViabilityModal';

export default function TrasladoOficiales({ unitId, role }: { unitId: string, role: string }) {
  const { user } = useAuth();
  const [transfers, setTransfers] = useState<any[]>([]);
  const [formData, setFormData] = useState({ soldierId: '', destinationUnitId: '' });
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchTransfers = () => {
    fetch(`${SIGEP_API_URL}/transfers?rankCategory=OFICIAL`, {
      headers: { 'Authorization': `Bearer ${user.token}` }
    })
      .then(res => res.json())
      .then(data => setTransfers(data))
      .catch(console.error);
  };

  useEffect(() => {
    fetchTransfers();
  }, [user.token]);

  const handleOpenModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.soldierId && formData.destinationUnitId) {
      setIsModalOpen(true);
    }
  };

  const handleConfirmTransfer = async (isViable: boolean, overrideReason: string) => {
    setIsModalOpen(false);
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
          soldierName: 'Oficial ' + formData.soldierId,
          rankCategory: 'OFICIAL',
          originUnitId: unitId,
          destinationUnitId: formData.destinationUnitId,
          impactLevel: isViable ? 'NORMAL' : 'ALTO',
          status: isViable ? 'PENDING_APPROVAL' : 'PENDING_REVIEW', // Nuevo estado si no es viable
          comments: overrideReason // Guardar la justificación
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
        <Shield size={32} color="var(--accent-cyan)" />
        Gestión de Cuadros de Mando (Oficiales)
      </h2>

      <RecomendacionIA />

      <div className="glass-panel" style={{ padding: '2rem', marginBottom: '2rem' }}>
        <h3 style={{ color: 'var(--text-secondary)', marginBottom: '1rem', textTransform: 'uppercase' }}>Solicitud de Movimiento Especial</h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '2rem' }}>
          Los traslados de Oficiales requieren aprobación directa del Comando del Ejército (G1/S1 Central). Jurisdicción actual: <strong>{unitId}</strong>.
        </p>

        <form onSubmit={handleOpenModal} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1.5rem', alignItems: 'end' }}>
          <div>
            <label className="form-label">ID del Oficial (Cédula/Código)</label>
            <input required type="text" className="form-control" placeholder="Ej. OFC-84912" value={formData.soldierId} onChange={e => setFormData({...formData, soldierId: e.target.value})} />
          </div>
          <div>
            <label className="form-label">Unidad Destino</label>
            <input required type="text" className="form-control" placeholder="Ej. DIV1" value={formData.destinationUnitId} onChange={e => setFormData({...formData, destinationUnitId: e.target.value})} />
          </div>
          <div>
            <button disabled={loading} type="submit" className="btn-primary" style={{ width: '100%' }}>
              {loading ? 'Procesando...' : <>Elevar Propuesta a G1 <ArrowRight size={16} style={{ display: 'inline', marginLeft: '5px' }} /></>}
            </button>
          </div>
        </form>
      </div>

      <div className="glass-panel" style={{ padding: '2rem' }}>
        <h3 style={{ color: 'var(--text-secondary)', marginBottom: '1rem', textTransform: 'uppercase' }}>Workflow de Oficiales ({unitId})</h3>
        <table className="data-table">
          <thead>
            <tr>
              <th>Fecha Solicitud</th>
              <th>ID Oficial</th>
              <th>Origen</th>
              <th>Destino Propuesto</th>
              <th>Estado Comando</th>
              <th>Acción (G1)</th>
            </tr>
          </thead>
          <tbody>
            {transfers.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                  No hay traslados de oficiales en su jurisdicción.
                </td>
              </tr>
            ) : (
              transfers.map(t => (
                <tr key={t.id}>
                  <td>{new Date(t.createdAt).toLocaleDateString()}</td>
                  <td>{t.soldierId}</td>
                  <td>{t.originUnitId}</td>
                  <td>{t.destinationUnitId}</td>
                  <td style={{ 
                    color: t.status === 'APPROVED' ? 'var(--alert-success)' : 
                           t.status === 'REJECTED' ? 'var(--alert-danger)' : 'var(--alert-warning)' 
                  }}>{t.status}</td>
                  <td>
                    {(role === 'ROLE_EJERCITO' || role === 'ROLE_DIVISION') && (t.status === 'PENDING_APPROVAL' || t.status === 'PENDING_REVIEW') && (
                      <div style={{ display: 'flex', gap: '5px', flexDirection: 'column' }}>
                        {t.status === 'PENDING_REVIEW' && <span className="text-xs text-red-400 font-bold mb-1">Requiere Override</span>}
                        <div style={{ display: 'flex', gap: '5px' }}>
                           <button onClick={() => updateStatus(t.id, 'APPROVED')} className="btn-primary" style={{ padding: '0.2rem', background: 'var(--alert-success)' }} title="Aprobar"><Check size={16}/></button>
                           <button onClick={() => updateStatus(t.id, 'REJECTED')} className="btn-primary" style={{ padding: '0.2rem', background: 'var(--alert-danger)' }} title="Rechazar"><X size={16}/></button>
                        </div>
                        {t.comments && <span className="text-xs text-slate-400 mt-1" style={{ maxWidth: '150px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={t.comments}>Razón: {t.comments}</span>}
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      
      <TransferViabilityModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        soldierId={formData.soldierId}
        targetUnitId={formData.destinationUnitId}
        onConfirmTransfer={handleConfirmTransfer}
      />
    </div>
  );
}
