import React from 'react';
import type { MilitaryUnit, SelectedEntity } from '../types';
import { MapEntityType } from '../types';
import { UnitCardComponent } from './UnitCardComponent';

interface UnitListProps {
  units: MilitaryUnit[];
  onSelectUnit: (unit: MilitaryUnit) => void;
  selectedEntity: SelectedEntity | null;
}

export const UnitListComponent: React.FC<UnitListProps> = ({ units, onSelectUnit, selectedEntity }) => {
  if (units.length === 0) {
    return <p className="text-gray-400">No hay unidades rastreadas actualmente.</p>;
  }

  return (
    <div className="space-y-5 pr-2">
      {units.map(unit => (
        <UnitCardComponent
          key={unit.id}
          unit={unit}
          onSelectUnit={onSelectUnit}
          isSelected={selectedEntity?.type === MapEntityType.UNIT && selectedEntity?.id === unit.id}
        />
      ))}
    </div>
  );
};
