import React from 'react';
import type { ForwardObserver, ArtilleryPiece, TargetSelectionRequest, MilitaryUnit, User, PendingFireMission } from '../types';
import { BinocularsIcon } from './icons/BinocularsIcon';
import { decimalToDMS } from '../utils/coordinateUtils';
import { FireMissionControlComponent } from './FireMissionControlComponent';

interface ForwardObserverDetailsPanelProps {
  observer: ForwardObserver;
  artilleryPieces: ArtilleryPiece[];
  targetSelectionRequest: TargetSelectionRequest | null;
  onCallForFire: (requester: ForwardObserver | MilitaryUnit) => void;
  onCancelFireMission: () => void;
  allUsers: User[];
  pendingFireMissions: PendingFireMission[];
  dismissPendingMission: (missionId: string) => void;
}

export const ForwardObserverDetailsPanel: React.FC<ForwardObserverDetailsPanelProps> = ({
  observer,
  artilleryPieces,
  targetSelectionRequest,
  onCallForFire,
  onCancelFireMission,
  allUsers,
  pendingFireMissions,
  dismissPendingMission,
}) => {
  const commander = allUsers.find(u => u.id === observer.commanderId);
  const commanderName = commander ? commander.displayName : (observer.commanderId === 'unassigned' ? 'No Asignado' : 'Cmdte. Desconocido');

  return (
    <div className="space-y-4 text-gray-200">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-bold text-purple-300">{observer.callsign}</h3>
        <BinocularsIcon className="w-6 h-6 text-purple-400" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2 text-sm">
        <div><strong className="text-gray-400">ID:</strong> {observer.id.substring(0, 12)}...</div>
        <div><strong className="text-gray-400">Estado:</strong> {observer.status}</div>
        <div><strong className="text-gray-400">Comandante:</strong> {commanderName}</div>
        <div><strong className="text-gray-400">Unidad Asignada:</strong> {observer.assignedUnitId.substring(0,8)}...</div>
        <div className="md:col-span-2"><strong className="text-gray-400">Ubicación:</strong> {decimalToDMS(observer.location)}</div>
      </div>

      <FireMissionControlComponent
        requester={observer}
        targetSelectionRequest={targetSelectionRequest}
        onCallForFire={onCallForFire}
        onCancelFireMission={onCancelFireMission}
        pendingFireMissions={pendingFireMissions}
        onDismissMission={dismissPendingMission}
        artilleryPieces={artilleryPieces}
      />
    </div>
  );
};