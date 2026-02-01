import React from 'react';
import type { Q5Report } from '../types';
import { Q5ReportCardComponent } from './Q5ReportCardComponent';
import { Q5ReportDetailsComponent } from './Q5ReportDetailsComponent';

interface Q5ViewProps {
  q5Reports: Q5Report[];
  selectedQ5Report: Q5Report | null;
  onSelectQ5Report: (report: Q5Report) => void;
  sendQ5ReportViaTelegram: (q5Id: string) => Promise<void>;
  q5SendingStatus: { [q5Id: string]: boolean };
}

export const Q5ViewComponent: React.FC<Q5ViewProps> = ({
  q5Reports,
  selectedQ5Report,
  onSelectQ5Report,
  sendQ5ReportViaTelegram,
  q5SendingStatus
}) => {

  const sortedQ5s = [...q5Reports].sort((a, b) => b.reportTimestamp - a.reportTimestamp);
  const isSendingCurrentQ5Telegram = selectedQ5Report ? q5SendingStatus[selectedQ5Report.id] || false : false;

  return (
    <div className="flex flex-col space-y-4 p-1">
      <h2 className="text-xl md:text-2xl font-semibold text-gray-200 border-b border-gray-700 pb-3">
        Módulo de Reportes Q5
      </h2>

      <div className="flex flex-col md:flex-row flex-1 space-y-4 md:space-y-0 md:space-x-4">
        {/* List Panel */}
        <div className="w-full md:w-2/5 bg-gray-800 p-3 md:p-4 rounded-lg shadow-inner pr-0 md:pr-2">
          {sortedQ5s.length === 0 ? (
            <p className="text-gray-400 text-center py-10">No hay reportes Q5 disponibles.</p>
          ) : (
            <div className="space-y-3">
              {sortedQ5s.map(q5 => (
                <Q5ReportCardComponent
                  key={q5.id}
                  report={q5}
                  onSelectQ5Report={onSelectQ5Report}
                  isSelected={selectedQ5Report?.id === q5.id}
                />
              ))}
            </div>
          )}
        </div>

        {/* Details Panel */}
        <div className="w-full md:w-3/5 bg-gray-850 p-0.5 rounded-lg shadow-inner">
          {selectedQ5Report ? (
            <Q5ReportDetailsComponent
              report={selectedQ5Report}
              onSendToTelegram={sendQ5ReportViaTelegram}
              isSendingTelegram={isSendingCurrentQ5Telegram}
            />
          ) : (
            <div className="flex items-center justify-center h-full bg-gray-800 rounded-lg">
              <p className="text-gray-400 text-center">Seleccione un reporte Q5 de la lista para ver detalles.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
