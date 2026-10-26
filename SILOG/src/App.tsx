import React, { useState } from 'react';
import { silogService } from './services/silogService';
import { silogAuthService } from './services/silogAuthService';
import { MilitaryWarehouse, SilogUser } from './types';
import { NavbarSILOG } from './components/NavbarSILOG';
import { LoginSILOG } from './components/LoginSILOG';
import { AlmacenesHierarchyView } from './components/AlmacenesHierarchyView';
import { ArmamentoClaseV } from './components/ArmamentoClaseV';
import { IntendenciaClaseII } from './components/IntendenciaClaseII';
import { AlimentacionClaseI } from './components/AlimentacionClaseI';
import { SanidadClaseVIII } from './components/SanidadClaseVIII';
import { ComunicacionesView } from './components/ComunicacionesView';
import { MaterialEspecialView } from './components/MaterialEspecialView';
import { KardexPersonalView } from './components/KardexPersonalView';
import { PelotonCombatPowerView } from './components/PelotonCombatPowerView';
import { PazYSalvoModal } from './components/PazYSalvoModal';

export const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<SilogUser | null>(silogAuthService.getCurrentUser());
  const warehouses = silogService.getWarehouses();
  const allowedWarehouses = currentUser 
    ? silogAuthService.getAllowedWarehouses(currentUser, warehouses)
    : warehouses;

  const [selectedWarehouse, setSelectedWarehouse] = useState<MilitaryWarehouse>(() => {
    if (currentUser?.warehouseId) {
      const match = warehouses.find(w => w.id === currentUser.warehouseId);
      if (match) return match;
    }
    return allowedWarehouses[0] || warehouses[0];
  });
  const [activeTab, setActiveTab] = useState<string>('PANORAMA');
  const [pazYSalvoSoldierId, setPazYSalvoSoldierId] = useState<string | null>(null);

  // Si no hay usuario militar autenticado, mostrar pantalla de acceso de SILOG
  if (!currentUser) {
    return (
      <LoginSILOG 
        onLoginSuccess={(user) => {
          setCurrentUser(user);
          const userAllowed = silogAuthService.getAllowedWarehouses(user, warehouses);
          if (user.warehouseId) {
            const match = warehouses.find(w => w.id === user.warehouseId);
            if (match) setSelectedWarehouse(match);
            else if (userAllowed.length > 0) setSelectedWarehouse(userAllowed[0]);
          } else if (userAllowed.length > 0) {
            setSelectedWarehouse(userAllowed[0]);
          }
          setActiveTab('PANORAMA');
        }} 
      />
    );
  }

  const handleLogout = () => {
    silogAuthService.logout();
    setCurrentUser(null);
  };

  const weapons = silogService.getWeapons(selectedWarehouse.id);
  const ammoLots = silogService.getAmmoLots(selectedWarehouse.id);
  const armors = silogService.getArmors(selectedWarehouse.id);
  const rations = silogService.getRations(selectedWarehouse.id);
  const comms = silogService.getComms(selectedWarehouse.id);
  const optronics = silogService.getOptronics(selectedWarehouse.id);
  const sanity = silogService.getSanityItems(selectedWarehouse.id);
  const profiles = silogService.getAllKardexProfiles();
  const capability = silogService.calculatePlatoonCombatCapability();

  return (
    <div className="min-h-screen bg-[#070a0f] text-slate-100 flex flex-col font-sans selection:bg-amber-500 selection:text-slate-950">
      <NavbarSILOG
        selectedWarehouse={selectedWarehouse}
        warehouses={allowedWarehouses}
        onSelectWarehouse={setSelectedWarehouse}
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        currentUser={currentUser}
        onLogout={handleLogout}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 space-y-6">
        {/* TAB PANORAMA GENERAL */}
        {activeTab === 'PANORAMA' && (
          <div className="space-y-6 animate-in fade-in">
            {/* Banner Superior de Estado M2M */}
            <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-amber-950/40 border border-slate-800 rounded-2xl p-6 flex flex-wrap items-center justify-between gap-4">
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-amber-400 font-mono tracking-widest uppercase">
                  CENTRO DE OPERACIONES LOGÍSTICAS MILITARES
                </span>
                <h2 className="text-xl font-black text-white">
                  {selectedWarehouse.name}
                </h2>
                <p className="text-xs text-slate-400">
                  Jurisdicción: <span className="text-amber-300 font-semibold">{selectedWarehouse.municipality}, {selectedWarehouse.department}</span> | 
                  Comandante: <span className="text-slate-200">{selectedWarehouse.commanderInCharge}</span>
                </p>
              </div>

              <div className="flex items-center gap-3">
                <div className="bg-slate-950/90 border border-slate-800 p-3 px-4 rounded-xl text-center">
                  <span className="text-[10px] text-slate-400 block font-mono">ENLACE SIGEP</span>
                  <span className="text-xs font-bold text-emerald-400">● 100% ONLINE</span>
                </div>
                <div className="bg-slate-950/90 border border-slate-800 p-3 px-4 rounded-xl text-center">
                  <span className="text-[10px] text-slate-400 block font-mono">TELEMETRÍA SIMCOP</span>
                  <span className="text-xs font-bold text-cyan-400">● SINCRONIZADA</span>
                </div>
              </div>
            </div>

            {/* Mosaico de las 6 Clases Doctrinales */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              <div onClick={() => setActiveTab('CLASE_V')} className="bg-slate-900/80 border border-slate-800 hover:border-amber-500/50 p-4 rounded-xl cursor-pointer transition text-center space-y-1">
                <span className="text-2xl block">🔫</span>
                <span className="text-base font-black text-white font-mono">{weapons.length}</span>
                <p className="text-[11px] font-bold text-slate-300">Clase V (Armas)</p>
                <p className="text-[9px] text-slate-500">Fusiles y Apoyo</p>
              </div>

              <div onClick={() => setActiveTab('CLASE_II')} className="bg-slate-900/80 border border-slate-800 hover:border-amber-500/50 p-4 rounded-xl cursor-pointer transition text-center space-y-1">
                <span className="text-2xl block">🛡️</span>
                <span className="text-base font-black text-white font-mono">{armors.length}</span>
                <p className="text-[11px] font-bold text-slate-300">Clase II (Blindaje)</p>
                <p className="text-[9px] text-slate-500">Chalecos IV y Cascos</p>
              </div>

              <div onClick={() => setActiveTab('CLASE_I')} className="bg-slate-900/80 border border-slate-800 hover:border-amber-500/50 p-4 rounded-xl cursor-pointer transition text-center space-y-1">
                <span className="text-2xl block">🍱</span>
                <span className="text-base font-black text-white font-mono">{rations.reduce((a, c) => a + c.quantityOnHand, 0).toLocaleString()}</span>
                <p className="text-[11px] font-bold text-slate-300">Clase I (Raciones)</p>
                <p className="text-[9px] text-emerald-400">Autonomía asegurada</p>
              </div>

              <div onClick={() => setActiveTab('CLASE_VIII')} className="bg-slate-900/80 border border-slate-800 hover:border-amber-500/50 p-4 rounded-xl cursor-pointer transition text-center space-y-1">
                <span className="text-2xl block">🩹</span>
                <span className="text-base font-black text-white font-mono">{sanity.length}</span>
                <p className="text-[11px] font-bold text-slate-300">Clase VIII (Sanidad)</p>
                <p className="text-[9px] text-slate-500">IFAKs y Torniquetes</p>
              </div>

              <div onClick={() => setActiveTab('COMUNICACIONES')} className="bg-slate-900/80 border border-slate-800 hover:border-amber-500/50 p-4 rounded-xl cursor-pointer transition text-center space-y-1">
                <span className="text-2xl block">📻</span>
                <span className="text-base font-black text-white font-mono">{comms.length}</span>
                <p className="text-[11px] font-bold text-slate-300">Comunicaciones</p>
                <p className="text-[9px] text-cyan-400">Harris Falcon III</p>
              </div>

              <div onClick={() => setActiveTab('ESPECIAL')} className="bg-slate-900/80 border border-slate-800 hover:border-amber-500/50 p-4 rounded-xl cursor-pointer transition text-center space-y-1">
                <span className="text-2xl block">👁️</span>
                <span className="text-base font-black text-white font-mono">{optronics.length}</span>
                <p className="text-[11px] font-bold text-slate-300">Material Especial</p>
                <p className="text-[9px] text-slate-500">PVS-14 & Drones</p>
              </div>
            </div>

            {/* Componente Destacado: Poder de Combate Real */}
            <PelotonCombatPowerView capability={capability} />
          </div>
        )}

        {activeTab === 'ALMACENES' && (
          <AlmacenesHierarchyView
            warehouses={warehouses}
            selectedWarehouse={selectedWarehouse}
            onSelectWarehouse={setSelectedWarehouse}
          />
        )}

        {activeTab === 'CLASE_V' && (
          <ArmamentoClaseV weapons={weapons} ammoLots={ammoLots} />
        )}

        {activeTab === 'CLASE_II' && (
          <IntendenciaClaseII armors={armors} />
        )}

        {activeTab === 'CLASE_I' && (
          <AlimentacionClaseI rations={rations} />
        )}

        {activeTab === 'CLASE_VIII' && (
          <SanidadClaseVIII sanityItems={sanity} />
        )}

        {activeTab === 'COMUNICACIONES' && (
          <ComunicacionesView comms={comms} />
        )}

        {activeTab === 'ESPECIAL' && (
          <MaterialEspecialView optronics={optronics} />
        )}

        {activeTab === 'KARDEX_PERSONAL' && (
          <KardexPersonalView
            profiles={profiles}
            onOpenPazYSalvo={(id) => setPazYSalvoSoldierId(id)}
          />
        )}

        {activeTab === 'PODER_FUEGO' && (
          <PelotonCombatPowerView capability={capability} />
        )}
      </main>

      <PazYSalvoModal
        soldierId={pazYSalvoSoldierId}
        onClose={() => setPazYSalvoSoldierId(null)}
      />
    </div>
  );
};

export default App;
