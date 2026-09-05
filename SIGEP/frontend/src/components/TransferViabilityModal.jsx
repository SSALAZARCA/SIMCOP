import React, { useState } from 'react';
import axios from 'axios';
import { useAuth } from '../AuthContext';
import { SIGEP_API_URL } from '../apiConfig';

const TransferViabilityModal = ({ isOpen, onClose, soldierId, targetUnitId, onConfirmTransfer }) => {
  const { user } = useAuth();
  const [viability, setViability] = useState(null);
  const [loading, setLoading] = useState(false);
  const [overrideReason, setOverrideReason] = useState("");

  React.useEffect(() => {
    if (isOpen && soldierId && targetUnitId) {
      checkViability();
    }
  }, [isOpen, soldierId, targetUnitId]);

  const checkViability = async () => {
    if (!user || !user.token) return;
    setLoading(true);
    try {
      const config = { headers: { 'Authorization': `Bearer ${user.token}` } };
      const res = await axios.get(`${SIGEP_API_URL}/analysis/viability/${soldierId}/to/${targetUnitId}`, config);
      setViability(res.data);
    } catch (error) {
      console.error("Error checking viability", error);
    }
    setLoading(false);
  };

  if (!isOpen) return null;

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
      <div className="glass-panel" style={{ width: '100%', maxWidth: '800px', padding: '2rem', background: 'rgba(15, 23, 42, 0.95)' }}>
        <h2 style={{ fontSize: '1.8rem', color: 'var(--text-primary)', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span>🔍</span> Análisis de Viabilidad de Traslado
        </h2>
        
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--accent-cyan)' }}>
            <h3>Analizando TOE y Doctrina...</h3>
          </div>
        ) : viability ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            
            {viability.viable ? (
              <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid var(--alert-success)', padding: '1.5rem', borderRadius: '8px', display: 'flex', gap: '15px' }}>
                <span style={{ fontSize: '2rem', color: 'var(--alert-success)' }}>✓</span>
                <div>
                  <h3 style={{ color: 'var(--alert-success)', margin: '0 0 5px 0' }}>Traslado Viable</h3>
                  <p style={{ color: 'var(--text-primary)', margin: 0 }}>{viability.message}</p>
                </div>
              </div>
            ) : (
              <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--alert-danger)', padding: '1.5rem', borderRadius: '8px', display: 'flex', gap: '15px' }}>
                <span style={{ fontSize: '2rem', color: 'var(--alert-danger)' }}>⚠️</span>
                <div>
                  <h3 style={{ color: 'var(--alert-danger)', margin: '0 0 5px 0' }}>Bloqueo de Traslado Detectado</h3>
                  <p style={{ color: 'var(--text-primary)', margin: '0 0 10px 0' }}>{viability.message}</p>
                  
                  {viability.blockedByOperationalStatus && (
                     <div style={{ background: 'rgba(0,0,0,0.3)', padding: '10px', borderRadius: '4px', border: '1px solid rgba(239, 68, 68, 0.4)', color: 'var(--alert-danger)', fontSize: '0.85rem' }}>
                        <strong>REGLA DOCTRINARIA:</strong> Se prohíbe la extracción de personal en unidades con estado de COMBATE activo.
                     </div>
                  )}
                </div>
              </div>
            )}

            {!viability.viable && viability.suggestedReplacements && viability.suggestedReplacements.length > 0 && (
              <div style={{ background: 'rgba(34, 211, 238, 0.05)', padding: '1.5rem', borderRadius: '8px', border: '1px solid rgba(34, 211, 238, 0.2)' }}>
                <h3 style={{ color: 'var(--accent-cyan)', margin: '0 0 10px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>💡</span> Sugerencias de Reemplazos Idóneos
                </h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '15px' }}>La IA ha encontrado perfiles idénticos en unidades con superávit de esta especialidad:</p>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {viability.suggestedReplacements.map((rep, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.2)', padding: '10px 15px', borderRadius: '6px', border: '1px solid var(--glass-border)' }}>
                      <div>
                        <p style={{ margin: '0 0 3px 0', fontWeight: 'bold', color: 'var(--text-primary)' }}>{rep.rank} {rep.name}</p>
                        <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Unidad Origen: <strong>{rep.unitId}</strong> | Especialidad: {rep.mosCode}</p>
                      </div>
                      <button className="btn-primary" style={{ padding: '0.4rem 1rem', fontSize: '0.8rem' }}>
                        Sustituir Solicitud
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {!viability.viable && (
               <div style={{ marginTop: '1rem', paddingTop: '1.5rem', borderTop: '1px solid var(--glass-border)' }}>
                 <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: 'var(--alert-warning)' }}>
                    Justificación para Forzar Traslado (Requiere Aprobación de Nivel Ejército)
                 </label>
                 <textarea 
                    className="form-control"
                    rows="3"
                    placeholder="Escriba la justificación táctica para forzar esta orden por encima del bloqueo de la IA..."
                    value={overrideReason}
                    onChange={(e) => setOverrideReason(e.target.value)}
                    style={{ resize: 'vertical' }}
                 ></textarea>
               </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '15px', marginTop: '1rem' }}>
              <button 
                onClick={onClose}
                style={{ background: 'transparent', border: '1px solid var(--glass-border)', color: 'var(--text-secondary)', padding: '0.6rem 1.5rem', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
              >
                Cancelar
              </button>
              
              <button 
                onClick={() => onConfirmTransfer(viability.viable, overrideReason)}
                disabled={!viability.viable && overrideReason.trim() === ""}
                style={{ 
                   background: viability.viable ? 'var(--alert-success)' : (!viability.viable && overrideReason.trim() === "") ? '#374151' : 'var(--alert-danger)', 
                   color: '#fff', 
                   border: 'none', 
                   padding: '0.6rem 1.5rem', 
                   borderRadius: '6px', 
                   cursor: (!viability.viable && overrideReason.trim() === "") ? 'not-allowed' : 'pointer', 
                   fontWeight: 'bold',
                   textTransform: 'uppercase'
                }}
              >
                {viability.viable ? "Confirmar Traslado" : "Forzar Traslado (Override)"}
              </button>
            </div>

          </div>
        ) : null}
      </div>
    </div>
  );
};

export default TransferViabilityModal;
