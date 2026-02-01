import React, { useState, useMemo } from 'react';
import type { MilitaryUnit, UnitHistoryEvent } from '../types';
import { decimalToDMS } from '../utils/coordinateUtils';
import { ClipboardDocumentListIcon } from './icons/ClipboardDocumentListIcon'; // Assuming you have this
import { MapEntityType } from '../types'; // For related entity type display

interface UnitHistoryViewProps {
  units: MilitaryUnit[];
  unitHistoryLog: UnitHistoryEvent[];
}

const getEventTypeColor = (eventType: UnitHistoryEvent['eventType']): string => {
  switch (eventType) {
    case "Unidad Creada": return "text-green-400";
    case "Entró en Combate":
    case "Cese de Combate":
      return "text-red-400";
    case "Cambio de Estado": return "text-yellow-400";
    case "Actualización Logística":
    case "Atributos Actualizados":
      return "text-blue-400";
    case "AAR Registrado":
    case "Reporte Q5 Generado":
      return "text-purple-400";
    case "Enviada a Permiso/Reentrenamiento":
    case "Reintegrada de Permiso/Reentrenamiento":
    case "Inicio de Permiso":
    case "Inicio de Reentrenamiento":
      return "text-indigo-400";
    default: return "text-gray-300";
  }
};

export const UnitHistoryViewComponent: React.FC<UnitHistoryViewProps> = ({ units, unitHistoryLog }) => {
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);

  const sortedUnits = useMemo(() => 
    [...units].sort((a, b) => a.name.localeCompare(b.name)), 
  [units]);

  const historyForSelectedUnit = useMemo(() => {
    if (!selectedUnitId) return [];
    return unitHistoryLog
      .filter(event => event.unitId === selectedUnitId)
      .sort((a, b) => b.timestamp - a.timestamp);
  }, [selectedUnitId, unitHistoryLog]);

  return (
    <div className="flex flex-col space-y-4 p-1">
      <div className="flex justify-between items-center border-b border-gray-700 pb-3">
        <h2 className="text-xl md:text-2xl font-semibold text-gray-200 flex items-center">
          <ClipboardDocumentListIcon className="w-6 h-6 md:w-7 md:h-7 mr-2 md:mr-3 text-cyan-400" />
          Histórico de Unidades
        </h2>
      </div>

      <div className="flex flex-col md:flex-row flex-1 space-y-4 md:space-y-0 md:space-x-4">
        {/* Unit Selection Panel */}
        <div className="w-full md:w-1/3 bg-gray-800 p-3 md:p-4 rounded-lg shadow-inner">
          <h3 className="text-lg font-semibold text-gray-300 mb-3 border-b border-gray-700 pb-2">Seleccionar Unidad</h3>
          {sortedUnits.length === 0 ? (
            <p className="text-gray-400">No hay unidades disponibles.</p>
          ) : (
            <ul className="space-y-2">
              {sortedUnits.map(unit => (
                <li key={unit.id}>
                  <button
                    onClick={() => setSelectedUnitId(unit.id)}
                    className={`w-full text-left px-3 py-2 rounded-md transition-colors text-sm
                                ${selectedUnitId === unit.id 
                                  ? 'bg-blue-600 text-white font-semibold' 
                                  : 'bg-gray-700 hover:bg-gray-600 text-gray-300'}`}
                  >
                    {unit.name} <span className="text-xs opacity-70">({unit.type})</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* History Log Panel */}
        <div className="w-full md:w-2/3 bg-gray-800 p-3 md:p-4 rounded-lg shadow-inner">
          {selectedUnitId && units.find(u => u.id === selectedUnitId) ? (
            <>
              <h3 className="text-lg font-semibold text-gray-300 mb-3 border-b border-gray-700 pb-2">
                Historial para: {units.find(u => u.id === selectedUnitId)?.name}
              </h3>
              {historyForSelectedUnit.length === 0 ? (
                <p className="text-gray-400">No hay eventos históricos para esta unidad.</p>
              ) : (
                <div className="space-y-3">
                  {historyForSelectedUnit.map(event => (
                    <div key={event.id} className="bg-gray-750 p-3 rounded-md shadow">
                      <div className="flex justify-between items-start">
                        <span className={`text-sm font-semibold ${getEventTypeColor(event.eventType)}`}>
                          {event.eventType}
                        </span>
                        <span className="text-xs text-gray-500">
                          {new Date(event.timestamp).toLocaleString('es-ES', {dateStyle: 'short', timeStyle: 'medium'})}
                        </span>
                      </div>
                      <p className="text-sm text-gray-300 mt-1 whitespace-pre-wrap break-words">{event.details}</p>
                      {event.oldValue && event.newValue && (
                        <p className="text-xs text-gray-400 mt-1">
                          Cambio: <span className="italic">{event.oldValue}</span> → <span className="italic">{event.newValue}</span>
                        </p>
                      )}
                      {event.location && (
                        <p className="text-xs text-gray-500 mt-0.5">Ubicación: {decimalToDMS(event.location)}</p>
                      )}
                      {event.relatedEntityId && (
                        <p className="text-xs text-gray-500 mt-0.5">
                          ID Relacionado ({event.relatedEntityType || 'Entidad'}): {event.relatedEntityId.substring(0,8)}...
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-gray-400 text-lg text-center">Seleccione una unidad para ver su historial.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
