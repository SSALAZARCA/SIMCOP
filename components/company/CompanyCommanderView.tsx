import React, { useState, useMemo, useCallback, useRef } from 'react';
import type { User, MilitaryUnit, OperationsOrder, Alert, SelectedEntity, UnitHistoryEvent } from '../../types';
import { CompanyViewType, MapEntityType } from '../../types';
import { HeaderComponent } from '../HeaderComponent';
import { CompanySidebarComponent } from './CompanySidebarComponent';
import { CompanyDashboardView } from './CompanyDashboardView';
import { CompanyPlatoonsView } from './CompanyPlatoonsView';
import { CompanyApprovalsView } from './CompanyApprovalsView';
import { CompanyORDOPsView } from './CompanyORDOPsView';
import { CompanyHistoryView } from './CompanyHistoryView';
import { MapDisplayComponent } from '../MapDisplayComponent';
import { ResizableDivider } from '../ResizableDivider';
import { MobileBottomNavComponent } from '../MobileBottomNavComponent';
import { Squares2X2Icon } from '../icons/Squares2X2Icon';
import { MapPinIcon } from '../icons/MapPinIcon';
import { UsersIcon } from '../icons/UsersIcon';
import { ShieldCheckIcon } from '../icons/ShieldCheckIcon';

interface CompanyCommanderViewProps {
  isMobile: boolean;
  currentUser: User;
  onLogout: () => void;
  allUnits: MilitaryUnit[];
  operationsOrders: OperationsOrder[];
  alerts: Alert[];
  unitHistoryLog: UnitHistoryEvent[];
  acknowledgeOperationsOrder: (orderId: string, userId: string) => void;
  approveAmmoReport: (alertId: string, approverUserId: string) => void;
  rejectAmmoReport: (alertId: string, approverUserId: string, reason: string) => void;
  approvePlatoonNovelty: (alertId: string, approverUserId: string) => void;
  rejectPlatoonNovelty: (alertId: string, approverUserId: string, reason: string) => void;
  eventBus: any;
  entityToPanTo: SelectedEntity | null;
}

export const CompanyCommanderView: React.FC<CompanyCommanderViewProps> = ({
  isMobile,
  currentUser,
  onLogout,
  allUnits,
  operationsOrders,
  alerts,
  unitHistoryLog,
  acknowledgeOperationsOrder,
  approveAmmoReport,
  rejectAmmoReport,
  approvePlatoonNovelty,
  rejectPlatoonNovelty,
  eventBus,
  entityToPanTo,
}) => {
  const [currentView, setCurrentView] = useState<CompanyViewType>(CompanyViewType.DASHBOARD);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [contentWidth, setContentWidth] = useState<number>(() => Math.max(320, Math.floor(window.innerWidth * 0.4)));
  const mainContainerRef = useRef<HTMLElement | null>(null);
  const [selectedMapEntity, setSelectedMapEntity] = useState<SelectedEntity | null>(null);

  const assignedCompany = useMemo(() => {
    return allUnits.find(u => u.id === currentUser.assignedUnitId);
  }, [allUnits, currentUser.assignedUnitId]);

  const subordinatePlatoons = useMemo(() => {
    if (!assignedCompany) return [];
    return allUnits.filter(u => u.parentId === assignedCompany.id);
  }, [allUnits, assignedCompany]);

  const handleSelectOnMap = useCallback((entity: SelectedEntity) => {
    setSelectedMapEntity(entity);
  }, []);

  const mapDisplayProps = {
    units: subordinatePlatoons,
    artilleryPieces: [],
    intelligenceReports: [],
    forwardObservers: [],
    activeFireMissions: [],
    selectedEntity: selectedMapEntity,
    onSelectEntity: handleSelectOnMap,
    isTargetSelectionActive: false,
    onTargetSelected: () => { },
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
    if (!assignedCompany) {
      return (
        <div className="p-8 text-center text-yellow-300 bg-gray-800 rounded-lg">
          <h3 className="text-xl font-semibold text-blue-400">Asignación de Unidad Requerida</h3>
          <p className="mt-2 text-gray-400 text-sm">
            Su cuenta de Comandante de Compañía no está asignada a ninguna unidad.
            Por favor, contacte a un administrador del sistema para que le asigne su compañía.
          </p>
        </div>
      );
    }

    switch (currentView) {
      case CompanyViewType.DASHBOARD:
        return <CompanyDashboardView company={assignedCompany} platoons={subordinatePlatoons} alerts={alerts} setCurrentView={setCurrentView} />;
      case CompanyViewType.PLATOONS:
        return <CompanyPlatoonsView platoons={subordinatePlatoons} onSelectPlatoon={(p) => handleSelectOnMap({ type: MapEntityType.UNIT, id: p.id })} />;
      case CompanyViewType.APPROVALS:
        return <CompanyApprovalsView
          alerts={alerts}
          currentUser={currentUser}
          approveAmmoReport={approveAmmoReport}
          rejectAmmoReport={rejectAmmoReport}
          approvePlatoonNovelty={approvePlatoonNovelty}
          rejectPlatoonNovelty={rejectPlatoonNovelty}
        />;
      case CompanyViewType.ORDOP:
        return <CompanyORDOPsView orders={operationsOrders} currentUser={currentUser} acknowledgeOrder={acknowledgeOperationsOrder} />;
      case CompanyViewType.HISTORY:
        return <CompanyHistoryView company={assignedCompany} platoons={subordinatePlatoons} historyLog={unitHistoryLog} />;
      default:
        return <CompanyDashboardView company={assignedCompany} platoons={subordinatePlatoons} alerts={alerts} setCurrentView={setCurrentView} />;
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
        <div className="absolute inset-0 pointer-events-none opacity-[0.03] elite-bg"></div>

        {!isMobile && (
          <CompanySidebarComponent currentView={currentView} setCurrentView={setCurrentView} />
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
              <CompanySidebarComponent
                currentView={currentView}
                setCurrentView={(view: CompanyViewType) => { setCurrentView(view); setIsMobileNavOpen(false); }}
              />
            </div>
          </div>
        )}

        {isMobile ? (
          <>
            <main className="flex-1 flex overflow-y-auto h-full w-full relative z-10 pb-20 p-2 md:p-4">
              <div className="w-full h-full glass-effect rounded-2xl p-4 shadow-2xl min-h-full border border-white/5">
                {currentView === (CompanyViewType as any).MAP ? (
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
                { label: 'COMPAÑÍA', view: CompanyViewType.DASHBOARD, icon: Squares2X2Icon },
                { label: 'PELOTONES', view: CompanyViewType.PLATOONS, icon: UsersIcon },
                { label: 'VISADOS', view: CompanyViewType.APPROVALS, icon: ShieldCheckIcon },
                { label: 'MAPA', view: (CompanyViewType as any).MAP || 'MAPA', icon: MapPinIcon },
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