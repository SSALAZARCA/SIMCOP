
import React from 'react';
import type { Q5Report } from '../types';
import { ArrowPathIcon } from './icons/ArrowPathIcon'; // For loading spinner

interface Q5ReportDetailsProps {
  report: Q5Report;
  onSendToTelegram: (q5Id: string) => void;
  isSendingTelegram: boolean;
}

const Section: React.FC<{ title: string; content: string }> = ({ title, content }) => (
  <div className="py-2">
    <h4 className="text-md font-semibold text-sky-200 mb-1">✅ {title}:</h4>
    <p className="text-sm text-gray-300 whitespace-pre-wrap leading-relaxed pl-2">{content || "No especificado."}</p>
  </div>
);

export const Q5ReportDetailsComponent: React.FC<Q5ReportDetailsProps> = ({ report, onSendToTelegram, isSendingTelegram }) => {
  const reportDate = new Date(report.reportTimestamp).toLocaleString('es-ES', {
    year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit'
  });

  return (
    <div className="p-1 bg-gray-800 text-gray-200 rounded-lg shadow-lg h-full flex flex-col">
      <div className="text-center py-3 border-b border-gray-700">
        <p className="text-sm font-bold text-red-400">🔴 <i>MDN-COGFM-COEJC-SECEJ-JEMOP-FUTOM-FUDRA11-BADRA32</i></p>
      </div>

      <div className="flex-grow overflow-y-auto p-4 space-y-1 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800">
        <div className="mb-3">
          <p className="text-xs text-gray-400 text-right">Generado: {reportDate}</p>
          <p className="text-xs text-gray-400 text-right">Para Unidad: {report.unitName} (ID: {report.unitId.substring(0, 8)}...)</p>
          <p className="text-xs text-gray-400 text-right">Basado en AAR ID: {report.aarId.substring(0, 8)}...</p>
        </div>

        <Section title="¿QUÉ?" content={report.que} />
        <Section title="¿QUIÉN?" content={report.quien} />
        <Section title="¿CUÁNDO?" content={report.cuando} />
        <Section title="¿DÓNDE?" content={report.donde} />
        <Section title="HECHOS" content={report.hechos} />
        <Section title="ACCIONES SUBSIGUIENTES" content={report.accionesSubsiguientes} />
      </div>

      <div className="text-center py-3 border-t border-gray-700 mt-auto">
        <button
          onClick={() => onSendToTelegram(report.id)}
          disabled={isSendingTelegram}
          className="w-full sm:w-auto mb-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-md text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          aria-label="Enviar reporte Q5 por Telegram"
        >
          {isSendingTelegram ? (
            <>
              <ArrowPathIcon className="w-4 h-4 mr-2 animate-spin" />
              Enviando a Telegram...
            </>
          ) : (
            "Enviar por Telegram"
          )}
        </button>
        <p className="text-sm font-semibold text-gray-400">Patria Honor Lealtad</p>
        <p className="text-xs text-gray-500 italic">Nuestro compromiso es Colombia</p>
      </div>
    </div>
  );
};
