import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Search, Filter, Save, X, AlertTriangle } from 'lucide-react';
import { specialtyService } from '../services/specialtyService';
import { SpecialtyCatalogEntry } from '../types';

export const SpecialtyCatalogManager: React.FC = () => {
    const [specialties, setSpecialties] = useState<SpecialtyCatalogEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [categoryFilter, setCategoryFilter] = useState<string>('all');

    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentSpecialty, setCurrentSpecialty] = useState<Partial<SpecialtyCatalogEntry>>({});
    const [isEditing, setIsEditing] = useState(false);

    useEffect(() => {
        loadSpecialties();
    }, []);

    const loadSpecialties = async () => {
        setLoading(true);
        try {
            const data = await specialtyService.getAll();
            setSpecialties(data);
            setError(null);
        } catch (err: any) {
            console.error('Error loading specialties:', err);
            setError(`Error al cargar el catálogo: ${err.message || 'Error desconocido'}`);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        try {
            if (isEditing && currentSpecialty.id) {
                await specialtyService.update(currentSpecialty.id, currentSpecialty);
            } else {
                await specialtyService.create(currentSpecialty as Omit<SpecialtyCatalogEntry, 'id'>);
            }
            setIsModalOpen(false);
            setCurrentSpecialty({});
            loadSpecialties();
        } catch (err) {
            setError('Error al guardar la especialidad');
            console.error(err);
        }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('¿Estás seguro de eliminar esta especialidad?')) return;

        try {
            await specialtyService.delete(id);
            loadSpecialties();
        } catch (err) {
            setError('Error al eliminar la especialidad');
            console.error(err);
        }
    };

    const openModal = (specialty?: SpecialtyCatalogEntry) => {
        if (specialty) {
            setCurrentSpecialty({ ...specialty });
            setIsEditing(true);
        } else {
            setCurrentSpecialty({
                code: '',
                name: '',
                category: 'professionalSoldiers', // Default
                description: ''
            });
            setIsEditing(false);
        }
        setIsModalOpen(true);
    };

    const filteredSpecialties = specialties.filter(s => {
        const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            s.code.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = categoryFilter === 'all' || s.category === categoryFilter;
        return matchesSearch && matchesCategory;
    });

    const categories = [
        { value: 'officers', label: 'Oficiales' },
        { value: 'ncos', label: 'Suboficiales' },
        { value: 'professionalSoldiers', label: 'Soldados Profesionales' },
        { value: 'regularSoldiers', label: 'Soldados Regulares' },
        { value: 'civilians', label: 'Civiles' }
    ];

    return (
        <div className="bg-gray-800 rounded-lg border border-gray-700 shadow-xl overflow-hidden">
            {/* Toolbar */}
            <div className="p-4 border-b border-gray-700 flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="flex items-center space-x-2 w-full md:w-auto">
                    <div className="relative flex-1 md:w-64">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <input
                            type="text"
                            placeholder="Buscar por código o nombre..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-gray-700 border border-gray-600 rounded-md pl-10 pr-4 py-2 text-sm text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                        />
                    </div>
                    <div className="relative">
                        <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <select
                            value={categoryFilter}
                            onChange={(e) => setCategoryFilter(e.target.value)}
                            className="bg-gray-700 border border-gray-600 rounded-md pl-10 pr-8 py-2 text-sm text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent appearance-none"
                        >
                            <option value="all">Todas las categorías</option>
                            {categories.map(c => (
                                <option key={c.value} value={c.value}>{c.label}</option>
                            ))}
                        </select>
                    </div>
                </div>
                <button
                    onClick={() => openModal()}
                    className="flex items-center px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-md transition-colors text-sm font-medium"
                >
                    <Plus className="w-4 h-4 mr-2" />
                    Nueva Especialidad
                </button>
            </div>

            {/* Error Message */}
            {error && (
                <div className="bg-red-900/50 border-l-4 border-red-500 p-4 m-4">
                    <div className="flex">
                        <AlertTriangle className="h-5 w-5 text-red-400 mr-2" />
                        <p className="text-sm text-red-200">{error}</p>
                    </div>
                </div>
            )}

            {/* Table */}
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-gray-400">
                    <thead className="bg-gray-700/50 text-gray-200 uppercase font-medium">
                        <tr>
                            <th className="px-6 py-3">Código</th>
                            <th className="px-6 py-3">Nombre</th>
                            <th className="px-6 py-3">Categoría</th>
                            <th className="px-6 py-3">Descripción</th>
                            <th className="px-6 py-3 text-right">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                        {loading ? (
                            <tr>
                                <td colSpan={5} className="px-6 py-8 text-center">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500 mx-auto"></div>
                                </td>
                            </tr>
                        ) : filteredSpecialties.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                                    No se encontraron especialidades
                                </td>
                            </tr>
                        ) : (
                            filteredSpecialties.map((specialty) => (
                                <tr key={specialty.id} className="hover:bg-gray-700/30 transition-colors">
                                    <td className="px-6 py-4 font-medium text-white">{specialty.code}</td>
                                    <td className="px-6 py-4">{specialty.name}</td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${specialty.category === 'officers' ? 'bg-blue-900/50 text-blue-300 border border-blue-700' :
                                            specialty.category === 'ncos' ? 'bg-green-900/50 text-green-300 border border-green-700' :
                                                specialty.category === 'professionalSoldiers' ? 'bg-yellow-900/50 text-yellow-300 border border-yellow-700' :
                                                    'bg-gray-700 text-gray-300 border border-gray-600'
                                            }`}>
                                            {categories.find(c => c.value === specialty.category)?.label || specialty.category}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 truncate max-w-xs">{specialty.description || '-'}</td>
                                    <td className="px-6 py-4 text-right space-x-2">
                                        <button
                                            onClick={() => openModal(specialty)}
                                            className="text-blue-400 hover:text-blue-300 transition-colors"
                                            title="Editar"
                                        >
                                            <Edit className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(specialty.id)}
                                            className="text-red-400 hover:text-red-300 transition-colors"
                                            title="Eliminar"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                    <div className="bg-gray-800 rounded-lg shadow-2xl w-full max-w-md border border-gray-700">
                        <div className="flex justify-between items-center p-4 border-b border-gray-700">
                            <h3 className="text-lg font-semibold text-white">
                                {isEditing ? 'Editar Especialidad' : 'Nueva Especialidad'}
                            </h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-white">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">Código (MOS)</label>
                                <input
                                    type="text"
                                    value={currentSpecialty.code || ''}
                                    onChange={(e) => setCurrentSpecialty({ ...currentSpecialty, code: e.target.value })}
                                    className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                                    placeholder="Ej. 11B"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">Nombre</label>
                                <input
                                    type="text"
                                    value={currentSpecialty.name || ''}
                                    onChange={(e) => setCurrentSpecialty({ ...currentSpecialty, name: e.target.value })}
                                    className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                                    placeholder="Ej. Infantería Ligera"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">Categoría</label>
                                <select
                                    value={currentSpecialty.category || 'professionalSoldiers'}
                                    onChange={(e) => setCurrentSpecialty({ ...currentSpecialty, category: e.target.value as any })}
                                    className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                                >
                                    {categories.map(c => (
                                        <option key={c.value} value={c.value}>{c.label}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">Descripción</label>
                                <textarea
                                    value={currentSpecialty.description || ''}
                                    onChange={(e) => setCurrentSpecialty({ ...currentSpecialty, description: e.target.value })}
                                    className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent h-24 resize-none"
                                    placeholder="Descripción opcional..."
                                />
                            </div>
                        </div>
                        <div className="p-4 border-t border-gray-700 flex justify-end space-x-3">
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="px-4 py-2 text-sm font-medium text-gray-300 hover:text-white hover:bg-gray-700 rounded-md transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleSave}
                                className="px-4 py-2 text-sm font-medium bg-teal-600 hover:bg-teal-700 text-white rounded-md transition-colors flex items-center"
                            >
                                <Save className="w-4 h-4 mr-2" />
                                Guardar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
