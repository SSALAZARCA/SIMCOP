import React from 'react';
import type { IntelligenceReport } from '../types';
// import { MapEntityType } from '../types'; // Not used directly for selection logic here
import { EyeIcon } from './icons/EyeIcon'; 
import { decimalToDMS } from '../utils/coordinateUtils';

interface IntelCardProps {
  report: IntelligenceReport;
  onSelectIntel: (report: IntelligenceReport) => void;
  isSelected: boolean;
}

const getReliabilityColor = (reliability: string): string => {
  if (reliability.startsWith('A') || reliability.startsWith('B')) return 'text-green-400';
  if (reliability.startsWith('C')) return 'text-yellow-400';
  return 'text-red-400';
};

const getCredibilityColor = (credibility: string): string => {
    if (credibility.startsWith('1') || credibility.startsWith('2')) return 'text-green-400';
    if (credibility.startsWith('3')) return 'text-yellow-400';
    return 'text-red-400';
};


const _IntelCardComponent: React.FC<IntelCardProps> = ({ report, onSelectIntel, isSelected }) => {
  const eventDate = new Date(report.eventTimestamp).toLocaleString('es-ES');
  const reportDate = new Date(report.reportTimestamp).toLocaleString('es-ES');

  return (
    <div 
      className={`bg-gray-800 p-4 rounded-lg shadow-md hover:bg-gray-700 transition-colors cursor-pointer
                  ${isSelected ? 'ring-2 ring-yellow-500' : ''}`}
      onClick={() => onSelectIntel(report)}
      aria-label={`Informe de inteligencia ${report.title}, tipo ${report.type}`}
    >
      <div className="flex justify-between items-start">
        <h3 className="text-lg font-semibold text-yellow-300">{report.title}</h3>
        <EyeIcon className="w-5 h-5 text-yellow-400" />
      </div>
      <p className="text-sm text-gray-400 mt-1">Tipo: {report.type} (Fuente: {report.sourceDetails})</p>
      
      <div className="mt-3 space-y-1 text-xs text-gray-300">
        <p>Hora Evento: <span className="font-medium text-gray-200">{eventDate}</span></p>
        <p>Hora Reporte: <span className="font-medium text-gray-200">{reportDate}</span></p>
        <p>Ubicación: <span className="font-medium text-gray-200">{decimalToDMS(report.location)}</span></p>
        <p>Fiabilidad: <span className={`font-medium ${getReliabilityColor(report.reliability)}`}>{report.reliability}</span></p>
        <p>Credibilidad: <span className={`font-medium ${getCredibilityColor(report.credibility)}`}>{report.credibility}</span></p>
        <p className="mt-2">Detalles: <span className="font-normal text-gray-300 italic">{report.details.substring(0, 100)}{report.details.length > 100 ? '...' : ''}</span></p>
        {report.keywords.length > 0 && (
          <p className="mt-1">Palabras Clave: {report.keywords.map(kw => <span key={kw} className="bg-gray-700 px-2 py-0.5 rounded-full text-xs mr-1">{kw}</span>)}</p>
        )}
      </div>
    </div>
  );
};

export const IntelCardComponent = React.memo(_IntelCardComponent);
