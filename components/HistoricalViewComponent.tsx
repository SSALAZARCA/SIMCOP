import React, { useMemo } from 'react';
import type { AfterActionReport, MilitaryUnit, Q5Report, UnitHistoryEvent, Alert, AARCombatEvent } from '../types';
import { AlertType } from '../types';
import { decimalToDMS } from '../utils/coordinateUtils';
import { ArrowPathIcon } from './icons/ArrowPathIcon'; // For loading spinner

interface CombatTimelineProps {
    aar: AfterActionReport;
    unitHistoryLog: UnitHistoryEvent[];
    alerts: Alert[];
}

const CombatTimelineComponent: React.FC<CombatTimelineProps> = ({ aar, unitHistoryLog, alerts }) => {
    const combatEvents = useMemo(() => {
        const combatStartAlert = alerts.find(a => a.id === aar.originalCombatAlertId && a.type === AlertType.UNIT_ENGAGED);
        if (!combatStartAlert) {
            return [{
                timestamp: aar.combatEndTimestamp,
                type: 'Fin de Combate',
                description: 'Cese de combate reportado.'
            }];
        }
        
        const startTime = combatStartAlert.timestamp;
        const endTime = aar.combatEndTimestamp;

        const relevantHistory = unitHistoryLog
            .filter(e => e.unitId === aar.unitId && e.timestamp >= startTime && e.timestamp <= endTime)
            .map(e => ({
                timestamp: e.timestamp,
                type: 'Evento de Historial',
                description: e.details,
            } as AARCombatEvent));

        const allEvents: AARCombatEvent[] = [
            { timestamp: startTime, type: 'Inicio de Combate', description: 'Unidad reportó entrar en combate.' },
            ...relevantHistory,
            { timestamp: endTime, type: 'Fin de Combate', description: 'Cese de combate reportado.' },
        ];
        
        return allEvents.sort((a, b) => a.timestamp - b.timestamp);

    }, [aar, unitHistoryLog, alerts]);

    return (
        <div className="mt-3 pt-3 border-t border-gray-700">
            <h4 className="text-md font-semibold text-gray-300 mb-2">Línea de Tiempo del Combate</h4>
            <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                {combatEvents.map((event, index) => (
                    <div key={index} className="flex items-start text-xs">
                        <div className="flex flex-col items-center mr-3">
                            <div className={`w-3 h-3 rounded-full ${event.type === 'Inicio de Combate' || event.type === 'Fin de Combate' ? 'bg-red-500' : 'bg-gray-500'}`}></div>
                            {index < combatEvents.length - 1 && <div className="w-px h-full bg-gray-600 my-1"></div>}
                        </div>
                        <div className="flex-1">
                            <p className="font-semibold text-gray-300">
                                {new Date(event.timestamp).toLocaleTimeString('es-ES')} - {event.type}
                            </p>
                            <p className="text-gray-400">{event.description}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};


interface HistoricalViewProps {
  afterActionReports: AfterActionReport[];
  units: MilitaryUnit[]; 
  onSelectAAR: (aar: AfterActionReport) => void;
  selectedAAR: AfterActionReport | null;
  generateAndAddQ5Report: (aarId: string) => Promise<void>;
  q5Reports: Q5Report[];
  q5GeneratingStatus: { [aarId: string]: boolean };
  unitHistoryLog: UnitHistoryEvent[];
  alerts: Alert[];
}

export const HistoricalViewComponent: React.FC<HistoricalViewProps> = ({ 
  afterActionReports, 
  onSelectAAR, 
  selectedAAR,
  generateAndAddQ5Report,
  q5Reports,
  q5GeneratingStatus,
  unitHistoryLog,
  alerts
}) => {
  
  const sortedAARs = [...afterActionReports].sort((a, b) => b.reportTimestamp - a.reportTimestamp);

  const renderDetailItem = (label: string, value: string | number | undefined, isTextarea: boolean = false) => {
    if (value === undefined || (typeof value === 'string' && !value.trim())) {
      return null; 
    }
    return (
      <div className="mt-2 pt-2 border-t border-gray-700">
        <h4 className="text-md font-semibold text-gray-300">{label}:</h4>
        {isTextarea ? (
          <p className="text-sm bg-gray-750 p-2 rounded whitespace-pre-wrap break-words">{value || 'N/A'}</p>
        ) : (
          <p className="text-sm">{value}</p>
        )}
      </div>
    );
  };

  const q5ExistsForSelectedAAR = selectedAAR && q5Reports.some(q5 => q5.aarId === selectedAAR.id);
  const isGeneratingQ5ForSelectedAAR = selectedAAR && q5GeneratingStatus[selectedAAR.id];


  return (
    <div className="flex flex-col space-y-4 p-1">
      <h2 className="text-xl md:text-2xl font-semibold text-gray-200 border-b border-gray-700 pb-3">
        Histórico de Reportes Post-Combate (AAR)
      </h2>

      <div className="flex flex-col md:flex-row flex-1 space-y-4 md:space-y-0 md:space-x-4">
        {/* List Panel */}
        <div className="w-full md:w-2/5 bg-gray-800 p-3 md:p-4 rounded-lg shadow-inner pr-0 md:pr-2">
          {sortedAARs.length === 0 ? (
            <p className="text-gray-400 text-center py-10">No hay reportes AAR disponibles.</p>
          ) : (
            <div className="space-y-3">
              {sortedAARs.map(aar => (
                <div 
                  key={aar.id} 
                  className={`bg-gray-750 p-3 rounded-md shadow-md cursor-pointer hover:bg-gray-700 transition-colors ${selectedAAR?.id === aar.id ? 'ring-2 ring-yellow-500' : 'border border-gray-700'}`}
                  onClick={() => onSelectAAR(aar)}
                  aria-label={`AAR para ${aar.unitName} el ${new Date(aar.reportTimestamp).toLocaleDateString('es-ES')}`}
                >
                  <h3 className="text-md font-semibold text-yellow-300">{aar.unitName}</h3>
                  <p className="text-xs text-gray-400">
                    Fecha Reporte: {new Date(aar.reportTimestamp).toLocaleString('es-ES')}
                  </p>
                  <p className="text-xs text-gray-400">
                    Ubicación Combate: {decimalToDMS(aar.location)}
                  </p>
                  <p className="text-sm text-gray-300 mt-1 truncate">
                    {aar.summary}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Details Panel */}
        <div className="w-full md:w-3/5 bg-gray-800 p-3 md:p-4 rounded-lg shadow-inner">
          {selectedAAR ? (
            <div className="space-y-3 text-gray-200">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                <h3 className="text-lg sm:text-xl font-bold text-yellow-400">Detalles AAR: {selectedAAR.unitName}</h3>
                {!q5ExistsForSelectedAAR && (
                  <button
                    onClick={() => generateAndAddQ5Report(selectedAAR.id)}
                    disabled={isGeneratingQ5ForSelectedAAR}
                    className="px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white text-xs font-medium rounded-md shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center self-start sm:self-center"
                  >
                    {isGeneratingQ5ForSelectedAAR ? (
                      <>
                        <ArrowPathIcon className="w-4 h-4 mr-1.5 animate-spin" />
                        Generando Q5...
                      </>
                    ) : "Generar Reporte Q5"}
                  </button>
                )}
                 {q5ExistsForSelectedAAR && (
                    <span className="px-3 py-1.5 bg-green-700 text-white text-xs font-medium rounded-md self-start sm:self-center">
                        Q5 Generado
                    </span>
                 )}
              </div>

              <p className="text-sm"><strong className="text-gray-400">ID Reporte:</strong> {selectedAAR.id.substring(0,12)}...</p>
              <p className="text-sm"><strong className="text-gray-400">Fecha Fin Combate:</strong> {new Date(selectedAAR.combatEndTimestamp).toLocaleString('es-ES')}</p>
              <p className="text-sm"><strong className="text-gray-400">Fecha Reporte AAR:</strong> {new Date(selectedAAR.reportTimestamp).toLocaleString('es-ES')}</p>
              <p className="text-sm"><strong className="text-gray-400">Ubicación de Combate:</strong> {decimalToDMS(selectedAAR.location)}</p>
              
              {selectedAAR.originalCombatAlertId && (
                <CombatTimelineComponent aar={selectedAAR} unitHistoryLog={unitHistoryLog} alerts={alerts} />
              )}
              
              <div className="mt-3 pt-3 border-t border-gray-700">
                <h4 className="text-md font-semibold text-gray-300 mb-1">Estado Propio y Logística:</h4>
                <ul className="list-disc list-inside pl-4 text-sm space-y-0.5">
                  <li>Bajas KIA: {selectedAAR.casualtiesKia}</li>
                  <li>Bajas WIA: {selectedAAR.casualtiesWia}</li>
                  <li>Bajas MIA: {selectedAAR.casualtiesMia}</li>
                  <li>Munición Gastada: {selectedAAR.ammunitionExpendedPercent}%</li>
                  <li>Moral de la Unidad: {selectedAAR.morale}</li>
                </ul>
                {renderDetailItem("Pérdidas/Daños de Equipo Propio", selectedAAR.equipmentLosses || 'Ninguno reportado.', true)}
              </div>

              <div className="mt-3 pt-3 border-t border-gray-700">
                <h4 className="text-md font-semibold text-gray-300 mb-1">Resultados del Enfrentamiento (Enemigo y Objetivos):</h4>
                <ul className="list-disc list-inside pl-4 text-sm space-y-0.5">
                  {selectedAAR.enemyCasualtiesKia !== undefined && <li>Bajas Enemigas (KIA): {selectedAAR.enemyCasualtiesKia}</li>}
                  {selectedAAR.enemyCasualtiesWia !== undefined && <li>Bajas Enemigas (WIA): {selectedAAR.enemyCasualtiesWia}</li>}
                </ul>
                {renderDetailItem("Equipo Enemigo Destruido/Capturado", selectedAAR.enemyEquipmentDestroyedOrCaptured, true)}
                {renderDetailItem("Objetivos Cumplidos", selectedAAR.objectivesAchieved, true)}
                {renderDetailItem("Otras Observaciones Positivas / Lecciones Aprendidas", selectedAAR.positiveObservations, true)}
              </div>
              
              {renderDetailItem("Resumen General de la Acción", selectedAAR.summary, true)}

            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-gray-400 text-center">Seleccione un reporte AAR de la lista para ver detalles.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};