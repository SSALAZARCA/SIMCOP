import React, { useMemo } from 'react';
import type { ForwardObserver, MilitaryUnit, TargetSelectionRequest, PendingFireMission, ArtilleryPiece } from '../types';
import { ArtilleryStatus } from '../types';
import { CrosshairsIcon } from './icons/CrosshairsIcon';
import { calculateDistanceAndAzimuth } from '../utils/ballistics';

interface FireMissionControlProps {
  requester: ForwardObserver | MilitaryUnit;
  targetSelectionRequest: TargetSelectionRequest | null;
  onCallForFire: (requester: ForwardObserver | MilitaryUnit) => void;
  onCancelFireMission: () => void;
  pendingFireMissions: PendingFireMission[];
  onDismissMission: (missionId: string) => void;
  artilleryPieces: ArtilleryPiece[];
}

export const FireMissionControlComponent: React.FC<FireMissionControlProps> = ({
  requester,
  targetSelectionRequest,
  onCallForFire,
  onCancelFireMission,
  pendingFireMissions,
  onDismissMission,
  artilleryPieces,
}) => {
  const isRequestingFire = targetSelectionRequest && targetSelectionRequest.requester.id === requester.id;
  const myPendingMission = pendingFireMissions.find(p => p.requesterId === requester.id);

  const isAnyArtilleryInRange = useMemo(() => {
    if (!requester || !artilleryPieces) {
      return false;
    }

    const availablePieces = artilleryPieces.filter(p => p.status === ArtilleryStatus.READY);
    if (availablePieces.length === 0) {
      return false;
    }

    return availablePieces.some(piece => {
      const { distance } = calculateDistanceAndAzimuth(piece.location, requester.location);
      return distance >= piece.minRange && distance <= piece.maxRange;
    });
  }, [requester, artilleryPieces]);

  const renderContent = () => {
    if (isRequestingFire) {
      return (
        <div className="space-y-3 text-center">
            <div className="p-3 bg-blue-900 rounded-md">
              <p className="font-semibold text-blue-200 animate-pulse">MODO DE SELECCIÓN DE BLANCO ACTIVO</p>
              <p className="text-xs text-blue-300 mt-1">Haga clic en la ubicación deseada en el mapa para marcar el blanco.</p>
            </div>
            <button
                onClick={onCancelFireMission}
                className="w-full mt-3 px-4 py-1.5 bg-red-700 hover:bg-red-800 text-white rounded-md text-xs font-medium"
            >
                Cancelar Solicitud
            </button>
        </div>
      );
    }

    if (myPendingMission) {
      if (myPendingMission.status === 'pending') {
        return (
          <div className="text-center p-3 bg-gray-700 rounded-md">
              <div className="flex items-center justify-center text-blue-300">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <p className="font-semibold">Solicitud Enviada...</p>
              </div>
            <p className="text-xs text-gray-400 mt-2">Esperando procesamiento y aprobación del Centro Director de Tiro (CDT).</p>
          </div>
        );
      }
      if (myPendingMission.status === 'rejected' || myPendingMission.status === 'no_assets') {
        return (
          <div className="p-3 bg-red-900/50 border border-red-700 rounded-md text-center">
            <p className="font-semibold text-red-300">
              {myPendingMission.status === 'rejected' ? 'Solicitud Rechazada' : 'Fallo en Asignación'}
            </p>
            <p className="text-xs text-red-400 mt-1 italic">
              {myPendingMission.rejectionReason || (myPendingMission.status === 'no_assets' ? 'No hay piezas de artillería en rango o disponibles.' : 'Motivo no especificado.')}
            </p>
            <button
              onClick={() => onDismissMission(myPendingMission.id)}
              className="mt-3 px-3 py-1 bg-gray-600 hover:bg-gray-500 text-white text-xs font-medium rounded-md"
            >
              Entendido
            </button>
          </div>
        );
      }
    }
    
    // Default state
    return (
      <>
        <p className="text-sm text-gray-400 mb-3">
          Inicie una solicitud de misión de fuego. Se le pedirá que seleccione un blanco en el mapa. La solicitud será enviada al Centro Director de Tiro (CDT) para su procesamiento y asignación.
        </p>
        <button
          onClick={() => onCallForFire(requester)}
          disabled={!isAnyArtilleryInRange}
          className="w-full flex items-center justify-center px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-md text-sm font-medium transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed"
        >
          <CrosshairsIcon className="w-4 h-4 mr-2" />
          {isAnyArtilleryInRange ? 'Iniciar Solicitud de Fuego' : 'Fuera de Alcance de Pieza'}
        </button>
      </>
    );
  };

  return (
    <div className="bg-gray-750 p-4 rounded-lg mt-4">
      <h4 className="text-lg font-semibold text-gray-300 mb-3">Solicitud de Apoyo de Fuego</h4>
      {renderContent()}
    </div>
  );
};