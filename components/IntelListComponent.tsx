import React from 'react';
import type { IntelligenceReport, SelectedEntity } from '../types';
import { MapEntityType } from '../types';
import { IntelCardComponent } from './IntelCardComponent';

interface IntelListProps {
  intelReports: IntelligenceReport[];
  onSelectIntel: (report: IntelligenceReport) => void;
  selectedEntity: SelectedEntity | null;
}

export const IntelListComponent: React.FC<IntelListProps> = ({ intelReports, onSelectIntel, selectedEntity }) => {
  if (intelReports.length === 0) {
    return <p className="text-gray-400">No hay informes de inteligencia disponibles.</p>;
  }

  return (
    <div className="space-y-3 pr-1">
      {intelReports.map(report => (
        <IntelCardComponent 
          key={report.id} 
          report={report} 
          onSelectIntel={onSelectIntel}
          isSelected={selectedEntity?.type === MapEntityType.INTEL && selectedEntity?.id === report.id}
        />
      ))}
    </div>
  );
};
