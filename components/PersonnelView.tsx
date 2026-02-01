import React, { useState } from 'react';
import { Users } from 'lucide-react';
import { SpecialtyCatalogManager } from './SpecialtyCatalogManager';
import { PersonnelStatus } from './PersonnelStatus';
import { MilitaryUnit } from '../types';

import { PersonnelReport } from './PersonnelReport';

interface PersonnelViewProps {
    units: MilitaryUnit[];
}

/**
 * Personnel Module View
 * Main view for personnel management including:
 * - Specialty catalog management
 * - Personnel status tracking (TOE vs Actual)
 */
export const PersonnelView: React.FC<PersonnelViewProps> = ({ units }) => {
    const [activeTab, setActiveTab] = useState<'catalog' | 'status' | 'reports'>('catalog');

    React.useEffect(() => {
        console.log('PersonnelView mounted');
    }, []);

    return (
        <div className="h-full flex flex-col bg-gray-900 text-white">
            {/* Header */}
            <div className="bg-gray-800 border-b border-gray-700 p-4">
                <div className="flex items-center space-x-3">
                    <Users className="w-6 h-6 text-teal-400" />
                    <h1 className="text-2xl font-bold">Módulo de Personal</h1>
                </div>
                <p className="text-sm text-gray-400 mt-1">
                    Gestión de catálogo de especialidades y estado de fuerza
                </p>
            </div>

            {/* Tabs */}
            <div className="bg-gray-800 border-b border-gray-700 px-4">
                <div className="flex space-x-4">
                    <button
                        onClick={() => setActiveTab('catalog')}
                        className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'catalog'
                            ? 'border-teal-400 text-teal-400'
                            : 'border-transparent text-gray-400 hover:text-gray-300'
                            }`}
                    >
                        Catálogo de Especialidades
                    </button>
                    <button
                        onClick={() => setActiveTab('status')}
                        className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'status'
                            ? 'border-teal-400 text-teal-400'
                            : 'border-transparent text-gray-400 hover:text-gray-300'
                            }`}
                    >
                        Estado de Personal
                    </button>
                    <button
                        onClick={() => setActiveTab('reports')}
                        className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'reports'
                            ? 'border-teal-400 text-teal-400'
                            : 'border-transparent text-gray-400 hover:text-gray-300'
                            }`}
                    >
                        Reportes e Informes
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto p-6">
                {activeTab === 'catalog' && (
                    <div className="max-w-6xl mx-auto">
                        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                            <h2 className="text-lg font-semibold mb-4">Catálogo de Especialidades Militares (MOS)</h2>
                            <p className="text-gray-400 mb-6">
                                Gestiona el catálogo de especialidades militares del Ejército Colombiano.
                                Este catálogo se utiliza al definir el TOE de las unidades organizacionales.
                            </p>

                            <SpecialtyCatalogManager />
                        </div>
                    </div>
                )}

                {activeTab === 'status' && (
                    <div className="max-w-6xl mx-auto">
                        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                            <h2 className="text-lg font-semibold mb-4">Estado de Personal (TOE vs Real)</h2>
                            <p className="text-gray-400 mb-6">
                                Visualiza el estado de personal de las unidades, comparando el TOE autorizado
                                con el personal real disponible.
                            </p>

                            <PersonnelStatus units={units} />
                        </div>
                    </div>
                )}

                {activeTab === 'reports' && (
                    <div className="max-w-6xl mx-auto">
                        <PersonnelReport units={units} />
                    </div>
                )}
            </div>
        </div>
    );
};
