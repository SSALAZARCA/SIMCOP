
import React, { useState, useMemo } from 'react';
import type { MilitaryUnit, User, NewHierarchyUnitData, UpdateHierarchyUnitData } from '../types';
import { MapEntityType } from '../types';
import { OrganizationUnitNode } from './OrganizationUnitNode';
import { OrganizationUnitFormModal } from './OrganizationUnitFormModal';
import { AssignCommanderModal } from './AssignCommanderModal';
import { ConfirmationModal } from './ui/ConfirmationModal';
import { Plus, UserPlus, Trash2, Edit2 } from 'lucide-react';

interface OrganizationStructureViewProps {
  organizationalUnits: MilitaryUnit[];
  allUsers: User[];
  addUnitHierarchy: (data: NewHierarchyUnitData) => Promise<{ success: boolean; message?: string }>;
  updateUnitHierarchyDetails: (unitId: string, data: UpdateHierarchyUnitData) => Promise<{ success: boolean; message?: string }>;
  deleteUnitHierarchy: (unitId: string) => Promise<{ success: boolean; message?: string }>;
  assignCommanderToOrganizationalUnit: (unitId: string, userId: string) => Promise<{ success: boolean; message?: string }>;
}

export const OrganizationStructureView: React.FC<OrganizationStructureViewProps> = ({
  organizationalUnits = [],
  allUsers = [],
  addUnitHierarchy,
  updateUnitHierarchyDetails,
  deleteUnitHierarchy,
  assignCommanderToOrganizationalUnit,
}) => {
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);
  const [showFormModal, setShowFormModal] = useState(false);
  const [parentUnitForNew, setParentUnitForNew] = useState<MilitaryUnit | null>(null);
  const [editingUnit, setEditingUnit] = useState<MilitaryUnit | null>(null);
  const [showAssignCommanderModal, setShowAssignCommanderModal] = useState(false);
  const [unitToAssignCommander, setUnitToAssignCommander] = useState<MilitaryUnit | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const [confirmationModalConfig, setConfirmationModalConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => { },
  });

  const topLevelUnits = useMemo(() => {
    return organizationalUnits.filter(u => !u.parentId);
  }, [organizationalUnits]);

  const handleAddSubUnit = (parent: MilitaryUnit) => {
    setParentUnitForNew(parent);
    setEditingUnit(null);
    setShowFormModal(true);
  };

  const handleAddTopLevel = () => {
    setParentUnitForNew(null);
    setEditingUnit(null);
    setShowFormModal(true);
  };

  const handleEditUnit = (unit: MilitaryUnit) => {
    setEditingUnit(unit);
    setParentUnitForNew(null);
    setShowFormModal(true);
  };

  const handleDeleteUnit = (unit: MilitaryUnit) => {
    setConfirmationModalConfig({
      isOpen: true,
      title: 'Confirmar Eliminación',
      message: `¿Está seguro de que desea eliminar la unidad "${unit.name}"? Esta acción no se puede deshacer y solo es posible si no tiene subunidades.`,
      onConfirm: async () => {
        const result = await deleteUnitHierarchy(unit.id);
        if (result.success) {
          setFeedbackMessage({ type: 'success', message: result.message || 'Unidad eliminada correctamente.' });
          setSelectedUnitId(null);
        } else {
          setFeedbackMessage({ type: 'error', message: result.message || 'Error al eliminar unidad.' });
        }
        setConfirmationModalConfig(prev => ({ ...prev, isOpen: false }));
      },
    });
  };

  const handleAssignCommander = (unit: MilitaryUnit) => {
    setUnitToAssignCommander(unit);
    setShowAssignCommanderModal(true);
  };

  const handleCloseFormModal = () => {
    setShowFormModal(false);
    setEditingUnit(null);
    setParentUnitForNew(null);
  };

  const handleCloseAssignCommanderModal = () => {
    setShowAssignCommanderModal(false);
    setUnitToAssignCommander(null);
  };

  const handleSubmitForm = async (formData: NewHierarchyUnitData | UpdateHierarchyUnitData) => {
    let result: { success: boolean, message?: string };
    if (editingUnit) {
      result = await updateUnitHierarchyDetails(editingUnit.id, formData as UpdateHierarchyUnitData);
    } else {
      result = await addUnitHierarchy(formData as NewHierarchyUnitData);
    }

    if (result.success) {
      setFeedbackMessage({ type: 'success', message: result.message || (editingUnit ? 'Unidad actualizada.' : 'Unidad creada.') });
      handleCloseFormModal();
    } else {
      // If we are here, we throw to let the modal handle it internally if it was wrapped in try-catch
      throw new Error(result.message || 'Ocurrió un error en el servidor.');
    }
  };

  const handleAssignCommanderSubmit = async (unitId: string, userId: string) => {
    const result = await assignCommanderToOrganizationalUnit(unitId, userId);
    if (result.success) {
      setFeedbackMessage({ type: 'success', message: result.message || 'Comandante asignado con éxito.' });
      handleCloseAssignCommanderModal();
    } else {
      setFeedbackMessage({ type: 'error', message: result.message || 'Error al asignar comandante.' });
    }
  };

  const selectedUnit = useMemo(() => {
    return organizationalUnits.find(u => u.id === selectedUnitId) || null;
  }, [selectedUnitId, organizationalUnits]);

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto p-4 md:p-10 min-h-screen">
      <header className="flex flex-col md:flex-row justify-between items-center gap-6 mb-10 bg-white/5 p-8 md:p-10 rounded-[40px] border border-white/10 backdrop-blur-xl shadow-2xl relative overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/5 to-purple-600/5 opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
        <div className="relative z-10 py-1">
          <h1 className="text-3xl md:text-4xl font-black text-white tracking-tighter uppercase drop-shadow-2xl mb-1">
            Estructura de Fuerza
          </h1>
          <p className="text-gray-400 font-bold tracking-widest text-[10px] uppercase flex items-center gap-3">
            <span className="w-8 h-px bg-blue-500/50"></span>
            Gestión de Jerarquía y Comandos Organicos
          </p>
        </div>

        <div className="flex flex-wrap gap-4 relative z-10">
          <button
            onClick={handleAddTopLevel}
            className="px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-[20px] font-black uppercase tracking-widest text-xs transition-all shadow-[0_0_30px_rgba(37,99,235,0.3)] active:scale-95 flex items-center gap-3 border border-white/10"
          >
            <Plus className="w-5 h-5" />
            Nueva División
          </button>

          {selectedUnit && (
            <>
              <button
                onClick={() => handleAddSubUnit(selectedUnit)}
                className="px-6 py-3.5 bg-gray-800 hover:bg-gray-700 text-teal-400 rounded-[20px] font-black uppercase tracking-widest text-[10px] transition-all border border-teal-500/20 active:scale-95 flex items-center gap-3 shadow-xl"
              >
                <Plus className="w-4 h-4" />
                Añadir Subunidad
              </button>
              <button
                onClick={() => handleAssignCommander(selectedUnit)}
                className="px-6 py-3.5 bg-gray-800 hover:bg-gray-700 text-purple-400 rounded-[20px] font-black uppercase tracking-widest text-[10px] transition-all border border-purple-500/20 active:scale-95 flex items-center gap-3 shadow-xl"
              >
                <UserPlus className="w-4 h-4" />
                Asignar Mando
              </button>
              <button
                onClick={() => handleEditUnit(selectedUnit)}
                className="px-6 py-3.5 bg-gray-800 hover:bg-gray-700 text-yellow-400 rounded-[20px] font-black uppercase tracking-widest text-[10px] transition-all border border-yellow-500/20 active:scale-95 flex items-center gap-3 shadow-xl"
              >
                Editar
              </button>
              <button
                onClick={() => handleDeleteUnit(selectedUnit)}
                className="px-5 py-3.5 bg-red-900/20 hover:bg-red-900/40 text-red-500 rounded-[20px] font-black uppercase tracking-widest text-[10px] transition-all border border-red-500/20 active:scale-95 shadow-xl"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </header>

      {feedbackMessage && (
        <div className={`mb-8 p-6 rounded-[24px] border ${feedbackMessage.type === 'success' ? 'bg-teal-950/30 border-teal-500/30 text-teal-400' : 'bg-red-950/30 border-red-500/30 text-red-400'} animate-fade-in flex items-center gap-4`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${feedbackMessage.type === 'success' ? 'bg-teal-500/20' : 'bg-red-500/20'}`}>
            <span className="font-black">!</span>
          </div>
          <span className="font-bold tracking-tight">{feedbackMessage.message}</span>
          <button onClick={() => setFeedbackMessage(null)} className="ml-auto text-xs font-black uppercase tracking-widest opacity-50 hover:opacity-100">Cerrar</button>
        </div>
      )}

      <main className="bg-black/20 p-6 md:p-8 rounded-[40px] border border-white/5 shadow-inner backdrop-blur-sm min-h-[500px]">
        <div className="flex flex-wrap justify-center gap-x-12 gap-y-16">
          {topLevelUnits.length > 0 ? (
            topLevelUnits.map(unit => (
              <OrganizationUnitNode
                key={unit.id}
                unit={unit}
                allUnits={organizationalUnits}
                selectedUnitId={selectedUnitId}
                onSelect={setSelectedUnitId}
                onAddSubUnit={handleAddSubUnit}
                onEditUnit={handleEditUnit}
                onDeleteUnit={handleDeleteUnit}
                onAssignCommander={handleAssignCommander}
              />
            ))
          ) : (
            <div className="py-32 text-center space-y-4">
              <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-8 animate-pulse border border-white/10">
                <Plus className="w-10 h-10 text-gray-700" />
              </div>
              <p className="text-2xl font-black text-gray-600 uppercase tracking-widest">No hay unidades de nivel superior</p>
              <p className="text-gray-700 text-sm font-bold">Comience creando una División para establecer la jerarquía.</p>
            </div>
          )}
        </div>
      </main>

      {showFormModal && (
        <OrganizationUnitFormModal
          isOpen={showFormModal}
          onClose={handleCloseFormModal}
          onSubmit={handleSubmitForm}
          existingUnit={editingUnit}
          parentUnit={parentUnitForNew}
          allUnits={organizationalUnits}
        />
      )}

      {showAssignCommanderModal && unitToAssignCommander && (
        <AssignCommanderModal
          isOpen={showAssignCommanderModal}
          onClose={handleCloseAssignCommanderModal}
          onSubmit={handleAssignCommanderSubmit}
          unit={unitToAssignCommander}
          allUsers={allUsers}
        />
      )}

      <ConfirmationModal
        isOpen={confirmationModalConfig.isOpen}
        onClose={() => setConfirmationModalConfig(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmationModalConfig.onConfirm}
        title={confirmationModalConfig.title}
        message={confirmationModalConfig.message}
      />
    </div>
  );
};
