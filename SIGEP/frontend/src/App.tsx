import React, { useState } from 'react';
import './index.css';
import { useAuth } from './AuthContext';
import { UnitProvider, useUnit } from './UnitContext';
import type { NavigationTab } from './types/sigep';
import Login from './components/Login';
import TacticalNavbar from './components/TacticalNavbar';
import Sidebar from './components/Sidebar';
import AnalysisDashboard from './components/AnalysisDashboard';
import Recomendaciones from './components/Recomendaciones';
import Informes from './components/Informes';
import ConsultaPersonal from './components/ConsultaPersonal';
import ConsolaTraslados from './components/ConsolaTraslados';
import Configuracion from './components/Configuracion';
import CargaMasivaPersonal from './components/CargaMasivaPersonal';


/**
 * Inner Authenticated Layout:
 * Consumes UnitContext for reactive unit scoping and tactical navigation.
 */
function AuthenticatedApp() {
  const { user } = useAuth();
  const { selectedUnitId } = useUnit();
  const [activeTab, setActiveTab] = useState<NavigationTab>('analisis');
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);

  if (!user) return null;

  // Reactively propagate selected unit or fallback to assigned unit
  const effectiveUnitId = selectedUnitId || user.unitId;

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#0d1117] text-gray-100 font-sans">
      
      {/* 1. Persistent Tactical Topbar */}
      <TacticalNavbar 
        onToggleMobileDrawer={() => setIsMobileDrawerOpen(prev => !prev)}
        isMobileDrawerOpen={isMobileDrawerOpen}
        onOpenCargaMasiva={() => setActiveTab('carga-masiva')}
      />

      {/* 2. Main Layout Container: Sidebar + Content Canvas */}
      <div className="flex-1 flex overflow-hidden relative">
        
        {/* Responsive Military Sidebar */}
        <Sidebar 
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          isMobileDrawerOpen={isMobileDrawerOpen}
          setIsMobileDrawerOpen={setIsMobileDrawerOpen}
        />

        {/* Central Tactical Content Canvas */}
        <main className="flex-1 overflow-y-auto custom-scrollbar p-3 sm:p-4 md:p-6 relative bg-gradient-to-br from-slate-950 via-[#0d1117] to-slate-900">
          {activeTab === 'analisis' && (
            <AnalysisDashboard unitId={effectiveUnitId} />
          )}

          {activeTab === 'recomendaciones' && (
            <Recomendaciones unitId={effectiveUnitId} role={user.role} />
          )}

          {activeTab === 'informes' && (
            <Informes unitId={effectiveUnitId} role={user.role} />
          )}

          {activeTab === 'consulta-personal' && (
            <ConsultaPersonal unitId={effectiveUnitId} role={user.role} />
          )}

          {activeTab === 'carga-masiva' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
                <div>
                  <h1 className="text-xl sm:text-2xl font-bold font-mono text-cyan-300 flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />
                    Carga Masiva de Personal Militar
                  </h1>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Módulo de ingestión masiva de efectivos para {effectiveUnitId} mediante planillas Excel (.xlsx, .xls), CSV o listados rápidos.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('consulta-personal')}
                  className="self-start sm:self-auto px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-mono text-cyan-300 transition-colors"
                >
                  Ver Expedientes Registrados →
                </button>
              </div>
              <CargaMasivaPersonal
                unitId={effectiveUnitId}
                onSuccess={() => setActiveTab('consulta-personal')}
                onCancel={() => setActiveTab('consulta-personal')}
              />
            </div>
          )}

          {activeTab === 'traslados' && (
            <ConsolaTraslados unitId={effectiveUnitId} role={user.role} initialCategory="TODOS" />
          )}

          {/* Backward compatibility routes for legacy tab keys */}
          {activeTab === 'oficiales' && (
            <ConsolaTraslados unitId={effectiveUnitId} role={user.role} initialCategory="OFICIAL" />
          )}

          {activeTab === 'suboficiales' && (
            <ConsolaTraslados unitId={effectiveUnitId} role={user.role} initialCategory="SUBOFICIAL" />
          )}

          {activeTab === 'soldados' && (
            <ConsolaTraslados unitId={effectiveUnitId} role={user.role} initialCategory="SOLDADO" />
          )}

          {activeTab === 'configuracion' && (
            <Configuracion role={user.role} />
          )}
        </main>

      </div>

    </div>
  );
}

/**
 * Root Application Component
 */
export function App() {
  const { user } = useAuth();

  if (!user) {
    return <Login />;
  }

  return (
    <UnitProvider>
      <AuthenticatedApp />
    </UnitProvider>
  );
}

export default App;
