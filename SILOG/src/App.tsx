import React, { useState, useEffect } from 'react';
import { silogService } from './services/silogService';
import { silogAuthService } from './services/silogAuthService';
import { MilitaryWarehouse, SilogUser } from './types';
import { NavbarSILOG } from './components/NavbarSILOG';
import { LoginSILOG } from './components/LoginSILOG';
import { AlmacenesHierarchyView } from './components/AlmacenesHierarchyView';
import { CadenaDistribucionView } from './components/CadenaDistribucionView';
import { ArmamentoClaseV } from './components/ArmamentoClaseV';
import { IntendenciaClaseII } from './components/IntendenciaClaseII';
import { AlimentacionClaseI } from './components/AlimentacionClaseI';
import { SanidadClaseVIII } from './components/SanidadClaseVIII';
import { ComunicacionesView } from './components/ComunicacionesView';
import { MaterialEspecialView } from './components/MaterialEspecialView';
import { KardexPersonalView } from './components/KardexPersonalView';
import { PelotonCombatPowerView } from './components/PelotonCombatPowerView';
import { PazYSalvoModal } from './components/PazYSalvoModal';
import { IngresoMaterialModal } from './components/IngresoMaterialModal';
import { MovimientoMaterialModal } from './components/MovimientoMaterialModal';
import { SapIngresoMasivoModal } from './components/SapIngresoMasivoModal';

export const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<SilogUser | null>(silogAuthService.getCurrentUser());
  const [refreshKey, setRefreshKey] = useState<number>(0);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Sincronización en vivo con Unidades Militares creadas en SIMCOP
  useEffect(() => {
    silogService.syncWithSimcop().then(syncedWarehouses => {
      if (syncedWarehouses && syncedWarehouses.length > 0) {
        setSelectedWarehouse(prev => {
          const match = syncedWarehouses.find(w => w.id === prev?.id);
          return match || syncedWarehouses[0];
        });
        setRefreshKey(k => k + 1);
      }
    });

    const unsubscribe = silogService.subscribe(() => {
      const live = silogService.getWarehouses();
      if (live && live.length > 0) {
        setSelectedWarehouse(prev => {
          const match = live.find(w => w.id === prev?.id);
          return match || live[0];
        });
      }
      setRefreshKey(k => k + 1);
    });

    return unsubscribe;
  }, []);

  // Estados del modal de Ingreso de Material (Solo Bodegueros / Almacenistas)
  const [isAddMaterialOpen, setIsAddMaterialOpen] = useState<boolean>(false);
  const [addMaterialCategory, setAddMaterialCategory] = useState<string>('CLASE_V_ARMA');
  const [targetWarehouseId, setTargetWarehouseId] = useState<string>('');

  // Estados del modal de Importación Masiva SAP MM (Solo Almacenistas Centralizadores BASPC)
  const [isSapModalOpen, setIsSapModalOpen] = useState<boolean>(false);

  // Estados del modal de Movimiento y Asignación Doctrinal
  const [isMovementModalOpen, setIsMovementModalOpen] = useState<boolean>(false);
  const [movementCategory, setMovementCategory] = useState<string>('CLASE_V_ARMA');
  const [movementItemId, setMovementItemId] = useState<string>('');
  const [movementItemDesc, setMovementItemDesc] = useState<string>('');
  const [movementWarehouseId, setMovementWarehouseId] = useState<string>('');
  const [movementCompanyId, setMovementCompanyId] = useState<string | undefined>(undefined);
  const [movementSoldierId, setMovementSoldierId] = useState<string | undefined>(undefined);

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

  // Si no hay usuario militar autenticado, mostrar pantalla de acceso de SILOGA
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

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4500);
  };

  const handleOpenAddMaterial = (cat?: string, whId?: string) => {
    setAddMaterialCategory(cat || 'CLASE_V_ARMA');
    setTargetWarehouseId(whId || selectedWarehouse.id);
    setIsAddMaterialOpen(true);
  };

  const handleMaterialAdded = (message: string) => {
    setRefreshKey(prev => prev + 1);
    showToast(message);
  };

  const handleOpenMovementModal = (params: {
    category: string;
    itemId: string;
    itemDescription: string;
    warehouseId?: string;
    companyId?: string;
    soldierId?: string;
  }) => {
    setMovementCategory(params.category);
    setMovementItemId(params.itemId);
    setMovementItemDesc(params.itemDescription);
    setMovementWarehouseId(params.warehouseId || selectedWarehouse.id);
    setMovementCompanyId(params.companyId);
    setMovementSoldierId(params.soldierId);
    setIsMovementModalOpen(true);
  };

  const handleMovementSuccess = (message: string) => {
    setRefreshKey(prev => prev + 1);
    showToast(message);
  };

  const canIngest = silogAuthService.canIngestMaterial(currentUser);

  // Re-fetch dinámico utilizando refreshKey como dependencia implícita
  const weapons = silogService.getWeapons(selectedWarehouse.id);
  const ammoLots = silogService.getAmmoLots(selectedWarehouse.id);
  const armors = silogService.getArmors(selectedWarehouse.id);
  const rations = silogService.getRations(selectedWarehouse.id);
  const comms = silogService.getComms(selectedWarehouse.id);
  const optronics = silogService.getOptronics(selectedWarehouse.id);
  const sanity = silogService.getSanityItems(selectedWarehouse.id);
  const profiles = silogService.getAllKardexProfiles();
  const capability = silogService.calculatePlatoonCombatCapability();

  const totalAmmoCount = ammoLots.reduce((acc, c) => acc + c.quantityRounds, 0);
  const totalRationsCount = rations.reduce((acc, c) => acc + c.quantityOnHand, 0);

  return (
    <div key={refreshKey} className="min-h-screen bg-[#070a0f] text-slate-100 flex flex-col font-sans selection:bg-amber-500 selection:text-slate-950">
      <NavbarSILOG
        selectedWarehouse={selectedWarehouse}
        warehouses={allowedWarehouses}
        onSelectWarehouse={setSelectedWarehouse}
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        currentUser={currentUser}
        onLogout={handleLogout}
        onOpenAddMaterial={() => handleOpenAddMaterial('CLASE_V_ARMA')}
        onOpenSapModal={() => setIsSapModalOpen(true)}
      />

      {/* Banner flotante de notificación de éxito */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-5 duration-300">
          <div className="bg-emerald-950/95 border border-emerald-500/60 text-emerald-100 px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 backdrop-blur-md">
            <span className="text-xl">✅</span>
            <div className="text-xs">
              <span className="font-bold text-white block">MOVIMIENTO LOGÍSTICO REGISTRADO</span>
              <span>{toastMessage}</span>
            </div>
            <button 
              onClick={() => setToastMessage(null)}
              className="ml-2 text-slate-400 hover:text-white text-xs font-bold"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Main Full-Width Container */}
      <main className="flex-1 w-full max-w-[1920px] mx-auto px-4 md:px-6 lg:px-8 py-5 space-y-6">
        {/* TAB PANORAMA GENERAL */}
        {activeTab === 'PANORAMA' && (
          <div className="space-y-6 animate-in fade-in">
            {/* Banner Superior de Estado M2M y Almacén Activo */}
            <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-amber-950/40 border border-slate-800 rounded-2xl p-5 md:p-6 flex flex-wrap items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-amber-400 font-mono tracking-widest uppercase bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                    CENTRO DE OPERACIONES LOGÍSTICAS MILITARES
                  </span>
                  <span className="text-[10px] font-bold text-blue-400 font-mono bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
                    {selectedWarehouse.brigadeId || 'BRIGADA'}
                  </span>
                  <span className="text-[10px] font-bold text-emerald-400 font-mono bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                    {currentUser.roleTitle}
                  </span>
                  <a
                    href="https://siloga.site"
                    target="_blank"
                    rel="noreferrer"
                    className="text-[10px] font-mono text-cyan-400 hover:underline hidden sm:inline"
                  >
                    siloga.site
                  </a>
                </div>
                <h2 className="text-2xl font-black text-white">
                  {selectedWarehouse.name}
                </h2>
                <p className="text-xs text-slate-400">
                  Jurisdicción: <span className="text-amber-300 font-semibold">{selectedWarehouse.municipality}, {selectedWarehouse.department}</span> | 
                  Comandante: <span className="text-slate-200">{selectedWarehouse.commanderInCharge}</span> |
                  Almacenista: <span className="text-slate-200">{selectedWarehouse.storekeeperName}</span>
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {canIngest ? (
                  <button
                    onClick={() => handleOpenAddMaterial('CLASE_V_ARMA')}
                    className="px-4 py-2.5 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-amber-950/50 transition-all flex items-center gap-2 border border-amber-400/50 active:scale-95"
                  >
                    <span>➕</span>
                    <span>Ingresar Material al Depósito</span>
                  </button>
                ) : (
                  <div className="bg-slate-950/80 border border-slate-800 p-2.5 px-4 rounded-xl text-left">
                    <span className="text-[10px] text-slate-400 block font-mono">POTESTAD DE INGRESO</span>
                    <span className="text-xs font-bold text-amber-300">🔒 Exclusivo Bodega</span>
                  </div>
                )}

                <div className="bg-slate-950/90 border border-slate-800 p-2.5 px-4 rounded-xl text-center">
                  <span className="text-[10px] text-slate-400 block font-mono">ENLACE SIGEP</span>
                  <span className="text-xs font-bold text-emerald-400">● 100% ONLINE</span>
                </div>
                <div className="bg-slate-950/90 border border-slate-800 p-2.5 px-4 rounded-xl text-center">
                  <span className="text-[10px] text-slate-400 block font-mono">TELEMETRÍA SIMCOP</span>
                  <span className="text-xs font-bold text-cyan-400">● SINCRONIZADA</span>
                </div>
              </div>
            </div>

            {/* Mosaico de las 6 Clases Doctrinales (Alta densidad full-width) */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
              <div 
                onClick={() => setActiveTab('CLASE_V')} 
                className="bg-slate-900/80 border border-slate-800 hover:border-amber-500/50 p-4 rounded-xl cursor-pointer transition text-center space-y-1.5 hover:bg-slate-850 group"
              >
                <span className="text-2xl block group-hover:scale-110 transition-transform">🔫</span>
                <span className="text-xl font-black text-white font-mono">{weapons.length}</span>
                <p className="text-xs font-bold text-slate-200">Clase V (Armas)</p>
                <p className="text-[10px] text-slate-400">{(totalAmmoCount / 1000).toFixed(0)}k tiros disp.</p>
              </div>

              <div 
                onClick={() => setActiveTab('CLASE_II')} 
                className="bg-slate-900/80 border border-slate-800 hover:border-amber-500/50 p-4 rounded-xl cursor-pointer transition text-center space-y-1.5 hover:bg-slate-850 group"
              >
                <span className="text-2xl block group-hover:scale-110 transition-transform">🛡️</span>
                <span className="text-xl font-black text-white font-mono">{armors.length}</span>
                <p className="text-xs font-bold text-slate-200">Clase II (Blindaje)</p>
                <p className="text-[10px] text-slate-400">Chalecos IV y Cascos</p>
              </div>

              <div 
                onClick={() => setActiveTab('CLASE_I')} 
                className="bg-slate-900/80 border border-slate-800 hover:border-amber-500/50 p-4 rounded-xl cursor-pointer transition text-center space-y-1.5 hover:bg-slate-850 group"
              >
                <span className="text-2xl block group-hover:scale-110 transition-transform">🍱</span>
                <span className="text-xl font-black text-emerald-400 font-mono">{totalRationsCount.toLocaleString()}</span>
                <p className="text-xs font-bold text-slate-200">Clase I (Raciones)</p>
                <p className="text-[10px] text-emerald-400">Autonomía asegurada</p>
              </div>

              <div 
                onClick={() => setActiveTab('CLASE_VIII')} 
                className="bg-slate-900/80 border border-slate-800 hover:border-amber-500/50 p-4 rounded-xl cursor-pointer transition text-center space-y-1.5 hover:bg-slate-850 group"
              >
                <span className="text-2xl block group-hover:scale-110 transition-transform">🩺</span>
                <span className="text-xl font-black text-white font-mono">{sanity.length}</span>
                <p className="text-xs font-bold text-slate-200">Clase VIII (Sanidad)</p>
                <p className="text-[10px] text-slate-400">IFAKs y Torniquetes</p>
              </div>

              <div 
                onClick={() => setActiveTab('COMUNICACIONES')} 
                className="bg-slate-900/80 border border-slate-800 hover:border-amber-500/50 p-4 rounded-xl cursor-pointer transition text-center space-y-1.5 hover:bg-slate-850 group"
              >
                <span className="text-2xl block group-hover:scale-110 transition-transform">📻</span>
                <span className="text-xl font-black text-white font-mono">{comms.length}</span>
                <p className="text-xs font-bold text-slate-200">Comunicaciones</p>
                <p className="text-[10px] text-cyan-400">Harris Falcon III</p>
              </div>

              <div 
                onClick={() => setActiveTab('ESPECIAL')} 
                className="bg-slate-900/80 border border-slate-800 hover:border-amber-500/50 p-4 rounded-xl cursor-pointer transition text-center space-y-1.5 hover:bg-slate-850 group"
              >
                <span className="text-2xl block group-hover:scale-110 transition-transform">🔭</span>
                <span className="text-xl font-black text-white font-mono">{optronics.length}</span>
                <p className="text-xs font-bold text-slate-200">Material Especial</p>
                <p className="text-[10px] text-slate-400">PVS-14 & Drones</p>
              </div>
            </div>

            {/* Componente Destacado: Poder de Combate Real */}
            <PelotonCombatPowerView capability={capability} />
          </div>
        )}

        {/* TAB CADENA DE SUMINISTRO Y DISTRIBUCIÓN */}
        {activeTab === 'DISTRIBUCION' && (
          <CadenaDistribucionView
            warehouses={warehouses}
            currentUser={currentUser}
            onOpenMovementModal={handleOpenMovementModal}
            onOpenSapModal={() => setIsSapModalOpen(true)}
          />
        )}

        {activeTab === 'ALMACENES' && (
          <AlmacenesHierarchyView
            warehouses={warehouses}
            selectedWarehouse={selectedWarehouse}
            onSelectWarehouse={setSelectedWarehouse}
            onOpenAddMaterial={canIngest ? (whId) => handleOpenAddMaterial('CLASE_V_ARMA', whId) : undefined}
          />
        )}

        {activeTab === 'CLASE_V' && (
          <ArmamentoClaseV 
            weapons={weapons} 
            ammoLots={ammoLots}
            onOpenAddMaterial={(cat) => handleOpenAddMaterial(cat)}
            onOpenMovementModal={handleOpenMovementModal}
          />
        )}

        {activeTab === 'CLASE_II' && (
          <IntendenciaClaseII 
            armors={armors}
            onOpenAddMaterial={(cat) => handleOpenAddMaterial(cat)}
            onOpenMovementModal={handleOpenMovementModal}
          />
        )}

        {activeTab === 'CLASE_I' && (
          <AlimentacionClaseI 
            rations={rations}
            onOpenAddMaterial={(cat) => handleOpenAddMaterial(cat)}
            onOpenMovementModal={handleOpenMovementModal}
          />
        )}

        {activeTab === 'CLASE_VIII' && (
          <SanidadClaseVIII 
            sanityItems={sanity}
            onOpenAddMaterial={(cat) => handleOpenAddMaterial(cat)}
            onOpenMovementModal={handleOpenMovementModal}
          />
        )}

        {activeTab === 'COMUNICACIONES' && (
          <ComunicacionesView 
            comms={comms}
            onOpenAddMaterial={(cat) => handleOpenAddMaterial(cat)}
            onOpenMovementModal={handleOpenMovementModal}
          />
        )}

        {activeTab === 'ESPECIAL' && (
          <MaterialEspecialView 
            optronics={optronics}
            onOpenAddMaterial={(cat) => handleOpenAddMaterial(cat)}
            onOpenMovementModal={handleOpenMovementModal}
          />
        )}

        {activeTab === 'KARDEX_PERSONAL' && (
          <KardexPersonalView
            profiles={profiles}
            onOpenPazYSalvo={(id) => setPazYSalvoSoldierId(id)}
            onOpenMovementModal={handleOpenMovementModal}
          />
        )}

        {activeTab === 'PODER_FUEGO' && (
          <PelotonCombatPowerView capability={capability} />
        )}
      </main>

      {/* Modal de Paz y Salvo Militar */}
      <PazYSalvoModal
        soldierId={pazYSalvoSoldierId}
        onClose={() => setPazYSalvoSoldierId(null)}
      />

      {/* Modal Integral de Ingreso y Alta de Material */}
      <IngresoMaterialModal
        isOpen={isAddMaterialOpen}
        onClose={() => setIsAddMaterialOpen(false)}
        warehouses={allowedWarehouses}
        currentWarehouseId={targetWarehouseId || selectedWarehouse.id}
        initialCategory={addMaterialCategory}
        onSuccess={handleMaterialAdded}
      />

      {/* Modal de Cadena de Custodia, Transferencias y Asignaciones Doctrinales */}
      <MovimientoMaterialModal
        isOpen={isMovementModalOpen}
        onClose={() => setIsMovementModalOpen(false)}
        currentUser={currentUser}
        itemCategory={movementCategory}
        itemId={movementItemId}
        itemDescription={movementItemDesc}
        currentWarehouseId={movementWarehouseId}
        currentCompanyId={movementCompanyId}
        currentSoldierId={movementSoldierId}
        onSuccess={handleMovementSuccess}
      />

      {/* Modal de Ingreso Masivo mediante Reporte SAP MM */}
      <SapIngresoMasivoModal
        isOpen={isSapModalOpen}
        onClose={() => setIsSapModalOpen(false)}
        currentUser={currentUser}
        warehouses={warehouses}
        currentWarehouseId={selectedWarehouse.id}
        onSuccess={handleMaterialAdded}
      />
    </div>
  );
};

export default App;
