import React from 'react';
import type { MilitaryUnit, UnitHistoryEvent } from '../../types';
import { UnitCardComponent } from '../UnitCardComponent';
import { decimalToDMS } from '../../utils/coordinateUtils';

interface PlatoonDashboardViewProps {
  platoon: MilitaryUnit;
  history: UnitHistoryEvent[];
}

const getEventTypeColor = (eventType: UnitHistoryEvent['eventType']): string => {
    if (eventType.includes("Combate") || eventType.includes("Fallido")) return "text-red-400";
    if (eventType.includes("Logística") || eventType.includes("Atributos")) return "text-blue-400";
    if (eventType.includes("Reporte") || eventType.includes("Recibida")) return "text-purple-400";
    if (eventType.includes("Creada") || eventType.includes("Éxito")) return "text-green-400";
    return "text-gray-300";
  };
  

export const PlatoonDashboardView: React.FC<PlatoonDashboardViewProps> = ({ platoon, history }) => {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold text-gray-200 border-b border-gray-700 pb-2">
        Panel de Control - {platoon.name}
      </h2>

      <div>
        <h3 className="text-xl font-semibold text-gray-300 mb-2">Estado Actual de la Unidad</h3>
        <UnitCardComponent unit={platoon} onSelectUnit={() => {}} isSelected={true} />
      </div>

      <div>
        <h3 className="text-xl font-semibold text-gray-300 mb-2">Historial Reciente del Pelotón</h3>
        <div className="bg-gray-800 p-4 rounded-lg shadow-inner max-h-96 overflow-y-auto">
          {history.length === 0 ? (
            <p className="text-gray-400">No hay eventos históricos registrados para este pelotón.</p>
          ) : (
            <div className="space-y-3">
              {history.map(event => (
                <div key={event.id} className="bg-gray-750 p-3 rounded-md">
                  <div className="flex justify-between items-start">
                    <span className={`text-sm font-semibold ${getEventTypeColor(event.eventType)}`}>
                      {event.eventType}
                    </span>
                    <span className="text-xs text-gray-500">
                      {new Date(event.timestamp).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'medium' })}
                    </span>
                  </div>
                  <p className="text-sm text-gray-300 mt-1">{event.details}</p>
                  {event.location && (
                    <p className="text-xs text-gray-500 mt-0.5">Ubicación: {decimalToDMS(event.location)}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
