import React, { useMemo } from 'react';
import type { MilitaryUnit, Alert } from '../../types';
import { UnitStatus, AlertType, CompanyViewType } from '../../types';
import { ShieldCheckIcon } from '../icons/ShieldCheckIcon';
import { UsersIcon } from '../icons/UsersIcon';
import { CheckCircleIcon } from '../icons/CheckCircleIcon';

interface CompanyDashboardViewProps {
  company: MilitaryUnit;
  platoons: MilitaryUnit[];
  alerts: Alert[];
  setCurrentView: (view: CompanyViewType) => void;
}

export const CompanyDashboardView: React.FC<CompanyDashboardViewProps> = ({ company, platoons, alerts, setCurrentView }) => {
  const totalPersonnel = useMemo(() => {
    return platoons.reduce((sum, p) => sum + p.personnelBreakdown.officers + p.personnelBreakdown.ncos + p.personnelBreakdown.professionalSoldiers + p.personnelBreakdown.slRegulars, 0);
  }, [platoons]);

  const operationalPlatoons = useMemo(() => {
    return platoons.filter(p => p.status === UnitStatus.OPERATIONAL || p.status === UnitStatus.MOVING || p.status === UnitStatus.STATIC).length;
  }, [platoons]);
  
  const pendingApprovalsCount = useMemo(() => {
    return alerts.filter(a => (a.type === AlertType.AMMO_REPORT_PENDING || a.type === AlertType.PLATOON_NOVELTY_PENDING) && !a.acknowledged).length;
  }, [alerts]);

  const getStatusColor = (status: UnitStatus): string => {
    switch (status) {
      case UnitStatus.OPERATIONAL:
      case UnitStatus.MOVING:
        return 'text-green-400';
      case UnitStatus.ENGAGED:
        return 'text-red-400 animate-pulse';
      case UnitStatus.LOW_SUPPLIES:
        return 'text-yellow-400';
      default:
        return 'text-gray-300';
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold text-gray-200 border-b border-gray-700 pb-2">
        Panel de Mando - {company.name}
      </h2>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gray-800 p-4 rounded-lg text-center">
          <ShieldCheckIcon className="w-8 h-8 mx-auto mb-2 text-blue-400" />
          <p className="text-2xl font-bold text-blue-300">{platoons.length}</p>
          <p className="text-sm text-gray-400">Pelotones Asignados</p>
        </div>
        <div className="bg-gray-800 p-4 rounded-lg text-center">
          <UsersIcon className="w-8 h-8 mx-auto mb-2 text-green-400" />
          <p className="text-2xl font-bold text-green-300">{totalPersonnel}</p>
          <p className="text-sm text-gray-400">Personal Total</p>
        </div>
        <div className="bg-gray-800 p-4 rounded-lg text-center">
          <ShieldCheckIcon className="w-8 h-8 mx-auto mb-2 text-yellow-400" />
          <p className="text-2xl font-bold text-yellow-300">{operationalPlatoons}</p>
          <p className="text-sm text-gray-400">Pelotones Operacionales</p>
        </div>
         <button 
            onClick={() => setCurrentView(CompanyViewType.APPROVALS)}
            className={`p-4 rounded-lg text-center transition-colors ${pendingApprovalsCount > 0 ? 'bg-orange-800 hover:bg-orange-700' : 'bg-gray-800 hover:bg-gray-700'}`}
        >
          <CheckCircleIcon className={`w-8 h-8 mx-auto mb-2 ${pendingApprovalsCount > 0 ? 'text-orange-300 animate-pulse' : 'text-gray-400'}`} />
          <p className={`text-2xl font-bold ${pendingApprovalsCount > 0 ? 'text-orange-200' : 'text-gray-300'}`}>{pendingApprovalsCount}</p>
          <p className="text-sm text-gray-400">Aprobaciones Pendientes</p>
        </button>
      </div>

      <div>
        <h3 className="text-xl font-semibold text-gray-300 mb-2">Resumen de Pelotones</h3>
        <div className="bg-gray-800 p-2 rounded-lg shadow-inner overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-750">
              <tr>
                <th className="px-3 py-2 text-left">Pelotón</th>
                <th className="px-3 py-2 text-left">Comandante</th>
                <th className="px-3 py-2 text-left">Estado</th>
                <th className="px-3 py-2 text-center">Munición</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {platoons.map(p => (
                <tr key={p.id} className="hover:bg-gray-750">
                  <td className="px-3 py-2 font-medium text-gray-200">{p.name}</td>
                  <td className="px-3 py-2 text-gray-300">{p.commander.rank} {p.commander.name}</td>
                  <td className={`px-3 py-2 font-semibold ${getStatusColor(p.status)}`}>{p.status}</td>
                  <td className={`px-3 py-2 text-center ${p.ammoLevel && p.ammoLevel < 25 ? 'text-yellow-400 font-bold' : 'text-gray-300'}`}>{p.ammoLevel?.toFixed(0)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
