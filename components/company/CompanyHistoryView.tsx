import React, { useMemo } from 'react';
import type { MilitaryUnit, UnitHistoryEvent } from '../../types';
import { decimalToDMS } from '../../utils/coordinateUtils';
import { ClockIcon } from '../icons/ClockIcon';

interface CompanyHistoryViewProps {
  company: MilitaryUnit;
  platoons: MilitaryUnit[];
  historyLog: UnitHistoryEvent[];
}

const getEventTypeColor = (eventType: UnitHistoryEvent['eventType']): string => {
    if (eventType.includes("Combate") || eventType.includes("Fallido") || eventType.includes("Rechazada")) return "text-red-400";
    if (eventType.includes("Logística") || eventType.includes("Atributos")) return "text-blue-400";
    if (eventType.includes("Reporte") || eventType.includes("Recibida") || eventType.includes("Aprobada")) return "text-purple-400";
    if (eventType.includes("Creada") || eventType.includes("Éxito") || eventType.includes("Satisfecho")) return "text-green-400";
    return "text-gray-300";
};

export const CompanyHistoryView: React.FC<CompanyHistoryViewProps> = ({ company, platoons, historyLog }) => {
  const relevantUnitIds = useMemo(() => {
    return new Set([company.id, ...platoons.map(p => p.id)]);
  }, [company, platoons]);

  const companyHistory = useMemo(() => {
    return historyLog
      .filter(event => event.unitId && relevantUnitIds.has(event.unitId))
      .sort((a, b) => b.timestamp - a.timestamp);
  }, [historyLog, relevantUnitIds]);

  return (
    <div className="h-full flex flex-col space-y-4">
      <h2 className="text-2xl font-semibold text-gray-200 border-b border-gray-700 pb-2 flex items-center">
        <ClockIcon className="w-7 h-7 mr-3 text-cyan-400" />
        Histórico Consolidado - {company.name}
      </h2>
      
      <div className="flex-1 overflow-y-auto bg-gray-800 p-4 rounded-lg shadow-inner">
        {companyHistory.length === 0 ? (
          <p className="text-gray-400 text-center py-10">No hay eventos históricos registrados para esta compañía y sus pelotones.</p>
        ) : (
          <div className="space-y-3">
            {companyHistory.map(event => (
              <div key={event.id} className="bg-gray-750 p-3 rounded-md shadow">
                <div className="flex justify-between items-start">
                  <div>
                    <span className={`text-sm font-semibold ${getEventTypeColor(event.eventType)}`}>
                      {event.eventType}
                    </span>
                    {event.unitName && <span className="text-xs text-gray-400 ml-2">({event.unitName})</span>}
                  </div>
                  <span className="text-xs text-gray-500">
                    {new Date(event.timestamp).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'medium' })}
                  </span>
                </div>
                <p className="text-sm text-gray-300 mt-1 whitespace-pre-wrap">{event.details}</p>
                {event.location && (
                  <p className="text-xs text-gray-500 mt-0.5">Ubicación: {decimalToDMS(event.location)}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};