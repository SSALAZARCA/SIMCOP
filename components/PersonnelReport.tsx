import React, { useMemo } from 'react';
import { MilitaryUnit } from '../types';
import { FileText, Printer, Download } from 'lucide-react';
import { soldierService } from '../services/soldierService';

interface PersonnelReportProps {
    units: MilitaryUnit[];
}

export const PersonnelReport: React.FC<PersonnelReportProps> = ({ units }) => {
    const today = new Date();

    const { hierarchy, aggregatedStats } = useMemo(() => {
        const unitMap = new Map<string, MilitaryUnit>();
        const childrenMap = new Map<string, string[]>();

        // 1. Index units
        units.forEach(u => {
            unitMap.set(u.id, u);
            if (!childrenMap.has(u.id)) childrenMap.set(u.id, []);
        });

        // 2. Build Tree
        const roots: string[] = [];
        units.forEach(u => {
            if (u.parentId && unitMap.has(u.parentId)) {
                childrenMap.get(u.parentId)?.push(u.id);
            } else {
                roots.push(u.id);
            }
        });

        // 3. Stats Aggregation (Recursive)
        const statsMap = new Map<string, any>();

        const calculateStats = (unitId: string) => {
            const unit = unitMap.get(unitId)!;
            const children = childrenMap.get(unitId) || [];

            // Local Stats (HQ/Organic)
            const localActual = unit.personnelBreakdown || { officers: 0, ncos: 0, professionalSoldiers: 0, slRegulars: 0 };
            const localToe = unit.toe?.authorizedPersonnel || { officers: 0, ncos: 0, professionalSoldiers: 0, regularSoldiers: 0, civilians: 0 };

            // Initialize with local values
            let agg = {
                actual: {
                    officers: localActual.officers,
                    ncos: localActual.ncos,
                    soldiers: (localActual.professionalSoldiers + localActual.slRegulars || 0)
                },
                authorized: {
                    officers: localToe.officers || 0,
                    ncos: localToe.ncos || 0,
                    soldiers: ((localToe.professionalSoldiers || 0) + (localToe.regularSoldiers || 0))
                }
            };

            // Recursively add Children Stats
            children.forEach(childId => {
                const childStats = calculateStats(childId);
                agg.actual.officers += childStats.actual.officers;
                agg.actual.ncos += childStats.actual.ncos;
                agg.actual.soldiers += childStats.actual.soldiers;

                agg.authorized.officers += childStats.authorized.officers;
                agg.authorized.ncos += childStats.authorized.ncos;
                agg.authorized.soldiers += childStats.authorized.soldiers;
            });

            statsMap.set(unitId, agg);
            return agg;
        };

        roots.forEach(rootId => calculateStats(rootId));

        // 4. Flatten for rendering with depth
        const flatList: { unit: MilitaryUnit, depth: number, stats: any }[] = [];
        const traverse = (id: string, depth: number) => {
            const unit = unitMap.get(id);
            if (!unit) return;
            flatList.push({ unit, depth, stats: statsMap.get(id) });
            const children = childrenMap.get(id) || [];
            children.forEach(childId => traverse(childId, depth + 1));
        };
        roots.forEach(rootId => traverse(rootId, 0));

        return { hierarchy: flatList, aggregatedStats: statsMap };

    }, [units]);

    // Grand Totals (Sum of Roots)
    const grandTotals = useMemo(() => {
        return hierarchy.filter(item => item.depth === 0).reduce((acc, item) => {
            acc.actual += item.stats.actual.officers + item.stats.actual.ncos + item.stats.actual.soldiers;
            acc.auth += item.stats.authorized.officers + item.stats.authorized.ncos + item.stats.authorized.soldiers;
            return acc;
        }, { actual: 0, auth: 0 });
    }, [hierarchy]);

    const readinessPercent = grandTotals.auth > 0 ? (grandTotals.actual / grandTotals.auth) * 100 : 0;

    const handlePrint = () => {
        window.print();
    };

    const handleDownloadCSV = async () => {
        try {
            const allSoldiers = await soldierService.getAll();
            const headers = ['ID', 'Unidad (ID)', 'Rango', 'Nombre Completo', 'Especialidad', 'Estado'];
            const rows = allSoldiers.map(s => [
                s.id,
                s.unitId || 'N/A',
                s.rank,
                `"${s.fullName}"`,
                s.moceCode,
                s.status
            ]);

            const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `reporte_personal_${today.toISOString().split('T')[0]}.csv`;
            link.click();
        } catch (error) {
            console.error("Error downloading CSV", error);
            alert("Error al generar el archivo CSV");
        }
    };

    return (
        <div className="bg-gray-100 min-h-screen text-gray-900 p-8 font-serif print:bg-white print:p-0">
            {/* Controls - Hide on Print */}
            <div className="max-w-4xl mx-auto mb-8 flex justify-end gap-4 print:hidden">
                <button
                    onClick={handleDownloadCSV}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
                >
                    <Download size={18} /> Exportar Nómina (CSV)
                </button>
                <button
                    onClick={handlePrint}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-800 text-white rounded hover:bg-gray-700 transition"
                >
                    <Printer size={18} /> Imprimir Informe
                </button>
            </div>

            {/* Document Paper */}
            <div className="max-w-4xl mx-auto bg-white shadow-lg p-12 print:shadow-none print:p-0">

                {/* Header */}
                <div className="text-center border-b-2 border-black pb-6 mb-8">
                    <h1 className="text-3xl font-bold uppercase mb-2">Informe de Situación de Personal</h1>
                    <h2 className="text-xl font-bold text-gray-700 uppercase">Estructura de Fuerza Completa</h2>
                    <p className="mt-4 text-sm font-semibold">
                        FECHA: {today.toLocaleDateString()} | HOR: {today.toLocaleTimeString()}
                    </p>
                    <p className="text-xs uppercase mt-1 text-red-700 font-bold">Documento Confidencial</p>
                </div>

                {/* Executive Summary */}
                <div className="mb-8">
                    <h3 className="text-lg font-bold uppercase border-b border-gray-400 mb-4 pb-1">1. Resumen Ejecutivo (Total Fuerza)</h3>
                    <div className="grid grid-cols-2 gap-8">
                        <div>
                            <p className="mb-2"><strong>Unidades Mayores:</strong> {hierarchy.filter(i => i.depth === 0).length}</p>
                            <p className="mb-2"><strong>Unidades Totales:</strong> {units.length}</p>
                            <p className="mb-2"><strong>Pie de Fuerza Total:</strong> {grandTotals.actual}</p>
                            <p className="mb-2"><strong>Autorizado (TOE):</strong> {grandTotals.auth}</p>
                        </div>
                        <div className="bg-gray-50 p-4 border border-gray-200">
                            <p className="text-center font-bold text-gray-600 mb-1">DISPOSICIÓN DE COMBATE</p>
                            <div className="text-center text-4xl font-bold mb-2">
                                {readinessPercent.toFixed(1)}%
                            </div>
                            <div className="w-full bg-gray-300 h-4 rounded-full overflow-hidden">
                                <div
                                    className={`h-full ${readinessPercent >= 90 ? 'bg-green-600' : readinessPercent >= 70 ? 'bg-yellow-500' : 'bg-red-600'}`}
                                    style={{ width: `${readinessPercent}%` }}
                                ></div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Unit Details Tree */}
                <div>
                    <h3 className="text-lg font-bold uppercase border-b border-gray-400 mb-4 pb-1">2. Estado de Fuerza por Niveles de Mando</h3>
                    <table className="w-full text-sm border-collapse border border-gray-400">
                        <thead>
                            <tr className="bg-gray-800 text-white">
                                <th className="p-2 text-left">Unidad</th>
                                <th className="p-2 text-center w-24">Tipo</th>
                                <th className="p-2 text-center w-32">Fuerza Real</th>
                                <th className="p-2 text-center w-32">Autorizada</th>
                                <th className="p-2 text-center w-24">Estado</th>
                            </tr>
                        </thead>
                        <tbody>
                            {hierarchy.map((item, idx) => {
                                const { unit, depth, stats } = item;
                                const actualTotal = stats.actual.officers + stats.actual.ncos + stats.actual.soldiers;
                                const authTotal = stats.authorized.officers + stats.authorized.ncos + stats.authorized.soldiers;
                                const pct = authTotal > 0 ? (actualTotal / authTotal) * 100 : 0;

                                // Indentation style
                                const paddingLeft = `${(depth * 20) + 8}px`;

                                return (
                                    <tr key={unit.id} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'} ${depth === 0 ? 'font-bold bg-gray-100' : ''} border-b border-gray-200`}>
                                        <td className="p-2 border-r border-gray-300" style={{ paddingLeft }}>
                                            <div className="flex items-center">
                                                {depth > 0 && <span className="text-gray-400 mr-2">└</span>}
                                                {unit.name}
                                            </div>
                                        </td>
                                        <td className="p-2 text-center text-xs uppercase border-r border-gray-300">{unit.type}</td>
                                        <td className="p-2 text-center border-r border-gray-300 font-medium">
                                            {actualTotal}
                                        </td>
                                        <td className="p-2 text-center border-r border-gray-300 text-gray-500">
                                            {authTotal}
                                        </td>
                                        <td className="p-2 text-center font-bold">
                                            {pct >= 90 ? <span className="text-green-700">LISTO ({pct.toFixed(0)}%)</span> :
                                                pct >= 70 ? <span className="text-yellow-600">ALERTA ({pct.toFixed(0)}%)</span> :
                                                    <span className="text-red-700">CRÍTICO ({pct.toFixed(0)}%)</span>}
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>

                <div className="mt-12 pt-8 border-t-2 border-black flex justify-between text-xs font-bold uppercase">
                    <div>
                        <p>_______________________</p>
                        <p>Oficial de Personal (B1/G1)</p>
                    </div>
                    <div>
                        <p>_______________________</p>
                        <p>Comandante</p>
                    </div>
                </div>

            </div>
        </div>
    );
};
