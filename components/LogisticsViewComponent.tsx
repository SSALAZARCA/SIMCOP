import React, { useState, useEffect, useCallback } from 'react';
import type { LogisticsRequest, PredictedLogisticsNeed, MilitaryUnit, User } from '../types';
import { LogisticsRequestStatus, UnitType } from '../types';
import { TruckIcon } from './icons/TruckIcon';
import { LightBulbIcon } from './icons/LightBulbIcon';
import { LogisticsRequestCardComponent } from './LogisticsRequestCardComponent';
// FIX: Import the newly created `getPredictiveLogisticsAnalysis` function.
import { getPredictiveLogisticsAnalysis } from '../utils/geminiService';
import { ResupplyModal } from './ResupplyModal';
import { Package2 } from 'lucide-react';

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
        <div className="flex flex-col items-center justify-center py-8 text-gray-400">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-300 mb-4"></div>
          Analizando necesidades logísticas con IA...
        </div>
      ) : error ? (
        <div className="text-center text-red-400 py-6">{error}</div>
      ) : predictions.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {predictions.map((p, index) => (
            <div
              key={index}
              className={`flex flex-col p-4 rounded-xl border-t-4 shadow-lg bg-gray-900/40 backdrop-blur-sm transition-transform hover:scale-[1.02] ${getUrgencyColor(p.urgency)}`}
            >
              <div className="flex justify-between items-start mb-3">
                <div className="flex flex-col">
                  <span className="text-xs font-mono text-gray-500 uppercase tracking-wider">Unidad</span>
                  <h4 className="font-bold text-gray-100">{p.unitName}</h4>
                </div>
                <div className={`px-2 py-0.5 rounded text-[10px] font-black tracking-tighter ${p.urgency === 'ALTA' ? 'bg-red-500 text-white' :
                  p.urgency === 'MEDIA' ? 'bg-yellow-500 text-black' :
                    'bg-blue-500 text-white'
                  }`}>
                  {p.urgency}
                </div>
              </div>

              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-yellow-400"></div>
                  <span className="text-sm font-semibold text-yellow-100">{p.item}</span>
                </div>
                <p className="text-sm text-gray-300 line-clamp-3 mb-4 leading-relaxed italic">
                  "{p.justification}"
                </p>
              </div>

              <div className="pt-3 border-t border-gray-700 mt-auto">
                <div className="flex justify-between items-center gap-2">
                  <div className="flex flex-col">
                    <span className="text-[10px] text-gray-500">Plazo Proyectado</span>
                    <span className="text-xs font-bold text-gray-400">{p.predictedTimeframe}</span>
                  </div>
                  <button
                    onClick={() => handleCreateRequest(p)}
                    className="px-3 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-lg shadow-md transition-all active:scale-95 whitespace-nowrap"
                  >
                    Crear Ticket
                  </button>
                </div>
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
  updateUnitLogistics: (unitId: string, logisticsData: { fuelLevel?: number | string; ammoLevel?: number | string; daysOfSupply?: number | string; }) => void;
}

export const LogisticsViewComponent: React.FC<LogisticsViewProps> = ({ requests, fulfillRequest, currentUser, allUnits, addLogisticsRequest, updateUnitLogistics }) => {
  const [selectedUnitForResupply, setSelectedUnitForResupply] = useState<MilitaryUnit | null>(null);
  const [isResupplyModalOpen, setIsResupplyModalOpen] = useState(false);
  const pendingRequests = requests.filter(r => r.status === LogisticsRequestStatus.PENDING).sort((a, b) => a.requestTimestamp - b.requestTimestamp);
  const fulfilledRequests = requests.filter(r => r.status === LogisticsRequestStatus.FULFILLED).sort((a, b) => b.fulfilledTimestamp! - a.fulfilledTimestamp!);

  return (
    <div className="flex flex-col space-y-4 p-2 md:p-4">
      <div className="flex flex-col sm:flex-row justify-between items-center border-b border-gray-700 pb-3 gap-2">
        <h2 className="text-xl md:text-2xl font-semibold text-gray-200 flex items-center">
          <TruckIcon className="w-6 h-6 md:w-7 md:h-7 mr-2 md:mr-3 text-lime-400" />
          Módulo de Gestión Logística
        </h2>
      </div>

      <div className="bg-gray-900/50 p-6 rounded-3xl border border-white/5 shadow-2xl backdrop-blur-md">
        <h3 className="text-lg font-black text-gray-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
          <Package2 className="w-5 h-5 text-blue-500" />
          Suministro Directo de Unidades
        </h3>
        <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar">
          {allUnits.filter(u => u.type === UnitType.PLATOON || u.type === UnitType.SQUAD || u.type === UnitType.TEAM).map(unit => (
            <button
              key={unit.id}
              onClick={() => {
                setSelectedUnitForResupply(unit);
                setIsResupplyModalOpen(true);
              }}
              className="group relative flex-none w-[200px] flex flex-col p-4 bg-black/40 border border-white/10 rounded-2xl hover:border-blue-500/50 transition-all text-left overflow-hidden h-[120px]"
            >
              <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-100 transition-opacity">
                <TruckIcon className="w-8 h-8 text-blue-500" />
              </div>
              <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-1">{unit.type}</span>
              <h4 className="text-sm font-black text-white truncate mb-2">{unit.name}</h4>
              <div className="mt-auto flex items-center gap-2">
                <div className="flex-1 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all ${unit.fuelLevel < 40 ? 'bg-red-500' : 'bg-blue-500'}`}
                    style={{ width: `${unit.fuelLevel}%` }}
                  />
                </div>
                <span className="text-[10px] font-black text-gray-500">{unit.fuelLevel}%</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      <PredictiveLogisticsComponent units={allUnits} addLogisticsRequest={addLogisticsRequest} />

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
        <div className="bg-gray-800/50 p-4 md:p-6 rounded-xl border border-gray-700/50 shadow-xl backdrop-blur-sm">
          <h3 className="text-xl font-bold text-yellow-500 mb-6 flex items-center gap-2">
            <span className="w-2 h-6 bg-yellow-500 rounded-full"></span>
            Requerimientos Pendientes
            <span className="ml-auto bg-yellow-500/20 text-yellow-500 text-sm px-2 py-0.5 rounded-full">{pendingRequests.length}</span>
          </h3>

          {pendingRequests.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-500 border-2 border-dashed border-gray-700 rounded-lg">
              <TruckIcon className="w-12 h-12 mb-3 opacity-20" />
              <p>No hay suministros pendientes de entrega</p>
            </div>
          ) : (
            <div className="space-y-4">
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
        </div>

        <div className="bg-gray-800/30 p-4 md:p-6 rounded-xl border border-gray-700/30 shadow-lg">
          <h3 className="text-xl font-bold text-green-500 mb-6 flex items-center gap-2">
            <span className="w-2 h-6 bg-green-500 rounded-full"></span>
            Historial de Entregas
            <span className="ml-auto bg-green-500/20 text-green-500 text-sm px-2 py-0.5 rounded-full">{fulfilledRequests.length}</span>
          </h3>

          {fulfilledRequests.length === 0 ? (
            <p className="text-gray-500 text-center py-12 italic">Historial vacío</p>
          ) : (
            <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
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

      {selectedUnitForResupply && (
        <ResupplyModal
          isOpen={isResupplyModalOpen}
          onClose={() => setIsResupplyModalOpen(false)}
          onConfirm={(data) => {
            updateUnitLogistics(selectedUnitForResupply.id, {
              daysOfSupply: data.days,
              fuelLevel: data.resetFuel ? 100 : selectedUnitForResupply.fuelLevel,
              ammoLevel: data.resetAmmo ? 100 : selectedUnitForResupply.ammoLevel,
            });
            setIsResupplyModalOpen(false);
          }}
          unitName={selectedUnitForResupply.name}
        />
      )}
    </div>
  );
};
