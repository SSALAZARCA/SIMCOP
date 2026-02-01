
import React from 'react';
import type { IntelligenceReport } from '../types';
import { EyeIcon } from './icons/EyeIcon';
import { decimalToDMS } from '../utils/coordinateUtils';

interface IntelDetailsPanelProps {
  report: IntelligenceReport;
}

const getReliabilityChipClass = (reliability: string): string => {
  if (reliability.startsWith('A') || reliability.startsWith('B')) return 'bg-green-600 text-green-100';
  if (reliability.startsWith('C')) return 'bg-yellow-600 text-yellow-100'; // Good contrast for yellow
  return 'bg-red-600 text-red-100';
};

const getCredibilityChipClass = (credibility: string): string => {
    if (credibility.startsWith('1') || credibility.startsWith('2')) return 'bg-green-600 text-green-100';
    if (credibility.startsWith('3')) return 'bg-yellow-600 text-yellow-100';
    return 'bg-red-600 text-red-100';
};

export const IntelDetailsPanel: React.FC<IntelDetailsPanelProps> = ({ report }) => {
  const eventDate = new Date(report.eventTimestamp).toLocaleString('es-ES');
  const reportDate = new Date(report.reportTimestamp).toLocaleString('es-ES');

  return (
    <div className="space-y-4 text-gray-200">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-bold text-yellow-300">{report.title}</h3>
        <EyeIcon className="w-6 h-6 text-yellow-400" />
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2 text-sm">
        <div><strong className="text-gray-400">ID:</strong> {report.id.substring(0,12)}...</div>
        <div><strong className="text-gray-400">Tipo:</strong> {report.type}</div>
        <div><strong className="text-gray-400">Detalles Fuente:</strong> {report.sourceDetails}</div>
        <div><strong className="text-gray-400">Hora Evento:</strong> {eventDate}</div>
        <div><strong className="text-gray-400">Hora Reporte:</strong> {reportDate}</div>
        <div>
          <strong className="text-gray-400">Ubicación:</strong> {decimalToDMS(report.location)}
        </div>
        <div>
          <strong className="text-gray-400">Fiabilidad:</strong> 
          <span className={`ml-1 px-2 py-0.5 text-xs font-semibold rounded-full ${getReliabilityChipClass(report.reliability)}`}>
            {report.reliability}
          </span>
        </div>
        <div>
          <strong className="text-gray-400">Credibilidad:</strong>
          <span className={`ml-1 px-2 py-0.5 text-xs font-semibold rounded-full ${getCredibilityChipClass(report.credibility)}`}>
            {report.credibility}
          </span>
        </div>
      </div>

      <div>
        <h4 className="text-md font-semibold mb-1 text-gray-300">Detalles</h4>
        <p className="text-sm bg-gray-750 p-3 rounded leading-relaxed whitespace-pre-wrap break-words">{report.details}</p>
      </div>
      
      {report.keywords && report.keywords.length > 0 && (
        <div>
          <h4 className="text-md font-semibold mb-1 text-gray-300">Palabras Clave</h4>
          <div className="flex flex-wrap gap-2">
            {report.keywords.map(kw => (
              <span key={kw} className="bg-gray-700 px-3 py-1 rounded-full text-xs">{kw}</span>
            ))}
          </div>
        </div>
      )}

      {report.attachments && report.attachments.length > 0 && (
         <div>
          <h4 className="text-md font-semibold mb-1 text-gray-300">Adjuntos</h4>
          <ul className="list-disc list-inside text-sm space-y-0.5">
            {report.attachments.map(att => (
              <li key={att.name}>
                {att.url ? <a href={att.url} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">{att.name} ({att.type})</a> : `${att.name} (${att.type})`}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
