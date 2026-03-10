
import React from 'react';
import type { IntelligenceReport } from '../types';
import { EyeIcon } from './icons/EyeIcon';
import { decimalToDMS } from '../utils/coordinateUtils';

interface IntelDetailsPanelProps {
  report: IntelligenceReport;
  allReports: IntelligenceReport[];
  onLink: (targetId: string) => void;
  onUnlink: (targetId: string) => void;
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

export const IntelDetailsPanel: React.FC<IntelDetailsPanelProps> = ({ report, allReports, onLink, onUnlink }) => {
  const eventDate = new Date(report.eventTimestamp).toLocaleString('es-ES');
  const reportDate = new Date(report.reportTimestamp).toLocaleString('es-ES');

  return (
    <div className="space-y-4 text-gray-200">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-bold text-yellow-300">{report.title}</h3>
        <EyeIcon className="w-6 h-6 text-yellow-400" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2 text-sm">
        <div><strong className="text-gray-400">ID:</strong> {report.id.substring(0, 12)}...</div>
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

      {/* Relaciones / Link Graph UI */}
      <div className="border-t border-gray-700 pt-3">
        <h4 className="text-md font-semibold mb-2 text-yellow-300 flex items-center">
          <span className="mr-2">🔗</span> Relaciones de Inteligencia
        </h4>

        <div className="space-y-2">
          {report.relatedReportIds && report.relatedReportIds.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {report.relatedReportIds.map(id => {
                const target = allReports.find(r => r.id === id);
                return (
                  <div key={id} className="flex items-center bg-gray-700 rounded-md px-2 py-1 text-xs border border-gray-600">
                    <span className="mr-2 truncate max-w-[120px]">{target?.title || 'Informe desconocido'}</span>
                    <button
                      onClick={() => onUnlink(id)}
                      className="text-red-400 hover:text-red-300 font-bold ml-1"
                      title="Eliminar vínculo"
                    >
                      ×
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-gray-500 italic">No hay informes vinculados a este reporte.</p>
          )}

          <div className="mt-3">
            <label className="block text-[10px] text-gray-400 uppercase font-bold mb-1">Vincular con otro informe</label>
            <select
              className="w-full bg-gray-800 border border-gray-600 text-[11px] rounded p-1"
              onChange={(e) => {
                if (e.target.value) {
                  onLink(e.target.value);
                  e.target.value = "";
                }
              }}
              defaultValue=""
            >
              <option value="" disabled>Seleccionar informe para vincular...</option>
              {allReports
                .filter(r => r.id !== report.id && !report.relatedReportIds?.includes(r.id))
                .map(r => (
                  <option key={r.id} value={r.id}>{r.title} ({new Date(r.eventTimestamp).toLocaleDateString()})</option>
                ))}
            </select>
          </div>
        </div>
      </div>
    </div>
  );
};
