
import React, { useMemo } from 'react';
import type { MilitaryUnit, UnitType } from '../types';
import { UnitType as UnitTypeEnum } from '../types';
import { Plus, Edit2, Trash2, UserPlus, ChevronRight, ChevronDown } from 'lucide-react';

interface OrganizationUnitNodeProps {
  unit: MilitaryUnit;
  allUnits: MilitaryUnit[];
  selectedUnitId: string | null;
  onSelect: (unitId: string) => void;
  onAddSubUnit: (parentUnit: MilitaryUnit) => void;
  onEditUnit: (unit: MilitaryUnit) => void;
  onDeleteUnit: (unit: MilitaryUnit) => void;
  onAssignCommander: (unit: MilitaryUnit) => void;
  level?: number;
}

const unitTypeDisplayNames: Record<string, string> = {
  [UnitTypeEnum.DIVISION]: 'División',
  [UnitTypeEnum.BRIGADE]: 'Brigada',
  [UnitTypeEnum.BATTALION]: 'Batallón',
  [UnitTypeEnum.COMPANY]: 'Compañía',
  [UnitTypeEnum.PLATOON]: 'Pelotón',
  [UnitTypeEnum.TEAM]: 'Equipo',
  [UnitTypeEnum.SQUAD]: 'Escuadra',
  [UnitTypeEnum.COMMAND_POST]: 'Puesto de Mando',
  [UnitTypeEnum.UAV_ATTACK_TEAM]: 'Equipo Drone Ataque',
  [UnitTypeEnum.UAV_INTEL_TEAM]: 'Equipo Drone Inteligencia',
};

const getUnitColor = (type: string) => {
  switch (type) {
    case UnitTypeEnum.DIVISION: return 'from-red-600/20 to-red-900/40 border-red-500/30 text-red-400';
    case UnitTypeEnum.BRIGADE: return 'from-orange-600/20 to-orange-900/40 border-orange-500/30 text-orange-400';
    case UnitTypeEnum.BATTALION: return 'from-yellow-600/20 to-yellow-900/40 border-yellow-500/30 text-yellow-400';
    case UnitTypeEnum.COMPANY: return 'from-green-600/20 to-green-900/40 border-green-500/30 text-green-400';
    case UnitTypeEnum.PLATOON: return 'from-blue-600/20 to-blue-900/40 border-blue-500/30 text-blue-400';
    default: return 'from-gray-600/20 to-gray-900/40 border-gray-500/30 text-gray-400';
  }
};

const canHaveChildren = (unitType: string): boolean => {
  return [
    UnitTypeEnum.DIVISION,
    UnitTypeEnum.BRIGADE,
    UnitTypeEnum.BATTALION,
    UnitTypeEnum.COMPANY
  ].includes(unitType as any);
};

export const OrganizationUnitNode: React.FC<OrganizationUnitNodeProps> = ({
  unit,
  allUnits,
  selectedUnitId,
  onSelect,
  onAddSubUnit,
  onEditUnit,
  onDeleteUnit,
  onAssignCommander,
  level = 0
}) => {
  const children = useMemo(() => {
    return allUnits.filter(u => u.parentId === unit.id);
  }, [allUnits, unit.id]);

  const isSelected = selectedUnitId === unit.id;
  const colorClasses = getUnitColor(unit.type);
  const displayName = unitTypeDisplayNames[unit.type] || unit.type;

  const commanderName = unit.commander?.name || 'Por Asignar';
  const hasCommander = commanderName !== 'Por Asignar';

  return (
    <div className="flex flex-col items-center w-full">
      <div
        onClick={() => onSelect(unit.id)}
        className={`
          relative group cursor-pointer transition-all duration-300 transform
          ${isSelected ? 'scale-105 z-20' : 'hover:scale-102 scale-100'}
          w-full max-w-[260px]
        `}
      >
        {/* Connection Line to parent (except for top level) */}
        {level > 0 && (
          <div className="absolute -top-8 left-1/2 w-px h-8 bg-gradient-to-b from-white/10 to-white/20"></div>
        )}

        {/* Node Card */}
        <div className={`
          bg-gradient-to-br ${colorClasses} 
          p-5 rounded-[24px] border-2 backdrop-blur-md shadow-xl
          ${isSelected ? 'ring-2 ring-white/10' : ''}
        `}>
          <div className="flex flex-col gap-4">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60 mb-1">
                  {displayName}
                </p>
                <h3 className="text-lg font-black tracking-tighter uppercase text-white truncate max-w-[160px]">
                  {unit.name}
                </h3>
              </div>
              <div className="w-10 h-10 bg-black/20 rounded-2xl flex items-center justify-center border border-white/5">
                {isSelected ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
              </div>
            </div>

            <div className="flex items-center gap-2 bg-black/20 p-2 rounded-xl border border-white/5">
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${hasCommander ? 'bg-blue-500/20 text-blue-400' : 'bg-gray-500/20 text-gray-500'}`}>
                <UserPlus className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0">
                <p className="text-[8px] font-black uppercase tracking-widest opacity-40 leading-none mb-0.5">Mando</p>
                <p className={`text-[10px] font-bold truncate leading-tight ${hasCommander ? 'text-white' : 'italic text-gray-500'}`}>
                  {hasCommander && `${unit.commander?.rank || ''} `}{commanderName}
                </p>
              </div>
            </div>

            {/* Quick Actions (only visible when selected or hover) */}
            <div className={`
              flex justify-center gap-2 mt-2 transition-all duration-300
              ${isSelected ? 'opacity-100 h-auto' : 'opacity-0 h-0 overflow-hidden'}
            `}>
              {canHaveChildren(unit.type) && (
                <button
                  onClick={(e) => { e.stopPropagation(); onAddSubUnit(unit); }}
                  className="p-3 bg-teal-500/20 hover:bg-teal-500/40 text-teal-400 rounded-xl border border-teal-500/20 transition-all hover:scale-110"
                  title="Añadir Subunidad"
                >
                  <Plus className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={(e) => { e.stopPropagation(); onAssignCommander(unit); }}
                className="p-3 bg-purple-500/20 hover:bg-purple-500/40 text-purple-400 rounded-xl border border-purple-500/20 transition-all hover:scale-110"
                title="Asignar Mando"
              >
                <UserPlus className="w-4 h-4" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onEditUnit(unit); }}
                className="p-3 bg-yellow-500/20 hover:bg-yellow-500/40 text-yellow-400 rounded-xl border border-yellow-500/20 transition-all hover:scale-110"
                title="Editar"
              >
                <Edit2 className="w-4 h-4" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onDeleteUnit(unit); }}
                className="p-3 bg-red-500/20 hover:bg-red-900/40 text-red-500 rounded-xl border border-red-500/20 transition-all hover:scale-110"
                title="Eliminar"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Recursive Children Container */}
      {children.length > 0 && (
        <div className="flex flex-col items-center mt-8 w-full">
          {/* Horizontal line Connecting children */}
          {children.length > 1 && (
            <div className="relative w-full flex justify-center h-px bg-white/10 mb-[-1px]">
              {/* This is a bit tricky with flexbox, better approach might be needed for true tree layout */}
            </div>
          )}

          <div className="flex flex-wrap justify-center gap-x-8 gap-y-12 w-full">
            {children.map(child => (
              <OrganizationUnitNode
                key={child.id}
                unit={child}
                allUnits={allUnits}
                selectedUnitId={selectedUnitId}
                onSelect={onSelect}
                onAddSubUnit={onAddSubUnit}
                onEditUnit={onEditUnit}
                onDeleteUnit={onDeleteUnit}
                onAssignCommander={onAssignCommander}
                level={level + 1}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};