
import React from 'react';
import type { Q5Report } from '../types';
import { DocumentTextIcon } from './icons/DocumentTextIcon';

interface Q5ReportCardProps {
  report: Q5Report;
  onSelectQ5Report: (report: Q5Report) => void;
  isSelected: boolean;
}

export const Q5ReportCardComponent: React.FC<Q5ReportCardProps> = ({ report, onSelectQ5Report, isSelected }) => {
  const reportDate = new Date(report.reportTimestamp).toLocaleString('es-ES', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
  });

  return (
    <div
      className={`bg-gray-750 p-3 rounded-md shadow-md cursor-pointer hover:bg-gray-700 transition-colors
                  ${isSelected ? 'ring-2 ring-sky-500' : 'border border-gray-700'}`}
      onClick={() => onSelectQ5Report(report)}
      aria-label={`Reporte Q5 para ${report.unitName}, generado el ${reportDate}`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h3 className="text-md font-semibold text-sky-300">Q5: {report.unitName}</h3>
          <p className="text-xs text-gray-400">Generado: {reportDate}</p>
          <p className="text-xs text-gray-400 mt-0.5">ID AAR: {report.aarId.substring(0, 8)}...</p>
        </div>
        <DocumentTextIcon className="w-5 h-5 text-sky-400 flex-shrink-0 ml-2" />
      </div>
      <p className="text-sm text-gray-300 mt-2 truncate">
        <span className="font-semibold">¿QUÉ?:</span> {report.que}
      </p>
    </div>
  );
};
