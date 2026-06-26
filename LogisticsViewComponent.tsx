import React, { useState, useEffect, useCallback } from 'react';
import type { LogisticsRequest, User, MilitaryUnit, PredictedLogisticsNeed } from '../types';
import { LogisticsRequestStatus } from '../types';
import { TruckIcon } from './icons/TruckIcon';
import { LightBulbIcon } from './icons/LightBulbIcon';
import { LogisticsRequestCardComponent } from './LogisticsRequestCardComponent';
// FIX: Import the newly created `getPredictiveLogisticsAnalysis` function.
import { getPredictiveLogisticsAnalysis } from '../utils/geminiService';

interface PredictiveLogisticsProps {
  units: MilitaryUnit[];
  addLogisticsRequest: (unitId: string, details: string) => void;
}

const PredictiveLogisticsComponent: React.FC<PredictiveLogisticsProps> = ({ units, addLogisticsRequest }) => {
  const [predictions, setPredictions] = useState<PredictedLogisticsNeed[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPredictions = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await getPredictiveLogisticsAnalysis(units);
      setPredictions(result);
    } catch (err: any) {
      setError(err.message || 'Error al obtener predicciones logísticas.');
      setPredictions([]);
    } finally {
      setIsLoading(false);
    }
  }, [units]);

  useEffect(() => {
    fetchPredictions();
    const intervalId = setInterval(fetchPredictions, 5 * 60 * 1000); // Fetch every 5 minutes
    return () => clearInterval(intervalId);
  }, [fetchPredictions]);
  
  const handleCreateRequest = (prediction: PredictedLogisticsNeed) => {
    const details = `Basado en predicción AI: Se necesita ${prediction.item}. Justificación: ${prediction.justification}. Plazo: ${prediction.predictedTimeframe}.`;
    addLogisticsRequest(prediction.unitId, details);
  };

  const getUrgencyColor = (urgency: 'ALTA' | 'MEDIA' | 'BAJA') => {
    switch (urgency) {
      case 'ALTA': return 'border-red-500 bg-red-900/50';
      case 'MEDIA': return 'border-yellow-500 bg-yellow-900/50';
      case 'BAJA': return 'border-blue-500 bg-blue-900/50';
    }
  };

  return (
    <div className="bg-gray-800 p-2 md:p-4 rounded-lg shadow-inner">
      <h3 className="text-lg font-semibold text-gray-300 mb-3 border-b border-gray-700 pb-2 flex items-center">
        <LightBulbIcon className="w-5 h-5 mr-2 text-yellow-300" />
        Análisis Logístico Predictivo
      </h3>
       {isLoading ? (
        <div className="text-center text-gray-400 animate-pulse">Analizando necesidades logísticas...</div>
      ) : error ? (
        <div className="text-center text-red-400">{error}</div>
      ) : predictions.length > 0 ? (
        <div className="space-y-3">
          {predictions.map((p, index) => (
            <div key={index} className={`p-3 rounded-md border-l-4 ${getUrgencyColor(p.urgency)}`}>
              <div className="flex justify-between items-start">
                  <h4 className="font-semibold text-gray-200">{p.unitName} - <span className="text-yellow-300">{p.item}</span></h4>
                  <span className="text-xs font-bold">{p.urgency}</span>
              </div>
              <p className="text-sm text-gray-300 mt-1">{p.justification}</p>
              <p className="text-xs text-gray-400 mt-1">Plazo Proyectado: {p.predictedTimeframe}</p>
               <div className="mt-2 text-right">
                <button 
                  onClick={() => handleCreateRequest(p)}
                  className="px-2 py-1 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md shadow-sm transition-colors"
                >
                  Crear Requerimiento
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center text-gray-400">No se predicen necesidades logísticas críticas en este momento.</div>
      )}
    </div>
  );
};


interface LogisticsViewProps {
  requests: LogisticsRequest[];
  fulfillRequest: (requestId: string, userId: string) => void;
  currentUser: User | null;
  allUnits: MilitaryUnit[]; // Pass allUnits to get context for predictive analysis
  addLogisticsRequest: (unitId: string, details: string) => void;
}

export const LogisticsViewComponent: React.FC<LogisticsViewProps> = ({ requests, fulfillRequest, currentUser, allUnits, addLogisticsRequest }) => {
  const pendingRequests = requests.filter(r => r.status === LogisticsRequestStatus.PENDING).sort((a,b) => a.requestTimestamp - b.requestTimestamp);
  const fulfilledRequests = requests.filter(r => r.status === LogisticsRequestStatus.FULFILLED).sort((a,b) => b.fulfilledTimestamp! - a.fulfilledTimestamp!);

  return (
    <div className="flex flex-col space-y-4 p-2 md:p-4">
      <div className="flex flex-col sm:flex-row justify-between items-center border-b border-gray-700 pb-3 gap-2">
        <h2 className="text-xl md:text-2xl font-semibold text-gray-200 flex items-center">
          <TruckIcon className="w-6 h-6 md:w-7 md:h-7 mr-2 md:mr-3 text-lime-400" />
          Módulo de Gestión Logística
        </h2>
      </div>

      <PredictiveLogisticsComponent units={allUnits} addLogisticsRequest={addLogisticsRequest} />

      <div className="flex-1 bg-gray-800 p-2 md:p-4 rounded-lg shadow-inner">
        <h3 className="text-lg font-semibold text-gray-300 mb-3 border-b border-gray-700 pb-2">Requerimientos Pendientes ({pendingRequests.length})</h3>
        {pendingRequests.length === 0 ? (
          <p className="text-gray-400 text-center py-5">No hay requerimientos logísticos pendientes.</p>
        ) : (
          <div className="space-y-3">
            {pendingRequests.map(req => (
              <LogisticsRequestCardComponent
                key={req.id}
                request={req}
                onFulfill={fulfillRequest}
                currentUser={currentUser}
              />
            ))}
          </div>
        )}
        
        <h3 className="text-lg font-semibold text-gray-300 mt-6 mb-3 border-b border-gray-700 pb-2">Requerimientos Satisfechos (Últimos {fulfilledRequests.length})</h3>
         {fulfilledRequests.length === 0 ? (
          <p className="text-gray-400 text-center py-5">No hay requerimientos satisfechos.</p>
        ) : (
          <div className="space-y-3">
            {fulfilledRequests.map(req => (
              <LogisticsRequestCardComponent
                key={req.id}
                request={req}
                onFulfill={fulfillRequest}
                currentUser={currentUser}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
