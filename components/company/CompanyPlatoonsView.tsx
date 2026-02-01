import React from 'react';
import type { MilitaryUnit } from '../../types';
import { UnitCardComponent } from '../UnitCardComponent';

interface CompanyPlatoonsViewProps {
  platoons: MilitaryUnit[];
  onSelectPlatoon: (platoon: MilitaryUnit) => void;
}

export const CompanyPlatoonsView: React.FC<CompanyPlatoonsViewProps> = ({ platoons, onSelectPlatoon }) => {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold text-gray-200 border-b border-gray-700 pb-2">
        Pelotones Subordinados
      </h2>
      <p className="text-sm text-gray-400">
        Esta es una vista de solo lectura del estado actual de sus pelotones. Para acciones, por favor use los módulos correspondientes. Haga clic en una unidad para centrarla en el mapa.
      </p>

      {platoons.length === 0 ? (
        <div className="bg-gray-800 p-8 rounded-lg text-center text-gray-400">
            No hay pelotones asignados a su compañía.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {platoons.map(platoon => (
                <UnitCardComponent 
                    key={platoon.id}
                    unit={platoon}
                    onSelectUnit={onSelectPlatoon}
                    isSelected={false} // Selection is shown on map, not here
                />
            ))}
        </div>
      )}
    </div>
  );
};
