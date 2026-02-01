import React from 'react';
import { PlatoonViewType } from '../../types';
import { Squares2X2Icon } from '../icons/Squares2X2Icon';
import { DocumentArrowUpIcon } from '../icons/DocumentArrowUpIcon';
import { ClipboardDocumentListIcon } from '../icons/ClipboardDocumentListIcon';
import { CrosshairsIcon } from '../icons/CrosshairsIcon';
import { ChatBubbleOvalLeftEllipsisIcon } from '../icons/ChatBubbleOvalLeftEllipsisIcon';

interface PlatoonSidebarProps {
  currentView: PlatoonViewType;
  setCurrentView: (view: PlatoonViewType) => void;
}

const navItemsConfig = [
  { view: PlatoonViewType.DASHBOARD, icon: Squares2X2Icon, label: 'Panel de Pelotón' },
  { view: PlatoonViewType.ORDOP, icon: DocumentArrowUpIcon, label: 'Órdenes Recibidas' },
  { view: PlatoonViewType.LOGISTICS, icon: ClipboardDocumentListIcon, label: 'Reporte Logístico' },
  { view: PlatoonViewType.ARTILLERY, icon: CrosshairsIcon, label: 'Apoyo de Fuego' },
  { view: PlatoonViewType.NOVELTIES, icon: ChatBubbleOvalLeftEllipsisIcon, label: 'Registrar Novedad' },
];

export const PlatoonSidebarComponent: React.FC<PlatoonSidebarProps> = ({ currentView, setCurrentView }) => {
  return (
    <aside className="w-64 bg-gray-800 p-4 space-y-2 shadow-lg h-full overflow-y-auto">
      {navItemsConfig.map((item) => (
        <button
          key={item.view}
          onClick={() => setCurrentView(item.view)}
          className={`w-full flex items-center space-x-3 p-3 rounded-md text-left text-sm font-medium transition-colors
              ${currentView === item.view 
              ? 'bg-blue-600 text-white' 
              : 'text-gray-300 hover:bg-gray-700 hover:text-white'
              }`}
          aria-current={currentView === item.view ? 'page' : undefined}
        >
          <item.icon className="w-5 h-5 flex-shrink-0" />
          <span>{item.label}</span> 
        </button>
      ))}
    </aside>
  );
};