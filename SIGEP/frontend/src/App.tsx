import React, { useState } from 'react';
import './index.css';
import { useAuth } from './AuthContext';
import Login from './components/Login';
import AnalysisDashboard from './pages/AnalysisDashboard';
import Recomendaciones from './components/Recomendaciones';
import Informes from './components/Informes';
import TrasladoOficiales from './components/TrasladoOficiales';
import TrasladoSuboficiales from './components/TrasladoSuboficiales';
import TrasladoSoldados from './components/TrasladoSoldados';
import Configuracion from './components/Configuracion';
import ConsultaPersonal from './components/ConsultaPersonal';
import { LayoutDashboard, AlertTriangle, FileBarChart, Shield, Users, Target, LogOut, Settings, Search } from 'lucide-react';

function App() {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('analisis');

  if (!user) {
    return <Login />;
  }

  // Identificador visual de la unidad (Ej. GESTOR_BAEEV4 -> BAEEV4)
  const unidadTexto = user.unitId === 'NATIONAL' ? 'Nacional' : user.unitId;

  return (
    <div className="app-container">
      
      {/* Sidebar Clonado de SIMCOP */}
      <aside className="sidebar">
        <div style={{ padding: '2rem 1.5rem', borderBottom: '1px solid var(--glass-border)' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0, letterSpacing: '2px', fontFamily: 'Orbitron' }}>
            SIGEP <span style={{ color: 'var(--accent-cyan)' }}>LIVE</span>
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: '0.5rem', textTransform: 'uppercase' }}>
            Nivel: {unidadTexto} ({user.role.replace('ROLE_', '')})
          </p>
        </div>

        <nav style={{ flex: 1, padding: '1rem 0', display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
          <div style={{ padding: '0.5rem 1.5rem', fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: '1rem' }}>
            Operaciones J1/G1/S1
          </div>
          
          <button className={`nav-item ${activeTab === 'analisis' ? 'active' : ''}`} onClick={() => setActiveTab('analisis')} style={{ width: '100%', background: 'transparent', border: 'none', textAlign: 'left' }}>
            <LayoutDashboard size={18} /> Módulo de Análisis
          </button>
          
          <button className={`nav-item ${activeTab === 'recomendaciones' ? 'active' : ''}`} onClick={() => setActiveTab('recomendaciones')} style={{ width: '100%', background: 'transparent', border: 'none', textAlign: 'left' }}>
            <AlertTriangle size={18} /> Recomendaciones
          </button>

          <button className={`nav-item ${activeTab === 'informes' ? 'active' : ''}`} onClick={() => setActiveTab('informes')} style={{ width: '100%', background: 'transparent', border: 'none', textAlign: 'left' }}>
            <FileBarChart size={18} /> Informes y Parte Diario
          </button>

          <button className={`nav-item ${activeTab === 'consulta-personal' ? 'active' : ''}`} onClick={() => setActiveTab('consulta-personal')} style={{ width: '100%', background: 'transparent', border: 'none', textAlign: 'left' }}>
            <Search size={18} /> Gestión de Personal (Hoja de Vida)
          </button>

          <div style={{ padding: '0.5rem 1.5rem', fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: '1.5rem' }}>
            Workflow de Traslados
          </div>

          <button className={`nav-item ${activeTab === 'oficiales' ? 'active' : ''}`} onClick={() => setActiveTab('oficiales')} style={{ width: '100%', background: 'transparent', border: 'none', textAlign: 'left' }}>
            <Shield size={18} /> Oficiales
          </button>

          <button className={`nav-item ${activeTab === 'suboficiales' ? 'active' : ''}`} onClick={() => setActiveTab('suboficiales')} style={{ width: '100%', background: 'transparent', border: 'none', textAlign: 'left' }}>
            <Users size={18} /> Suboficiales
          </button>

          <button className={`nav-item ${activeTab === 'soldados' ? 'active' : ''}`} onClick={() => setActiveTab('soldados')} style={{ width: '100%', background: 'transparent', border: 'none', textAlign: 'left' }}>
            <Target size={18} /> Soldados
          </button>

          {(user.role === 'ROLE_EJERCITO' || user.role === 'ROLE_ADMINISTRATOR' || user.role.includes('ROLE_COMANDANTE_')) && (
            <div style={{ marginTop: 'auto' }}>
              <button className={`nav-item ${activeTab === 'configuracion' ? 'active' : ''}`} onClick={() => setActiveTab('configuracion')} style={{ width: '100%', background: 'transparent', border: 'none', textAlign: 'left' }}>
                <Settings size={18} /> Configuración
              </button>
            </div>
          )}
        </nav>

        <div style={{ padding: '1rem', borderTop: '1px solid var(--glass-border)' }}>
          <button onClick={logout} className="nav-item" style={{ width: '100%', background: 'transparent', border: 'none', textAlign: 'left', color: 'var(--alert-danger)' }}>
            <LogOut size={18} /> Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="main-content" style={{ padding: '2rem' }}>
        {activeTab === 'analisis' && <AnalysisDashboard />}
        {activeTab === 'recomendaciones' && <Recomendaciones unitId={user.unitId} role={user.role} />}
        {activeTab === 'informes' && <Informes unitId={user.unitId} role={user.role} />}
        {activeTab === 'consulta-personal' && <ConsultaPersonal unitId={user.unitId} role={user.role} />}
        {activeTab === 'oficiales' && <TrasladoOficiales unitId={user.unitId} role={user.role} />}
        {activeTab === 'suboficiales' && <TrasladoSuboficiales unitId={user.unitId} role={user.role} />}
        {activeTab === 'soldados' && <TrasladoSoldados unitId={user.unitId} role={user.role} />}
        {activeTab === 'configuracion' && <Configuracion role={user.role} />}
      </main>

    </div>
  );
}

export default App;
