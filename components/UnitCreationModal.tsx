
import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import type { NewUnitData, GeoLocation, PersonnelBreakdown, CommanderInfo, MilitaryUnit } from '../types';
import { UnitType, UnitSituationINSITOP } from '../types';
import { dmsToDecimal } from '../utils/coordinateUtils';
import { COMMANDERS, RANKS_ABBREVIATIONS, PRIMARY_UNIT_ROLES_APP6, MISSION_TYPES } from '../constants';
import { Flag, Shield, Briefcase, Plus, MapPin, Truck, Swords, Users, Target } from 'lucide-react';

interface UnitCreationModalProps {
  isOpen: boolean;
  onClose: () => void;
  addUnit: (unitData: NewUnitData) => void;
  allUnits: MilitaryUnit[];
}

const allowedUnitTypesForCreation = [UnitType.PLATOON, UnitType.TEAM, UnitType.SQUAD];

export const UnitCreationModal: React.FC<UnitCreationModalProps> = ({ isOpen, onClose, addUnit, allUnits }) => {
  const [name, setName] = useState('');
  const [type, setType] = useState<UnitType>(UnitType.PLATOON);
  const [primaryRole, setPrimaryRole] = useState<string>(PRIMARY_UNIT_ROLES_APP6[0].capabilityTerm);

  const [commanderRank, setCommanderRank] = useState(RANKS_ABBREVIATIONS[0] || 'ST.');
  const [commanderName, setCommanderName] = useState(COMMANDERS[0]?.name || 'Nombre Comandante');

  const [officers, setOfficers] = useState('0');
  const [ncos, setNcos] = useState('1');
  const [professionalSoldiers, setProfessionalSoldiers] = useState('8');
  const [slRegulars, setSlRegulars] = useState('0');

  const [initialLatDeg, setInitialLatDeg] = useState('');
  const [initialLatMin, setInitialLatMin] = useState('');
  const [initialLatSec, setInitialLatSec] = useState('');
  const [initialLatDir, setInitialLatDir] = useState<'N' | 'S'>('N');

  const [initialLonDeg, setInitialLonDeg] = useState('');
  const [initialLonMin, setInitialLonMin] = useState('');
  const [initialLonSec, setInitialLonSec] = useState('');
  const [initialLonDir, setInitialLonDir] = useState<'W' | 'E'>('W');

  const [equipmentStr, setEquipmentStr] = useState('');
  const [capabilitiesStr, setCapabilitiesStr] = useState('');
  const [fuelLevel, setFuelLevel] = useState<string>('');
  const [ammoLevel, setAmmoLevel] = useState<string>('100');
  const [daysOfSupply, setDaysOfSupply] = useState<string>('7');
  const [currentMission, setCurrentMission] = useState<string>(MISSION_TYPES.find(m => m.sigla === "PATCTRL")?.sigla || MISSION_TYPES[0].sigla);
  const [unitSituationType, setUnitSituationType] = useState<UnitSituationINSITOP>(UnitSituationINSITOP.ORGANICA);
  const [selectedParentId, setSelectedParentId] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const showFuelInput = type !== UnitType.SQUAD && type !== UnitType.TEAM;

  const potentialParents = useMemo(() => {
    if (type === UnitType.PLATOON) {
      return allUnits.filter(u => u.type === UnitType.COMPANY);
    }
    if (type === UnitType.TEAM || type === UnitType.SQUAD) {
      return allUnits.filter(u => u.type === UnitType.PLATOON);
    }
    return [];
  }, [allUnits, type]);

  const clearInitialLocationFields = () => {
    setInitialLatDeg(''); setInitialLatMin(''); setInitialLatSec(''); setInitialLatDir('N');
    setInitialLonDeg(''); setInitialLonMin(''); setInitialLonSec(''); setInitialLonDir('W');
  };

  useEffect(() => {
    if (isOpen) {
      setName('');
      setType(UnitType.PLATOON);
      setPrimaryRole(PRIMARY_UNIT_ROLES_APP6[0].capabilityTerm);
      setCommanderRank(RANKS_ABBREVIATIONS[0] || 'ST.');
      setCommanderName(COMMANDERS[0]?.name || 'Nombre Comandante');
      setOfficers('0');
      setNcos('1');
      setProfessionalSoldiers('8');
      setSlRegulars('0');
      clearInitialLocationFields();
      setEquipmentStr('');
      setCapabilitiesStr('');
      setFuelLevel('');
      setAmmoLevel('100');
      setDaysOfSupply('7');
      setCurrentMission(MISSION_TYPES.find(m => m.sigla === "PATCTRL")?.sigla || MISSION_TYPES[0].sigla);
      setUnitSituationType(UnitSituationINSITOP.ORGANICA);
      setSelectedParentId(potentialParents.length > 0 ? potentialParents[0].id : '');
      setError(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]); // potentialParents is intentionally omitted to avoid re-triggering form reset on its change

  useEffect(() => {
    if (!showFuelInput) {
      setFuelLevel('');
    }
  }, [type, showFuelInput]);

  useEffect(() => {
    if (potentialParents.length > 0) {
      if (!selectedParentId || !potentialParents.find(p => p.id === selectedParentId)) {
        setSelectedParentId(potentialParents[0].id);
      }
    } else {
      setSelectedParentId('');
    }
  }, [type, potentialParents, selectedParentId]);


  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) { setError("El nombre de la unidad es obligatorio."); return; }
    if (!selectedParentId) { setError("Debe seleccionar una Unidad Superior (Padre)."); return; }
    if (!primaryRole.trim()) { setError("La Clase de Unidad Principal es obligatoria."); return; }
    if (!commanderRank.trim()) { setError("El grado del comandante es obligatorio."); return; }
    if (!commanderName.trim()) { setError("El nombre del comandante es obligatorio."); return; }

    const officersNum = parseInt(officers, 10);
    const ncosNum = parseInt(ncos, 10);
    const profSoldiersNum = parseInt(professionalSoldiers, 10);
    const slRegularsNum = parseInt(slRegulars, 10);

    if (isNaN(officersNum) || officersNum < 0) { setError("Oficiales debe ser un número no negativo."); return; }
    if (isNaN(ncosNum) || ncosNum < 0) { setError("Suboficiales debe ser un número no negativo."); return; }
    if (isNaN(profSoldiersNum) || profSoldiersNum < 0) { setError("SL. Profesionales debe ser un número no negativo."); return; }
    if (isNaN(slRegularsNum) || slRegularsNum < 0) { setError("SL. Regulares debe ser un número no negativo."); return; }
    if ((officersNum + ncosNum + profSoldiersNum + slRegularsNum) <= 0) { setError("El total de personal debe ser mayor a cero."); return; }

    const latD = parseFloat(initialLatDeg);
    const latM = parseFloat(initialLatMin);
    const latS = parseFloat(initialLatSec);
    const lonD = parseFloat(initialLonDeg);
    const lonM = parseFloat(initialLonMin);
    const lonS = parseFloat(initialLonSec);

    if (isNaN(latD) || isNaN(latM) || isNaN(latS) || isNaN(lonD) || isNaN(lonM) || isNaN(lonS)) {
      setError("Todos los campos de GMS para Ubicación Inicial son requeridos.");
      return;
    }
    if (latD < 0 || latD > 90 || latM < 0 || latM >= 60 || latS < 0 || latS >= 60) {
      setError("Valores de latitud inicial inválidos (G°:0-90, M′/S″:0-59).");
      return;
    }
    if (lonD < 0 || lonD > 180 || lonM < 0 || lonM >= 60 || lonS < 0 || lonS >= 60) {
      setError("Valores de longitud inicial inválidos (G°:0-180, M′/S″:0-59).");
      return;
    }

    const constructedInitialLatDMS = `${latD}°${latM}′${latS}″ ${initialLatDir}`;
    const constructedInitialLonDMS = `${lonD}°${lonM}′${lonS}″ ${initialLonDir}`;

    const parsedLat = dmsToDecimal(constructedInitialLatDMS, false);
    const parsedLon = dmsToDecimal(constructedInitialLonDMS, true);

    if (parsedLat === null) { setError("Formato de latitud inicial inválido."); return; }
    if (parsedLon === null) { setError("Formato de longitud inicial inválido."); return; }

    const location: GeoLocation = { lat: parsedLat, lon: parsedLon };
    const equipment = equipmentStr.split(',').map(s => s.trim()).filter(s => s);
    const otherCapabilities = capabilitiesStr.split(',').map(s => s.trim()).filter(s => s);
    const finalCapabilities = [primaryRole, ...otherCapabilities.filter(c => c.toLowerCase() !== primaryRole.toLowerCase())];
    const ammoLevelNum = parseInt(ammoLevel, 10);
    if (isNaN(ammoLevelNum) || ammoLevelNum < 0 || ammoLevelNum > 100) { setError("Nivel de munición debe estar entre 0 y 100."); return; }
    const daysOfSupplyNum = parseInt(daysOfSupply, 10);
    if (isNaN(daysOfSupplyNum) || daysOfSupplyNum < 0) { setError("Días de suministro debe ser un número positivo."); return; }

    let fuelLevelNum: number | undefined = undefined;
    if (showFuelInput && fuelLevel.trim() !== '') {
      fuelLevelNum = parseInt(fuelLevel, 10);
      if (isNaN(fuelLevelNum) || fuelLevelNum < 0 || fuelLevelNum > 100) { setError("Nivel de combustible debe estar entre 0 y 100."); return; }
    }

    const personnelBreakdown: PersonnelBreakdown = {
      officers: officersNum,
      ncos: ncosNum,
      professionalSoldiers: profSoldiersNum,
      slRegulars: slRegularsNum
    };
    const commanderInfo: CommanderInfo = { rank: commanderRank, name: commanderName.trim() };

    const newUnitData: NewUnitData = {
      name, type, commander: commanderInfo, personnelBreakdown, location, equipment,
      capabilities: finalCapabilities, fuelLevel: fuelLevelNum, ammoLevel: ammoLevelNum,
      daysOfSupply: daysOfSupplyNum, parentId: selectedParentId,
      currentMission,
      unitSituationType
    };

    addUnit(newUnitData);
    onClose();
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 bg-gray-950/95 flex items-start justify-center z-[5000] p-4 overflow-y-auto backdrop-blur-md custom-scrollbar"
      style={{ isolation: 'isolate' }}
      aria-modal="true" role="dialog" aria-labelledby="createTacticalUnitModalTitle">
      <div className="bg-gray-900 my-8 p-8 md:p-14 rounded-[48px] shadow-2xl w-full max-w-5xl border border-white/10 relative">
        <h2 id="createTacticalUnitModalTitle" className="text-4xl md:text-5xl font-black text-white mb-10 uppercase tracking-tighter border-b border-white/10 pb-8 flex items-center gap-4">
          <div className="w-3 h-12 bg-blue-600 rounded-full shadow-[0_0_20px_rgba(37,99,235,0.5)]"></div>
          Registrar Nueva Unidad Táctica
        </h2>
        <form onSubmit={handleSubmit} className="space-y-12">
          {/* Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            <div className="space-y-4">
              <label htmlFor="unitName" className="block text-sm font-black text-gray-500 uppercase tracking-widest ml-2">Nombre de Unidad*</label>
              <input
                type="text"
                id="unitName"
                value={name}
                onChange={e => setName(e.target.value)}
                required
                placeholder="EJ. PELOTÓN DE RECONOCIMIENTO"
                className="w-full bg-black/40 border border-white/10 p-4 rounded-2xl text-xl font-black text-white shadow-inner focus:ring-4 focus:ring-blue-500/20 outline-none transition-all placeholder:opacity-20"
              />
            </div>
            <div className="space-y-4">
              <label htmlFor="unitType" className="block text-sm font-black text-gray-500 uppercase tracking-widest ml-2">Escalón de Mando*</label>
              <select id="unitType" value={type} onChange={e => setType(e.target.value as UnitType)} className="w-full bg-black/40 border border-white/10 p-4 rounded-2xl text-xl font-black text-blue-400 shadow-inner focus:ring-4 focus:ring-blue-500/20 outline-none appearance-none h-[64px]">
                {allowedUnitTypesForCreation.map(t => <option key={t} value={t} className="bg-gray-900">{t}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="parentUnit" className="block text-sm font-black text-gray-400 uppercase tracking-widest mb-2">Unidad Superior (Padre)*</label>
              <select
                id="parentUnit"
                value={selectedParentId}
                onChange={e => setSelectedParentId(e.target.value)}
                required
                className="w-full bg-gray-900 border border-white/5 p-3 rounded-xl text-sm font-bold text-white shadow-inner focus:ring-2 focus:ring-blue-500/50 outline-none disabled:opacity-50"
                disabled={potentialParents.length === 0}
              >
                {potentialParents.length === 0 ? (
                  <option value="">
                    {type === UnitType.PLATOON ? "No hay Compañías disponibles" : "No hay Pelotones disponibles"}
                  </option>
                ) : (
                  potentialParents.map(pUnit => <option key={pUnit.id} value={pUnit.id} className="bg-gray-800">{pUnit.name} ({pUnit.type})</option>)
                )}
              </select>
              {potentialParents.length === 0 && (
                <p className="text-[10px] text-yellow-500 italic mt-2">
                  Asegúrese de haber creado {type === UnitType.PLATOON ? "Compañías" : "Pelotones"} en "Estructura de Fuerza".
                </p>
              )}
            </div>
            <div>
              <label htmlFor="primaryRole" className="block text-sm font-black text-gray-400 uppercase tracking-widest mb-3">Especialidad Principal*</label>
              <select id="primaryRole" value={primaryRole} onChange={e => setPrimaryRole(e.target.value)} className="w-full bg-gray-900 border border-white/5 p-4 rounded-2xl text-base font-bold text-white shadow-inner focus:ring-2 focus:ring-blue-500/50 outline-none">
                {PRIMARY_UNIT_ROLES_APP6.map(role => <option key={role.capabilityTerm} value={role.capabilityTerm} className="bg-gray-800">{role.label}</option>)}
              </select>
            </div>
          </div>

          {/* New: Status and Mission Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 bg-black/20 p-10 rounded-[40px] border border-white/5 shadow-inner">
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <Flag className="w-4 h-4 text-blue-500" />
                <label htmlFor="currentMission" className="block text-xs font-black text-gray-500 uppercase tracking-widest ml-1">Misión Operativa*</label>
              </div>
              <select id="currentMission" value={currentMission} onChange={e => setCurrentMission(e.target.value)} className="w-full bg-gray-900 border border-white/10 p-5 rounded-2xl text-lg font-black text-white focus:ring-4 focus:ring-blue-500/20 outline-none transition-all">
                {MISSION_TYPES.map(m => <option key={m.sigla} value={m.sigla} className="bg-gray-800">{m.sigla} - {m.description}</option>)}
              </select>
            </div>
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <Briefcase className="w-4 h-4 text-orange-500" />
                <label htmlFor="unitSituation" className="block text-xs font-black text-gray-500 uppercase tracking-widest ml-1">Situación Operacional*</label>
              </div>
              <select id="unitSituation" value={unitSituationType} onChange={e => setUnitSituationType(e.target.value as UnitSituationINSITOP)} className="w-full bg-gray-900 border border-white/10 p-5 rounded-2xl text-lg font-black text-white focus:ring-4 focus:ring-orange-500/20 outline-none transition-all">
                <option value={UnitSituationINSITOP.ORGANICA} className="bg-gray-800">Orgánica (Permanente)</option>
                <option value={UnitSituationINSITOP.AGREGADA} className="bg-gray-800">Agregada (Temporal)</option>
                <option value={UnitSituationINSITOP.SEGREGADA} className="bg-gray-800">Segregada (Destacada)</option>
              </select>
            </div>
          </div>

          {/* Commander Info */}
          <fieldset className="border border-white/10 p-5 rounded-2xl bg-white/5">
            <legend className="text-xs font-black text-blue-400 uppercase tracking-[0.2em] px-3">Comandante de Unidad</legend>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
              <div>
                <label htmlFor="commanderRank" className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5">Grado Mil.</label>
                <select id="commanderRank" value={commanderRank} onChange={e => setCommanderRank(e.target.value)} className="w-full bg-gray-900 border border-white/10 p-2.5 rounded-lg text-sm font-bold text-white outline-none">
                  {RANKS_ABBREVIATIONS.map(r => <option key={r} value={r} className="bg-gray-800">{r}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="commanderName" className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5">Nombres y Apellidos</label>
                <input type="text" id="commanderName" value={commanderName} onChange={e => setCommanderName(e.target.value)} required className="w-full bg-gray-900 border border-white/10 p-2.5 rounded-lg text-sm font-bold text-white outline-none" placeholder="EJ. JUAN PEREZ" />
              </div>
            </div>
          </fieldset>

          {/* Personnel Breakdown */}
          <fieldset className="border border-white/10 p-5 rounded-2xl bg-white/5">
            <legend className="text-xs font-black text-teal-400 uppercase tracking-[0.2em] px-3">Efectivos Autorizados (SIOCH)</legend>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
              {[
                { id: 'officers', label: 'Oficiales', value: officers, setter: setOfficers },
                { id: 'ncos', label: 'Suboficiales', value: ncos, setter: setNcos },
                { id: 'profSoldiers', label: 'SLP.', value: professionalSoldiers, setter: setProfessionalSoldiers },
                { id: 'slRegulars', label: 'SLR.', value: slRegulars, setter: setSlRegulars },
              ].map(field => (
                <div key={field.id}>
                  <label htmlFor={field.id} className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5">{field.label}</label>
                  <input type="number" id={field.id} value={field.value} onChange={e => field.setter(e.target.value)} required min="0" className="w-full bg-gray-900 border border-white/10 p-2.5 rounded-lg text-sm font-black text-center text-teal-400 outline-none" />
                </div>
              ))}
            </div>
          </fieldset>

          {/* Initial Location GMS */}
          <fieldset className="border border-white/20 p-8 rounded-[32px] bg-black/40 space-y-10 shadow-2xl">
            <legend className="text-sm font-black text-purple-400 uppercase tracking-[0.4em] px-6 py-1 bg-purple-900/20 rounded-full border border-purple-500/30">Ubicación Inicial (GMS)</legend>

            <div className="space-y-10">
              {/* LATITUD ROW */}
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-1.5 h-6 bg-purple-500 rounded-full"></div>
                  <p className="text-xs font-black text-purple-300 uppercase tracking-widest">Coordenada Latitud</p>
                </div>
                <div className="flex flex-col md:flex-row gap-6">
                  <div className="flex-1 grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <label className="block text-[10px] font-black text-gray-500 uppercase tracking-tighter text-center">Grados</label>
                      <input type="number" value={initialLatDeg} onChange={e => setInitialLatDeg(e.target.value)} placeholder="00" className="w-full bg-gray-900 border border-white/10 p-5 rounded-2xl text-2xl text-center font-black text-white focus:ring-4 focus:ring-purple-500/20 outline-none transition-all border-b-2 border-b-purple-500/30" />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-[10px] font-black text-gray-500 uppercase tracking-tighter text-center">Minutos</label>
                      <input type="number" value={initialLatMin} onChange={e => setInitialLatMin(e.target.value)} placeholder="00" className="w-full bg-gray-900 border border-white/10 p-5 rounded-2xl text-2xl text-center font-black text-white focus:ring-4 focus:ring-purple-500/20 outline-none transition-all border-b-2 border-b-purple-500/30" />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-[10px] font-black text-gray-500 uppercase tracking-tighter text-center">Segundos</label>
                      <input type="number" value={initialLatSec} onChange={e => setInitialLatSec(e.target.value)} placeholder="00" className="w-full bg-gray-900 border border-white/10 p-5 rounded-2xl text-2xl text-center font-black text-white focus:ring-4 focus:ring-purple-500/20 outline-none transition-all border-b-2 border-b-purple-500/30" />
                    </div>
                  </div>
                  <div className="md:w-48 space-y-2">
                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-tighter text-center">Hemisferio</label>
                    <select value={initialLatDir} onChange={e => setInitialLatDir(e.target.value as 'N' | 'S')} className="w-full bg-gray-900 border border-purple-500/30 p-5 rounded-2xl text-lg font-black text-purple-400 outline-none focus:ring-4 focus:ring-purple-500/20 h-[72px] shadow-lg">
                      <option value="N">NORTE (N)</option>
                      <option value="S">SUR (S)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* LONGITUD ROW */}
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-1.5 h-6 bg-purple-500 rounded-full"></div>
                  <p className="text-xs font-black text-purple-300 uppercase tracking-widest">Coordenada Longitud</p>
                </div>
                <div className="flex flex-col md:flex-row gap-6">
                  <div className="flex-1 grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <label className="block text-[10px] font-black text-gray-500 uppercase tracking-tighter text-center">Grados</label>
                      <input type="number" value={initialLonDeg} onChange={e => setInitialLonDeg(e.target.value)} placeholder="00" className="w-full bg-gray-900 border border-white/10 p-5 rounded-2xl text-2xl text-center font-black text-white focus:ring-4 focus:ring-purple-500/20 outline-none transition-all border-b-2 border-b-purple-500/30" />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-[10px] font-black text-gray-500 uppercase tracking-tighter text-center">Minutos</label>
                      <input type="number" value={initialLonMin} onChange={e => setInitialLonMin(e.target.value)} placeholder="00" className="w-full bg-gray-900 border border-white/10 p-5 rounded-2xl text-2xl text-center font-black text-white focus:ring-4 focus:ring-purple-500/20 outline-none transition-all border-b-2 border-b-purple-500/30" />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-[10px] font-black text-gray-500 uppercase tracking-tighter text-center">Segundos</label>
                      <input type="number" value={initialLonSec} onChange={e => setInitialLonSec(e.target.value)} placeholder="00" className="w-full bg-gray-900 border border-white/10 p-5 rounded-2xl text-2xl text-center font-black text-white focus:ring-4 focus:ring-purple-500/20 outline-none transition-all border-b-2 border-b-purple-500/30" />
                    </div>
                  </div>
                  <div className="md:w-48 space-y-2">
                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-tighter text-center">Hemisferio</label>
                    <select value={initialLonDir} onChange={e => setInitialLonDir(e.target.value as 'E' | 'W')} className="w-full bg-gray-900 border border-purple-500/30 p-5 rounded-2xl text-lg font-black text-purple-400 outline-none focus:ring-4 focus:ring-purple-500/20 h-[72px] shadow-lg">
                      <option value="W">OESTE (W)</option>
                      <option value="E">ESTE (E)</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </fieldset>

          <div className="space-y-6">
            <div>
              <label htmlFor="unitEquipment" className="block text-sm font-black text-gray-400 uppercase tracking-widest mb-2">Equipo / Dotación (separado por comas)</label>
              <textarea id="unitEquipment" value={equipmentStr} onChange={e => setEquipmentStr(e.target.value)} rows={3} className="w-full bg-gray-900 border border-white/5 p-4 rounded-xl text-sm font-bold text-white shadow-inner focus:ring-2 focus:ring-blue-500/50 outline-none" placeholder="Ej: Fusil M4, Radio PRC-152, GPS DAGR"></textarea>
            </div>
            <div>
              <label htmlFor="unitCapabilities" className="block text-sm font-black text-gray-400 uppercase tracking-widest mb-2">Capacidades Especiales (separadas por comas)</label>
              <textarea id="unitCapabilities" value={capabilitiesStr} onChange={e => setCapabilitiesStr(e.target.value)} rows={3} className="w-full bg-gray-900 border border-white/5 p-4 rounded-xl text-sm font-bold text-white shadow-inner focus:ring-2 focus:ring-blue-500/50 outline-none" placeholder="Ej: Acción Directa, Combate Urbano, Desminado"></textarea>
            </div>
          </div>

          <fieldset className="border border-white/10 p-5 rounded-2xl bg-white/5">
            <legend className="text-xs font-black text-orange-400 uppercase tracking-[0.2em] px-3">Logística Inicial</legend>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4">
              {showFuelInput && (
                <div>
                  <label htmlFor="unitFuel" className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5">Combustible %</label>
                  <input type="number" id="unitFuel" value={fuelLevel} onChange={e => setFuelLevel(e.target.value)} min="0" max="100" className="w-full bg-gray-900 border border-white/10 p-2.5 rounded-lg text-sm text-center font-black text-orange-400 outline-none" placeholder="Opcional" />
                </div>
              )}
              <div className={!showFuelInput ? "md:col-start-1" : ""}>
                <label htmlFor="unitAmmo" className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5">Munición %*</label>
                <input type="number" id="unitAmmo" value={ammoLevel} onChange={e => setAmmoLevel(e.target.value)} required min="0" max="100" className="w-full bg-gray-900 border border-white/10 p-2.5 rounded-lg text-sm text-center font-black text-orange-400 outline-none" />
              </div>
              <div>
                <label htmlFor="unitSupplies" className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5">Días Suministro*</label>
                <input type="number" id="unitSupplies" value={daysOfSupply} onChange={e => setDaysOfSupply(e.target.value)} required min="0" className="w-full bg-gray-900 border border-white/10 p-2.5 rounded-lg text-sm text-center font-black text-orange-400 outline-none" />
              </div>
            </div>
          </fieldset>

          {error && <p className="text-sm text-red-400 text-center py-1 bg-red-900 bg-opacity-40 rounded">{error}</p>}

          <div className="flex flex-col md:flex-row justify-between items-center gap-8 pt-12 border-t border-white/10 mt-12 bg-black/20 p-8 rounded-[32px]">
            <div className="flex flex-col text-left">
              <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Total Personal de Unidad</p>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-black text-blue-400 monospace-tech shadow-blue-500/20 drop-shadow-xl">{parseInt(officers) + parseInt(ncos) + parseInt(professionalSoldiers) + parseInt(slRegulars) || 0}</span>
                <span className="text-[10px] font-black text-blue-800 uppercase tracking-widest leading-none">Efectivos Estimados</span>
              </div>
            </div>

            <div className="flex gap-6 w-full md:w-auto">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 md:flex-none px-12 py-6 bg-gray-800 hover:bg-gray-700 text-white rounded-[24px] text-xs font-black uppercase tracking-[0.2em] transition-all border border-white/5 active:scale-95 shadow-xl"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={potentialParents.length === 0 && !selectedParentId}
                className="flex-1 md:flex-none px-16 py-6 bg-blue-600 hover:bg-blue-500 text-white rounded-[24px] text-xs font-black uppercase tracking-[0.3em] transition-all shadow-[0_0_40px_rgba(37,99,235,0.3)] active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                Registrar Unidad
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};