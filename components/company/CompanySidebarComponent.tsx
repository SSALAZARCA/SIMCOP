import React from 'react';
import { CompanyViewType } from '../../types';
import { Squares2X2Icon } from '../icons/Squares2X2Icon';
import { ShieldCheckIcon } from '../icons/ShieldCheckIcon';
import { CheckCircleIcon } from '../icons/CheckCircleIcon';
import { DocumentArrowUpIcon } from '../icons/DocumentArrowUpIcon';
import { ClockIcon } from '../icons/ClockIcon';

interface CompanySidebarProps {
  currentView: CompanyViewType;
  setCurrentView: (view: CompanyViewType) => void;
}

const navItemsConfig = [
  { view: CompanyViewType.DASHBOARD, icon: Squares2X2Icon, label: 'Panel de Compañía' },
  { view: CompanyViewType.PLATOONS, icon: ShieldCheckIcon, label: 'Pelotones Subordinados' },
  { view: CompanyViewType.APPROVALS, icon: CheckCircleIcon, label: 'Aprobaciones Pendientes' },
  { view: CompanyViewType.ORDOP, icon: DocumentArrowUpIcon, label: 'Órdenes de Operaciones' },
  { view: CompanyViewType.HISTORY, icon: ClockIcon, label: 'Histórico de Compañía' },
];

export const CompanySidebarComponent: React.FC<CompanySidebarProps> = ({ currentView, setCurrentView }) => {
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