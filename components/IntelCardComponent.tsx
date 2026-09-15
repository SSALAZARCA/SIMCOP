import React from 'react';
import type { IntelligenceReport } from '../types';
// import { MapEntityType } from '../types'; // Not used directly for selection logic here
import { EyeIcon } from './icons/EyeIcon'; 
// import { decimalToDMS } from '../utils/coordinateUtils'; // kept for potential future use

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
  const eventDate = new Date(report.eventTimestamp).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' });

  return (
    <div 
      className={`group bg-gray-800 border rounded-xl shadow-md hover:shadow-lg hover:bg-gray-750 transition-all cursor-pointer
                  ${isSelected 
                    ? 'ring-2 ring-yellow-400 border-yellow-500/50 bg-gray-800' 
                    : 'border-gray-700/60 hover:border-yellow-500/30'}`}
      onClick={() => onSelectIntel(report)}
      aria-label={`Informe de inteligencia ${report.title}, tipo ${report.type}`}
    >
      {/* Accent bar */}
      <div className={`h-1 rounded-t-xl ${isSelected ? 'bg-yellow-400' : 'bg-yellow-600/40 group-hover:bg-yellow-500/60'} transition-colors`} />

      <div className="p-4">
        {/* Header row */}
        <div className="flex justify-between items-start gap-2 mb-2">
          <h3 className="text-sm font-bold text-yellow-300 leading-snug flex-1">{report.title}</h3>
          <div className="flex items-center gap-1.5 shrink-0">
            <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${getReliabilityColor(report.reliability)} border-current/30 bg-current/10`}>
              {report.reliability}
            </span>
            <EyeIcon className="w-4 h-4 text-yellow-400/70" />
          </div>
        </div>

        {/* Source + Type badge */}
        <div className="flex items-center gap-2 mb-3">
          <span className="text-[10px] font-bold px-2 py-0.5 bg-blue-900/60 text-blue-300 rounded border border-blue-700/40 uppercase tracking-wider">{report.type}</span>
          <p className="text-xs text-gray-400 truncate">{report.sourceDetails}</p>
        </div>

        {/* Description */}
        <p className="text-xs text-gray-300 leading-relaxed line-clamp-3 mb-3">
          {report.details}
        </p>

        {/* Keywords */}
        {report.keywords.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {report.keywords.slice(0, 4).map(kw => (
              <span key={kw} className="bg-gray-700 border border-gray-600 px-2 py-0.5 rounded-full text-[10px] text-gray-300">{kw}</span>
            ))}
            {report.keywords.length > 4 && (
              <span className="text-[10px] text-gray-500">+{report.keywords.length - 4}</span>
            )}
          </div>
        )}

        {/* Timestamps footer */}
        <div className="flex justify-between items-center text-[10px] text-gray-500 border-t border-white/5 pt-2">
          <span>Evento: <span className="text-gray-400 font-medium">{eventDate}</span></span>
          <span className={`font-bold ${getCredibilityColor(report.credibility)}`}>CRED: {report.credibility}</span>
        </div>
      </div>
    </div>
  );
};

export const IntelCardComponent = React.memo(_IntelCardComponent);
