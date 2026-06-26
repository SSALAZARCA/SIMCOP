import React from 'react';
import { Soldier } from '../types';

interface SoldierListComponentProps {
    soldiers: Soldier[];
}

export const SoldierListComponent: React.FC<SoldierListComponentProps> = ({ soldiers }) => {
    if (!soldiers || soldiers.length === 0) {
        return (
            <div className="p-4 text-center text-gray-400 bg-gray-800/50 rounded-lg border border-gray-700">
                <p>No hay personal individual registrado en esta unidad.</p>
                <p className="text-xs mt-2">La información proviene de la sincronización con SIOCH.</p>
            </div>
        );
    }

    return (
        <div className="overflow-x-auto">
            <table className="min-w-full text-sm text-left text-gray-300">
                <thead className="text-xs text-gray-400 uppercase bg-gray-700/50">
                    <tr>
                        <th className="px-4 py-2">Grado</th>
                        <th className="px-4 py-2">Nombre</th>
                        <th className="px-4 py-2">Especialidad</th>
                        <th className="px-4 py-2">Estado</th>
                        <th className="px-4 py-2">Sanidad</th>
                    </tr>
                </thead>
                <tbody>
                    {soldiers.map((soldier) => (
                        <tr key={soldier.id} className="border-b border-gray-700 hover:bg-gray-700/30">
                            <td className="px-4 py-2 font-medium">{soldier.rank}</td>
                            <td className="px-4 py-2">{soldier.fullName}</td>
                            <td className="px-4 py-2">{soldier.moceCode}</td>
                            <td className="px-4 py-2">
                                <span className={`px-2 py-0.5 rounded text-xs ${soldier.status === 'ACTIVO' ? 'bg-green-900 text-green-300' : 'bg-yellow-900 text-yellow-300'
                                    }`}>
                                    {soldier.status}
                                </span>
                            </td>
                            <td className="px-4 py-2">
                                <span className={`px-2 py-0.5 rounded text-xs ${soldier.healthStatus === 'APTO' ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300'
                                    }`}>
                                    {soldier.healthStatus}
                                </span>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};
