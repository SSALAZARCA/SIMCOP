import React from 'react';
import type { ForwardObserver } from '../types';
import { ForwardObserverStatus } from '../types';
import { BinocularsIcon } from './icons/BinocularsIcon';
import { decimalToDMS } from '../utils/coordinateUtils';

interface ForwardObserverCardProps {
  observer: ForwardObserver;
  isSelected: boolean;
  onSelect: () => void;
}

const getStatusColor = (status: ForwardObserverStatus): string => {
  switch (status) {
    case ForwardObserverStatus.OPERATIONAL: return 'text-green-400';
    case ForwardObserverStatus.OBSERVING: return 'text-yellow-400';
    case ForwardObserverStatus.MOVING: return 'text-blue-400';
    case ForwardObserverStatus.NO_COMMS: return 'text-red-400';
    default: return 'text-gray-400';
  }
};

export const ForwardObserverCard: React.FC<ForwardObserverCardProps> = ({ observer, isSelected, onSelect }) => {
  return (
    <div
      onClick={onSelect}
      className={`p-3 rounded-md cursor-pointer transition-colors ${isSelected ? 'bg-blue-800 ring-2 ring-blue-500' : 'bg-gray-750 hover:bg-gray-700'}`}
      role="button"
    >
      <div className="flex justify-between items-start">
        <div>
          <h4 className="font-semibold text-purple-300">{observer.callsign}</h4>
          <p className={`text-xs font-medium ${getStatusColor(observer.status)}`}>{observer.status}</p>
        </div>
        <BinocularsIcon className="w-5 h-5 text-purple-400" />
      </div>
      <div className="text-xs text-gray-400 mt-2">
        <p>Ubicación: <span className="font-mono">{decimalToDMS(observer.location)}</span></p>
      </div>
    </div>
  );
};
