import React from 'react';
import type { MilitaryUnit } from '../types';
import { AcademicCapIcon } from './icons/AcademicCapIcon'; 
import { RetrainingUnitCardComponent } from './RetrainingUnitCardComponent'; // New import

interface RetrainingAreaViewProps {
  retrainingUnits: MilitaryUnit[];
  returnUnitFromRetraining: (unitId: string) => void;
  startUnitLeave: (unitId: string, durationDays: number) => void;
  startUnitRetraining: (unitId: string, focus: string, durationDays: number) => void; // Updated signature
}

export const RetrainingAreaViewComponent: React.FC<RetrainingAreaViewProps> = ({ 
    retrainingUnits, 
    returnUnitFromRetraining,
    startUnitLeave,
    startUnitRetraining
}) => {
  
  return (
    <div className="flex flex-col space-y-4 p-1">
      <div className="flex justify-between items-center border-b border-gray-700 pb-3">
        <h2 className="text-2xl font-semibold text-gray-200 flex items-center">
          <AcademicCapIcon className="w-7 h-7 mr-3 text-indigo-400" />
          Área de Permiso y Reentrenamiento
        </h2>
      </div>

      <div className="flex-1 bg-gray-800 p-4 rounded-lg shadow-inner">
        {retrainingUnits.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
            <AcademicCapIcon className="w-16 h-16 mb-4 text-gray-600" />
            <p className="text-lg">No hay unidades actualmente en Permiso o Reentrenamiento.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {retrainingUnits.map(unit => (
              <RetrainingUnitCardComponent
                key={unit.id}
                unit={unit}
                returnUnitFromRetraining={returnUnitFromRetraining}
                startUnitLeave={startUnitLeave}
                startUnitRetraining={startUnitRetraining}
              />
            ))}
          </div>
        )}
      </div>
      <p className="text-xs text-gray-500 text-center pt-2">
        Las unidades aquí listadas se encuentran temporalmente fuera del área de operaciones.
      </p>
    </div>
  );
};
