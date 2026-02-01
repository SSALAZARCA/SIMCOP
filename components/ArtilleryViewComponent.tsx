import React, { useState, useEffect, useMemo } from 'react';
import type { ArtilleryPiece, ForwardObserver, SelectedEntity, MilitaryUnit, NewArtilleryPieceData, NewForwardObserverData, ActiveFireMission, ProjectileType, User, TargetSelectionRequest, UserTelegramConfig, FiringSolution, PendingFireMission } from '../types';
import { MapEntityType, UnitType, UserRole, ArtilleryType } from '../types';
import { CrosshairsIcon } from './icons/CrosshairsIcon';
import { PlusCircleIcon } from './icons/PlusCircleIcon';
import { ArtilleryPieceCard } from './ArtilleryPieceCard';
import { ForwardObserverCard } from './ForwardObserverCard';
import { ArtilleryDetailsPanel } from './ArtilleryDetailsPanel';
import { ForwardObserverDetailsPanel } from './ForwardObserverDetailsPanel';
import { ArtilleryCreationModal } from './ArtilleryCreationModal';
import { ForwardObserverCreationModal } from './ForwardObserverCreationModal';
import { AdvancedFireControlSystem } from './AdvancedFireControlSystem';
import { M101A1FireControlSystem } from './M101A1FireControlSystem';
import { LG1FireControlSystem } from './LG1FireControlSystem';
import { L119FireControlSystem } from './L119FireControlSystem';
import { M120FireControlSystem } from './M120FireControlSystem';
import { HY112FireControlSystem } from './HY112FireControlSystem';
import { TelegramConfigComponent } from './TelegramConfigComponent';
import { decimalToDMS } from '../utils/coordinateUtils';


interface ArtilleryViewProps {
  artilleryPieces: ArtilleryPiece[];
  forwardObservers: ForwardObserver[];
  activeFireMissions: ActiveFireMission[];
  pendingFireMissions: PendingFireMission[];
  allUnits: MilitaryUnit[];
  allUsers: User[];
  onSelectEntity: (entity: SelectedEntity | null) => void;
  targetSelectionRequest: TargetSelectionRequest | null;
  onCallForFire: (requester: ForwardObserver | MilitaryUnit) => void;
  onCancelFireMission: () => void;
  addArtilleryPiece: (pieceData: NewArtilleryPieceData) => void;
  deleteArtilleryPiece: (id: string) => Promise<{ success: boolean; message?: string }>;
  addForwardObserver: (observerData: NewForwardObserverData) => void;
  acceptFireMission: (pendingMissionId: string, artilleryId: string, projectileType: ProjectileType, charge: number, isMrsi: boolean, firingSolution: FiringSolution) => void;
  currentUser: User | null;
  // userTelegramConfigs prop removed
  updateUserTelegramConfig: (userId: string, chatId: string) => void;
  sendTestTelegramAlert: (chatId?: string) => Promise<boolean>;
  rejectFireMission: (pendingMissionId: string, rejectorUserId: string, reason: string) => void;
  dismissPendingMission: (missionId: string) => void;
  confirmShotFired: (missionId: string) => void;
}

type ActiveTab = 'pieces' | 'observers' | 'cdt' | 'telegram';

const TabButton: React.FC<{ active: boolean; onClick: () => void; children: React.ReactNode }> = ({ active, onClick, children }) => (
  <button
    onClick={onClick}
    className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${active
      ? 'bg-gray-800 text-white border-b-2 border-blue-500'
      : 'bg-gray-700 text-gray-400 hover:bg-gray-750 hover:text-gray-200'
      }`}
  >
    {children}
  </button>
);

export const ArtilleryViewComponent: React.FC<ArtilleryViewProps> = ({
  artilleryPieces,
  forwardObservers,
  activeFireMissions,
  pendingFireMissions,
  allUnits,
  allUsers,
  onSelectEntity,
  targetSelectionRequest,
  onCallForFire,
  onCancelFireMission,
  addArtilleryPiece,
  addForwardObserver,
  acceptFireMission,
  currentUser,
  updateUserTelegramConfig,
  sendTestTelegramAlert,
  rejectFireMission,
  dismissPendingMission,
  confirmShotFired,
}) => {
  // ...
  // ... (lines 82-273)
  // ...

  const [activeTab, setActiveTab] = useState<ActiveTab>('cdt');
  const [selectedPiece, setSelectedPiece] = useState<ArtilleryPiece | null>(null);
  const [selectedObserver, setSelectedObserver] = useState<ForwardObserver | null>(null);
  const [showCreatePieceModal, setShowCreatePieceModal] = useState(false);
  const [showCreateObserverModal, setShowCreateObserverModal] = useState(false);

  const [cdtModalState, setCdtModalState] = useState<{ type: ArtilleryType | null; mission: PendingFireMission | null }>({ type: null, mission: null });

  const handleSelectPiece = (piece: ArtilleryPiece) => {
    setSelectedPiece(piece);
    setSelectedObserver(null);
    onSelectEntity({ type: MapEntityType.ARTILLERY, id: piece.id });
  };

  const handleSelectObserver = (observer: ForwardObserver) => {
    setSelectedObserver(observer);
    setSelectedPiece(null);
    onSelectEntity({ type: MapEntityType.FORWARD_OBSERVER, id: observer.id });
  };

  const eligibleUnitsForObserver = useMemo(() => {
    return allUnits.filter(u => u.type === UnitType.PLATOON || u.type === UnitType.TEAM || u.type === UnitType.SQUAD);
  }, [allUnits]);

  const eligibleUnitsForArtillery = useMemo(() => {
    return allUnits.filter(u => u.type === UnitType.BATTALION || u.type === UnitType.BRIGADE);
  }, [allUnits]);

  useEffect(() => {
    if (activeTab !== 'pieces') setSelectedPiece(null);
    if (activeTab !== 'observers') setSelectedObserver(null);
    if (activeTab !== 'pieces' && activeTab !== 'observers') onSelectEntity(null);
  }, [activeTab, onSelectEntity]);

  const fireControlSystems = useMemo(() => [
    { type: ArtilleryType.HOWITZER_155, name: 'Obús Santa Bárbara 155/52', component: AdvancedFireControlSystem },
    { type: ArtilleryType.HOWITZER_105, name: 'Obús 105 mm M101A1', component: M101A1FireControlSystem },
    { type: ArtilleryType.HOWITZER_105_LG1, name: 'Obús 105 mm LG-1 Mk III', component: LG1FireControlSystem },
    { type: ArtilleryType.HOWITZER_105_L119, name: 'Obús BAE Systems L119', component: L119FireControlSystem },
    { type: ArtilleryType.MORTAR_120_M120, name: 'Mortero M120 de 120 mm', component: M120FireControlSystem },
    { type: ArtilleryType.MORTAR_120_HY112, name: 'Mortero HY1-12 de 120 mm', component: HY112FireControlSystem },
  ], []);

  const filteredFireControlSystems = useMemo(() => {
    if (!currentUser || !currentUser.role.startsWith('Director de Tiro')) {
      return fireControlSystems;
    }
    const roleToTypeMap: Partial<Record<UserRole, ArtilleryType>> = {
      [UserRole.DIRECTOR_TIRO_155]: ArtilleryType.HOWITZER_155,
      [UserRole.DIRECTOR_TIRO_M101A1]: ArtilleryType.HOWITZER_105,
      [UserRole.DIRECTOR_TIRO_LG1]: ArtilleryType.HOWITZER_105_LG1,
      [UserRole.DIRECTOR_TIRO_L119]: ArtilleryType.HOWITZER_105_L119,
      [UserRole.DIRECTOR_TIRO_M120]: ArtilleryType.MORTAR_120_M120,
      [UserRole.DIRECTOR_TIRO_HY112]: ArtilleryType.MORTAR_120_HY112,
    };
    const userArtilleryType = roleToTypeMap[currentUser.role as UserRole];
    if (userArtilleryType) {
      return fireControlSystems.filter(sys => sys.type === userArtilleryType);
    }
    return [];
  }, [currentUser, fireControlSystems]);

  const userPendingMissions = useMemo(() => {
    if (!currentUser) return [];

    const isHighCommandOrAdmin = currentUser.role === UserRole.ADMINISTRATOR || currentUser.role.startsWith('Comandante');

    return pendingFireMissions.filter(mission => {
      if (mission.status === 'rejected') return false; // Hide rejected missions from this view
      const piece = artilleryPieces.find(p => p.id === mission.assignedArtilleryId);
      if (!piece) return isHighCommandOrAdmin || mission.status === 'no_assets';

      if (isHighCommandOrAdmin) return true;

      if (currentUser.role.startsWith('Director de Tiro')) {
        const fdoArtilleryTypes = filteredFireControlSystems.map(s => s.type);
        return piece.directorTiroId === currentUser.id || fdoArtilleryTypes.includes(piece.type);
      }
      return false;
    });
  }, [currentUser, pendingFireMissions, filteredFireControlSystems, artilleryPieces]);


  const handleLaunchCdt = (mission: PendingFireMission) => {
    const piece = artilleryPieces.find(p => p.id === mission.assignedArtilleryId);
    if (!piece) {
      alert("Error: No se puede abrir el calculador. La pieza asignada a esta misión no fue encontrada.");
      return;
    }
    const system = fireControlSystems.find(s => s.type === piece.type);
    if (!system) {
      alert(`Error: No se encontró un sistema de cálculo para el tipo de pieza "${piece.type}".`);
      return;
    }
    setCdtModalState({ type: piece.type, mission: mission });
  };

  const handleCloseCdtModal = () => setCdtModalState({ type: null, mission: null });

  const handleRejectMission = (missionId: string) => {
    if (!currentUser) return;
    const reason = window.prompt("Ingrese el motivo para rechazar la misión:");
    if (reason && reason.trim()) {
      rejectFireMission(missionId, currentUser.id, reason.trim());
    } else if (reason !== null) {
      alert("El motivo no puede estar vacío.");
    }
  };

  return (
    <>
      <div className="flex flex-col space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-center border-b border-gray-700 pb-3 gap-2">
          <h2 className="text-xl md:text-2xl font-semibold text-gray-200 flex items-center">
            <CrosshairsIcon className="w-6 h-6 md:w-7 md:h-7 mr-2 md:mr-3 text-orange-400" />
            Artillería y Observación
          </h2>
        </div>

        <div className="flex items-end space-x-1 border-b border-gray-700">
          <TabButton active={activeTab === 'cdt'} onClick={() => setActiveTab('cdt')}>CDT (Centro Director de Tiro)</TabButton>
          <TabButton active={activeTab === 'pieces'} onClick={() => setActiveTab('pieces')}>Piezas de Artillería</TabButton>
          <TabButton active={activeTab === 'observers'} onClick={() => setActiveTab('observers')}>Observadores Adelantados</TabButton>
          {currentUser?.role === UserRole.ADMINISTRATOR && (
            <TabButton active={activeTab === 'telegram'} onClick={() => setActiveTab('telegram')}>Configuración Telegram</TabButton>
          )}
        </div>

        <div className="flex-1 bg-gray-800 p-2 md:p-4 rounded-b-lg shadow-inner">
          {activeTab === 'pieces' && (
            <div className="flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-4">
              <div className="w-full md:w-2/5 pr-0 md:pr-2">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-lg font-semibold text-gray-300">Piezas Disponibles</h3>
                  <button onClick={() => setShowCreatePieceModal(true)} className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs flex items-center"><PlusCircleIcon className="w-4 h-4 mr-1" /> Añadir Pieza</button>
                </div>
                <div className="space-y-2">
                  {artilleryPieces.map(p => <ArtilleryPieceCard key={p.id} piece={p} isSelected={selectedPiece?.id === p.id} onSelect={() => handleSelectPiece(p)} />)}
                </div>
              </div>
              <div className="w-full md:w-3/5">
                {selectedPiece ? <ArtilleryDetailsPanel piece={selectedPiece} allUsers={allUsers} activeFireMissions={activeFireMissions} confirmShotFired={confirmShotFired} currentUser={currentUser} /> : <p className="text-center text-gray-500 pt-10">Seleccione una pieza para ver detalles.</p>}
              </div>
            </div>
          )}
          {activeTab === 'observers' && (
            <div className="flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-4">
              <div className="w-full md:w-2/5 pr-0 md:pr-2">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-lg font-semibold text-gray-300">Observadores</h3>
                  <button onClick={() => setShowCreateObserverModal(true)} className="px-2 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded text-xs flex items-center"><PlusCircleIcon className="w-4 h-4 mr-1" /> Añadir OA</button>
                </div>
                <div className="space-y-2">
                  {forwardObservers.map(o => <ForwardObserverCard key={o.id} observer={o} isSelected={selectedObserver?.id === o.id} onSelect={() => handleSelectObserver(o)} />)}
                </div>
              </div>
              <div className="w-full md:w-3/5">
                {selectedObserver ? <ForwardObserverDetailsPanel observer={selectedObserver} artilleryPieces={artilleryPieces} targetSelectionRequest={targetSelectionRequest} onCallForFire={onCallForFire} onCancelFireMission={onCancelFireMission} allUsers={allUsers} pendingFireMissions={pendingFireMissions.filter(p => p.requesterId === selectedObserver.id)} dismissPendingMission={dismissPendingMission} /> : <p className="text-center text-gray-500 pt-10">Seleccione un observador para ver detalles.</p>}
              </div>
            </div>
          )}
          {activeTab === 'cdt' && (
            <div>
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-gray-300 mb-2 border-b border-gray-700 pb-2">Misiones de Fuego Pendientes</h3>
                <div className="max-h-96 overflow-y-auto space-y-2 pr-1">
                  {userPendingMissions.length === 0 ? (
                    <p className="text-gray-500">No hay misiones pendientes asignadas.</p>
                  ) : (
                    userPendingMissions.map(mission => (
                      <div key={mission.id} className={`p-2 rounded-md ${mission.status === 'no_assets' ? 'bg-red-900/50' : 'bg-gray-750'}`}>
                        <p className="text-sm font-medium text-white">Blanco: {decimalToDMS(mission.target)}</p>
                        <div className="text-xs text-gray-400 flex justify-between items-center mt-1">
                          <span>Solicitante: {allUsers.find(u => u.id === mission.requesterId)?.displayName || allUnits.find(u => u.id === mission.requesterId)?.name || 'Desconocido'}</span>
                          <div className="flex space-x-2">
                            {mission.assignedArtilleryId && mission.status === 'pending' && (
                              <button onClick={() => handleRejectMission(mission.id)} className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white text-xs rounded shadow-md">Rechazar</button>
                            )}
                            {mission.assignedArtilleryId && mission.status === 'pending' ? (
                              <button onClick={() => handleLaunchCdt(mission)} className="px-2 py-1 bg-orange-600 hover:bg-orange-700 text-white text-xs rounded shadow-md">Procesar Misión</button>
                            ) : (
                              <span className="px-2 py-1 bg-red-800 text-red-300 text-xs rounded shadow-md">Sin Piezas Disponibles</span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
          {activeTab === 'telegram' && currentUser?.role === UserRole.ADMINISTRATOR && (
            <TelegramConfigComponent
              allUsers={allUsers}
              onUpdateConfig={updateUserTelegramConfig}
              onSendTest={sendTestTelegramAlert}
              artilleryPieces={artilleryPieces}
            />
          )}
        </div>
      </div>

      {/* Modals */}
      <ArtilleryCreationModal isOpen={showCreatePieceModal} onClose={() => setShowCreatePieceModal(false)} addArtilleryPiece={addArtilleryPiece} eligibleParentUnits={eligibleUnitsForArtillery} allUsers={allUsers} />
      <ForwardObserverCreationModal isOpen={showCreateObserverModal} onClose={() => setShowCreateObserverModal(false)} addForwardObserver={addForwardObserver} eligibleUnitsForObserver={eligibleUnitsForObserver} allUsers={allUsers} />

      {/* Fire Control System Modals */}
      {fireControlSystems.map(sys => {
        const matchingPieces = artilleryPieces.filter(p => p.type === sys.type);
        return (
          <sys.component
            key={sys.type}
            isOpen={cdtModalState.type === sys.type}
            onClose={handleCloseCdtModal}
            pendingMission={cdtModalState.mission}
            artilleryPieces={matchingPieces}
            allUnits={allUnits}
            forwardObservers={forwardObservers}
            acceptFireMission={acceptFireMission}
          />
        )
      })}
    </>
  );
};
