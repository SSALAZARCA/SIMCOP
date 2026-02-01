import React from 'react';
import { ViewType, UserRole } from '../types';
import type { User } from '../types';
import { Squares2X2Icon } from './icons/Squares2X2Icon';
import { ShieldCheckIcon } from './icons/ShieldCheckIcon';
import { EyeIcon } from './icons/EyeIcon';
import { BellAlertIcon } from './icons/BellAlertIcon';
import { ChartBarIcon } from './icons/ChartBarIcon';
import { ChatBubbleOvalLeftEllipsisIcon } from './icons/ChatBubbleOvalLeftEllipsisIcon';
import { ArchiveBoxIcon } from './icons/ArchiveBoxIcon';
import { DocumentTextIcon } from './icons/DocumentTextIcon';
import { AcademicCapIcon } from './icons/AcademicCapIcon';
import { ClipboardDocumentListIcon } from './icons/ClipboardDocumentListIcon';
import { TableCellsIcon } from './icons/TableCellsIcon';
import { MapPinIcon } from './icons/MapPinIcon';
import { RssIcon } from './icons/RssIcon';
import { DocumentArrowUpIcon } from './icons/DocumentArrowUpIcon';
import { UsersIcon } from './icons/UsersIcon';
import { SitemapIcon } from './icons/SitemapIcon';
import { CrosshairsIcon } from './icons/CrosshairsIcon';
import { TruckIcon } from './icons/TruckIcon';
import { Cog6ToothIcon } from './icons/Cog6ToothIcon';
import { VideoCameraIcon } from './icons';

interface SidebarProps {
  currentView: ViewType;
  setCurrentView: (view: ViewType) => void;
  currentUser: User | null;
}

const navItemsConfig = [
  { view: ViewType.DASHBOARD, icon: Squares2X2Icon },
  { view: ViewType.MAP, icon: MapPinIcon },
  { view: ViewType.UNITS, icon: ShieldCheckIcon },
  { view: ViewType.ORGANIZATION_STRUCTURE, icon: SitemapIcon },
  { view: ViewType.INTEL, icon: EyeIcon },
  { view: ViewType.ALERTS, icon: BellAlertIcon },
  { view: ViewType.ANALYSIS, icon: ChartBarIcon },
  { view: ViewType.BMA, icon: ShieldCheckIcon },
  { view: ViewType.COMMUNICATIONS, icon: ChatBubbleOvalLeftEllipsisIcon },
  { view: ViewType.ARTILLERY_OBSERVATION, icon: CrosshairsIcon },
  { view: ViewType.UAV_MANAGEMENT, icon: VideoCameraIcon },
  { view: ViewType.ORDOP, icon: DocumentArrowUpIcon },
  { view: ViewType.LOGISTICS, icon: TruckIcon },
  { view: ViewType.HISTORICAL, icon: ArchiveBoxIcon },
  { view: ViewType.Q5_REPORT, icon: DocumentTextIcon },
  { view: ViewType.RETRAINING_AREA, icon: AcademicCapIcon },
  { view: ViewType.UNIT_HISTORY, icon: ClipboardDocumentListIcon },
  { view: ViewType.INSITOP, icon: TableCellsIcon },
  { view: ViewType.SPOT, icon: RssIcon },
  { view: ViewType.PERSONNEL, icon: UsersIcon },  // Módulo de Personal
  { view: ViewType.USER_MANAGEMENT, icon: UsersIcon },
  { view: ViewType.SETTINGS, icon: Cog6ToothIcon },
];

export const SidebarComponent: React.FC<SidebarProps> = ({ currentView, setCurrentView, currentUser }) => {

  // Helper to get the enum key from the enum value
  const getViewTypeKey = (viewTypeValue: ViewType): string => {
    const entries = Object.entries(ViewType) as [string, ViewType][];
    const entry = entries.find(([_, value]) => value === viewTypeValue);
    return entry ? entry[0] : viewTypeValue;
  };

  const canAccessView = (viewType: ViewType): boolean => {
    if (!currentUser) return false;

    // Grant full access to ADMINISTRATOR
    const isAdmin = currentUser?.role === (UserRole as any).ADMINISTRATOR || currentUser?.role === ('ADMINISTRATOR' as any);
    if (isAdmin) return true;

    if (viewType === ViewType.USER_MANAGEMENT || viewType === ViewType.SETTINGS) {
      return isAdmin;
    }

    // Check if permissions array contains the enum value (which is now the key)
    return currentUser.permissions?.includes(viewType as any) || false;
  };

  return (
    <aside className="w-64 glass-effect p-4 space-y-1.5 shadow-2xl h-full overflow-y-auto relative z-40 border-r border-white/5 custom-scrollbar">
      <div className="mb-6 px-2 py-1">
        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em] mb-4">Navegación Operativa</p>
        <div className="h-[1px] w-full bg-gradient-to-r from-blue-500/50 to-transparent"></div>
      </div>

      {navItemsConfig.map((item) => {
        if (!canAccessView(item.view)) {
          return null;
        }
        const isActive = currentView === item.view;
        return (
          <button
            key={item.view}
            onClick={() => {
              console.log('Sidebar item clicked:', item.view);
              setCurrentView(item.view);
            }}
            className={`w-full flex items-center space-x-3 p-3 rounded-xl text-left text-sm font-semibold transition-all group relative overflow-hidden
                ${isActive
                ? 'bg-blue-600/20 text-blue-400 shadow-lg shadow-blue-900/10 border border-blue-500/30'
                : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'
              }`}
            aria-current={isActive ? 'page' : undefined}
          >
            {isActive && (
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.8)]"></div>
            )}
            <item.icon className={`w-5 h-5 flex-shrink-0 transition-transform group-hover:scale-110 ${isActive ? 'text-blue-500' : 'text-gray-500 group-hover:text-gray-300'}`} />
            <span className="truncate tracking-wide">{item.view}</span>
            {isActive && (
              <div className="ml-auto w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse"></div>
            )}
          </button>
        );
      })}
    </aside>
  );
};