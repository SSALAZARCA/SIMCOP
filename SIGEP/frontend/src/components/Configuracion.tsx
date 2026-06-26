import React, { useState, useEffect } from 'react';
import { useAuth } from '../AuthContext';
import { Settings, Save, ShieldAlert, AlertTriangle, Users, UserPlus, Clock, ArrowRightLeft, Target, Edit, Trash2, X } from 'lucide-react';
import axios from 'axios';
import { SIMCOP_API_URL, SIGEP_API_URL } from '../apiConfig';

export default function Configuracion({ role }: { role: string }) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'DOCTRINA' | 'USUARIOS'>('DOCTRINA');

  // ---- ESTADO: PARÁMETROS OPERACIONALES ----
  const [params, setParams] = useState({ 
    CRITICAL_DEFICIT_THRESHOLD: '85', 
    WARNING_DEFICIT_THRESHOLD: '95', 
    MAX_PENDING_TRANSFERS: '50',
    MIN_MONTHS_FOR_TRANSFER: '24',
    MAX_ROTATION_PERCENTAGE: '15',
    RETRAINING_ALERT_DAYS: '30'
  });
  const [loadingParams, setLoadingParams] = useState(false);
  const [msgParams, setMsgParams] = useState('');

  // ---- ESTADO: GESTIÓN DE USUARIOS ----
  const [editingUserId, setEditingUserId] = useState<number | null>(null);
  const [userForm, setUserForm] = useState({
    username: '',
    hashedPassword: '',
    displayName: '',
    role: 'COMANDANTE_BATALLON',
    permissions: '',
    assignedUnitId: ''
  });
  const [loadingUser, setLoadingUser] = useState(false);
  const [msgUser, setMsgUser] = useState('');
  const [units, setUnits] = useState<any[]>([]);

  const [users, setUsers] = useState<any[]>([]);

  useEffect(() => {
    // Cargar Parámetros de SIGEP
    fetch(`${SIGEP_API_URL}/parameters`, {
      headers: { 'Authorization': `Bearer ${user?.token}` }
    })
      .then(res => res.json())
      .then(data => {
        setParams(prev => ({...prev, ...data}));
      })
      .catch(console.error);

    // Cargar Unidades de SIMCOP para el selector
    axios.get(`${SIMCOP_API_URL}/units`)
      .then(res => {
        const allUnits = res.data;
        if (role === 'ROLE_ADMINISTRATOR' || role === 'ROLE_EJERCITO' || role === 'ROLE_COMANDANTE_EJERCITO' || user?.assignedUnitId === 'NATIONAL') {
          setUnits(allUnits);
        } else {
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
        }
      })
      .catch(console.error);
      
    // Cargar lista de usuarios desde SIGEP
    axios.get(`${SIGEP_API_URL}/users`, {
      headers: { 'Authorization': `Bearer ${user?.token}` }
    })
    .then(res => setUsers(res.data))
    .catch(console.error);
  }, [user?.token, user?.simcopToken, role, user?.assignedUnitId]);

  const handleSaveParams = async () => {
    setLoadingParams(true);
    try {
      const response = await fetch(`${SIGEP_API_URL}/parameters`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user?.token}`
        },
        body: JSON.stringify(params)
      });
      if (response.ok) {
        setMsgParams('Parámetros actualizados con éxito en la red SIGEP.');
      } else {
        setMsgParams('Error de permisos.');
      }
    } catch (err) {
      setMsgParams('Error de conexión.');
    }
    setLoadingParams(false);
    setTimeout(() => setMsgParams(''), 3000);
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingUser(true);
    try {
      if (editingUserId) {
        await axios.put(`${SIGEP_API_URL}/users/${editingUserId}`, userForm, {
          headers: { 'Authorization': `Bearer ${user?.token}` }
        });
        setMsgUser('Jefe de Personal actualizado correctamente.');
      } else {
        await axios.post(`${SIGEP_API_URL}/users`, userForm, {
          headers: { 'Authorization': `Bearer ${user?.token}` }
        });
        setMsgUser('Jefe de Personal creado correctamente en SIGEP.');
      }
      setUserForm({ username: '', hashedPassword: '', displayName: '', role: 'COMANDANTE_BATALLON', permissions: '', assignedUnitId: '' });
      setEditingUserId(null);
      
      const resUsers = await axios.get(`${SIGEP_API_URL}/users`, {
        headers: { 'Authorization': `Bearer ${user?.token}` }
      });
      setUsers(resUsers.data);
      
    } catch (err: any) {
      if (err.response?.status === 403) {
        setMsgUser('Error: Solo los Administradores Globales pueden modificar usuarios.');
      } else {
        setMsgUser('Error al guardar el usuario. Verifique los datos.');
      }
    }
    setLoadingUser(false);
    setTimeout(() => setMsgUser(''), 4000);
  };

  const handleEditUser = (u: any) => {
    setEditingUserId(u.id);
    setUserForm({
      username: u.username,
      hashedPassword: '',
      displayName: u.displayName,
      role: u.role,
      permissions: u.permissions,
      assignedUnitId: u.assignedUnitId
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteUser = async (id: number) => {
    if (!window.confirm('¿Desea eliminar este usuario permanentemente?')) return;
    try {
      await axios.delete(`${SIGEP_API_URL}/users/${id}`, {
        headers: { 'Authorization': `Bearer ${user?.token}` }
      });
      setUsers(users.filter(u => u.id !== id));
      setMsgUser('Usuario eliminado.');
    } catch (err) {
      setMsgUser('Error al eliminar usuario.');
    }
  };

  if (role !== 'ROLE_EJERCITO' && !role.includes('ROLE_COMANDANTE_') && role !== 'ROLE_ADMINISTRATOR') {
    return (
      <div className="fade-in" style={{ padding: '2rem', color: 'var(--alert-danger)' }}>
        <h2>Acceso Denegado</h2>
        <p>Solo el Comandante del Ejército tiene autorización para acceder a la configuración.</p>
      </div>
    );
  }

  return (
    <div className="fade-in" style={{ padding: '2rem' }}>
      <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '2rem', marginBottom: '1rem', color: 'var(--text-primary)' }}>
        <Settings size={32} color="var(--accent-cyan)" />
        Configuración Avanzada
      </h2>

      {/* Navegación de Pestañas */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '1rem' }}>
        <button onClick={() => setActiveTab('DOCTRINA')} className={activeTab === 'DOCTRINA' ? 'btn-primary' : 'btn-secondary'} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <Settings size={18} /> Doctrina Operacional
        </button>
        {(role === 'ROLE_ADMINISTRATOR' || role === 'ROLE_EJERCITO' || role.includes('ROLE_COMANDANTE_')) && (
          <button onClick={() => setActiveTab('USUARIOS')} className={activeTab === 'USUARIOS' ? 'btn-primary' : 'btn-secondary'} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <Users size={18} /> Gestión de Usuarios
          </button>
        )}
      </div>

      {activeTab === 'DOCTRINA' && (
        <div className="glass-panel fade-in" style={{ padding: '2rem', marginBottom: '2rem', maxWidth: '800px' }}>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
            Ajuste los factores operacionales que gobiernan el motor de Recomendaciones, Alertas y Traslados.
          </p>

          <div style={{ display: 'grid', gap: '2rem' }}>
            {/* Factores Operacionales */}
            <h3 style={{ color: 'var(--accent-cyan)', borderBottom: '1px solid rgba(0,240,255,0.3)', paddingBottom: '0.5rem' }}>Déficit de Fuerza</h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <label style={{ color: 'var(--alert-danger)', display: 'flex', alignItems: 'center', gap: '5px', fontWeight: 'bold' }}>
                <ShieldAlert size={18} /> Umbral Crítico de Misión (%)
              </label>
              <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                <input type="range" min="50" max="99" value={params.CRITICAL_DEFICIT_THRESHOLD} 
                  onChange={(e) => setParams({...params, CRITICAL_DEFICIT_THRESHOLD: e.target.value})} 
                  style={{ flex: 1, accentColor: 'var(--alert-danger)' }} />
                <span style={{ fontSize: '1.2rem', fontWeight: 'bold', width: '50px' }}>{params.CRITICAL_DEFICIT_THRESHOLD}%</span>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <label style={{ color: 'var(--alert-warning)', display: 'flex', alignItems: 'center', gap: '5px', fontWeight: 'bold' }}>
                <AlertTriangle size={18} /> Advertencia Operacional (%)
              </label>
              <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                <input type="range" min="60" max="100" value={params.WARNING_DEFICIT_THRESHOLD} 
                  onChange={(e) => setParams({...params, WARNING_DEFICIT_THRESHOLD: e.target.value})} 
                  style={{ flex: 1, accentColor: 'var(--alert-warning)' }} />
                <span style={{ fontSize: '1.2rem', fontWeight: 'bold', width: '50px' }}>{params.WARNING_DEFICIT_THRESHOLD}%</span>
              </div>
            </div>

            <h3 style={{ color: 'var(--accent-cyan)', borderBottom: '1px solid rgba(0,240,255,0.3)', paddingBottom: '0.5rem', marginTop: '1rem' }}>Factores de Traslado y Entrenamiento</h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <label style={{ color: '#8b5cf6', display: 'flex', alignItems: 'center', gap: '5px', fontWeight: 'bold' }}>
                <Clock size={18} /> Tiempo Mínimo en Plaza (Meses)
              </label>
              <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                <input type="range" min="6" max="60" value={params.MIN_MONTHS_FOR_TRANSFER} 
                  onChange={(e) => setParams({...params, MIN_MONTHS_FOR_TRANSFER: e.target.value})} 
                  style={{ flex: 1, accentColor: '#8b5cf6' }} />
                <span style={{ fontSize: '1.2rem', fontWeight: 'bold', width: '50px' }}>{params.MIN_MONTHS_FOR_TRANSFER}</span>
              </div>
              <small style={{ color: 'var(--text-secondary)' }}>Meses requeridos ininterrumpidos para que el sistema sugiera rotación automática.</small>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <label style={{ color: '#10b981', display: 'flex', alignItems: 'center', gap: '5px', fontWeight: 'bold' }}>
                <ArrowRightLeft size={18} /> Límite de Desangre Mensual por Unidad (%)
              </label>
              <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                <input type="range" min="5" max="30" value={params.MAX_ROTATION_PERCENTAGE} 
                  onChange={(e) => setParams({...params, MAX_ROTATION_PERCENTAGE: e.target.value})} 
                  style={{ flex: 1, accentColor: '#10b981' }} />
                <span style={{ fontSize: '1.2rem', fontWeight: 'bold', width: '50px' }}>{params.MAX_ROTATION_PERCENTAGE}%</span>
              </div>
              <small style={{ color: 'var(--text-secondary)' }}>Freno matemático: Bloquea traslados si la unidad va a perder más de este porcentaje en el mismo ciclo.</small>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <label style={{ color: '#3b82f6', display: 'flex', alignItems: 'center', gap: '5px', fontWeight: 'bold' }}>
                <Target size={18} /> Alerta Previa a Caducidad de Curso (Días)
              </label>
              <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                <input type="range" min="15" max="90" value={params.RETRAINING_ALERT_DAYS} 
                  onChange={(e) => setParams({...params, RETRAINING_ALERT_DAYS: e.target.value})} 
                  style={{ flex: 1, accentColor: '#3b82f6' }} />
                <span style={{ fontSize: '1.2rem', fontWeight: 'bold', width: '50px' }}>{params.RETRAINING_ALERT_DAYS}</span>
              </div>
            </div>

            <button onClick={handleSaveParams} disabled={loadingParams} className="btn-primary" style={{ marginTop: '1rem', display: 'flex', justifyContent: 'center', gap: '8px', padding: '1rem' }}>
              <Save size={20} /> {loadingParams ? 'Guardando...' : 'Aplicar Nueva Doctrina a la Red'}
            </button>
            
            {msgParams && <div style={{ padding: '1rem', background: 'rgba(16, 185, 129, 0.1)', color: 'var(--alert-success)', border: '1px solid var(--alert-success)', borderRadius: '4px' }}>{msgParams}</div>}
          </div>
        </div>
      )}

      {activeTab === 'USUARIOS' && (role === 'ROLE_ADMINISTRATOR' || role === 'ROLE_EJERCITO' || role.includes('ROLE_COMANDANTE_')) && (
        <div className="glass-panel fade-in" style={{ padding: '2rem', marginBottom: '2rem', maxWidth: '800px' }}>
          <h3 style={{ color: 'var(--accent-cyan)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <UserPlus size={24} /> {editingUserId ? 'Editar Identidad de Jefe de Personal' : 'Crear Identidad de Jefe de Personal (SIGEP)'}
            {editingUserId && (
              <button type="button" onClick={() => { setEditingUserId(null); setUserForm({ username: '', hashedPassword: '', displayName: '', role: 'COMANDANTE_BATALLON', permissions: '', assignedUnitId: '' }); }} className="btn-secondary" style={{ marginLeft: 'auto', padding: '0.5rem', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <X size={16} /> Cancelar
              </button>
            )}
          </h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
            Registrar o modificar un Jefe de Personal o usuario administrativo. Esta cuenta es exclusiva para el sistema SIGEP y la gestión de la Hoja de Vida.
          </p>

          <form onSubmit={handleCreateUser} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ color: 'var(--text-secondary)', display: 'block', marginBottom: '0.5rem' }}>Nombre de Usuario (ID Lógico)</label>
                <input required disabled={!!editingUserId} value={userForm.username} onChange={e => setUserForm({...userForm, username: e.target.value})} style={{ width: '100%', padding: '0.8rem', background: 'rgba(0,0,0,0.5)', border: '1px solid var(--glass-border)', color: 'white', borderRadius: '4px' }} placeholder="ej. santiago.salazar" />
              </div>
              <div>
                <label style={{ color: 'var(--text-secondary)', display: 'block', marginBottom: '0.5rem' }}>Contraseña</label>
                <input required={!editingUserId} type="password" value={userForm.hashedPassword} onChange={e => setUserForm({...userForm, hashedPassword: e.target.value})} style={{ width: '100%', padding: '0.8rem', background: 'rgba(0,0,0,0.5)', border: '1px solid var(--glass-border)', color: 'white', borderRadius: '4px' }} placeholder={editingUserId ? "Dejar en blanco para no cambiar" : "Contraseña de red"} />
              </div>
              <div style={{ gridColumn: '1 / span 2' }}>
                <label style={{ color: 'var(--text-secondary)', display: 'block', marginBottom: '0.5rem' }}>Nombre Visible (DisplayName)</label>
                <input required value={userForm.displayName} onChange={e => setUserForm({...userForm, displayName: e.target.value})} style={{ width: '100%', padding: '0.8rem', background: 'rgba(0,0,0,0.5)', border: '1px solid var(--glass-border)', color: 'white', borderRadius: '4px' }} placeholder="Ej. CR. Santiago Salazar" />
              </div>
              <div>
                <label style={{ color: 'var(--text-secondary)', display: 'block', marginBottom: '0.5rem' }}>Rol / Nivel de Mando</label>
                <select value={userForm.role} onChange={e => setUserForm({...userForm, role: e.target.value})} style={{ width: '100%', padding: '0.8rem', background: 'rgba(0,0,0,0.5)', border: '1px solid var(--glass-border)', color: 'white', borderRadius: '4px' }}>
                  <option value="COMANDANTE_COMPANIA">Jefe de Personal de Compañía</option>
                  <option value="COMANDANTE_BATALLON">Jefe de Personal de Batallón</option>
                  <option value="COMANDANTE_BRIGADA">Jefe de Personal de Brigada</option>
                  <option value="COMANDANTE_DIVISION">Jefe de Personal de División</option>
                  <option value="COMANDANTE_EJERCITO">Jefe de Personal de Ejército</option>
                  <option value="ADMINISTRATOR">Super Administrador de Red</option>
                </select>
              </div>
              <div>
                <label style={{ color: 'var(--text-secondary)', display: 'block', marginBottom: '0.5rem' }}>Asignación a Unidad</label>
                <select required value={userForm.assignedUnitId} onChange={e => setUserForm({...userForm, assignedUnitId: e.target.value})} style={{ width: '100%', padding: '0.8rem', background: 'rgba(0,0,0,0.5)', border: '1px solid var(--glass-border)', color: 'white', borderRadius: '4px' }}>
                  <option value="" disabled>Seleccione una unidad operativa</option>
                  <option value="NATIONAL">Comando Central (Nivel Nacional)</option>
                  {units.filter(u => u.type !== 'PELOTON').map(u => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </select>
              </div>
            </div>
            
            <button type="submit" disabled={loadingUser} className="btn-primary" style={{ padding: '1rem', marginTop: '1rem', fontSize: '1.1rem' }}>
              {loadingUser ? 'Cifrando...' : (editingUserId ? 'Actualizar Credenciales' : 'Emitir Credenciales en el Sistema')}
            </button>

            {msgUser && (
              <div style={{ padding: '1rem', background: msgUser.includes('Error') ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)', color: msgUser.includes('Error') ? 'var(--alert-danger)' : 'var(--alert-success)', border: `1px solid ${msgUser.includes('Error') ? 'var(--alert-danger)' : 'var(--alert-success)'}`, borderRadius: '4px' }}>
                {msgUser}
              </div>
            )}
          </form>

          <h3 style={{ color: 'var(--accent-cyan)', marginTop: '3rem', marginBottom: '1rem', borderBottom: '1px solid rgba(0,240,255,0.3)', paddingBottom: '0.5rem' }}>Directorio de Usuarios Activos</h3>
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Nombre de Usuario</th>
                  <th>Nombre Visible</th>
                  <th>Rol</th>
                  <th>ID Unidad Asignada</th>
                  <th style={{ textAlign: 'right' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {users.length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>No hay usuarios registrados. Usa el formulario de arriba para crear uno.</td>
                  </tr>
                ) : (
                  users.map(u => (
                    <tr key={u.id}>
                      <td>{u.username}</td>
                      <td>{u.displayName}</td>
                      <td><span style={{ background: 'rgba(0, 240, 255, 0.1)', color: 'var(--accent-cyan)', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.8rem' }}>{u.role}</span></td>
                      <td>{u.assignedUnitId}</td>
                      <td style={{ textAlign: 'right' }}>
                        <button onClick={() => handleEditUser(u)} className="btn-icon" style={{ marginRight: '0.5rem', color: 'var(--accent-cyan)', background: 'transparent', border: 'none', cursor: 'pointer' }} title="Editar">
                          <Edit size={18} />
                        </button>
                        <button onClick={() => handleDeleteUser(u.id)} className="btn-icon" style={{ color: 'var(--alert-danger)', background: 'transparent', border: 'none', cursor: 'pointer' }} title="Eliminar">
                          <Trash2 size={18} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
}
