import React, { useMemo, useState } from 'react';
import { MilitaryUnit, UnitType } from '../types';
import { Users, AlertTriangle, CheckCircle, XCircle, ChevronRight } from 'lucide-react';
import { UnitRoster } from './UnitRoster';

interface PersonnelStatusProps {
    units: MilitaryUnit[];
}

interface UnitReadiness {
    unitId: string;
    unitName: string;
    unitType: UnitType;
    officers: { authorized: number; actual: number; diff: number; percent: number };
    ncos: { authorized: number; actual: number; diff: number; percent: number };
    soldiers: { authorized: number; actual: number; diff: number; percent: number }; // Includes professional and regular
    total: { authorized: number; actual: number; diff: number; percent: number };
    readinessStatus: 'RED' | 'AMBER' | 'GREEN';
    originalUnit: MilitaryUnit; // Keep ref to full object
}

export const PersonnelStatus: React.FC<PersonnelStatusProps> = ({ units }) => {
    const [selectedUnit, setSelectedUnit] = useState<MilitaryUnit | null>(null);

    const readinessData = useMemo(() => {
        return units.map(unit => {
            // Safe access to nested properties
            const toe = unit.toe?.authorizedPersonnel || { officers: 0, ncos: 0, professionalSoldiers: 0, regularSoldiers: 0, civilians: 0 };
            const actual = unit.personnelBreakdown || { officers: 0, ncos: 0, professionalSoldiers: 0, slRegulars: 0, slPeasant: 0, slBaccalaureate: 0 };

            // Officers
            const authOfficers = toe.officers || 0;
            const actOfficers = actual.officers || 0;
            const diffOfficers = actOfficers - authOfficers;
            const pctOfficers = authOfficers > 0 ? (actOfficers / authOfficers) * 100 : (actOfficers > 0 ? 100 : 0);

            // NCOs
            const authNcos = toe.ncos || 0;
            const actNcos = actual.ncos || 0;
            const diffNcos = actNcos - authNcos;
            const pctNcos = authNcos > 0 ? (actNcos / authNcos) * 100 : (actNcos > 0 ? 100 : 0);

            // Soldiers (Professional + Regular)
            const authSoldiers = (toe.professionalSoldiers || 0) + (toe.regularSoldiers || 0);
            const actSoldiers = (actual.professionalSoldiers || 0) + (actual.slRegulars || 0) + (actual.slPeasant || 0) + (actual.slBaccalaureate || 0);
            const diffSoldiers = actSoldiers - authSoldiers;
            const pctSoldiers = authSoldiers > 0 ? (actSoldiers / authSoldiers) * 100 : (actSoldiers > 0 ? 100 : 0);

            // Total
            const authTotal = authOfficers + authNcos + authSoldiers + (toe.civilians || 0);
            const actTotal = actOfficers + actNcos + actSoldiers; // Civilians usually not tracked in personnelBreakdown in same way, or ignored for readiness
            const diffTotal = actTotal - authTotal;
            const pctTotal = authTotal > 0 ? (actTotal / authTotal) * 100 : (actTotal > 0 ? 100 : 0);

            // Readiness Logic (Simplified)
            let status: 'RED' | 'AMBER' | 'GREEN' = 'GREEN';
            if (pctTotal < 70) status = 'RED';
            else if (pctTotal < 90) status = 'AMBER';

            return {
                unitId: unit.id,
                unitName: unit.name,
                unitType: unit.type,
                officers: { authorized: authOfficers, actual: actOfficers, diff: diffOfficers, percent: pctOfficers },
                ncos: { authorized: authNcos, actual: actNcos, diff: diffNcos, percent: pctNcos },
                soldiers: { authorized: authSoldiers, actual: actSoldiers, diff: diffSoldiers, percent: pctSoldiers },
                total: { authorized: authTotal, actual: actTotal, diff: diffTotal, percent: pctTotal },
                readinessStatus: status,
                originalUnit: unit
            } as UnitReadiness;
        });
    }, [units]);

    const aggregates = useMemo(() => {
        return readinessData.reduce((acc, curr) => {
            acc.authTotal += curr.total.authorized;
            acc.actTotal += curr.total.actual;
            return acc;
        }, { authTotal: 0, actTotal: 0 });
    }, [readinessData]);

    const overallPercent = aggregates.authTotal > 0 ? (aggregates.actTotal / aggregates.authTotal) * 100 : 0;

    return (
        <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gray-800 p-4 rounded-lg border border-gray-700 flex items-center justify-between">
                    <div>
                        <p className="text-gray-400 text-sm">Personal Autorizado (TOE)</p>
                        <p className="text-2xl font-bold text-white">{aggregates.authTotal}</p>
                    </div>
                    <Users className="w-8 h-8 text-blue-500 opacity-50" />
                </div>
                <div className="bg-gray-800 p-4 rounded-lg border border-gray-700 flex items-center justify-between">
                    <div>
                        <p className="text-gray-400 text-sm">Personal Real (Actual)</p>
                        <p className="text-2xl font-bold text-white">{aggregates.actTotal}</p>
                    </div>
                    <Users className="w-8 h-8 text-green-500 opacity-50" />
                </div>
                <div className="bg-gray-800 p-4 rounded-lg border border-gray-700 flex items-center justify-between">
                    <div>
                        <p className="text-gray-400 text-sm">Cumplimiento Global</p>
                        <p className={`text-2xl font-bold ${overallPercent >= 90 ? 'text-green-400' : overallPercent >= 70 ? 'text-yellow-400' : 'text-red-400'}`}>
                            {overallPercent.toFixed(1)}%
                        </p>
                    </div>
                    {overallPercent >= 90 ? <CheckCircle className="w-8 h-8 text-green-500 opacity-50" /> :
                        overallPercent >= 70 ? <AlertTriangle className="w-8 h-8 text-yellow-500 opacity-50" /> :
                            <XCircle className="w-8 h-8 text-red-500 opacity-50" />}
                </div>
            </div>

            {/* Detailed Table */}
            <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
                <div className="p-4 border-b border-gray-700">
                    <h3 className="text-lg font-semibold text-white">Detalle por Unidad</h3>
                    <p className="text-xs text-gray-400 mt-1">Haz clic en "Ver Nómina" para gestionar el personal individualmente.</p>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-700">
                        <thead className="bg-gray-900">
                            <tr>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Unidad</th>
                                <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-400 uppercase tracking-wider">Oficiales (Real/Auth)</th>
                                <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-400 uppercase tracking-wider">Suboficiales (Real/Auth)</th>
                                <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-400 uppercase tracking-wider">Soldados (Real/Auth)</th>
                                <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-400 uppercase tracking-wider">Total</th>
                                <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-400 uppercase tracking-wider">Estado</th>
                                <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-400 uppercase tracking-wider">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="bg-gray-800 divide-y divide-gray-700">
                            {readinessData.map((row) => (
                                <tr key={row.unitId} className="hover:bg-gray-750">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm font-medium text-white">{row.unitName}</div>
                                        <div className="text-xs text-gray-500">{row.unitType}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-center">
                                        <div className="text-sm text-gray-300">
                                            <span className={row.officers.diff < 0 ? 'text-red-400' : 'text-green-400'}>{row.officers.actual}</span>
                                            <span className="text-gray-500"> / {row.officers.authorized}</span>
                                        </div>
                                        <div className="text-xs text-gray-500">{row.officers.percent.toFixed(0)}%</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-center">
                                        <div className="text-sm text-gray-300">
                                            <span className={row.ncos.diff < 0 ? 'text-red-400' : 'text-green-400'}>{row.ncos.actual}</span>
                                            <span className="text-gray-500"> / {row.ncos.authorized}</span>
                                        </div>
                                        <div className="text-xs text-gray-500">{row.ncos.percent.toFixed(0)}%</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-center">
                                        <div className="text-sm text-gray-300">
                                            <span className={row.soldiers.diff < 0 ? 'text-red-400' : 'text-green-400'}>{row.soldiers.actual}</span>
                                            <span className="text-gray-500"> / {row.soldiers.authorized}</span>
                                        </div>
                                        <div className="text-xs text-gray-500">{row.soldiers.percent.toFixed(0)}%</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-center">
                                        <div className="text-sm font-bold text-white">{row.total.percent.toFixed(1)}%</div>
                                        <div className="text-xs text-gray-500">{row.total.actual} / {row.total.authorized}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-center">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                                            ${row.readinessStatus === 'GREEN' ? 'bg-green-900 text-green-200' :
                                                row.readinessStatus === 'AMBER' ? 'bg-yellow-900 text-yellow-200' :
                                                    'bg-red-900 text-red-200'}`}>
                                            {row.readinessStatus === 'GREEN' ? 'LISTO' :
                                                row.readinessStatus === 'AMBER' ? 'ALERTA' : 'CRÍTICO'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <button
                                            onClick={() => setSelectedUnit(row.originalUnit)}
                                            className="text-teal-400 hover:text-teal-300 flex items-center gap-1 ml-auto"
                                        >
                                            Ver Nómina <ChevronRight size={16} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal for Unit Roster */}
            {selectedUnit && (
                <UnitRoster unit={selectedUnit} onClose={() => setSelectedUnit(null)} />
            )}
        </div>
    );
};
