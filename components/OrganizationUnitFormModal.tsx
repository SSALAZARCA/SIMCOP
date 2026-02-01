
import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import type { MilitaryUnit, UnitType as UnitTypeEnum, NewHierarchyUnitData, UpdateHierarchyUnitData, MilitarySpecialty, SpecialtyCatalogEntry } from '../types';
import { UnitType, UnitSituationINSITOP } from '../types';
import { SpecialtySelector } from './SpecialtySelector';
import { MISSION_TYPES } from '../constants';
import { Plus, Trash2, Loader2, Flag, Briefcase } from 'lucide-react';

interface OrganizationUnitFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: NewHierarchyUnitData | UpdateHierarchyUnitData) => Promise<void>;
  existingUnit: MilitaryUnit | null;
  parentUnit: MilitaryUnit | null;
  allUnits: MilitaryUnit[];
}

const hierarchyRules: Record<UnitTypeEnum, UnitTypeEnum | null> = {
  [UnitType.DIVISION]: null,
  [UnitType.BRIGADE]: UnitType.DIVISION,
  [UnitType.BATTALION]: UnitType.BRIGADE,
  [UnitType.COMPANY]: UnitType.BATTALION,
  [UnitType.PLATOON]: UnitType.COMPANY,
  [UnitType.TEAM]: UnitType.PLATOON,
  [UnitType.SQUAD]: UnitType.PLATOON,
  [UnitType.COMMAND_POST]: null,
  [UnitType.UAV_ATTACK_TEAM]: UnitType.COMPANY,
  [UnitType.UAV_INTEL_TEAM]: UnitType.COMPANY,
};

const allowedChildTypes: Record<UnitTypeEnum, UnitTypeEnum[]> = {
  [UnitType.DIVISION]: [UnitType.BRIGADE],
  [UnitType.BRIGADE]: [UnitType.BATTALION],
  [UnitType.BATTALION]: [UnitType.COMPANY],
  [UnitType.COMPANY]: [UnitType.PLATOON, UnitType.UAV_ATTACK_TEAM, UnitType.UAV_INTEL_TEAM],
  [UnitType.PLATOON]: [],
  [UnitType.TEAM]: [],
  [UnitType.SQUAD]: [],
  [UnitType.COMMAND_POST]: [],
  [UnitType.UAV_ATTACK_TEAM]: [],
  [UnitType.UAV_INTEL_TEAM]: [],
};

const getSelectableUnitTypes = (parentType: UnitTypeEnum | null): UnitTypeEnum[] => {
  if (!parentType) {
    return [UnitType.DIVISION];
  }
  return allowedChildTypes[parentType] || [];
};

export const OrganizationUnitFormModal: React.FC<OrganizationUnitFormModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  existingUnit,
  parentUnit,
  allUnits
}) => {
  const [name, setName] = useState('');
  const [type, setType] = useState<UnitTypeEnum>(UnitType.DIVISION);
  const [currentMission, setCurrentMission] = useState<string>(MISSION_TYPES.find(m => m.sigla === "PATCTRL")?.sigla || MISSION_TYPES[0].sigla);
  const [unitSituationType, setUnitSituationType] = useState<UnitSituationINSITOP>(UnitSituationINSITOP.ORGANICA);
  const [localError, setLocalError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // TOE - Authorized Personnel State
  const [officers, setOfficers] = useState<number>(0);
  const [ncos, setNcos] = useState<number>(0);
  const [professionalSoldiers, setProfessionalSoldiers] = useState<number>(0);
  const [regularSoldiers, setRegularSoldiers] = useState<number>(0);
  const [civilians, setCivilians] = useState<number>(0);

  // TOE - Specialties State
  const [officerSpecialties, setOfficerSpecialties] = useState<MilitarySpecialty[]>([]);
  const [ncoSpecialties, setNcoSpecialties] = useState<MilitarySpecialty[]>([]);
  const [proSoldierSpecialties, setProSoldierSpecialties] = useState<MilitarySpecialty[]>([]);
  const [regularSoldierSpecialties, setRegularSoldierSpecialties] = useState<MilitarySpecialty[]>([]);
  const [civilianSpecialties, setCivilianSpecialties] = useState<MilitarySpecialty[]>([]);

  const selectableTypes = useMemo(() => {
    if (existingUnit) {
      const parentOfExisting = existingUnit.parentId ? allUnits.find(u => u.id === existingUnit.parentId)?.type || null : null;
      return getSelectableUnitTypes(parentOfExisting);
    }
    return getSelectableUnitTypes(parentUnit?.type || null);
  }, [existingUnit, parentUnit, allUnits]);


  useEffect(() => {
    if (isOpen) {
      setLocalError(null);
      setIsSubmitting(false);
      if (existingUnit) {
        setName(existingUnit.name);
        setType(existingUnit.type);

        const unitWithToe = existingUnit as any;
        const toe = unitWithToe.toe;

        if (toe) {
          setOfficers(toe.authorizedPersonnel?.officers || 0);
          setNcos(toe.authorizedPersonnel?.ncos || 0);
          setProfessionalSoldiers(toe.authorizedPersonnel?.professionalSoldiers || 0);
          setRegularSoldiers(toe.authorizedPersonnel?.regularSoldiers || 0);
          setCivilians(toe.authorizedPersonnel?.civilians || 0);

          setCurrentMission(existingUnit.currentMission || MISSION_TYPES.find(m => m.sigla === "PATCTRL")?.sigla || MISSION_TYPES[0].sigla);
          setUnitSituationType(existingUnit.unitSituationType || UnitSituationINSITOP.ORGANICA);

          setOfficerSpecialties(toe.specialties?.officers || []);
          setNcoSpecialties(toe.specialties?.ncos || []);
          setProSoldierSpecialties(toe.specialties?.professionalSoldiers || []);
          setRegularSoldierSpecialties(toe.specialties?.regularSoldiers || []);
          setCivilianSpecialties(toe.specialties?.civilians || []);
        } else {
          setOfficers(existingUnit.personnelBreakdown?.officers || 0);
          setNcos(existingUnit.personnelBreakdown?.ncos || 0);
          setProfessionalSoldiers(existingUnit.personnelBreakdown?.professionalSoldiers || 0);
          setRegularSoldiers(existingUnit.personnelBreakdown?.slRegulars || 0);
          setCivilians(0);

          setOfficerSpecialties([]);
          setNcoSpecialties([]);
          setProSoldierSpecialties([]);
          setRegularSoldierSpecialties([]);
          setCivilianSpecialties([]);
        }
      } else {
        setName('');
        const allowed = getSelectableUnitTypes(parentUnit?.type || null);
        setType(allowed.length > 0 ? allowed[0] : UnitType.DIVISION);
        setCurrentMission(MISSION_TYPES.find(m => m.sigla === "PATCTRL")?.sigla || MISSION_TYPES[0].sigla);
        setUnitSituationType(UnitSituationINSITOP.ORGANICA);
        setOfficers(0); setNcos(0); setProfessionalSoldiers(0); setRegularSoldiers(0); setCivilians(0);
        setOfficerSpecialties([]); setNcoSpecialties([]); setProSoldierSpecialties([]); setRegularSoldierSpecialties([]); setCivilianSpecialties([]);
      }
    }
  }, [isOpen, existingUnit, parentUnit]);

  const handleAddSpecialty = (category: string, specialty: SpecialtyCatalogEntry) => {
    const newSpecialty: MilitarySpecialty = {
      code: specialty.code,
      name: specialty.name,
      quantity: 1
    };

    switch (category) {
      case 'officers': setOfficerSpecialties(prev => [...prev, newSpecialty]); break;
      case 'ncos': setNcoSpecialties(prev => [...prev, newSpecialty]); break;
      case 'professionalSoldiers': setProSoldierSpecialties(prev => [...prev, newSpecialty]); break;
      case 'regularSoldiers': setRegularSoldierSpecialties(prev => [...prev, newSpecialty]); break;
      case 'civilians': setCivilianSpecialties(prev => [...prev, newSpecialty]); break;
    }
  };

  const handleRemoveSpecialty = (category: string, index: number) => {
    switch (category) {
      case 'officers': setOfficerSpecialties(prev => prev.filter((_, i) => i !== index)); break;
      case 'ncos': setNcoSpecialties(prev => prev.filter((_, i) => i !== index)); break;
      case 'professionalSoldiers': setProSoldierSpecialties(prev => prev.filter((_, i) => i !== index)); break;
      case 'regularSoldiers': setRegularSoldierSpecialties(prev => prev.filter((_, i) => i !== index)); break;
      case 'civilians': setCivilianSpecialties(prev => prev.filter((_, i) => i !== index)); break;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    if (!name.trim()) {
      setLocalError("El nombre de la unidad es obligatorio.");
      return;
    }

    const parentIdForCheck = existingUnit ? existingUnit.parentId : (parentUnit ? parentUnit.id : null);
    const isNameTaken = allUnits.some(
      u => u.id !== existingUnit?.id &&
        u.name.toLowerCase() === name.trim().toLowerCase() &&
        u.parentId === parentIdForCheck
    );

    if (isNameTaken) {
      setLocalError(`Ya existe una unidad con el nombre "${name.trim()}" bajo el mismo superior.`);
      return;
    }

    setIsSubmitting(true);
    try {
      if (existingUnit) {
        const updateData: UpdateHierarchyUnitData = {
          name: name.trim(),
          currentMission,
          unitSituationType,
          toe: {
            authorizedPersonnel: { officers, ncos, professionalSoldiers, regularSoldiers, civilians },
            specialties: { officers: officerSpecialties, ncos: ncoSpecialties, professionalSoldiers: proSoldierSpecialties, regularSoldiers: regularSoldierSpecialties, civilians: civilianSpecialties },
          }
        };
        if (type !== existingUnit.type) {
          const children = allUnits.filter(u => u.parentId === existingUnit.id);
          if (children.length > 0 && !allowedChildTypes[type]?.length) {
            setLocalError(`No se puede cambiar el tipo a "${type}" porque tiene subunidades.`);
            setIsSubmitting(false);
            return;
          }
          updateData.type = type;
        }
        await onSubmit(updateData);
      } else {
        const newUnitData: NewHierarchyUnitData = {
          name: name.trim(),
          type,
          parentId: parentUnit ? parentUnit.id : null,
          currentMission,
          unitSituationType,
          toe: {
            authorizedPersonnel: { officers, ncos, professionalSoldiers, regularSoldiers, civilians },
            specialties: { officers: officerSpecialties, ncos: ncoSpecialties, professionalSoldiers: proSoldierSpecialties, regularSoldiers: regularSoldierSpecialties, civilians: civilianSpecialties },
          },
        };
        await onSubmit(newUnitData);
      }
    } catch (err: any) {
      setLocalError(err.message || "Error al procesar la solicitud.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const categories = [
    { key: 'officers', label: 'Oficiales', state: officerSpecialties, count: officers, setter: setOfficers },
    { key: 'ncos', label: 'Suboficiales', state: ncoSpecialties, count: ncos, setter: setNcos },
    { key: 'professionalSoldiers', label: 'Soldados Prof.', state: proSoldierSpecialties, count: professionalSoldiers, setter: setProfessionalSoldiers },
    { key: 'regularSoldiers', label: 'Soldados Reg.', state: regularSoldierSpecialties, count: regularSoldiers, setter: setRegularSoldiers },
    { key: 'civilians', label: 'Civiles', state: civilianSpecialties, count: civilians, setter: setCivilians },
  ];

  return createPortal(
    <div className="fixed inset-0 bg-gray-950/95 flex items-start justify-center z-[5000] p-4 overflow-y-auto backdrop-blur-md custom-scrollbar" style={{ isolation: 'isolate' }}>
      <div className="bg-gray-900 my-8 p-6 md:p-10 rounded-[32px] shadow-2xl w-full max-w-5xl border border-white/10 relative">
        <div className="flex justify-between items-start mb-10">
          <div className="flex flex-col gap-3">
            <h2 className="text-2xl md:text-3xl font-black text-white tracking-tighter uppercase drop-shadow-lg">
              {existingUnit ? 'Editar Estructura' : 'Registrar Nueva Estructura'}
            </h2>
            <div className="flex items-center gap-4">
              <span className="px-4 py-1.5 bg-teal-500/10 text-teal-400 text-[11px] font-black uppercase tracking-widest rounded-full border border-teal-500/20 shadow-inner">
                TOE Compliance
              </span>
              {parentUnit && (
                <span className="text-gray-500 text-xs font-bold flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-gray-700 rounded-full"></div>
                  Unidad Superior: <span className="text-gray-300">{parentUnit.name}</span>
                </span>
              )}
            </div>
          </div>
          <button onClick={onClose} className="p-5 bg-white/5 hover:bg-white/10 rounded-2xl transition-all border border-white/5 group shadow-xl">
            <Trash2 className="w-6 h-6 text-gray-500 group-hover:text-red-400 transition-colors" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-black/20 p-6 md:p-8 rounded-[32px] border border-white/5 shadow-inner">
            <div className="space-y-3">
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Nombre Descriptivo</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Ej: Batallón de Infantería N1"
                className="w-full bg-gray-800 border border-white/5 rounded-xl px-6 py-4 text-white text-lg font-bold focus:ring-2 focus:ring-teal-500/50 outline-none transition-all placeholder:text-gray-700 shadow-lg"
                required
              />
            </div>
            <div className="space-y-3">
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Escalón Jerárquico</label>
              <select
                value={type}
                onChange={e => setType(e.target.value as UnitTypeEnum)}
                className="w-full bg-gray-800 border border-white/5 rounded-xl px-6 py-4 text-white text-lg font-bold focus:ring-2 focus:ring-teal-500/50 outline-none appearance-none transition-all shadow-lg"
                disabled={selectableTypes.length <= 1 && !existingUnit}
              >
                {selectableTypes.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>

          {/* Operational Fields Group */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-black/20 p-6 md:p-8 rounded-[32px] border border-white/5 shadow-inner">
            <div className="space-y-3">
              <div className="flex items-center gap-2 mb-1">
                <Flag className="w-3.5 h-3.5 text-teal-500" />
                <label htmlFor="currentMission" className="block text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Misión Operativa Predeterminada</label>
              </div>
              <select id="currentMission" value={currentMission} onChange={e => setCurrentMission(e.target.value)} className="w-full bg-gray-900 border border-white/10 p-4 rounded-xl text-base font-black text-white focus:ring-2 focus:ring-teal-500/20 outline-none transition-all shadow-lg">
                {MISSION_TYPES.map(m => <option key={m.sigla} value={m.sigla} className="bg-gray-800 text-sm">{m.sigla} - {m.description}</option>)}
              </select>
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-2 mb-1">
                <Briefcase className="w-3.5 h-3.5 text-orange-500" />
                <label htmlFor="unitSituation" className="block text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Situación Administrativa</label>
              </div>
              <select id="unitSituation" value={unitSituationType} onChange={e => setUnitSituationType(e.target.value as UnitSituationINSITOP)} className="w-full bg-gray-900 border border-white/10 p-4 rounded-xl text-base font-black text-white focus:ring-2 focus:ring-orange-500/20 outline-none transition-all shadow-lg">
                <option value={UnitSituationINSITOP.ORGANICA} className="bg-gray-800 text-sm">Orgánica</option>
                <option value={UnitSituationINSITOP.AGREGADA} className="bg-gray-800 text-sm">Agregada</option>
                <option value={UnitSituationINSITOP.SEGREGADA} className="bg-gray-800 text-sm">Segregada</option>
              </select>
            </div>
          </div>

          <div className="space-y-6">
            <h3 className="text-xs font-black text-teal-500 uppercase tracking-[0.3em] flex items-center gap-3 ml-1">
              <div className="h-px w-8 bg-teal-500/30"></div>
              Personal y Especialidades Requeridas (TOE)
              <div className="h-px flex-1 bg-teal-500/30"></div>
            </h3>

            <div className="grid grid-cols-1 gap-6">
              {categories.map((cat) => (
                <div key={cat.key} className="bg-gray-800/40 rounded-[32px] border border-white/5 p-8 hover:bg-gray-800/60 transition-all group shadow-xl">
                  <div className="flex flex-col lg:flex-row lg:items-center gap-6">
                    <div className="w-32 shrink-0">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">{cat.label}</label>
                      <input
                        type="number"
                        min="0"
                        value={cat.count}
                        onChange={e => cat.setter(parseInt(e.target.value) || 0)}
                        className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-2 text-white font-black text-center focus:ring-1 focus:ring-teal-500/50 outline-none transition-all"
                      />
                    </div>

                    <div className="flex-1 space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] font-black text-gray-600 uppercase tracking-[0.2em]">Especialidades Tácticas</label>
                        <span className="text-[10px] font-bold text-teal-800">{cat.state.length} Asignadas</span>
                      </div>
                      <div className="flex flex-wrap gap-2 min-h-[44px]">
                        {cat.state.map((spec, sIdx) => (
                          <div key={sIdx} className="flex items-center gap-3 bg-teal-500/10 border border-teal-500/20 px-4 py-2 rounded-xl group/item hover:border-teal-400 transition-all shadow-sm">
                            <span className="text-[10px] font-mono text-teal-400 font-black tracking-tighter">{spec.code}</span>
                            <span className="text-xs font-bold text-gray-200">{spec.name}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveSpecialty(cat.key, sIdx)}
                              className="w-4 h-4 rounded-full bg-teal-900/50 flex items-center justify-center hover:bg-red-500/20 group"
                            >
                              <Plus className="w-2.5 h-2.5 text-teal-400 group-hover:text-red-400 rotate-45" />
                            </button>
                          </div>
                        ))}
                        <div className="w-48">
                          <SpecialtySelector
                            category={cat.key as any}
                            onSelect={(s) => handleAddSpecialty(cat.key as any, s)}
                            placeholder={`Agregar...`}
                            className="text-xs"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {localError && (
            <div className="p-6 bg-red-900/20 border border-red-500/30 rounded-[24px] flex items-center gap-4 animate-shake">
              <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center shrink-0">
                <span className="text-red-500 font-black">!</span>
              </div>
              <p className="text-sm font-bold text-red-400 leading-relaxed">{localError}</p>
            </div>
          )}

          <div className="flex flex-col md:flex-row justify-between items-center gap-8 pt-12 border-t border-white/10 mt-12 bg-gray-900/50 p-8 rounded-[32px]">
            <div className="flex flex-col">
              <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1 ml-1">Capacidad Operativa Total (TOE)</p>
              <div className="flex items-baseline gap-3">
                <span className="text-5xl font-black text-teal-400 monospace-tech shadow-teal-500/20 drop-shadow-2xl">{officers + ncos + professionalSoldiers + regularSoldiers + civilians}</span>
                <span className="text-sm font-black text-teal-700 uppercase tracking-widest">Efectivos Autorizados</span>
              </div>
            </div>

            <div className="flex gap-6 w-full md:w-auto">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="flex-1 md:flex-none px-12 py-6 bg-gray-800 hover:bg-gray-700 text-white rounded-[24px] text-xs font-black uppercase tracking-[0.2em] transition-all border border-white/5 active:scale-95 shadow-xl disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSubmitting || (selectableTypes.length === 0 && !existingUnit)}
                className="flex-1 md:flex-none px-16 py-6 bg-teal-600 hover:bg-teal-500 text-white rounded-[24px] text-xs font-black uppercase tracking-[0.3em] transition-all shadow-[0_0_40px_rgba(20,184,166,0.3)] active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center min-w-[200px]"
              >
                {isSubmitting ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  existingUnit ? 'Confirmar Cambios' : 'Registrar Estructura'
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};