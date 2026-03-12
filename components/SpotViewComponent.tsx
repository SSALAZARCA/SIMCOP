import React, { useState, useEffect, useCallback } from 'react';
import type { MilitaryUnit, GeoLocation, SpotReportPayload, LoggedSpotReport } from '../types';
import { RssIcon } from './icons/RssIcon';
// PaperAirplaneIcon is no longer used in this version
import { ArrowTopRightOnSquareIcon } from './icons/ArrowTopRightOnSquareIcon';
import { ClipboardDocumentIcon } from './icons/ClipboardDocumentIcon';
import { decimalToDMS } from '../utils/coordinateUtils';

const MAX_LOGGED_REPORTS = 20;

interface SpotViewProps {
  units: MilitaryUnit[];
  processSpotReport: (data: SpotReportPayload) => void;
}

export const SpotViewComponent: React.FC<SpotViewProps> = ({ units, processSpotReport }) => {
  const [loggedReports, setLoggedReports] = useState<LoggedSpotReport[]>([]);
  const [activeUnitId, setActiveUnitId] = useState<string | null>(null);
  const [copiedUrlId, setCopiedUrlId] = useState<string | null>(null);

  const logReport = useCallback((report: SpotReportPayload) => {
    const unitName = units.find(u => u.id === report.unitId)?.name || 'ID Desconocido';
    setLoggedReports(prev => {
      const newLog: LoggedSpotReport = { 
        ...report, 
        receivedTimestamp: Date.now(),
        unitName
      };
      return [newLog, ...prev].slice(0, MAX_LOGGED_REPORTS);
    });
  }, [units]);

  useEffect(() => {
    const handleSpotMessage = (event: MessageEvent) => {
      if (event.origin !== window.origin) return;
      
      if (event.data && (event.data.type === 'SPOT_REPORT' || event.data.type === 'SPOT_REPORT_REAL_SENT')) {
        const payload = event.data.payload;
        if (payload && payload.unitId) {
          const reportData: SpotReportPayload = { 
            unitId: payload.unitId, 
            location: payload.location || { lat: payload.lat, lon: payload.lon }, 
            timestamp: payload.timestamp || Date.now()
          };
          processSpotReport(reportData);
          logReport(reportData);
        }
      }
    };

    window.addEventListener('message', handleSpotMessage);
    return () => window.removeEventListener('message', handleSpotMessage);
  }, [processSpotReport, logReport]);

  const getApiWebhookUrl = (unitId: string) => {
    return `${window.location.origin}/api/units/${unitId}/spot`;
  };

  const getSimulatorUrl = (unitId: string) => {
    return `${window.location.origin}/spot-sender.html?unitId=${unitId}&targetOrigin=${encodeURIComponent(window.location.origin)}`;
  };
  
  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedUrlId(id);
      setTimeout(() => setCopiedUrlId(null), 2000);
    });
  };

  const safeUnits = Array.isArray(units) ? units : [];

  return (
    <div className="flex flex-col space-y-4 p-2 md:p-4 h-full overflow-hidden">
      <div className="flex flex-col sm:flex-row justify-between items-center border-b border-gray-700 pb-3 gap-2">
        <h2 className="text-xl md:text-2xl font-semibold text-gray-200 flex items-center">
          <RssIcon className="w-6 h-6 md:w-7 md:h-7 mr-2 md:mr-3 text-orange-400" />
          SPOT - Seguimiento Táctico de Unidades
        </h2>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 flex-1 overflow-hidden">
        {/* Unit Selector */}
        <div className="xl:col-span-1 bg-gray-800 p-4 rounded-lg shadow-md flex flex-col overflow-hidden border border-gray-700">
          <h3 className="text-sm font-bold text-gray-400 uppercase mb-3 tracking-wider">Unidades en AO</h3>
          <div className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
            {safeUnits.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-10 italic">No hay unidades activas.</p>
            ) : (
              safeUnits.map(unit => (
                <div 
                  key={unit.id} 
                  onClick={() => setActiveUnitId(unit.id)}
                  className={`p-3 rounded-md cursor-pointer transition-all border ${activeUnitId === unit.id ? 'bg-blue-900 bg-opacity-30 border-blue-500' : 'bg-gray-750 border-gray-700 hover:border-gray-500'}`}
                >
                  <p className="font-semibold text-blue-300 text-sm">{unit.name}</p>
                  <p className="text-[10px] text-gray-500 truncate">UUID: {unit.id}</p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Integration Details */}
        <div className="xl:col-span-2 bg-gray-800 p-4 rounded-lg shadow-md flex flex-col overflow-hidden border border-gray-700">
          {activeUnitId ? (
            <div className="space-y-4 flex flex-col h-full">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-semibold text-gray-200">Integración de Producción</h3>
                  <p className="text-xs text-blue-400 font-medium">Unidad Selección: {safeUnits.find(u => u.id === activeUnitId)?.name}</p>
                </div>
                <button 
                  onClick={() => window.open(getSimulatorUrl(activeUnitId), '_blank')}
                  className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-200 text-[10px] rounded flex items-center transition-colors border border-gray-600"
                >
                  <ArrowTopRightOnSquareIcon className="w-3.5 h-3.5 mr-1.5" /> Abrir Simulador
                </button>
              </div>

              <div className="space-y-4 overflow-y-auto pr-2 custom-scrollbar">
                <div className="bg-gray-900 p-3 rounded-md border border-gray-700">
                  <label className="text-[10px] text-gray-500 uppercase font-black mb-1.5 block tracking-widest">Webhook Endpoint (POST)</label>
                  <div className="flex items-center gap-2 bg-gray-950 p-2 rounded border border-gray-800">
                    <code className="flex-1 text-[11px] text-orange-400 font-mono break-all">{getApiWebhookUrl(activeUnitId)}</code>
                    <button 
                      onClick={() => handleCopy(getApiWebhookUrl(activeUnitId), 'url')}
                      className={`p-1.5 rounded transition-colors ${copiedUrlId === 'url' ? 'bg-green-600 text-white' : 'hover:bg-gray-800 text-gray-400'}`}
                    >
                      <ClipboardDocumentIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="bg-gray-900 p-3 rounded-md border border-gray-700">
                  <label className="text-[10px] text-gray-500 uppercase font-black mb-1.5 block tracking-widest">Esquema de Datos (JSON)</label>
                  <div className="relative group">
                    <pre className="text-[10px] text-green-500 font-mono p-2 bg-gray-950 rounded border border-gray-800 leading-relaxed">
{`{
  "lat": 4.1234,  // Latitud Decimal
  "lon": -74.5678, // Longitud Decimal
  "timestamp": ${Date.now()} // Opcional (ms)
}`}
                    </pre>
                  </div>
                </div>

                <div className="bg-blue-900 bg-opacity-20 border border-blue-900 p-3 rounded flex gap-3">
                  <div className="text-blue-400 mt-0.5">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <p className="text-[11px] text-blue-200 leading-relaxed italic">
                    Este endpoint está optimizado para dispositivos de campo y rastreadores GPS reales. Una vez configurado, la unidad actualizará su posición y estado de "Misión" automáticamente en el mapa táctico de SIMCOP sin necesidad de intervención manual.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-gray-600 opacity-50 space-y-3">
              <RssIcon className="w-16 h-16" />
              <p className="text-sm font-medium">Seleccione una unidad para configurar el Webhook</p>
            </div>
          )}
        </div>
      </div>
      
      {/* Activity Log */}
      <div className="bg-gray-800 p-4 rounded-lg shadow-md border border-gray-700">
        <h3 className="text-sm font-bold text-gray-400 uppercase mb-3 flex justify-between items-center tracking-wider">
          <span>Monitor de Actividad SPOT</span>
          <span className="flex items-center text-[9px] text-green-500 font-bold bg-green-500 bg-opacity-10 px-2 py-0.5 rounded-full border border-green-500 border-opacity-30">
            <span className="w-1.5 h-1.5 bg-green-500 rounded-full mr-1.5 animate-pulse"></span>
            SERVICIO ACTIVO
          </span>
        </h3>
        {loggedReports.length === 0 ? (
          <p className="text-xs text-gray-500 text-center py-6 italic">En espera de telemetría entrante...</p>
        ) : (
          <div className="overflow-x-auto custom-scrollbar">
            <table className="min-w-full text-[10px] text-left">
              <thead className="text-gray-500 border-b border-gray-700">
                <tr>
                  <th className="pb-2 font-black uppercase tracking-tighter">Timestamp (Recepcionado)</th>
                  <th className="pb-2 font-black uppercase tracking-tighter">Elemento Táctico</th>
                  <th className="pb-2 font-black uppercase tracking-tighter">Coordenadas (GMS)</th>
                  <th className="pb-2 font-black uppercase tracking-tighter text-right">Integridad</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {loggedReports.map((log, index) => (
                  <tr key={index} className="animate-in fade-in slide-in-from-left-2 duration-300">
                    <td className="py-2.5 text-gray-300">{new Date(log.receivedTimestamp).toLocaleString()}</td>
                    <td className="py-2.5">
                      <span className="text-blue-400 font-bold">{log.unitName}</span>
                    </td>
                    <td className="py-2.5 font-mono text-orange-300">{decimalToDMS(log.location)}</td>
                    <td className="py-2.5 text-right">
                      <span className="px-1.5 py-0.5 rounded bg-green-900 bg-opacity-30 text-green-400 border border-green-800">OK</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
