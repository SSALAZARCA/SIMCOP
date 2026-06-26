import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Edit, Save, X, User } from 'lucide-react';
import { specialtyService } from '../services/specialtyService';
import { Soldier, MilitaryUnit, SpecialtyCatalogEntry } from '../types';

interface UnitRosterProps {
    unit: MilitaryUnit;
    onClose: () => void;
}

export const UnitRoster: React.FC<UnitRosterProps> = ({ unit, onClose }) => {
    const [soldiers, setSoldiers] = useState<Soldier[]>([]);
    const [specialties, setSpecialties] = useState<SpecialtyCatalogEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [currentSoldier, setCurrentSoldier] = useState<Partial<Soldier>>({});

    useEffect(() => {
        loadData();
    }, [unit.id]);

    const loadData = async () => {
        setLoading(true);
        try {
            const [soldiersData, specialtiesData] = await Promise.all([
                soldierService.getByUnit(unit.id),
                specialtyService.getAll()
            ]);
            setSoldiers(soldiersData);
            setSpecialties(specialtiesData);
        } catch (error) {
            console.error('Error loading data:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadSoldiers = async () => {
        try {
            const data = await soldierService.getByUnit(unit.id);
            setSoldiers(data);
        } catch (error) {
            console.error('Error loading soldiers:', error);
        }
    };

    const handleSave = async () => {
        try {
            if (currentSoldier.id) {
                await soldierService.update(currentSoldier.id, currentSoldier);
            } else {
                await soldierService.create(currentSoldier as Soldier, unit.id);
            }
            setIsEditing(false);
            setCurrentSoldier({});
            loadSoldiers();
        } catch (error) {
            console.error('Error saving soldier:', error);
        }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('¿Eliminar soldado de la unidad?')) return;
        try {
            await soldierService.delete(id);
            loadSoldiers();
        } catch (error) {
            console.error('Error deleting soldier:', error);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
            <div className="bg-gray-800 rounded-lg shadow-2xl w-full max-w-4xl border border-gray-700 h-[80vh] flex flex-col">
                {/* Header */}
                <div className="flex justify-between items-center p-4 border-b border-gray-700 bg-gray-900/50">
                    <div>
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            <User className="text-teal-400" />
                            {unit.name} - Lista de Personal
                        </h2>
                        <p className="text-sm text-gray-400">{unit.type}</p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-white p-2">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-auto p-6">
                    {isEditing ? (
                        <div className="bg-gray-700/30 p-6 rounded-lg border border-gray-600">
                            <h3 className="text-lg font-semibold text-white mb-4">
                                {currentSoldier.id ? 'Editar Soldado' : 'Nuevo Soldado'}
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-1">Nombre Completo</label>
                                    <input
                                        type="text"
                                        className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-white"
                                        value={currentSoldier.fullName || ''}
                                        onChange={e => setCurrentSoldier({ ...currentSoldier, fullName: e.target.value })}
                                        placeholder="Apellidos y Nombres"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-1">Rango</label>
                                    <select
                                        className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-white"
                                        value={currentSoldier.rank || ''}
                                        onChange={e => setCurrentSoldier({ ...currentSoldier, rank: e.target.value })}
                                    >
                                        <option value="">Seleccione...</option>
                                        <optgroup label="Oficiales">
                                            <option value="TE.">Teniente</option>
                                            <option value="ST.">Subteniente</option>
                                            <option value="CT.">Capitán</option>
                                        </optgroup>
                                        <optgroup label="Suboficiales">
                                            <option value="SV.">Sargento Viceprimero</option>
                                            <option value="SS.">Sargento Segundo</option>
                                            <option value="CP.">Cabo Primero</option>
                                            <option value="CS.">Cabo Segundo</option>
                                            <option value="CT3.">Cabo Tercero</option>
                                        </optgroup>
                                        <optgroup label="Soldados">
                                            <option value="SLP.">Soldado Profesional</option>
                                            <option value="SL18.">Soldado Regular</option>
                                        </optgroup>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-1">Especialidad (MOS)</label>
                                    <select
                                        className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-white"
                                        value={currentSoldier.moceCode || ''}
                                        onChange={e => setCurrentSoldier({ ...currentSoldier, moceCode: e.target.value })}
                                    >
                                        <option value="">Seleccione Especialidad...</option>
                                        {specialties.map(spec => (
                                            <option key={spec.id} value={spec.code}>
                                                {spec.code} - {spec.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-1">Estado</label>
                                    <select
                                        className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-white"
                                        value={currentSoldier.status || 'ACTIVO'}
                                        onChange={e => setCurrentSoldier({ ...currentSoldier, status: e.target.value })}
                                    >
                                        <option value="ACTIVO">Activo</option>
                                        <option value="PERMISO">Permiso</option>
                                        <option value="ENFERMO">Enfermo/Excusado</option>
                                        <option value="COMISION">Comisión</option>
                                    </select>
                                </div>
                            </div>
                            <div className="mt-6 flex justify-end gap-3">
                                <button
                                    onClick={() => { setIsEditing(false); setCurrentSoldier({}); }}
                                    className="px-4 py-2 text-gray-300 hover:text-white"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleSave}
                                    className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded flex items-center gap-2"
                                >
                                    <Save size={18} /> Guardar
                                </button>
                            </div>
                        </div>
                    ) : (
                        loading ? (
                            <div className="text-center py-8 text-gray-400">Cargando personal...</div>
                        ) : (
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-gray-700 text-gray-400 text-sm uppercase">
                                        <th className="py-3 px-4">Rango</th>
                                        <th className="py-3 px-4">Nombre</th>
                                        <th className="py-3 px-4">Especialidad</th>
                                        <th className="py-3 px-4">Estado</th>
                                        <th className="py-3 px-4 text-right">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="text-gray-200">
                                    {soldiers.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="py-8 text-center text-gray-500">
                                                No hay personal asignado a esta unidad.
                                            </td>
                                        </tr>
                                    ) : (
                                        soldiers.map(soldier => (
                                            <tr key={soldier.id} className="border-b border-gray-700/50 hover:bg-gray-700/30">
                                                <td className="py-3 px-4 font-medium">{soldier.rank}</td>
                                                <td className="py-3 px-4">{soldier.fullName}</td>
                                                <td className="py-3 px-4 text-gray-400">{soldier.moceCode}</td>
                                                <td className="py-3 px-4">
                                                    <span className={`px-2 py-1 rounded text-xs font-semibold
                                                        ${soldier.status === 'ACTIVO' ? 'bg-green-900 text-green-200' :
                                                            soldier.status === 'PERMISO' ? 'bg-blue-900 text-blue-200' :
                                                                'bg-yellow-900 text-yellow-200'}`}>
                                                        {soldier.status}
                                                    </span>
                                                </td>
                                                <td className="py-3 px-4 text-right flex justify-end gap-2">
                                                    <button
                                                        onClick={() => { setCurrentSoldier(soldier); setIsEditing(true); }}
                                                        className="p-1 text-gray-400 hover:text-blue-400"
                                                        title="Editar"
                                                    >
                                                        <Edit size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(soldier.id)}
                                                        className="p-1 text-gray-400 hover:text-red-400"
                                                        title="Eliminar"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        )
                    )}
                </div>

                {/* Footer Actions */}
                {!isEditing && (
                    <div className="p-4 border-t border-gray-700 bg-gray-900/50 flex justify-end">
                        <button
                            onClick={() => { setCurrentSoldier({}); setIsEditing(true); }}
                            className="bg-teal-600 hover:bg-teal-500 text-white px-4 py-2 rounded flex items-center gap-2"
                        >
                            <Plus size={20} /> Agregar Soldado
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};
