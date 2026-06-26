import React from 'react';
import type { ArtilleryPiece, AmmoStock } from '../types';
import { ArtilleryStatus } from '../types';
import { CrosshairsIcon } from './icons/CrosshairsIcon';

interface ArtilleryPieceCardProps {
  piece: ArtilleryPiece;
  isSelected: boolean;
  onSelect: () => void;
}

const getStatusColor = (status: ArtilleryStatus): string => {
  switch (status) {
    case ArtilleryStatus.READY: return 'bg-green-600 text-green-100';
    case ArtilleryStatus.FIRING: return 'bg-red-600 text-red-100 animate-pulse';
    case ArtilleryStatus.MOVING: return 'bg-blue-500 text-blue-100';
    case ArtilleryStatus.OUT_OF_AMMO: return 'bg-yellow-500 text-yellow-900';
    case ArtilleryStatus.MAINTENANCE: return 'bg-gray-500 text-gray-200';
    default: return 'bg-gray-700';
  }
};

const formatAmmo = (ammo: AmmoStock[]): string => {
  return ammo.map(a => `${a.type}: ${a.quantity}`).join(' / ');
};

export const ArtilleryPieceCard: React.FC<ArtilleryPieceCardProps> = ({ piece, isSelected, onSelect }) => {
  return (
    <div
      onClick={onSelect}
      className={`p-3 rounded-md cursor-pointer transition-colors ${isSelected ? 'bg-blue-800 ring-2 ring-blue-500' : 'bg-gray-750 hover:bg-gray-700'}`}
      role="button"
    >
      <div className="flex justify-between items-start">
        <div>
          <h4 className="font-semibold text-blue-300">{piece.name}</h4>
          <p className="text-xs text-gray-400">{piece.type}</p>
        </div>
        <div className={`text-xs font-medium px-2 py-0.5 rounded-full ${getStatusColor(piece.status)}`}>
          {piece.status}
        </div>
      </div>
      <div className="text-xs text-gray-300 mt-2">
        <p>Munición: <span className="font-mono">{formatAmmo(piece.ammunition)}</span></p>
      </div>
    </div>
  );
};
