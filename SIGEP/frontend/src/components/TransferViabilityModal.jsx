import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../AuthContext';
import { SIGEP_API_URL } from '../apiConfig';
import { CheckCircle2, AlertTriangle, ShieldAlert, X, Users, ShieldCheck } from 'lucide-react';

const TransferViabilityModal = ({ isOpen, onClose, soldierId, targetUnitId, onConfirmTransfer }) => {
  const { user } = useAuth();
  const [viability, setViability] = useState(null);
  const [loading, setLoading] = useState(false);
  const [overrideReason, setOverrideReason] = useState("");

  useEffect(() => {
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
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(5px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
      <div className="glass-panel" style={{ width: '100%', maxWidth: '820px', padding: '2rem', background: 'rgba(15, 23, 42, 0.96)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)' }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.8rem' }}>
          <h2 style={{ fontSize: '1.5rem', color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
            <ShieldCheck size={26} color="var(--accent-cyan)" /> Dictamen de Viabilidad de Traslado (G1/S1)
          </h2>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
            <X size={22} />
          </button>
        </div>
        
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--accent-cyan)' }}>
            <div className="spinner" style={{ width: '32px', height: '32px', border: '3px solid transparent', borderTopColor: 'var(--accent-cyan)', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 1rem auto' }}></div>
            <h3>Consultando TOE Orgánica, Sanidad y Estado Operacional...</h3>
          </div>
        ) : viability ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem', maxHeight: '70vh', overflowY: 'auto', paddingRight: '6px' }}>
            
            {viability.operationalNote && (
              <div style={{ background: 'rgba(245, 158, 11, 0.12)', border: '1px solid #f59e0b', padding: '1rem', borderRadius: '8px', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                <AlertTriangle size={24} color="#f59e0b" style={{ flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <h4 style={{ color: '#fbbf24', margin: '0 0 4px 0', fontSize: '0.95rem' }}>AVISO OPERACIONAL - UNIDAD EN CONTACTO</h4>
                  <p style={{ color: '#fef3c7', margin: 0, fontSize: '0.88rem', lineHeight: '1.4' }}>
                    {viability.operationalNote}
                  </p>
                </div>
              </div>
            )}

            {viability.viable ? (
              <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid var(--alert-success)', padding: '1.2rem', borderRadius: '8px', display: 'flex', gap: '12px', alignItems: 'center' }}>
                <CheckCircle2 size={28} color="var(--alert-success)" style={{ flexShrink: 0 }} />
                <div>
                  <h4 style={{ color: 'var(--alert-success)', margin: '0 0 4px 0' }}>Traslado Viable Doctrinalmente</h4>
                  <p style={{ color: 'var(--text-primary)', margin: 0, fontSize: '0.9rem' }}>{viability.message}</p>
                </div>
              </div>
            ) : (
              <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--alert-danger)', padding: '1.2rem', borderRadius: '8px', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                <ShieldAlert size={28} color="var(--alert-danger)" style={{ flexShrink: 0, marginTop: '2px' }} />
                <div style={{ flex: 1 }}>
                  <h4 style={{ color: 'var(--alert-danger)', margin: '0 0 6px 0' }}>Bloqueo de Traslado Registrado</h4>
                  <p style={{ color: 'var(--text-primary)', margin: '0 0 10px 0', fontSize: '0.9rem' }}>{viability.message}</p>
                  
                  {viability.blockedByHealth && (
                    <div style={{ background: 'rgba(0,0,0,0.3)', padding: '8px 12px', borderRadius: '4px', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#fca5a5', fontSize: '0.85rem', marginBottom: '6px' }}>
                      <strong>CAUSAL SANIDAD:</strong> Efectivo no apto físicamente o bajo incapacidad/excusa médica activa.
                    </div>
                  )}

                  {viability.blockedByCriticalSpecialty && (
                    <div style={{ background: 'rgba(0,0,0,0.3)', padding: '8px 12px', borderRadius: '4px', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#fca5a5', fontSize: '0.85rem', marginBottom: '6px' }}>
                      <strong>CAUSAL ESPECIALIDAD PRIMORDIAL:</strong> El efectivo desempeña el único puesto orgánico vital de su especialidad (médico/enfermero de combate, tirador de alta precisión, radio-operador, etc.).
                    </div>
                  )}

                  {viability.blockedByToe && (
                    <div style={{ background: 'rgba(0,0,0,0.3)', padding: '8px 12px', borderRadius: '4px', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#fca5a5', fontSize: '0.85rem' }}>
                      <strong>CAUSAL TOE:</strong> La extracción deja a la unidad por debajo de la plantilla orgánica autorizada.
                    </div>
                  )}
                </div>
              </div>
            )}

            {!viability.viable && viability.suggestedReplacements && viability.suggestedReplacements.length > 0 && (
              <div style={{ background: 'rgba(34, 211, 238, 0.05)', padding: '1.2rem', borderRadius: '8px', border: '1px solid rgba(34, 211, 238, 0.2)' }}>
                <h4 style={{ color: 'var(--accent-cyan)', margin: '0 0 8px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Users size={18} /> Sugerencias de Reemplazos Idóneos (IA)
                </h4>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                  Efectivos con perfil compatible en unidades con superávit orgánico:
                </p>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {viability.suggestedReplacements.map((rep, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.25)', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--glass-border)' }}>
                      <div>
                        <p style={{ margin: '0 0 2px 0', fontWeight: 'bold', color: 'var(--text-primary)', fontSize: '0.9rem' }}>{rep.rank} {rep.name}</p>
                        <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Unidad: <strong>{rep.unitId}</strong> | MOS: {rep.mosCode} | Sanidad: {rep.healthStatus || 'APTO'}</p>
                      </div>
                      <span style={{ fontSize: '0.75rem', background: 'rgba(16, 185, 129, 0.2)', color: '#10b981', padding: '4px 8px', borderRadius: '4px' }}>
                        Disponible
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {!viability.viable && (
               <div style={{ marginTop: '0.5rem', paddingTop: '1rem', borderTop: '1px solid var(--glass-border)' }}>
                 <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: 'var(--alert-warning)', fontSize: '0.88rem' }}>
                    Convalidación / Autorización Especial del Oficial de Personal (S1/B1/G1/JEMPP):
                 </label>
                 <textarea 
                    className="form-control"
                    rows={3}
                    placeholder="Indique la justificación táctica/administrativa o directiva superior para autorizar este movimiento de personal..."
                    value={overrideReason}
                    onChange={(e) => setOverrideReason(e.target.value)}
                    style={{ resize: 'vertical', width: '100%', background: 'rgba(0,0,0,0.3)', color: '#fff', border: '1px solid var(--glass-border)', borderRadius: '6px', padding: '8px' }}
                 ></textarea>
               </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '0.8rem' }}>
              <button 
                onClick={onClose}
                style={{ background: 'transparent', border: '1px solid var(--glass-border)', color: 'var(--text-secondary)', padding: '0.6rem 1.2rem', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
              >
                Cerrar
              </button>
              
              <button 
                onClick={() => onConfirmTransfer(viability.viable, overrideReason)}
                disabled={!viability.viable && overrideReason.trim() === ""}
                style={{ 
                   background: viability.viable ? 'var(--alert-success)' : (!viability.viable && overrideReason.trim() === "") ? '#374151' : 'var(--alert-danger)', 
                   color: '#fff', 
                   border: 'none', 
                   padding: '0.6rem 1.4rem', 
                   borderRadius: '6px', 
                   cursor: (!viability.viable && overrideReason.trim() === "") ? 'not-allowed' : 'pointer', 
                   fontWeight: 'bold'
                }}
              >
                {viability.viable ? "Confirmar Traslado" : "Convalidar y Autorizar Traslado"}
              </button>
            </div>

          </div>
        ) : null}
      </div>
    </div>
  );
};

export default TransferViabilityModal;
