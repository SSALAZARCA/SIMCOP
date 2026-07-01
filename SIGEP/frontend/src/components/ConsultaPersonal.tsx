import React, { useState, useEffect } from 'react';
import { Search, FileText, Activity, MapPin, Upload, Download, CheckCircle, AlertTriangle, Cross, Users, BookOpen } from 'lucide-react';
import { useAuth } from '../AuthContext';
import axios from 'axios';
import { SIMCOP_API_URL, SIGEP_API_URL } from '../apiConfig';
import FichaDigital from './FichaDigital';
import LibroNovedades from './LibroNovedades';

export default function ConsultaPersonal({ role, unitId }: { role: string; unitId?: string }) {
  const { user } = useAuth();
  
  // States
  const [units, setUnits] = useState<any[]>([]);
  const [selectedUnitId, setSelectedUnitId] = useState('');
  
  const [activeTab, setActiveTab] = useState<'EXPEDIENTES' | 'NOVEDADES' | 'ALTA'>('EXPEDIENTES');
  
  // Soldados de la unidad
  const [soldiers, setSoldiers] = useState<any[]>([]);
  const [selectedSoldier, setSelectedSoldier] = useState<any>(null);
  const [dossier, setDossier] = useState<any>(null);
  
  // Formulario de Alta
  const [altaForm, setAltaForm] = useState({
    name: '', rank: 'CT', mosCode: '', branch: '', healthStatus: 'APTO', cursosCombate: ''
  });

  // 1. Cargar Unidades desde SIMCOP
  useEffect(() => {
    const fetchUnits = async () => {
      try {
        const res = await axios.get(`${SIMCOP_API_URL}/units`); // SIN TOKEN PARA SIMCOP
        const allUnits = res.data;
        
        if (user?.role === 'ROLE_ADMINISTRATOR' || user?.role === 'ROLE_EJERCITO' || user?.role === 'ROLE_COMANDANTE_EJERCITO' || user?.assignedUnitId === 'NATIONAL') {
          setUnits(allUnits);
          if (allUnits.length > 0) setSelectedUnitId(allUnits[0].id);
        } else {
          // Filtrar jerárquicamente
          const tree = [];
          const queue = [user?.assignedUnitId];
          while(queue.length > 0) {
            const currentId = queue.shift();
            const currentUnit = allUnits.find(u => u.id === currentId);
            if (currentUnit) tree.push(currentUnit);
            
            const children = allUnits.filter(u => u.parentId === currentId);
            queue.push(...children.map(c => c.id));
          }
          setUnits(tree);
          if (tree.length > 0) setSelectedUnitId(tree[0].id);
        }
      } catch (e) {
        console.error("Error fetching units from SIMCOP", e);
      }
    };
    fetchUnits();
  }, [user?.role, user?.assignedUnitId]);

  // 2. Cargar Soldados Físicos de SIGEP al cambiar Unidad
  const fetchSoldiers = async () => {
    if (!selectedUnitId) return;
    try {
      const res = await axios.get(`${SIGEP_API_URL}/personnel/unit/${selectedUnitId}`, {
        headers: { Authorization: `Bearer ${user?.token}` }
      });
      setSoldiers(res.data);
      setSelectedSoldier(null);
      setDossier(null);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchSoldiers();
  }, [selectedUnitId]);

  // 3. Ver Expediente Completo
  const loadDossier = async (soldierId: string) => {
    try {
      const res = await axios.get(`${SIGEP_API_URL}/personnel/${soldierId}/dossier`, {
        headers: { Authorization: `Bearer ${user?.token}` }
      });
      setDossier(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSelectSoldier = (soldier: any) => {
    setSelectedSoldier(soldier);
    setDossier(null);
    loadDossier(soldier.id);
  };

  // 4. Alta de Personal Físico
  const handleAlta = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUnitId) return alert("Seleccione una unidad primero");
    
    try {
      await axios.post(`${SIGEP_API_URL}/personnel`, {
        ...altaForm,
        unitId: selectedUnitId
      }, {
        headers: { Authorization: `Bearer ${user?.token}` }
      });
      alert('Soldado dado de alta exitosamente en SIGEP');
      setAltaForm({ name: '', rank: 'SLP', mosCode: 'INFANTERIA', branch: 'INFANTERIA', healthStatus: 'APTO', cursosCombate: '' });
      fetchSoldiers();
      setActiveTab('EXPEDIENTES');
    } catch (e) {
      console.error(e);
      alert('Error en el Alta');
    }
  };

  return (
    <div className="fade-in" style={{ padding: '2rem', height: '100vh', display: 'flex', flexDirection: 'column' }}>
      
      {/* Cabecera y Selector Maestro */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '2rem', color: 'var(--text-primary)' }}>
          <Users size={32} color="var(--accent-cyan)" />
          Gestión de Personal
        </h2>
        
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <label style={{ color: 'var(--text-secondary)' }}>UNIDAD A ADMINISTRAR:</label>
          <select 
            className="glass-panel"
            value={selectedUnitId} 
            onChange={e => setSelectedUnitId(e.target.value)}
            style={{ padding: '0.8rem', color: 'var(--accent-cyan)', fontSize: '1.1rem', outline: 'none', border: '1px solid var(--accent-cyan)', borderRadius: '8px' }}
          >
            {units.map(u => (
              <option key={u.id} value={u.id}>{u.name} (TOE de SIMCOP)</option>
            ))}
          </select>
        </div>
      </div>

      {/* Navegación Interna */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '1rem' }}>
        <button onClick={() => setActiveTab('EXPEDIENTES')} className={activeTab === 'EXPEDIENTES' ? 'btn-primary' : 'btn-secondary'} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <FileText size={18} /> Ver Expedientes ({soldiers.length})
        </button>
        <button onClick={() => setActiveTab('NOVEDADES')} className={activeTab === 'NOVEDADES' ? 'btn-primary' : 'btn-secondary'} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <BookOpen size={18} /> Libro de Novedades
        </button>
        <button onClick={() => setActiveTab('ALTA')} className={activeTab === 'ALTA' ? 'btn-primary' : 'btn-secondary'} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <Upload size={18} /> Cargar Personal (Alta)
        </button>
      </div>

      {/* Contenido Dinámico */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        
        {activeTab === 'ALTA' && (
          <div className="glass-panel" style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto', animation: 'fadeIn 0.5s' }}>
            <h3 style={{ color: 'var(--accent-cyan)', marginBottom: '2rem' }}>Formulario de Alta de Personal a Unidad</h3>
            <form onSubmit={handleAlta} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ color: 'var(--text-secondary)', display: 'block', marginBottom: '0.5rem' }}>Nombre Completo</label>
                  <input required value={altaForm.name} onChange={e => setAltaForm({...altaForm, name: e.target.value})} style={{ width: '100%', padding: '0.8rem', background: 'rgba(0,0,0,0.5)', border: '1px solid var(--glass-border)', color: 'white', borderRadius: '4px' }} />
                </div>
                <div>
                  <label style={{ color: 'var(--text-secondary)', display: 'block', marginBottom: '0.5rem' }}>Grado / Rango</label>
                  <select required value={altaForm.rank} onChange={e => setAltaForm({...altaForm, rank: e.target.value})} style={{ width: '100%', padding: '0.8rem', background: 'rgba(0,0,0,0.5)', border: '1px solid var(--glass-border)', color: 'white', borderRadius: '4px' }}>
                    <optgroup label="Oficiales">
                      <option value="GR">General (GR)</option>
                      <option value="MG">Mayor General (MG)</option>
                      <option value="BG">Brigadier General (BG)</option>
                      <option value="CR">Coronel (CR)</option>
                      <option value="TC">Teniente Coronel (TC)</option>
                      <option value="MY">Mayor (MY)</option>
                      <option value="CT">Capitán (CT)</option>
                      <option value="TE">Teniente (TE)</option>
                      <option value="ST">Subteniente (ST)</option>
                    </optgroup>
                    <optgroup label="Suboficiales">
                      <option value="SMCC">Sargento Mayor Comando Conjunto (SMCC)</option>
                      <option value="SMC">Sargento Mayor Comando (SMC)</option>
                      <option value="SM">Sargento Mayor (SM)</option>
                      <option value="SP">Sargento Primero (SP)</option>
                      <option value="SV">Sargento Viceprimero (SV)</option>
                      <option value="SS">Sargento Segundo (SS)</option>
                      <option value="CP">Cabo Primero (CP)</option>
                      <option value="CS">Cabo Segundo (CS)</option>
                      <option value="C3">Cabo Tercero (C3)</option>
                    </optgroup>
                    <optgroup label="Soldados">
                      <option value="SLP">Soldado Profesional (SLP)</option>
                      <option value="SL18">Soldado (SL18)</option>
                    </optgroup>
                  </select>
                </div>
                <div>
                  <label style={{ color: 'var(--text-secondary)', display: 'block', marginBottom: '0.5rem' }}>Arma</label>
                  <input required value={altaForm.branch} onChange={e => setAltaForm({...altaForm, branch: e.target.value})} style={{ width: '100%', padding: '0.8rem', background: 'rgba(0,0,0,0.5)', border: '1px solid var(--glass-border)', color: 'white', borderRadius: '4px' }} />
                </div>
                <div>
                  <label style={{ color: 'var(--text-secondary)', display: 'block', marginBottom: '0.5rem' }}>Código Especialidad (MOS)</label>
                  <input required value={altaForm.mosCode} onChange={e => setAltaForm({...altaForm, mosCode: e.target.value})} style={{ width: '100%', padding: '0.8rem', background: 'rgba(0,0,0,0.5)', border: '1px solid var(--glass-border)', color: 'white', borderRadius: '4px' }} />
                </div>
                <div style={{ gridColumn: '1 / span 2' }}>
                  <label style={{ color: 'var(--text-secondary)', display: 'block', marginBottom: '0.5rem' }}>Cursos de Combate (Separados por coma)</label>
                  <input value={altaForm.cursosCombate} onChange={e => setAltaForm({...altaForm, cursosCombate: e.target.value})} style={{ width: '100%', padding: '0.8rem', background: 'rgba(0,0,0,0.5)', border: '1px solid var(--glass-border)', color: 'white', borderRadius: '4px' }} />
                </div>
              </div>
              <button type="submit" className="btn-primary" style={{ padding: '1rem', marginTop: '1rem', fontSize: '1.1rem' }}>Procesar Alta en SIGEP</button>
            </form>
          </div>
        )}

        {activeTab === 'NOVEDADES' && (
          <LibroNovedades unitId={selectedUnitId} userToken={user?.token} soldiers={soldiers} onUpdate={fetchSoldiers} />
        )}

        {activeTab === 'EXPEDIENTES' && (
          <div style={{ display: 'flex', gap: '2rem', height: '100%' }}>
            {/* Panel Izquierdo: Lista de Soldados */}
            <div className="glass-panel" style={{ width: '350px', flexShrink: 0, display: 'flex', flexDirection: 'column' }}>
              <div style={{ padding: '1rem', borderBottom: '1px solid var(--glass-border)', background: 'rgba(0,0,0,0.2)' }}>
                <h3 style={{ margin: 0, color: 'var(--text-primary)' }}>Personal Físico</h3>
                <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.8rem' }}>Unidad seleccionada</p>
              </div>
              <div style={{ flex: 1, overflowY: 'auto', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {soldiers.length === 0 ? (
                  <p style={{ color: 'var(--text-secondary)', textAlign: 'center', marginTop: '2rem' }}>No hay personal cargado en esta unidad.</p>
                ) : (
                  soldiers.map(s => (
                    <div key={s.id} onClick={() => handleSelectSoldier(s)} style={{
                      padding: '1rem', background: selectedSoldier?.id === s.id ? 'rgba(0, 240, 255, 0.1)' : 'rgba(255,255,255,0.02)',
                      border: `1px solid ${selectedSoldier?.id === s.id ? 'var(--accent-cyan)' : 'var(--glass-border)'}`,
                      borderRadius: '8px', cursor: 'pointer', transition: '0.2s', position: 'relative', overflow: 'hidden'
                    }}>
                      <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '4px', background: s.status === 'ACTIVE' ? '#10b981' : '#ef4444' }}></div>
                      <div style={{ fontWeight: 'bold', color: 'var(--text-primary)' }}>{s.rank} {s.name}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>ID: {s.id?.substring(0, 8)} | Arma: {s.branch || 'N/A'}</div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Panel Derecho: Ficha Digital */}
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {!selectedSoldier ? (
                <div className="glass-panel" style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-secondary)', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
                  <FileText size={64} style={{ opacity: 0.2, marginBottom: '1rem' }} />
                  <h3>Ningún perfil seleccionado</h3>
                  <p>Seleccione un soldado de la lista para visualizar su Ficha Digital Completa.</p>
                </div>
              ) : !dossier ? (
                <div className="glass-panel" style={{ padding: '4rem', textAlign: 'center', color: 'var(--accent-cyan)' }}>Descargando expediente clasificado...</div>
              ) : (
                <FichaDigital dossier={dossier} userToken={user?.token} />
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
