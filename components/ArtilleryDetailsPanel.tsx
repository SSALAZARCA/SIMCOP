import React, { useMemo } from 'react';
import type { ArtilleryPiece, AmmoStock, User, ActiveFireMission } from '../types';
import { ArtilleryStatus } from '../types';
import { CrosshairsIcon } from './icons/CrosshairsIcon';
import { PaperAirplaneIcon } from './icons/PaperAirplaneIcon';
import { ARTILLERY_TYPE_DETAILS } from '../constants';
import { decimalToDMS } from '../utils/coordinateUtils';

interface ArtilleryDetailsPanelProps {
  piece: ArtilleryPiece;
  allUsers: User[];
  activeFireMissions: ActiveFireMission[];
  confirmShotFired: (missionId: string) => void;
  deleteArtilleryPiece?: (id: string) => Promise<{ success: boolean; message?: string }>;
  currentUser: User | null;
}

const getStatusPillColor = (status: ArtilleryStatus): string => {
  switch (status) {
    case ArtilleryStatus.READY: return 'bg-green-600 text-green-100';
    case ArtilleryStatus.FIRING: return 'bg-red-600 text-red-100 animate-pulse';
    case ArtilleryStatus.MOVING: return 'bg-blue-500 text-blue-100';
    case ArtilleryStatus.OUT_OF_AMMO: return 'bg-yellow-500 text-yellow-900';
    case ArtilleryStatus.MAINTENANCE: return 'bg-gray-500 text-gray-200';
    default: return 'bg-gray-700';
  }
};

const getAmmoColor = (type: AmmoStock['type']): string => {
  switch (type) {
    case 'HE': return 'border-red-500';
    case 'SMOKE': return 'border-gray-400';
    case 'ILLUM': return 'border-yellow-400';
    default: return 'border-gray-600';
  }
}

export const ArtilleryDetailsPanel: React.FC<ArtilleryDetailsPanelProps> = ({ piece, allUsers, activeFireMissions, confirmShotFired, currentUser, deleteArtilleryPiece }) => {
  const details = ARTILLERY_TYPE_DETAILS[piece.type];
  const commander = allUsers.find(u => u.id === piece.commanderId);
  const commanderName = commander ? commander.displayName : (piece.commanderId === 'unassigned' ? 'No Asignado' : 'Cmdte. Desconocido');
  const directorTiro = allUsers.find(u => u.id === piece.directorTiroId);
  const directorTiroName = directorTiro ? `${directorTiro.displayName} (${directorTiro.role})` : 'FDO No Asignado';

  const activeMission = useMemo(() =>
    activeFireMissions.find(m => m.artilleryId === piece.id && m.status === 'active'),
    [activeFireMissions, piece.id]
  );
  const isCommander = currentUser?.id === piece.commanderId;

  return (
    <div className="space-y-4 text-gray-200">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-bold text-blue-300">{piece.name}</h3>
        <CrosshairsIcon className="w-6 h-6 text-orange-400" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2 text-sm">
        <div><strong className="text-gray-400">ID:</strong> {piece.id.substring(0, 12)}...</div>
        <div><strong className="text-gray-400">Tipo:</strong> {piece.type}</div>
        <div><strong className="text-gray-400">Comandante:</strong> {commanderName}</div>
        <div><strong className="text-gray-400">Director de Tiro:</strong> {directorTiroName}</div>
        <div><strong className="text-gray-400">Ubicación:</strong> {decimalToDMS(piece.location)}</div>
        <div><strong className="text-gray-400">Unidad Asignada:</strong> {piece.assignedUnitId.substring(0, 8)}...</div>
        <div className="md:col-span-2">
          <strong className="text-gray-400">Estado:</strong>
          <span className={`ml-2 px-2 py-0.5 text-xs font-semibold rounded-full ${getStatusPillColor(piece.status)}`}>
            {piece.status}
          </span>
        </div>
      </div>

      {activeMission && (
        <div className="bg-red-900/50 border-2 border-red-500 rounded-lg p-3 space-y-2 animate-pulse">
          <h4 className="text-md font-bold text-red-300 text-center">¡MISIÓN DE FUEGO ACTIVA!</h4>
          <div className="text-xs grid grid-cols-2 gap-1">
            <p><span className="font-semibold text-gray-400">Blanco:</span> {decimalToDMS(activeMission.target)}</p>
            <p><span className="font-semibold text-gray-400">Proyectil:</span> {activeMission.projectileType}</p>
            <p><span className="font-semibold text-gray-400">Carga:</span> {activeMission.charge}</p>
            <p><span className="font-semibold text-gray-400">MRSI:</span> {activeMission.isMrsi ? 'Sí' : 'No'}</p>
          </div>
          <button
            onClick={() => confirmShotFired(activeMission.id)}
            disabled={!isCommander}
            title={!isCommander ? 'Solo el comandante de pieza asignado puede confirmar el disparo.' : 'Confirmar que el disparo ha sido efectuado.'}
            className="w-full mt-2 p-2 bg-green-600 hover:bg-green-700 text-white font-bold rounded flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <PaperAirplaneIcon className="w-5 h-5 mr-2" />
            Confirmar Disparo Efectuado
          </button>
        </div>
      )}

      <div className="bg-gray-750 p-3 rounded">
        <h4 className="text-md font-semibold text-gray-300">Especificaciones</h4>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm mt-1">
          <div><strong className="text-gray-400">Alcance Mínimo:</strong> {(details.minRange / 1000).toFixed(1)} km</div>
          <div><strong className="text-gray-400">Alcance Máximo:</strong> {(details.maxRange / 1000).toFixed(1)} km</div>
        </div>
      </div>

      <div className="bg-gray-750 p-3 rounded">
        <h4 className="text-md font-semibold text-gray-300">Inventario de Munición</h4>
        {piece.ammunition.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-2">
            {piece.ammunition.map(ammo => (
              <div key={ammo.type} className={`p-2 bg-gray-700 rounded border-l-4 ${getAmmoColor(ammo.type)}`}>
                <p className="text-sm font-semibold">{ammo.type}</p>
                <p className="text-lg font-bold">{ammo.quantity}</p>
                <p className="text-xs text-gray-400">Proyectiles</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-400 mt-1 italic">No hay munición registrada.</p>
        )}
      </div>

      {deleteArtilleryPiece && (
        <button
          onClick={() => {
            if (confirm('¿Estás seguro de eliminar esta pieza de artillería? Esta acción no se puede deshacer.')) {
              deleteArtilleryPiece(piece.id);
            }
          }}
          className="w-full p-2 bg-red-800 hover:bg-red-700 text-red-100 rounded text-sm font-semibold"
        >
          Eliminar Pieza
        </button>
      )}
    </div>
  );
};
