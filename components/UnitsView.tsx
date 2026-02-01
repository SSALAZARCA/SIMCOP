import React, { useState, useEffect, useCallback } from 'react';
import type { MilitaryUnit, SelectedEntity, GeoLocation, NewUnitData, UnitSituationINSITOP, ArtilleryPiece, TargetSelectionRequest, ForwardObserver, PendingFireMission } from '../types';
import { MapEntityType } from '../types'; // Keep for SelectedEntity typing
import { UnitListComponent } from './UnitListComponent';
import { UnitDetailsPanel } from './UnitDetailsPanel';
import { UnitCreationModal } from './UnitCreationModal';

interface UnitsViewProps {
  allUnits: MilitaryUnit[]; // All units for parent selection
  units: MilitaryUnit[]; // Filtered units (Platoon, Team, Squad) for listing
  onSelectUnit: (unit: MilitaryUnit) => void;
  addManualRoutePoint: (unitId: string, location: GeoLocation, timestamp: number) => Promise<void>;
  updateUnitLogistics: (unitId: string, logisticsData: { fuelLevel?: number | string; ammoLevel?: number | string; daysOfSupply?: number | string; }) => Promise<void>;
  updateUnitAttributes: (unitId: string, attributes: { equipment?: string[]; capabilities?: string[] }) => Promise<void>;
  updateUnitMission: (unitId: string, missionSigla: string) => Promise<void>;
  updateUnitSituation: (unitId: string, newSituation: UnitSituationINSITOP) => Promise<void>;
  addUnit: (unitData: NewUnitData) => Promise<void>;
  sendUnitToRetraining: (unitId: string) => Promise<void>;
  artilleryPieces: ArtilleryPiece[];
  targetSelectionRequest: TargetSelectionRequest | null;
  onCallForFire: (requester: ForwardObserver | MilitaryUnit) => void;
  onCancelFireMission: () => void;
  pendingFireMissions: PendingFireMission[];
  dismissPendingMission: (missionId: string) => void;
}

export const UnitsView: React.FC<UnitsViewProps> = ({
  allUnits,
  units,
  onSelectUnit,
  addManualRoutePoint,
  updateUnitLogistics,
  updateUnitAttributes,
  updateUnitMission,
  updateUnitSituation,
  addUnit,
  sendUnitToRetraining,
  artilleryPieces,
  targetSelectionRequest,
  onCallForFire,
  onCancelFireMission,
  pendingFireMissions,
  dismissPendingMission,
}) => {
  const [selectedUnitForPanel, setSelectedUnitForPanel] = useState<MilitaryUnit | null>(null);
  const [showCreateUnitModal, setShowCreateUnitModal] = useState(false);

  const handleLocalSelect = useCallback((unit: MilitaryUnit) => {
    setSelectedUnitForPanel(unit);
    onSelectUnit(unit);
  }, [onSelectUnit]);

  useEffect(() => {
    if (selectedUnitForPanel?.id) {
      const updatedUnitFromAll = allUnits.find(u => u.id === selectedUnitForPanel.id);
      if (updatedUnitFromAll) {
        if (updatedUnitFromAll !== selectedUnitForPanel) {
          setSelectedUnitForPanel(updatedUnitFromAll);
        }
      } else {
        setSelectedUnitForPanel(null);
      }
    }
  }, [allUnits, selectedUnitForPanel?.id]);

  const listSelectedEntity: SelectedEntity | null = selectedUnitForPanel
    ? { type: MapEntityType.UNIT, id: selectedUnitForPanel.id }
    : null;

  return (
    <>
      <div className="flex flex-col space-y-6 animate-in fade-in duration-500">
        <div className="flex flex-col sm:flex-row justify-between items-center border-b border-white/5 pb-4 gap-4">
          <div className="flex items-center gap-3">
            <div className="w-1.5 h-6 bg-blue-600 rounded-full"></div>
            <h2 className="text-xl font-black text-white uppercase tracking-[0.2em]">Listado de Unidades Tácticas</h2>
          </div>
          <button
            onClick={() => setShowCreateUnitModal(true)}
            className="w-full sm:w-auto px-6 py-2.5 bg-blue-900/40 hover:bg-blue-600 text-blue-100 hover:text-white border border-blue-800/30 rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-blue-900/20 active:scale-95 flex items-center justify-center gap-2"
          >
            <span className="text-lg leading-none">+</span>
            CREAR NUEVA UNIDAD
          </button>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          <div className="w-full lg:w-2/5">
            <UnitListComponent units={units} onSelectUnit={handleLocalSelect} selectedEntity={listSelectedEntity} />
          </div>

          <div className="w-full lg:w-3/5 glass-effect rounded-2xl border border-white/5 shadow-2xl overflow-hidden min-h-[600px] flex flex-col">
            {selectedUnitForPanel ? (
              <div className="flex-1 overflow-y-auto custom-scrollbar">
                <UnitDetailsPanel
                  unit={selectedUnitForPanel}
                  addManualRoutePoint={addManualRoutePoint}
                  updateUnitLogistics={updateUnitLogistics}
                  updateUnitAttributes={updateUnitAttributes}
                  updateUnitMission={updateUnitMission}
                  updateUnitSituation={updateUnitSituation}
                  sendUnitToRetraining={sendUnitToRetraining}
                  artilleryPieces={artilleryPieces}
                  targetSelectionRequest={targetSelectionRequest}
                  onCallForFire={onCallForFire}
                  onCancelFireMission={onCancelFireMission}
                  pendingFireMissions={pendingFireMissions}
                  dismissPendingMission={dismissPendingMission}
                />
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
                <div className="w-20 h-20 bg-blue-500/5 rounded-full flex items-center justify-center mb-6 border border-blue-500/10">
                  <svg className="w-10 h-10 text-blue-500/30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 20l-5.447-2.724A2 2 0 013 15.382V5.618a2 2 0 011.553-1.947L9 2l5.447 2.724A2 2 0 0116 6.618v9.764a2 2 0 01-1.553 1.947L9 20z" />
                  </svg>
                </div>
                <p className="text-sm font-bold text-gray-500 uppercase tracking-widest leading-relaxed">
                  {showCreateUnitModal ? 'INICIALIZANDO PROTOCOLO DE CREACIÓN...' : 'SELECCIONE UNA UNIDAD TÁCTICA PARA ACCEDER A LA CONSOLA DE MANDO Y CONTROL'}
                </p>
                {!showCreateUnitModal && (
                  <div className="mt-4 flex items-center gap-2">
                    <span className="w-1 h-1 bg-gray-700 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                    <span className="w-1 h-1 bg-gray-700 rounded-full animate-bounce" style={{ animationDelay: '200ms' }}></span>
                    <span className="w-1 h-1 bg-gray-700 rounded-full animate-bounce" style={{ animationDelay: '400ms' }}></span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      <UnitCreationModal
        isOpen={showCreateUnitModal}
        onClose={() => setShowCreateUnitModal(false)}
        addUnit={addUnit}
        allUnits={allUnits}
      />
    </>
  );
};