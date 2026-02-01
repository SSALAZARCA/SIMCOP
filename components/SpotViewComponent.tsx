import React, { useState, useEffect, useCallback } from 'react';
import type { MilitaryUnit, GeoLocation, SpotReportPayload, LoggedSpotReport } from '../types';
import { RssIcon } from './icons/RssIcon';
// PaperAirplaneIcon is no longer used in this version
import { ArrowTopRightOnSquareIcon } from './icons/ArrowTopRightOnSquareIcon';
import { ClipboardDocumentIcon } from './icons/ClipboardDocumentIcon';
import { decimalToDMS } from '../utils/coordinateUtils';

interface SpotViewProps {
  units: MilitaryUnit[];
  processSpotReport: (data: SpotReportPayload) => void;
}

const MAX_LOGGED_REPORTS = 20;

interface UnitWebhookInfo {
  url: string;
  unitName: string;
}

export const SpotViewComponent: React.FC<SpotViewProps> = ({ units, processSpotReport }) => {
  const [loggedReports, setLoggedReports] = useState<LoggedSpotReport[]>([]);
  const [generatedUnitUrls, setGeneratedUnitUrls] = useState<Record<string, UnitWebhookInfo>>({});
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
  }, [units]); // Dependency on units is correct here

  useEffect(() => {
    const handleSpotMessage = (event: MessageEvent) => {
      if (event.origin !== window.origin) { 
        console.warn("SPOT: Mensaje recibido de origen no confiable:", event.origin, "Esperado:", window.origin);
        return;
      }
      if (event.data && event.data.type === 'SPOT_REPORT') {
        const payload = event.data.payload as SpotReportPayload; // Assert type
        if (payload && payload.unitId && payload.location && 
            typeof payload.location.lat === 'number' && 
            typeof payload.location.lon === 'number' && 
            typeof payload.timestamp === 'number') {
          const reportData: SpotReportPayload = { 
            unitId: payload.unitId, 
            location: payload.location, 
            timestamp: payload.timestamp 
          };
          processSpotReport(reportData);
          logReport(reportData);
        } else {
          console.error("SPOT: Payload de SPOT_REPORT inválido:", event.data.payload);
          const errorLog: LoggedSpotReport = {
            unitId: 'ERROR_PAYLOAD', location: {lat:0, lon:0}, timestamp: 0,
            receivedTimestamp: Date.now(), unitName: 'Payload Inválido',
          };
          setLoggedReports(prev => [errorLog, ...prev].slice(0, MAX_LOGGED_REPORTS));
        }
      }
    };

    window.addEventListener('message', handleSpotMessage);
    return () => window.removeEventListener('message', handleSpotMessage);
  }, [processSpotReport, logReport]);

  const handleGenerateOrShowUrl = (unit: MilitaryUnit) => {
    const spotSenderPage = "/spot-sender.html"; // Relative path
    let origin = window.location.origin;
    if (!origin || origin === "null") { // Handle file:// or other unusual origins
        console.warn("SPOT: window.location.origin is not standard. Using empty string for URL generation. This might affect spot-sender.html functionality if not served via HTTP/S.");
        origin = ""; // Fallback to relative path for spot-sender, targetOrigin might be problematic
    }
    const url = `${origin}${spotSenderPage}?unitId=${unit.id}&targetOrigin=${encodeURIComponent(origin)}`;
    setGeneratedUnitUrls(prev => ({
      ...prev,
      [unit.id]: { url, unitName: unit.name }
    }));
  };

  const handleOpenSenderPage = (url: string, unitId: string) => {
    // Ensure unique name for window.open to allow multiple instances if needed
    // and to ensure window.opener is set reliably.
    window.open(url, `_blank_spot_${unitId}_${Date.now()}`, 'noopener,noreferrer');
  };
  
  const handleCopyUrl = (url: string, unitId: string) => {
    if (!navigator.clipboard) {
        alert("La API del portapapeles no está disponible en este navegador o contexto (posiblemente HTTP). Por favor, copie manualmente.");
        console.warn("Navigator.clipboard no disponible.");
        return;
    }
    navigator.clipboard.writeText(url).then(() => {
      setCopiedUrlId(unitId);
      setTimeout(() => setCopiedUrlId(null), 2000);
    }).catch(err => {
      console.error("Error al copiar URL: ", err);
      alert("No se pudo copiar la URL. Verifique los permisos del portapapeles o cópiela manualmente.");
    });
  };

  // Ensure units is always an array before mapping
  const safeUnits = Array.isArray(units) ? units : [];

  return (
    <div className="flex flex-col space-y-4 p-2 md:p-4">
      <div className="flex flex-col sm:flex-row justify-between items-center border-b border-gray-700 pb-3 gap-2">
        <h2 className="text-xl md:text-2xl font-semibold text-gray-200 flex items-center">
          <RssIcon className="w-6 h-6 md:w-7 md:h-7 mr-2 md:mr-3 text-orange-400" />
          SPOT - Seguimiento y Posicionamiento Táctico
        </h2>
      </div>

      <div className="bg-gray-800 p-4 rounded-lg shadow-md">
        <h3 className="text-lg font-semibold text-gray-300 mb-2">Generador de URL de Envío SPOT por Unidad</h3>
        <p className="text-sm text-gray-400 mb-3">
          Para cada unidad, se genera una URL real y única que apunta a la página 'SPOT Sender' (`spot-sender.html`). 
          Esta página actúa como la interfaz para que un dispositivo externo (o un simulador) envíe reportes de coordenadas 
          para esa unidad específica de vuelta a esta aplicación SIMCOP principal. 
          Abra esta URL en otro navegador o pestaña para simular un reporte de dispositivo.
        </p>
        {safeUnits.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-3">No hay unidades creadas. Por favor, cree unidades en la vista 'Unidades' primero.</p>
        ) : (
          <div className="space-y-4 pr-2">
            {safeUnits.map(unit => (
              <div key={unit.id} className="bg-gray-750 p-3 rounded-md">
                <div className="flex flex-col sm:flex-row justify-between items-center gap-2">
                  <div>
                    <p className="font-semibold text-blue-300">{unit.name}</p>
                    <p className="text-xs text-gray-500">ID: {unit.id}</p>
                  </div>
                  <button
                    onClick={() => handleGenerateOrShowUrl(unit)}
                    className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-medium rounded-md shadow-sm transition-colors w-full sm:w-auto"
                  >
                    {generatedUnitUrls[unit.id] ? 'Actualizar URL de Envío' : 'Generar URL de Envío'}
                  </button>
                </div>
                {generatedUnitUrls[unit.id] && (
                  <div className="mt-2 space-y-2">
                    <input 
                      type="text" 
                      readOnly 
                      value={generatedUnitUrls[unit.id].url} 
                      className="w-full bg-gray-700 p-1.5 rounded-md text-xs text-gray-300 border border-gray-600"
                      aria-label={`URL de Envío SPOT para ${unit.name}`}
                      onFocus={(e) => e.target.select()}
                    />
                    <div className="flex flex-col sm:flex-row gap-2">
                       <button
                        onClick={() => handleCopyUrl(generatedUnitUrls[unit.id].url, unit.id)}
                        className="flex-1 px-3 py-1.5 bg-gray-600 hover:bg-gray-500 text-white text-xs font-medium rounded-md shadow-sm transition-colors flex items-center justify-center"
                      >
                        <ClipboardDocumentIcon className="w-3.5 h-3.5 mr-1.5" />
                        {copiedUrlId === unit.id ? '¡Copiado!' : 'Copiar URL'}
                      </button>
                      <button
                        onClick={() => handleOpenSenderPage(generatedUnitUrls[unit.id].url, unit.id)}
                        className="flex-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-md shadow-sm transition-colors flex items-center justify-center"
                      >
                        <ArrowTopRightOnSquareIcon className="w-3.5 h-3.5 mr-1.5" />
                        Abrir Página de Envío
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      
      <div className="bg-gray-800 p-4 rounded-lg shadow-md">
        <h3 className="text-lg font-semibold text-gray-300 mb-2">Instrucciones de Integración (Envío Simulado)</h3>
        <p className="text-sm text-gray-400 mb-2">
          La "Página de Envío" que se abre con la URL generada permite ingresar coordenadas manualmente. Para una simulación más avanzada, un script externo que controle un navegador podría usar esta URL para automatizar el envío de datos mediante `postMessage`.
        </p>
        <p className="text-sm text-gray-400 mb-1">El sistema receptor en SIMCOP (esta pestaña) escucha mensajes con la estructura:</p>
        <pre className="bg-gray-900 p-3 rounded-md text-xs text-gray-200 overflow-x-auto">
          {`{\n  type: 'SPOT_REPORT',\n  payload: {\n    unitId: 'ID_DE_LA_UNIDAD_DE_LA_URL',\n    location: { lat: 4.60971, lon: -74.08175 },\n    timestamp: 1678886400000 // Timestamp UNIX en milisegundos\n  }\n}`}
        </pre>
         <p className="text-xs text-gray-500 mt-2">
          La página <code className="bg-gray-700 p-0.5 rounded text-orange-400">spot-sender.html</code> se encarga de formatear y enviar este mensaje a SIMCOP.
        </p>
      </div>

      <div className="flex-1 bg-gray-800 p-4 rounded-lg shadow-md">
        <h3 className="text-lg font-semibold text-gray-300 mb-3 border-b border-gray-600 pb-2">Registro de Reportes SPOT Recibidos (Últimos {MAX_LOGGED_REPORTS})</h3>
        {loggedReports.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-5">Esperando reportes SPOT...</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-700 text-xs">
              <thead className="bg-gray-750 sticky top-0 z-10">
                <tr>
                  <th className="px-3 py-2 text-left font-medium text-gray-300">Recibido (App)</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-300">ID Unidad</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-300">Nombre Unidad</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-300">Ubicación (GMS)</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-300">Timestamp (Dispositivo)</th>
                </tr>
              </thead>
              <tbody className="bg-gray-800 divide-y divide-gray-700">
                {loggedReports.map((log, index) => (
                  <tr key={index} className={`${log.unitId === 'ERROR_PAYLOAD' ? 'bg-red-900 bg-opacity-30' : (index % 2 === 0 ? 'bg-gray-800' : 'bg-gray-850') }`}>
                    <td className="px-3 py-2 whitespace-nowrap text-gray-300">{new Date(log.receivedTimestamp).toLocaleString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</td>
                    <td className="px-3 py-2 whitespace-nowrap text-gray-300">{log.unitId.substring(0,10)}...</td>
                    <td className="px-3 py-2 whitespace-nowrap text-gray-300">{log.unitName}</td>
                    <td className="px-3 py-2 whitespace-nowrap text-gray-300">{log.unitId !== 'ERROR_PAYLOAD' ? decimalToDMS(log.location) : 'N/A'}</td>
                    <td className="px-3 py-2 whitespace-nowrap text-gray-300">{log.unitId !== 'ERROR_PAYLOAD' ? new Date(log.timestamp).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'medium'}) : 'N/A'}</td>
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
