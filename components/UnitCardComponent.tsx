import React from 'react';
import type { MilitaryUnit } from '../types';
import { UnitStatus } from '../types';
import { MapPinIcon } from './icons/MapPinIcon';
import { ArrowPathIcon } from './icons/ArrowPathIcon';
import { decimalToDMS } from '../utils/coordinateUtils';

interface UnitCardProps {
  unit: MilitaryUnit;
  onSelectUnit: (unit: MilitaryUnit) => void;
  isSelected: boolean;
}

const getStatusStyles = (status: UnitStatus): string => {
  switch (status) {
    case UnitStatus.OPERATIONAL:
    case UnitStatus.MOVING:
      return 'text-green-400 border-green-500/30 bg-green-500/10 glow-green';
    case UnitStatus.STATIC:
      return 'text-blue-400 border-blue-500/30 bg-blue-500/10 glow-blue';
    case UnitStatus.ENGAGED:
      return 'text-red-400 border-red-500/30 bg-red-500/10 glow-red animate-pulse';
    case UnitStatus.AAR_PENDING:
      return 'text-yellow-500 border-yellow-500/30 bg-yellow-500/10 glow-yellow';
    case UnitStatus.ON_LEAVE_RETRAINING:
      return 'text-indigo-400 border-indigo-500/30 bg-indigo-500/10 glow-blue';
    case UnitStatus.LOW_SUPPLIES:
      return 'text-yellow-400 border-yellow-400/30 bg-yellow-400/10 glow-yellow';
    case UnitStatus.NO_COMMUNICATION:
      return 'text-orange-400 border-orange-400/30 bg-orange-500/10 glow-orange';
    case UnitStatus.MAINTENANCE:
      return 'text-gray-400 border-gray-400/30 bg-gray-500/10';
    default:
      return 'text-gray-300 border-gray-600/30 bg-gray-700/10';
  }
};

const _UnitCardComponent: React.FC<UnitCardProps> = ({ unit, onSelectUnit, isSelected }) => {
  const lastMovedMinutesAgo = Math.floor((Date.now() - unit.lastMovementTimestamp) / (60 * 1000));
  const totalPersonnel = (unit.personnelBreakdown?.officers || 0) + (unit.personnelBreakdown?.ncos || 0) + (unit.personnelBreakdown?.professionalSoldiers || 0) + (unit.personnelBreakdown?.slRegulars || 0);

  return (
    <div
      className={`glass-effect p-5 rounded-2xl soft-transition cursor-pointer group relative overflow-hidden
                  ${isSelected ? 'ring-2 ring-blue-500/50 shadow-[0_0_25px_rgba(59,130,246,0.3)]' : 'hover:bg-white/10 hover:shadow-xl'}`}
      onClick={() => onSelectUnit(unit)}
      aria-label={`Unidad ${unit.name}, tipo ${unit.type}, estado ${unit.status}`}
    >
      {/* Selection Glow Indicator */}
      {isSelected && (
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500 shadow-[2px_0_10px_rgba(59,130,246,0.5)]"></div>
      )}

      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="text-base font-black text-white uppercase tracking-tight group-hover:text-blue-400 transition-colors leading-tight">{unit.name}</h3>
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mt-1">
            {unit.type} <span className="mx-1.5 opacity-30 text-gray-600">|</span> {unit.commander?.rank || 'N/A'} {unit.commander?.name || 'N/A'}
          </p>
        </div>
        <div className={`text-[10px] font-black px-3 py-1 rounded-full border uppercase tracking-[0.15em] shadow-sm ${getStatusStyles(unit.status)}`}>
          {unit.status}
        </div>
      </div>

      <div className="space-y-4 text-[11px] uppercase font-bold tracking-tight">
        <div className="flex justify-between text-gray-400 border-b border-white/10 pb-2">
          <span className="text-gray-500">Efectivos Totales</span>
          <span className="text-white font-black monospace-tech tracking-wider">{totalPersonnel}</span>
        </div>

        {unit.status !== UnitStatus.ON_LEAVE_RETRAINING && (
          <div className="flex flex-col gap-3">
            <div className="flex items-center text-gray-300 bg-blue-500/5 p-2 rounded-xl border border-blue-500/10 backdrop-blur-sm">
              <MapPinIcon className="w-4 h-4 mr-3 text-blue-500" />
              <span className="monospace-tech text-xs text-blue-100/90">{decimalToDMS(unit.location)}</span>
            </div>
            <div className="flex items-center text-gray-400 px-2">
              <ArrowPathIcon className="w-3.5 h-3.5 mr-2.5 text-purple-500/70" />
              <span className="text-[10px] tracking-widest">ÚLT. REPORTE: <span className="text-white monospace-tech ml-1">{lastMovedMinutesAgo}M</span></span>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4 mt-2">
          <div className={`p-3 rounded-xl border border-white/10 ${unit.fuelLevel !== undefined && unit.fuelLevel < 25 ? 'bg-red-500/20 border-red-500/30' : 'bg-white/5 shadow-inner'}`}>
            <p className="text-[10px] text-gray-500 mb-2 font-black tracking-widest">FUEL</p>
            <div className="flex items-end justify-between">
              <span className={`text-sm font-black monospace-tech ${unit.fuelLevel !== undefined && unit.fuelLevel < 25 ? 'text-red-400' : 'text-blue-400'}`}>{unit.fuelLevel}%</span>
              <div className="w-12 h-1.5 bg-gray-800 rounded-full overflow-hidden shadow-inner border border-white/5">
                <div className={`h-full ${unit.fuelLevel !== undefined && unit.fuelLevel < 25 ? 'bg-gradient-to-r from-red-600 to-red-400 shadow-[0_0_10px_rgba(239,68,68,0.5)]' : 'bg-gradient-to-r from-blue-600 to-blue-400 shadow-[0_0_10px_rgba(59,130,246,0.5)]'}`} style={{ width: `${unit.fuelLevel || 0}%` }}></div>
              </div>
            </div>
          </div>
          <div className={`p-3 rounded-xl border border-white/10 ${unit.ammoLevel !== undefined && unit.ammoLevel < 25 ? 'bg-yellow-500/20 border-yellow-500/30' : 'bg-white/5 shadow-inner'}`}>
            <p className="text-[10px] text-gray-500 mb-2 font-black tracking-widest">AMMO</p>
            <div className="flex items-end justify-between">
              <span className={`text-sm font-black monospace-tech ${unit.ammoLevel !== undefined && unit.ammoLevel < 25 ? 'text-yellow-400' : 'text-green-400'}`}>{unit.ammoLevel}%</span>
              <div className="w-12 h-1.5 bg-gray-800 rounded-full overflow-hidden shadow-inner border border-white/5">
                <div className={`h-full ${unit.ammoLevel !== undefined && unit.ammoLevel < 25 ? 'bg-gradient-to-r from-yellow-600 to-yellow-400 shadow-[0_0_10px_rgba(234,179,8,0.5)]' : 'bg-gradient-to-r from-green-600 to-green-400 shadow-[0_0_10px_rgba(34,197,94,0.5)]'}`} style={{ width: `${unit.ammoLevel || 0}%` }}></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const UnitCardComponent = React.memo(_UnitCardComponent);
