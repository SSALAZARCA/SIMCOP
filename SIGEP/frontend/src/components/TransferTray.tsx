import React, { useState } from 'react';
import { useAuth } from '../AuthContext';
import { PlaneTakeoff, PlaneLanding, ClipboardCheck, Clock, CheckCircle2, ShieldAlert, FileText, FileSignature } from 'lucide-react';

export default function TransferTray({ role }: { role: string }) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('pendientes');

  // Datos simulados de la máquina de estados
  const traslados = [
    { id: 'TRF-8401', grado: 'CT', nombre: 'Juan Pérez', mos: '11B', origen: 'Batos 12', destino: 'Batos 44', estado: 'INITIATED', impacto: 'Bajo' },
    { id: 'TRF-8402', grado: 'SSG', nombre: 'Carlos Díaz', mos: '68W', origen: 'Batos 12', destino: 'Sanidad Central', estado: 'EXTENSION_REQUESTED', impacto: 'CRÍTICO' },
    { id: 'TRF-8403', grado: 'SL2', nombre: 'Luis G.', mos: '19D', origen: 'Batos 3', destino: 'Batos 12', estado: 'ACKNOWLEDGED', impacto: 'Medio' },
    { id: 'TRF-8404', grado: 'TE', nombre: 'Ana M.', mos: '11B', origen: 'Batos 1', destino: 'Batos 2', estado: 'IN_TRANSIT', impacto: 'Bajo' },
  ];

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'INITIATED': return <span className="badge" style={{ backgroundColor: 'rgba(59, 130, 246, 0.2)', color: '#60a5fa' }}><Clock size={12} style={{ display: 'inline', marginRight: '4px' }}/> INICIADO (Esperando Acuse)</span>;
      case 'EXTENSION_REQUESTED': return <span className="badge" style={{ backgroundColor: 'rgba(245, 158, 11, 0.2)', color: '#fbbf24' }}><ShieldAlert size={12} style={{ display: 'inline', marginRight: '4px' }}/> PRÓRROGA SOLICITADA</span>;
      case 'ACKNOWLEDGED': return <span className="badge" style={{ backgroundColor: 'rgba(16, 185, 129, 0.2)', color: '#34d399' }}><ClipboardCheck size={12} style={{ display: 'inline', marginRight: '4px' }}/> ACUSE RECIBIDO (Listo Despacho)</span>;
      case 'IN_TRANSIT': return <span className="badge" style={{ backgroundColor: 'rgba(168, 85, 247, 0.2)', color: '#c084fc' }}><PlaneTakeoff size={12} style={{ display: 'inline', marginRight: '4px' }}/> EN TRÁNSITO</span>;
      case 'COMPLETED': return <span className="badge active"><CheckCircle2 size={12} style={{ display: 'inline', marginRight: '4px' }}/> COMPLETADO</span>;
      default: return <span className="badge">{status}</span>;
    }
  };

  return (
    <div className="fade-in" style={{ padding: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h2 style={{ color: 'var(--text-primary)', fontSize: '1.8rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <FileSignature size={28} color="var(--accent-cyan)" />
          Bandeja de Workflow de Traslados
        </h2>
        {role === 'ROLE_EJERCITO' && (
          <button className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileText size={18} /> Nueva Orden de Traslado
          </button>
        )}
      </div>

      <div className="glass-panel" style={{ padding: '0' }}>
        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--glass-border)', padding: '0 1rem' }}>
          <button 
            className={`nav-btn ${activeTab === 'pendientes' ? 'active' : ''}`}
            style={{ padding: '1.2rem 2rem', borderRadius: 0, borderBottom: activeTab === 'pendientes' ? '2px solid var(--accent-cyan)' : 'none' }}
            onClick={() => setActiveTab('pendientes')}
          >
            Pendientes de Acción
          </button>
          <button 
            className={`nav-btn ${activeTab === 'arbitraje' ? 'active' : ''}`}
            style={{ padding: '1.2rem 2rem', borderRadius: 0, borderBottom: activeTab === 'arbitraje' ? '2px solid var(--accent-cyan)' : 'none' }}
            onClick={() => setActiveTab('arbitraje')}
          >
            Arbitraje de Prórrogas
          </button>
          <button 
            className={`nav-btn ${activeTab === 'historial' ? 'active' : ''}`}
            style={{ padding: '1.2rem 2rem', borderRadius: 0, borderBottom: activeTab === 'historial' ? '2px solid var(--accent-cyan)' : 'none' }}
            onClick={() => setActiveTab('historial')}
          >
            Historial
          </button>
        </div>

        {/* Table */}
        <div className="data-table-container" style={{ padding: '1rem' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>ID Orden</th>
                <th>Efectivo</th>
                <th>Especialidad</th>
                <th>Unidad Origen</th>
                <th>Unidad Destino</th>
                <th>Impacto TOE</th>
                <th>Estado Actual</th>
                <th>Acción Requerida</th>
              </tr>
            </thead>
            <tbody>
              {traslados.map((t) => (
                <tr key={t.id}>
                  <td style={{ fontFamily: 'Orbitron', color: 'var(--text-secondary)' }}>{t.id}</td>
                  <td style={{ fontWeight: 600 }}>{t.grado} {t.nombre}</td>
                  <td>{t.mos}</td>
                  <td>{t.origen}</td>
                  <td>{t.destino}</td>
                  <td>
                    <span style={{ color: t.impacto === 'CRÍTICO' ? 'var(--alert-danger)' : t.impacto === 'Medio' ? 'var(--alert-warning)' : 'var(--alert-success)' }}>
                      {t.impacto}
                    </span>
                  </td>
                  <td>{getStatusBadge(t.estado)}</td>
                  <td>
                    {t.estado === 'INITIATED' && (role === 'ROLE_BATALLON' || role === 'ROLE_EJERCITO') && (
                      <div style={{ display: 'flex', gap: '5px' }}>
                        <button className="btn-primary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}>Acusar Recibo</button>
                        <button className="btn-primary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', background: 'transparent', border: '1px solid var(--alert-warning)', color: 'var(--alert-warning)' }}>Solicitar Prórroga</button>
                      </div>
                    )}
                    {t.estado === 'EXTENSION_REQUESTED' && (role === 'ROLE_BRIGADA' || role === 'ROLE_DIVISION' || role === 'ROLE_EJERCITO') && (
                      <button className="btn-primary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', background: 'var(--alert-danger)', borderColor: 'var(--alert-danger)' }}>Arbitrar (Resolver)</button>
                    )}
                    {t.estado === 'ACKNOWLEDGED' && role === 'ROLE_BATALLON' && (
                      <button className="btn-primary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', background: 'var(--accent-cyan)', color: '#000' }}><PlaneTakeoff size={14} style={{ display: 'inline', marginRight: '4px' }}/> Despachar Física</button>
                    )}
                    {t.estado === 'IN_TRANSIT' && role === 'ROLE_BATALLON' && (
                      <button className="btn-primary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', background: 'var(--alert-success)', borderColor: 'var(--alert-success)' }}><PlaneLanding size={14} style={{ display: 'inline', marginRight: '4px' }}/> Marcar Llegada</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
