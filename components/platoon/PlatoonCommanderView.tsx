import React, { useState, useMemo, useCallback, useRef } from 'react';
import type { User, MilitaryUnit, OperationsOrder, ArtilleryPiece, TargetSelectionRequest, UnitHistoryEvent, ForwardObserver, SelectedEntity, GeoLocation, ActiveFireMission, PendingFireMission } from '../../types';
import { PlatoonViewType, MapEntityType } from '../../types';
import { HeaderComponent } from '../HeaderComponent';
import { PlatoonSidebarComponent } from './PlatoonSidebarComponent';
import { PlatoonDashboardView } from './PlatoonDashboardView';
import { PlatoonORDOPsView } from './PlatoonORDOPsView';
import { PlatoonLogisticsView } from './PlatoonLogisticsView';
import { PlatoonNoveltiesView } from './PlatoonNoveltiesView';
import { PlatoonArtilleryView } from './PlatoonArtilleryView';
import { MapDisplayComponent } from '../MapDisplayComponent';
import { ResizableDivider } from '../ResizableDivider';
import { MobileBottomNavComponent } from '../MobileBottomNavComponent';
import { Squares2X2Icon } from '../icons/Squares2X2Icon';
import { MapPinIcon } from '../icons/MapPinIcon';
import { DocumentArrowUpIcon } from '../icons/DocumentArrowUpIcon';
import { CrosshairsIcon } from '../icons/CrosshairsIcon';

interface PlatoonCommanderViewProps {
  isMobile: boolean;
  currentUser: User;
  onLogout: () => void;
  allUnits: MilitaryUnit[];
  operationsOrders: OperationsOrder[];
  artilleryPieces: ArtilleryPiece[];
  forwardObservers: ForwardObserver[];
  activeFireMissions: ActiveFireMission[];
  unitHistoryLog: UnitHistoryEvent[];
  acknowledgeOperationsOrder: (orderId: string, userId: string) => void;
  submitAmmoExpenditureReport: (unitId: string, userId: string, amount: number, justification: string) => void;
  logPlatoonNovelty: (unitId: string, userId: string, details: string, isLogisticsRequest: boolean) => void;
  onCallForFire: (requester: MilitaryUnit | ForwardObserver) => void;
  onCancelFireMission: () => void;
  targetSelectionRequest: TargetSelectionRequest | null;
  eventBus: any;
  entityToPanTo: SelectedEntity | null;
  onTargetSelected: (location: GeoLocation) => void;
  pendingFireMissions: PendingFireMission[];
  dismissPendingMission: (missionId: string) => void;
}

export const PlatoonCommanderView: React.FC<PlatoonCommanderViewProps> = ({
  isMobile,
  currentUser,
  onLogout,
  allUnits,
  operationsOrders,
  artilleryPieces,
  forwardObservers,
  activeFireMissions,
  unitHistoryLog,
  acknowledgeOperationsOrder,
  submitAmmoExpenditureReport,
  logPlatoonNovelty,
  onCallForFire,
  onCancelFireMission,
  targetSelectionRequest,
  onTargetSelected,
  pendingFireMissions,
  dismissPendingMission,
  eventBus,
  entityToPanTo,
}) => {
  const [currentView, setCurrentView] = useState<PlatoonViewType>(PlatoonViewType.DASHBOARD);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  const [contentWidth, setContentWidth] = useState<number>(() => Math.max(320, Math.floor(window.innerWidth * 0.4)));
  const mainContainerRef = useRef<HTMLElement | null>(null);
  const [selectedMapEntity, setSelectedMapEntity] = useState<SelectedEntity | null>(null);

  const assignedPlatoon = useMemo(() => {
    return allUnits.find(u => u.id === currentUser.assignedUnitId);
  }, [allUnits, currentUser.assignedUnitId]);

  const platoonHistory = useMemo(() => {
    if (!assignedPlatoon) return [];
    return unitHistoryLog.filter(event => event.unitId === assignedPlatoon.id);
  }, [unitHistoryLog, assignedPlatoon]);

  const handleSelectOnMap = useCallback((entity: SelectedEntity) => {
    setSelectedMapEntity(entity);
  }, []);

  const platoonAndSupportUnitsForMap = useMemo(() => {
    if (!assignedPlatoon) return [];
    return [assignedPlatoon];
  }, [assignedPlatoon]);

  const mapDisplayProps = {
    units: platoonAndSupportUnitsForMap,
    artilleryPieces,
    intelligenceReports: [],
    forwardObservers: [],
    activeFireMissions,
    selectedEntity: selectedMapEntity,
    onSelectEntityOnMap: handleSelectOnMap,
    isTargetSelectionActive: !!targetSelectionRequest && targetSelectionRequest.requester.id === assignedPlatoon?.id,
    onTargetSelected: onTargetSelected,
    distanceToolActive: false,
    aoiDrawingModeActive: false,
    enemyInfluenceLayerActive: false,
    piccDrawingConfig: null,
    onPiccDrawingComplete: () => { },
    activeTemplateContext: null,
    eventBus: eventBus,
    entityToPanTo: entityToPanTo,
  };

  const handleDividerDrag = useCallback((deltaX: number) => {
    setContentWidth(prevWidth => {
      if (!mainContainerRef.current) return prevWidth;
      const mainContainerTotalWidth = mainContainerRef.current.offsetWidth;
      let newWidth = prevWidth + deltaX;
      newWidth = Math.max(320, newWidth);
      newWidth = Math.min(newWidth, mainContainerTotalWidth - 320);
      return newWidth;
    });
  }, []);

  const renderContent = () => {
    if (!assignedPlatoon) {
      return (
        <div className="p-8 text-center text-yellow-300 bg-gray-800 rounded-lg">
          <h3 className="text-xl font-semibold text-blue-400">Asignación de Unidad Requerida</h3>
          <p className="mt-2 text-gray-400 text-sm">
            Su cuenta de Comandante de Pelotón no está asignada a ninguna unidad.
            Por favor, contacte a un administrador del sistema para que le asigne su pelotón.
          </p>
        </div>
      );
    }

    switch (currentView) {
      case PlatoonViewType.DASHBOARD:
        return <PlatoonDashboardView platoon={assignedPlatoon} history={platoonHistory} />;
      case PlatoonViewType.ORDOP:
        return <PlatoonORDOPsView
          orders={operationsOrders}
          currentUser={currentUser}
          acknowledgeOrder={acknowledgeOperationsOrder}
        />;
      case PlatoonViewType.LOGISTICS:
        return <PlatoonLogisticsView
          platoon={assignedPlatoon}
          currentUser={currentUser}
          submitAmmoReport={submitAmmoExpenditureReport}
        />;
      case PlatoonViewType.ARTILLERY:
        return <PlatoonArtilleryView
          platoon={assignedPlatoon}
          targetSelectionRequest={targetSelectionRequest}
          onCallForFire={onCallForFire}
          onCancelFireMission={onCancelFireMission}
          pendingFireMissions={pendingFireMissions}
          dismissPendingMission={dismissPendingMission}
          artilleryPieces={artilleryPieces}
        />;
      case PlatoonViewType.NOVELTIES:
        return <PlatoonNoveltiesView
          platoon={assignedPlatoon}
          currentUser={currentUser}
          logNovelty={logPlatoonNovelty}
        />;
      default:
        return <PlatoonDashboardView platoon={assignedPlatoon} history={platoonHistory} />;
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-950 text-gray-100 antialiased font-sans overflow-hidden">
      <HeaderComponent
        isMobile={isMobile}
        onToggleMobileNav={() => setIsMobileNavOpen(!isMobileNavOpen)}
        currentUser={currentUser}
        onLogout={onLogout}
      />
      <div className="flex flex-1 overflow-hidden relative">
        {!isMobile && (
          <PlatoonSidebarComponent currentView={currentView} setCurrentView={setCurrentView} />
        )}

        {isMobile && isMobileNavOpen && (
          <div
            className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-md transition-all"
            onClick={() => setIsMobileNavOpen(false)}
          >
            <div
              className="fixed top-0 left-0 h-full z-[70] shadow-2xl animate-in slide-in-from-left duration-300"
              onClick={e => e.stopPropagation()}
            >
              <PlatoonSidebarComponent
                currentView={currentView}
                setCurrentView={(view: PlatoonViewType) => { setCurrentView(view); setIsMobileNavOpen(false); }}
              />
            </div>
          </div>
        )}

        {isMobile ? (
          <>
            <main className="flex-1 flex overflow-y-auto h-full w-full relative z-10 pb-20 p-2 md:p-4">
              <div className="w-full h-full glass-effect rounded-2xl p-4 shadow-2xl min-h-full border border-white/5">
                {currentView === (PlatoonViewType as any).MAP ? (
                  <div className="h-[60vh] rounded-xl overflow-hidden mb-4 border border-white/5 map-container-glow">
                    <MapDisplayComponent {...mapDisplayProps} />
                  </div>
                ) : renderContent()}
              </div>
            </main>
            <MobileBottomNavComponent
              currentView={currentView}
              setCurrentView={setCurrentView}
              items={[
                { label: 'PELOTÓN', view: PlatoonViewType.DASHBOARD, icon: Squares2X2Icon },
                { label: 'ÓRDENES', view: PlatoonViewType.ORDOP, icon: DocumentArrowUpIcon },
                { label: 'FUEGOS', view: PlatoonViewType.ARTILLERY, icon: CrosshairsIcon },
                { label: 'MAPA', view: (PlatoonViewType as any).MAP || 'MAPA', icon: MapPinIcon },
              ]}
            />
          </>
        ) : (
          <main ref={mainContainerRef} className="flex-1 flex overflow-hidden relative z-10">
            <div className="h-full overflow-hidden flex flex-col" style={{ flex: `0 0 ${contentWidth}px` }}>
              <div className="p-4 h-full overflow-y-auto pr-2 custom-scrollbar">
                {renderContent()}
              </div>
            </div>

            <ResizableDivider onDrag={handleDividerDrag} />

            <div className="h-full flex-1 p-2 overflow-hidden">
              <div className="glass-effect rounded-2xl shadow-2xl h-full border border-white/5 overflow-hidden map-container-glow">
                <MapDisplayComponent {...mapDisplayProps} />
              </div>
            </div>
          </main>
        )}
      </div>
    </div>
  );
};