import React from 'react';
import type { MilitaryUnit, TargetSelectionRequest, ForwardObserver, PendingFireMission, ArtilleryPiece } from '../../types';
import { FireMissionControlComponent } from '../FireMissionControlComponent';

interface PlatoonArtilleryViewProps {
  platoon: MilitaryUnit;
  targetSelectionRequest: TargetSelectionRequest | null;
  onCallForFire: (requester: MilitaryUnit | ForwardObserver) => void;
  onCancelFireMission: () => void;
  pendingFireMissions: PendingFireMission[];
  dismissPendingMission: (missionId: string) => void;
  artilleryPieces: ArtilleryPiece[];
}

export const PlatoonArtilleryView: React.FC<PlatoonArtilleryViewProps> = ({
  platoon,
  targetSelectionRequest,
  onCallForFire,
  onCancelFireMission,
  pendingFireMissions,
  dismissPendingMission,
  artilleryPieces,
}) => {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold text-gray-200 border-b border-gray-700 pb-2">
        Solicitud de Apoyo de Fuego de Artillería
      </h2>

      <div className="max-w-2xl mx-auto">
        <FireMissionControlComponent
          requester={platoon}
          targetSelectionRequest={targetSelectionRequest}
          onCallForFire={onCallForFire}
          onCancelFireMission={onCancelFireMission}
          pendingFireMissions={pendingFireMissions}
          onDismissMission={dismissPendingMission}
          artilleryPieces={artilleryPieces}
        />
      </div>
    </div>
  );
};