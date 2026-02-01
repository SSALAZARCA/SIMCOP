import React, { useState, useEffect } from 'react';
import type { MilitaryUnit, RoutePoint, GeoLocation, CommanderInfo, UnitSituationINSITOP as UnitSituationEnumType, ArtilleryPiece, TargetSelectionRequest, ForwardObserver, PendingFireMission } from '../types';
import { UnitStatus, UnitSituationINSITOP, UnitType } from '../types';
import { MapPinIcon } from './icons/MapPinIcon';
import { ArrowPathIcon } from './icons/ArrowPathIcon';
import { AcademicCapIcon } from './icons/AcademicCapIcon';
import { TagIcon } from './icons/TagIcon';
import { AdjustmentsHorizontalIcon } from './icons/AdjustmentsHorizontalIcon';
import { MISSION_TYPES } from '../constants';
import { decimalToDMS, dmsToDecimal } from '../utils/coordinateUtils';
import { FireMissionControlComponent } from './FireMissionControlComponent';
import { SoldierListComponent } from './SoldierListComponent';
import { UsersIcon } from './icons/UsersIcon';
import { ResupplyModal } from './ResupplyModal';
import { Truck } from 'lucide-react';

interface UnitDetailsPanelProps {
  unit: MilitaryUnit;
  addManualRoutePoint: (unitId: string, location: GeoLocation, timestamp: number) => void;
  updateUnitLogistics: (unitId: string, logisticsData: { fuelLevel?: number | string; ammoLevel?: number | string; daysOfSupply?: number | string; }) => void;
  updateUnitAttributes: (unitId: string, attributes: { equipment?: string[]; capabilities?: string[] }) => void;
  updateUnitMission: (unitId: string, missionSigla: string) => void;
  updateUnitSituation: (unitId: string, newSituation: UnitSituationEnumType) => void;
  sendUnitToRetraining?: (unitId: string) => void;
  artilleryPieces: ArtilleryPiece[];
  targetSelectionRequest: TargetSelectionRequest | null;
  onCallForFire: (requester: ForwardObserver | MilitaryUnit) => void;
  onCancelFireMission: () => void;
  pendingFireMissions: PendingFireMission[];
  dismissPendingMission: (missionId: string) => void;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

const getStatusStyles = (status: UnitStatus): string => {
  switch (status) {
    case UnitStatus.OPERATIONAL:
    case UnitStatus.MOVING:
      return 'border-green-500/30 bg-green-500/10 text-green-400 glow-green';
    case UnitStatus.STATIC:
      return 'border-blue-500/30 bg-blue-500/10 text-blue-400 glow-blue';
    case UnitStatus.ENGAGED:
      return 'border-red-500/30 bg-red-500/10 text-red-400 glow-red animate-pulse';
    case UnitStatus.AAR_PENDING:
      return 'border-yellow-500/30 bg-yellow-500/10 text-yellow-500 glow-yellow';
    case UnitStatus.ON_LEAVE_RETRAINING:
      return 'border-indigo-500/30 bg-indigo-500/10 text-indigo-400 glow-blue';
    case UnitStatus.LOW_SUPPLIES:
      return 'border-yellow-500/30 bg-yellow-400/10 text-yellow-400 glow-yellow';
    case UnitStatus.NO_COMMUNICATION:
      return 'border-orange-500/30 bg-orange-500/10 text-orange-400 glow-orange';
    case UnitStatus.MAINTENANCE:
      return 'border-gray-500/30 bg-gray-500/10 text-gray-400';
    default:
      return 'border-gray-600/30 bg-gray-600/10 text-gray-300';
  }
};

const renderRouteHistory = (routeHistory: RoutePoint[]) => {
  if (!routeHistory || routeHistory.length === 0) {
    return (
      <div className="bg-black/20 p-4 rounded-xl border border-white/5 text-center">
        <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest italic">Sin Historial de Posicionamiento</p>
      </div>
    );
  }
  const MAX_DISPLAY_POINTS = 5;
  const pointsToShow = routeHistory.slice(0, MAX_DISPLAY_POINTS);

  return (
    <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar pr-2">
      {pointsToShow.map((point, index) => (
        <div key={index} className="group bg-white/5 p-2 rounded-lg border border-white/5 text-[10px] text-gray-300 flex items-center justify-between hover:bg-white/10 transition-colors">
          <div className="flex items-center">
            <ArrowPathIcon className="w-3.5 h-3.5 mr-2 text-blue-500/50" />
            <span className="font-bold opacity-70 mr-3">{new Date(point.timestamp).toLocaleString('es-ES', { timeStyle: 'short' })}</span>
            <span className="monospace-tech text-blue-400">{decimalToDMS(point)}</span>
          </div>
        </div>
      ))}
      {routeHistory.length > MAX_DISPLAY_POINTS && (
        <p className="text-[9px] font-bold text-gray-500 uppercase tracking-tighter text-right border-t border-white/5 pt-1">
          + {routeHistory.length - MAX_DISPLAY_POINTS} REGISTROS ADICIONALES
        </p>
      )}
    </div>
  );
};

const formatPersonnelBreakdown = (pb: MilitaryUnit['personnelBreakdown']): string => {
  return [
    String(pb.officers).padStart(2, '0'),
    String(pb.ncos).padStart(2, '0'),
    String(pb.professionalSoldiers).padStart(2, '0'),
    String(pb.slRegulars).padStart(2, '0')
  ].join('-');
};


export const UnitDetailsPanel: React.FC<UnitDetailsPanelProps> = ({
  unit,
  addManualRoutePoint,
  updateUnitLogistics,
  updateUnitAttributes,
  updateUnitMission,
  updateUnitSituation,
  sendUnitToRetraining,
  artilleryPieces,
  targetSelectionRequest,
  onCallForFire,
  onCancelFireMission,
  pendingFireMissions,
  dismissPendingMission,
}) => {
  const lastCommMinutesAgo = Math.floor((Date.now() - unit.lastCommunicationTimestamp) / (60 * 1000));
  const lastMoveMinutesAgo = Math.floor((Date.now() - unit.lastMovementTimestamp) / (60 * 1000));

  const [manualLatDeg, setManualLatDeg] = useState('');
  const [manualLatMin, setManualLatMin] = useState('');
  const [manualLatSec, setManualLatSec] = useState('');
  const [manualLatDir, setManualLatDir] = useState<'N' | 'S'>('N');

  const [manualLonDeg, setManualLonDeg] = useState('');
  const [manualLonMin, setManualLonMin] = useState('');
  const [manualLonSec, setManualLonSec] = useState('');
  const [manualLonDir, setManualLonDir] = useState<'E' | 'W'>('W');

  const [manualTimestampStr, setManualTimestampStr] = useState('');
  const [manualInputError, setManualInputError] = useState<string | null>(null);

  const [isEditingLogistics, setIsEditingLogistics] = useState(false);
  const [editableFuel, setEditableFuel] = useState<string>(String(unit.fuelLevel ?? ''));
  const [editableAmmo, setEditableAmmo] = useState<string>(String(unit.ammoLevel ?? ''));
  const [editableDaysSupply, setEditableDaysSupply] = useState<string>(String(unit.daysOfSupply ?? '7'));
  const [logisticsError, setLogisticsError] = useState<string | null>(null);

  const daysPassedSinceResupply = unit.lastResupplyDate ? Math.floor((Date.now() - unit.lastResupplyDate) / MS_PER_DAY) : 0;
  const effectiveDaysRemaining = unit.daysOfSupply ? Math.max(0, unit.daysOfSupply - daysPassedSinceResupply) : 0;

  const [isEditingEquipment, setIsEditingEquipment] = useState(false);
  const [editableEquipment, setEditableEquipment] = useState<string[]>(unit.equipment);
  const [newEquipmentItem, setNewEquipmentItem] = useState('');

  const [isEditingCapabilities, setIsEditingCapabilities] = useState(false);
  const [editableCapabilities, setEditableCapabilities] = useState<string[]>(unit.capabilities);
  const [newCapabilityItem, setNewCapabilityItem] = useState('');

  const [isEditingMission, setIsEditingMission] = useState(false);
  const [editableMissionSigla, setEditableMissionSigla] = useState<string>(unit.currentMission || MISSION_TYPES.find(m => m.sigla === "N/A")?.sigla || MISSION_TYPES[0].sigla);

  const [isEditingSituation, setIsEditingSituation] = useState(false);
  const [editableSituation, setEditableSituation] = useState<UnitSituationEnumType>(unit.unitSituationType);

  const [isResupplyModalOpen, setIsResupplyModalOpen] = useState(false);

  const handleResupplyConfirm = (data: { days: number; resetAmmo: boolean; resetFuel: boolean }) => {
    updateUnitLogistics(unit.id, {
      daysOfSupply: data.days,
      fuelLevel: data.resetFuel ? 100 : unit.fuelLevel,
      ammoLevel: data.resetAmmo ? 100 : unit.ammoLevel,
    });
    setIsResupplyModalOpen(false);
  };


  const canBeSentToRetraining = unit.status !== UnitStatus.ON_LEAVE_RETRAINING &&
    unit.status !== UnitStatus.ENGAGED &&
    unit.status !== UnitStatus.AAR_PENDING;

  const currentMissionDetails = MISSION_TYPES.find(m => m.sigla === unit.currentMission);

  useEffect(() => {
    if (!isEditingLogistics) {
      setEditableFuel(String(unit.fuelLevel ?? ''));
      setEditableAmmo(String(unit.ammoLevel ?? ''));
      setEditableDaysSupply(String(unit.daysOfSupply ?? '7'));
      setLogisticsError(null);
    }
  }, [unit, isEditingLogistics]);

  useEffect(() => {
    if (!isEditingEquipment) {
      setEditableEquipment([...unit.equipment]);
      setNewEquipmentItem('');
    }
  }, [unit, isEditingEquipment]);

  useEffect(() => {
    if (!isEditingCapabilities) {
      setEditableCapabilities([...unit.capabilities]);
      setNewCapabilityItem('');
    }
  }, [unit, isEditingCapabilities]);

  useEffect(() => {
    if (!isEditingMission) {
      setEditableMissionSigla(unit.currentMission || MISSION_TYPES.find(m => m.sigla === "N/A")?.sigla || MISSION_TYPES[0].sigla);
    }
  }, [unit, isEditingMission]);

  useEffect(() => {
    if (!isEditingSituation) {
      setEditableSituation(unit.unitSituationType);
    }
  }, [unit, isEditingSituation]);

  const clearManualInputFields = () => {
    setManualLatDeg(''); setManualLatMin(''); setManualLatSec(''); setManualLatDir('N');
    setManualLonDeg(''); setManualLonMin(''); setManualLonSec(''); setManualLonDir('W');
    setManualTimestampStr('');
  };

  const handleAddManualPoint = () => {
    setManualInputError(null);
    const latD = parseFloat(manualLatDeg);
    const latM = parseFloat(manualLatMin);
    const latS = parseFloat(manualLatSec);
    const lonD = parseFloat(manualLonDeg);
    const lonM = parseFloat(manualLonMin);
    const lonS = parseFloat(manualLonSec);

    if (isNaN(latD) || isNaN(latM) || isNaN(latS) || isNaN(lonD) || isNaN(lonM) || isNaN(lonS) || !manualTimestampStr.trim()) {
      setManualInputError("Todos los campos de GMS y Fecha/Hora son requeridos.");
      return;
    }
    const constructedLatDMS = `${latD}°${latM}′${latS}″ ${manualLatDir}`;
    const constructedLonDMS = `${lonD}°${lonM}′${lonS}″ ${manualLonDir}`;
    const lat = dmsToDecimal(constructedLatDMS, false);
    const lon = dmsToDecimal(constructedLonDMS, true);
    const timestamp = new Date(manualTimestampStr).getTime();
    if (lat === null || lon === null || isNaN(timestamp)) {
      setManualInputError("Formato de coordenadas o fecha inválido.");
      return;
    }
    addManualRoutePoint(unit.id, { lat, lon }, timestamp);
    clearManualInputFields();
  };

  const handleEditLogistics = () => setIsEditingLogistics(true);
  const handleCancelEditLogistics = () => setIsEditingLogistics(false);
  const handleSaveLogistics = () => {
    updateUnitLogistics(unit.id, {
      fuelLevel: parseFloat(editableFuel),
      ammoLevel: parseFloat(editableAmmo),
      daysOfSupply: parseInt(editableDaysSupply, 10)
    });
    setIsEditingLogistics(false);
  };

  const handleAddEquipmentItem = () => {
    if (newEquipmentItem.trim() && !editableEquipment.includes(newEquipmentItem.trim())) {
      setEditableEquipment([...editableEquipment, newEquipmentItem.trim()]);
      setNewEquipmentItem('');
    }
  };
  const handleRemoveEquipmentItem = (itemToRemove: string) => setEditableEquipment(editableEquipment.filter(item => item !== itemToRemove));
  const handleSaveEquipment = () => {
    updateUnitAttributes(unit.id, { equipment: editableEquipment });
    setIsEditingEquipment(false);
  };

  const handleAddCapabilityItem = () => {
    if (newCapabilityItem.trim() && !editableCapabilities.includes(newCapabilityItem.trim())) {
      setEditableCapabilities([...editableCapabilities, newCapabilityItem.trim()]);
      setNewCapabilityItem('');
    }
  };
  const handleRemoveCapabilityItem = (itemToRemove: string) => setEditableCapabilities(editableCapabilities.filter(item => item !== itemToRemove));
  const handleSaveCapabilities = () => {
    updateUnitAttributes(unit.id, { capabilities: editableCapabilities });
    setIsEditingCapabilities(false);
  };

  const handleSaveMission = () => {
    updateUnitMission(unit.id, editableMissionSigla);
    setIsEditingMission(false);
  };

  const handleSaveSituation = () => {
    updateUnitSituation(unit.id, editableSituation);
    setIsEditingSituation(false);
  };

  const handleSendToRetraining = () => {
    if (sendUnitToRetraining && canBeSentToRetraining) {
      sendUnitToRetraining(unit.id);
    }
  };

  return (
    <div className="space-y-8 text-gray-200 animate-in fade-in duration-500 p-2">
      {/* Header / Identity */}
      <div className="flex justify-between items-start border-b border-white/10 pb-8">
        <div>
          <h3 className="text-3xl font-black text-white uppercase tracking-tighter leading-none">{unit.name}</h3>
          <div className="flex items-center gap-3 mt-3">
            <span className="text-xs font-black text-blue-500 uppercase tracking-[0.2em]">{unit.type}</span>
            <span className="w-1.5 h-1.5 bg-gray-700 rounded-full"></span>
            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">{unit.commander?.rank || 'N/A'} {unit.commander?.name || 'N/A'}</span>
          </div>
        </div>
        <div className={`px-5 py-2 text-xs font-black rounded-full border-2 uppercase tracking-[0.25em] shadow-xl backdrop-blur-md ${getStatusStyles(unit.status)}`}>
          {unit.status}
        </div>
      </div>

      {/* Primary Data Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
        {[
          { label: "ID OPERATIVO", value: unit.id.substring(0, 12), mono: true },
          { label: "EFECTIVOS (OF-SOS-SLP-SLR)", value: formatPersonnelBreakdown(unit.personnelBreakdown), mono: true },
          { label: "UBICACIÓN GPS", value: unit.status !== UnitStatus.ON_LEAVE_RETRAINING ? decimalToDMS(unit.location) : "N/A", mono: true, color: "text-blue-400" },
          { label: "ÚLTIMO REPORTE", value: `${lastCommMinutesAgo}M ATRÁS`, mono: true },
        ].map((item, idx) => (
          <div key={idx} className="bg-white/5 p-4 rounded-2xl border border-white/5 shadow-inner backdrop-blur-sm">
            <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.15em] mb-2">{item.label}</p>
            <p className={`text-sm font-bold ${item.mono ? 'monospace-tech' : ''} ${item.color || 'text-white'} truncate`}>{item.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Mission Section */}
        <div className="glass-effect p-4 rounded-2xl border border-white/5 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-3 opacity-5 group-hover:opacity-10 transition-opacity">
            <TagIcon className="w-12 h-12" />
          </div>
          <div className="flex justify-between items-center mb-4">
            <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] flex items-center">
              <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
              Misión Operativa
            </h4>
            {!isEditingMission && unit.status !== UnitStatus.AAR_PENDING && unit.status !== UnitStatus.ENGAGED && unit.status !== UnitStatus.ON_LEAVE_RETRAINING && (
              <button
                onClick={() => setIsEditingMission(true)}
                className="px-3 py-1 bg-blue-500/10 hover:bg-blue-500 text-blue-400 hover:text-white border border-blue-500/20 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all"
              >
                MODIFICAR
              </button>
            )}
          </div>

          {isEditingMission ? (
            <div className="space-y-3">
              <select
                value={editableMissionSigla}
                onChange={(e) => setEditableMissionSigla(e.target.value)}
                className="w-full bg-gray-900/60 border border-white/10 rounded-xl p-2.5 text-xs font-bold text-blue-100 outline-none focus:ring-1 focus:ring-blue-500/50"
              >
                {MISSION_TYPES.map(mission => (
                  <option key={mission.sigla} value={mission.sigla} className="bg-gray-900">
                    {mission.sigla} - {mission.description}
                  </option>
                ))}
              </select>
              <div className="flex justify-end gap-2">
                <button onClick={() => setIsEditingMission(false)} className="px-3 py-1.5 text-[9px] font-black uppercase text-gray-500 hover:text-white transition-colors">Cancelar</button>
                <button onClick={handleSaveMission} className="px-4 py-1.5 text-[9px] font-black uppercase bg-blue-600 text-white rounded-lg shadow-lg shadow-blue-900/40">Confirmar Cambios</button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-4 bg-black/20 p-3 rounded-xl border border-white/5">
              <div className="bg-blue-500/10 p-2 rounded-lg border border-blue-500/20">
                <span className="text-sm font-black text-blue-400 monospace-tech">
                  {currentMissionDetails?.sigla || "PATCTRL"}
                </span>
              </div>
              <p className="text-xs font-bold text-gray-200">
                {currentMissionDetails?.description || "Patrullaje y Control de Área"}
              </p>
            </div>
          )}
        </div>

        {/* Situation Section */}
        <div className="glass-effect p-4 rounded-2xl border border-white/5 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-3 opacity-5 group-hover:opacity-10 transition-opacity">
            <AdjustmentsHorizontalIcon className="w-12 h-12" />
          </div>
          <div className="flex justify-between items-center mb-4">
            <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] flex items-center">
              <span className="w-2 h-2 bg-orange-500 rounded-full mr-2"></span>
              Situación INSITOP
            </h4>
            {!isEditingSituation && unit.status !== UnitStatus.AAR_PENDING && unit.status !== UnitStatus.ENGAGED && unit.status !== UnitStatus.ON_LEAVE_RETRAINING && (
              <button
                onClick={() => setIsEditingSituation(true)}
                className="px-3 py-1 bg-orange-500/10 hover:bg-orange-500 text-orange-400 hover:text-white border border-orange-500/20 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all"
                aria-label="Editar situación de la unidad"
              >
                ACTUALIZAR
              </button>
            )}
          </div>

          {isEditingSituation ? (
            <div className="space-y-3">
              <select
                value={editableSituation}
                onChange={(e) => setEditableSituation(e.target.value as UnitSituationEnumType)}
                className="w-full bg-gray-900/60 border border-white/10 rounded-xl p-2.5 text-xs font-bold text-orange-100 outline-none focus:ring-1 focus:ring-orange-500/50"
              >
                {Object.values(UnitSituationINSITOP).map(sit => (
                  <option key={sit} value={sit} className="bg-gray-900">{sit}</option>
                ))}
              </select>
              <div className="flex justify-end gap-2">
                <button onClick={() => setIsEditingSituation(false)} className="px-3 py-1.5 text-[9px] font-black uppercase text-gray-500 hover:text-white transition-colors">Cancelar</button>
                <button onClick={handleSaveSituation} className="px-4 py-1.5 text-[9px] font-black uppercase bg-orange-600 text-white rounded-lg shadow-lg shadow-orange-900/40">Registrar Situación</button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 bg-black/20 p-3 rounded-xl border border-white/5">
              <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(249,115,22,0.6)]"></div>
              <p className="text-xs font-bold text-gray-200 uppercase tracking-wider">
                {unit.unitSituationType}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* SIOCH Personnel Section */}
      <div className="glass-effect p-4 rounded-2xl border border-white/5">
        <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4 flex items-center">
          <UsersIcon className="w-4 h-4 mr-2 text-green-500/70" />
          Personal Individual (SIOCH)
        </h4>
        <div className="bg-black/20 rounded-xl border border-white/5 overflow-hidden">
          <SoldierListComponent soldiers={unit.personnelList || []} />
        </div>
      </div>

      <div className="flex flex-col gap-4">
        {sendUnitToRetraining && canBeSentToRetraining && (
          <button
            onClick={handleSendToRetraining}
            className="w-full flex items-center justify-center gap-3 px-6 py-3 bg-indigo-900/20 hover:bg-indigo-600 text-indigo-400 hover:text-white border border-indigo-800/30 rounded-xl text-[10px] font-black uppercase tracking-[.25em] transition-all group shadow-xl active:scale-95"
          >
            <AcademicCapIcon className="w-5 h-5 group-hover:scale-110 transition-transform" />
            INICIAR PROTOCOLO DE PERMISO Y REENTRENAMIENTO
          </button>
        )}
      </div>

      {/* Logistics & Equipment Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Logistics Section */}
        <div className="glass-effect p-4 rounded-2xl border border-white/5 flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Suministros y Comms</h4>
            <div className="flex gap-2">
              {!isEditingLogistics && unit.status !== UnitStatus.AAR_PENDING && unit.status !== UnitStatus.ENGAGED && unit.status !== UnitStatus.ON_LEAVE_RETRAINING && (
                <>
                  <button
                    onClick={() => setIsResupplyModalOpen(true)}
                    className="px-3 py-1 bg-green-600/20 hover:bg-green-600 text-green-400 hover:text-white border border-green-500/20 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5"
                  >
                    <Truck className="w-3 h-3" />
                    REABASTECER
                  </button>
                  <button
                    onClick={handleEditLogistics}
                    className="px-3 py-1 bg-blue-500/10 hover:bg-blue-500 text-blue-400 hover:text-white border border-blue-500/20 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all"
                  >
                    EDITAR
                  </button>
                </>
              )}
            </div>
          </div>

          <div className="space-y-4 flex-1">
            {isEditingLogistics ? (
              <div className="space-y-3 bg-black/20 p-4 rounded-xl border border-white/5">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[9px] font-black text-gray-500 uppercase mb-1">Combustible %</label>
                    <input type="number" value={editableFuel} onChange={e => setEditableFuel(e.target.value)} className="w-full bg-gray-900 border border-white/10 rounded-lg p-2 text-xs font-bold text-blue-100" />
                  </div>
                  <div>
                    <label className="block text-[9px] font-black text-gray-500 uppercase mb-1">Munición %</label>
                    <input type="number" value={editableAmmo} onChange={e => setEditableAmmo(e.target.value)} className="w-full bg-gray-900 border border-white/10 rounded-lg p-2 text-xs font-bold text-blue-100" />
                  </div>
                </div>
                <div className="flex justify-end gap-2 mt-2">
                  <button onClick={handleCancelEditLogistics} className="px-3 py-1.5 text-[9px] font-black uppercase text-gray-500 hover:text-white">Cancelar</button>
                  <button onClick={handleSaveLogistics} className="px-4 py-1.5 text-[9px] font-black uppercase bg-blue-600 text-white rounded-lg">Guardar</button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "COMBUSTIBLE", value: `${unit.fuelLevel?.toFixed(0)}%`, level: unit.fuelLevel, critical: 20 },
                  { label: "MUNICIÓN", value: `${unit.ammoLevel?.toFixed(0)}%`, level: unit.ammoLevel, critical: 25 },
                  { label: "DÍAS SUMIN.", value: `${effectiveDaysRemaining.toFixed(0)}D`, level: effectiveDaysRemaining, critical: 3 },
                  { label: "MOVIMIENTO", value: `${lastMoveMinutesAgo}M`, level: 100, critical: 0 },
                ].map((stat, i) => (
                  <div key={i} className="bg-black/20 p-3 rounded-xl border border-white/5">
                    <p className="text-[8px] font-black text-gray-600 uppercase tracking-widest mb-1">{stat.label}</p>
                    <p className={`text-sm font-black monospace-tech ${stat.level && stat.level < stat.critical ? 'text-red-500 animate-pulse' : 'text-gray-200'}`}>
                      {stat.value}
                    </p>
                  </div>
                ))}
              </div>
            )}

            <div className="bg-blue-500/5 p-3 rounded-xl border border-blue-500/10 flex items-center justify-between mt-auto">
              <span className="text-[9px] font-black text-blue-400/60 uppercase tracking-widest">Último Reabastecimiento</span>
              <span className="text-[10px] font-bold text-blue-200 monospace-tech">
                {unit.lastResupplyDate ? new Date(unit.lastResupplyDate).toLocaleDateString('es-ES') : 'N/A'}
              </span>
            </div>
          </div>
        </div>

        {/* Equipment & Capabilities */}
        <div className="space-y-6">
          <div className="glass-effect p-4 rounded-2xl border border-white/5">
            <div className="flex justify-between items-center mb-4">
              <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Inventario de Equipo</h4>
              <button onClick={() => setIsEditingEquipment(!isEditingEquipment)} className="px-3 py-1 bg-blue-500/10 hover:bg-blue-500 text-blue-400 hover:text-white border border-blue-500/20 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all">GESTIONAR</button>
            </div>

            {isEditingEquipment ? (
              <div className="space-y-2">
                <div className="flex gap-2">
                  <input value={newEquipmentItem} onChange={e => setNewEquipmentItem(e.target.value)} placeholder="NUEVO ITEM..." className="flex-1 bg-gray-900 border border-white/10 rounded-lg p-2 text-[10px] font-bold text-white uppercase outline-none" />
                  <button onClick={handleAddEquipmentItem} className="bg-blue-600 px-3 rounded-lg text-white font-black">+</button>
                </div>
                <div className="max-h-32 overflow-y-auto custom-scrollbar flex flex-wrap gap-2 pt-2">
                  {editableEquipment.map(item => (
                    <span key={item} className="bg-white/5 border border-white/10 px-2 py-1 rounded text-[9px] font-bold flex items-center gap-2">
                      {item}
                      <button onClick={() => handleRemoveEquipmentItem(item)} className="text-red-500">×</button>
                    </span>
                  ))}
                </div>
                <button onClick={handleSaveEquipment} className="w-full mt-2 bg-green-600/20 text-green-400 border border-green-500/20 py-2 rounded-lg text-[9px] font-black uppercase">Guardar Inventario</button>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2 font-mono">
                {unit.equipment.map(eq => (
                  <span key={eq} className="bg-white/5 border border-white/5 px-2 py-1 rounded text-[9px] font-bold text-gray-400 uppercase tracking-tighter">
                    {eq}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="glass-effect p-4 rounded-2xl border border-white/5">
            <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4">Capacidades Tácticas</h4>
            <div className="grid grid-cols-2 gap-2">
              {unit.capabilities.map(cap => (
                <div key={cap} className="bg-blue-500/5 border border-blue-500/10 px-3 py-2 rounded-xl text-[9px] font-black text-blue-300 uppercase tracking-widest flex items-center gap-2">
                  <div className="w-1 h-1 bg-blue-500 rounded-full"></div>
                  {cap}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Positioning Section */}
      {unit.status !== UnitStatus.ON_LEAVE_RETRAINING && (
        <div className="glass-effect p-6 rounded-2xl border border-white/5 space-y-6">
          <div className="flex items-center justify-between">
            <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] flex items-center gap-2">
              <MapPinIcon className="w-4 h-4 text-blue-500" />
              Monitoreo de Posicionamiento
            </h4>
          </div>

          <div className="flex flex-col space-y-8">
            <div className="space-y-4">
              <h5 className="text-xs font-black text-gray-500 uppercase tracking-[0.2em] border-l-2 border-gray-700 pl-3">Historial de Ruta Reciente</h5>
              {renderRouteHistory(unit.routeHistory)}
            </div>

            {unit.status !== UnitStatus.AAR_PENDING && unit.status !== UnitStatus.ENGAGED && (
              <div className="bg-blue-900/10 p-6 rounded-3xl border border-blue-500/10 space-y-6 shadow-inner backdrop-blur-md">
                <div className="flex items-center gap-3 border-b border-blue-500/10 pb-4">
                  <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center">
                    <MapPinIcon className="w-5 h-5 text-blue-400" />
                  </div>
                  <h5 className="text-sm font-black text-blue-300 uppercase tracking-widest">Registro de Punto Manual (GMS)</h5>
                </div>

                <div className="space-y-6">
                  {/* LATITUD GROUP */}
                  <div className="space-y-3">
                    <p className="text-[10px] font-black text-blue-500/70 uppercase tracking-[0.2em] ml-1">Latitud de Operación</p>
                    <div className="grid grid-cols-4 gap-4">
                      <div className="flex flex-col gap-1.5">
                        <span className="text-[9px] font-black text-gray-500 uppercase text-center tracking-tighter">Grados</span>
                        <input type="number" value={manualLatDeg} onChange={e => setManualLatDeg(e.target.value)} placeholder="00" className="bg-gray-900/80 border border-white/10 rounded-xl p-4 text-center text-lg font-black text-white outline-none focus:ring-2 focus:ring-blue-500/50 transition-all" />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <span className="text-[9px] font-black text-gray-500 uppercase text-center tracking-tighter">Minutos</span>
                        <input type="number" value={manualLatMin} onChange={e => setManualLatMin(e.target.value)} placeholder="00" className="bg-gray-900/80 border border-white/10 rounded-xl p-4 text-center text-lg font-black text-white outline-none focus:ring-2 focus:ring-blue-500/50 transition-all" />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <span className="text-[9px] font-black text-gray-500 uppercase text-center tracking-tighter">Segundos</span>
                        <input type="number" value={manualLatSec} onChange={e => setManualLatSec(e.target.value)} placeholder="00" className="bg-gray-900/80 border border-white/10 rounded-xl p-4 text-center text-lg font-black text-white outline-none focus:ring-2 focus:ring-blue-500/50 transition-all" />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <span className="text-[9px] font-black text-gray-500 uppercase text-center tracking-tighter">Hem</span>
                        <select value={manualLatDir} onChange={e => setManualLatDir(e.target.value as 'N' | 'S')} className="bg-gray-900 border border-white/10 rounded-xl p-4 text-sm font-black text-blue-400 uppercase outline-none focus:ring-2 focus:ring-blue-500/50 h-[58px]">
                          <option value="N">NORTE</option><option value="S">SUR</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* LONGITUD GROUP */}
                  <div className="space-y-3">
                    <p className="text-[10px] font-black text-blue-500/70 uppercase tracking-[0.2em] ml-1">Longitud de Operación</p>
                    <div className="grid grid-cols-4 gap-4">
                      <div className="flex flex-col gap-1.5">
                        <input type="number" value={manualLonDeg} onChange={e => setManualLonDeg(e.target.value)} placeholder="00" className="bg-gray-900/80 border border-white/10 rounded-xl p-4 text-center text-lg font-black text-white outline-none focus:ring-2 focus:ring-blue-500/50 transition-all" />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <input type="number" value={manualLonMin} onChange={e => setManualLonMin(e.target.value)} placeholder="00" className="bg-gray-900/80 border border-white/10 rounded-xl p-4 text-center text-lg font-black text-white outline-none focus:ring-2 focus:ring-blue-500/50 transition-all" />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <input type="number" value={manualLonSec} onChange={e => setManualLonSec(e.target.value)} placeholder="00" className="bg-gray-900/80 border border-white/10 rounded-xl p-4 text-center text-lg font-black text-white outline-none focus:ring-2 focus:ring-blue-500/50 transition-all" />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <select value={manualLonDir} onChange={e => setManualLonDir(e.target.value as 'E' | 'W')} className="bg-gray-900 border border-white/10 rounded-xl p-4 text-sm font-black text-blue-400 uppercase outline-none focus:ring-2 focus:ring-blue-500/50 h-[58px]">
                          <option value="W">OESTE</option><option value="E">ESTE</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Fecha y Hora de Observación</span>
                    <input type="datetime-local" value={manualTimestampStr} onChange={(e) => setManualTimestampStr(e.target.value)} className="w-full bg-gray-900 border border-white/20 p-4 rounded-xl text-lg font-black text-white uppercase outline-none focus:ring-2 focus:ring-blue-500/50 shadow-inner" />
                  </div>

                  <button onClick={handleAddManualPoint} className="w-full bg-blue-600 hover:bg-blue-500 py-5 rounded-2xl text-xs font-black uppercase tracking-[0.3em] text-white shadow-2xl shadow-blue-900/60 active:scale-[0.98] transition-all flex items-center justify-center gap-3">
                    REGISTRAR POSICIÓN TÁCTICA
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Fire Control System */}
      {unit.type === UnitType.PLATOON && (
        <div className="glass-effect p-6 rounded-2xl border border-red-900/10 shadow-lg shadow-red-900/5">
          <FireMissionControlComponent
            requester={unit}
            targetSelectionRequest={targetSelectionRequest}
            onCallForFire={onCallForFire}
            onCancelFireMission={onCancelFireMission}
            pendingFireMissions={pendingFireMissions}
            onDismissMission={dismissPendingMission}
            artilleryPieces={artilleryPieces}
          />
        </div>
      )}

      <ResupplyModal
        isOpen={isResupplyModalOpen}
        onClose={() => setIsResupplyModalOpen(false)}
        onConfirm={handleResupplyConfirm}
        unitName={unit.name}
      />
    </div>
  );
};