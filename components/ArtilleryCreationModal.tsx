
import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import type { NewArtilleryPieceData, MilitaryUnit, User } from '../types';
import { ArtilleryType, UserRole } from '../types';
import { dmsToDecimal } from '../utils/coordinateUtils';
import { ARTILLERY_TYPE_TO_FDO_ROLE } from '../constants';

interface ArtilleryCreationModalProps {
  isOpen: boolean;
  onClose: () => void;
  addArtilleryPiece: (pieceData: NewArtilleryPieceData) => void;
  eligibleParentUnits: MilitaryUnit[];
  allUsers: User[];
}

export const ArtilleryCreationModal: React.FC<ArtilleryCreationModalProps> = ({ isOpen, onClose, addArtilleryPiece, eligibleParentUnits, allUsers }) => {
  const [name, setName] = useState('');
  const [type, setType] = useState<ArtilleryType>(ArtilleryType.MORTAR_120_M120);
  const [assignedUnitId, setAssignedUnitId] = useState<string>('');
  const [commanderId, setCommanderId] = useState<string>('');
  const [directorTiroId, setDirectorTiroId] = useState<string>('');

  const [latDeg, setLatDeg] = useState('');
  const [latMin, setLatMin] = useState('');
  const [latSec, setLatSec] = useState('');
  const [latDir, setLatDir] = useState<'N' | 'S'>('N');

  const [lonDeg, setLonDeg] = useState('');
  const [lonMin, setLonMin] = useState('');
  const [lonSec, setLonSec] = useState('');
  const [lonDir, setLonDir] = useState<'W' | 'E'>('W');

  const [initialHe, setInitialHe] = useState('50');
  const [initialSmoke, setInitialSmoke] = useState('20');
  const [initialIllum, setInitialIllum] = useState('10');

  const [error, setError] = useState<string | null>(null);

  const pieceCommanders = useMemo(() => {
    return allUsers.filter(u => u.role === UserRole.COMANDANTE_PIEZA_ARTILLERIA);
  }, [allUsers]);

  const fireDirectionOfficers = useMemo(() => {
    // This logic ensures that only FDOs with the correct role for the selected artillery type are shown.
    const requiredRole = ARTILLERY_TYPE_TO_FDO_ROLE[type as ArtilleryType];
    if (!requiredRole) {
      console.warn(`No FDO role defined for artillery type: ${type}`);
      return [];
    }
    // Ensure allUsers is an array before filtering and that user objects are valid.
    if (!Array.isArray(allUsers)) {
      return [];
    }
    return allUsers.filter(user => user && user.role === requiredRole);
  }, [allUsers, type]);


  useEffect(() => {
    if (isOpen) {
      // Reset form fields
      setName('');
      setType(ArtilleryType.MORTAR_120_M120);
      setAssignedUnitId(eligibleParentUnits.length > 0 ? eligibleParentUnits[0].id : '');
      setCommanderId(pieceCommanders.length > 0 ? pieceCommanders[0].id : '');
      setLatDeg(''); setLatMin(''); setLatSec(''); setLatDir('N');
      setLonDeg(''); setLonMin(''); setLonSec(''); setLonDir('W');
      setInitialHe('50');
      setInitialSmoke('20');
      setInitialIllum('10');
      setError(null);
    }
  }, [isOpen, eligibleParentUnits, pieceCommanders]);

  // This effect ensures the FDO selection updates correctly when the artillery type changes.
  useEffect(() => {
    if (isOpen) {
      setDirectorTiroId(fireDirectionOfficers.length > 0 ? fireDirectionOfficers[0].id : '');
    }
  }, [type, isOpen, fireDirectionOfficers]);


  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Basic Validations
    if (!name.trim()) { setError("El nombre de la pieza es obligatorio."); return; }
    if (!assignedUnitId) { setError("Debe seleccionar una Unidad Superior."); return; }
    if (!commanderId) { setError("Debe seleccionar un Comandante de Pieza."); return; }
    if (!directorTiroId) { setError("Debe seleccionar un Director de Tiro (FDO). No hay FDOs disponibles para este tipo de pieza."); return; }


    const latD = parseFloat(latDeg); const latM = parseFloat(latMin); const latS = parseFloat(latSec);
    const lonD = parseFloat(lonDeg); const lonM = parseFloat(lonMin); const lonS = parseFloat(lonSec);

    if (isNaN(latD) || isNaN(latM) || isNaN(latS) || isNaN(lonD) || isNaN(lonM) || isNaN(lonS)) {
      setError("Todos los campos de GMS para la Ubicación son requeridos."); return;
    }
    if (latD < 0 || latD > 90 || latM < 0 || latM >= 60 || latS < 0 || latS >= 60) {
      setError("Valores de latitud inválidos (G:0-90, M/S:0-59)."); return;
    }
    if (lonD < 0 || lonD > 180 || lonM < 0 || lonM >= 60 || lonS < 0 || lonS >= 60) {
      setError("Valores de longitud inválidos (G:0-180, M/S:0-59)."); return;
    }

    const constructedLatDMS = `${latD}°${latM}′${latS}″ ${latDir}`;
    const constructedLonDMS = `${lonD}°${lonM}′${lonS}″ ${lonDir}`;

    const parsedLat = dmsToDecimal(constructedLatDMS, false);
    const parsedLon = dmsToDecimal(constructedLonDMS, true);

    if (parsedLat === null || parsedLon === null) { setError("Formato de coordenadas GMS inválido."); return; }

    const heNum = parseInt(initialHe, 10);
    const smokeNum = parseInt(initialSmoke, 10);
    const illumNum = parseInt(initialIllum, 10);

    if (isNaN(heNum) || heNum < 0 || isNaN(smokeNum) || smokeNum < 0 || isNaN(illumNum) || illumNum < 0) {
      setError("Las cantidades de munición deben ser números no negativos.");
      return;
    }

    const newPieceData: NewArtilleryPieceData = {
      name: name.trim(),
      type,
      location: { lat: parsedLat, lon: parsedLon },
      assignedUnitId,
      commanderId,
      directorTiroId,
      initialAmmunition: {
        he: heNum,
        smoke: smokeNum,
        illum: illumNum,
      }
    };

    addArtilleryPiece(newPieceData);
    onClose();
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-start justify-center z-[5000] p-4 overflow-y-auto custom-scrollbar">
      <div className="bg-gray-800 my-8 p-6 rounded-lg shadow-xl w-full max-w-2xl border border-white/10 relative">
        <h2 className="text-xl font-semibold text-orange-300 mb-4">Crear Nueva Pieza de Artillería</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="pieceName" className="block text-sm font-medium text-gray-300">Nombre de la Pieza*</label>
              <input type="text" id="pieceName" value={name} onChange={e => setName(e.target.value)} required className="mt-1 w-full bg-gray-700 p-2 rounded-md text-sm border border-gray-600 focus:ring-orange-500 focus:border-orange-500 outline-none" />
            </div>
            <div>
              <label htmlFor="pieceType" className="block text-sm font-medium text-gray-300">Tipo/Calibre*</label>
              <select id="pieceType" value={type} onChange={e => setType(e.target.value as ArtilleryType)} className="mt-1 w-full bg-gray-700 p-2 rounded-md text-sm border border-gray-600 focus:ring-orange-500 focus:border-orange-500 outline-none h-[38px]">
                {Object.values(ArtilleryType).map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="assignedUnit" className="block text-sm font-medium text-gray-300">Unidad Superior Asignada*</label>
              <select id="assignedUnit" value={assignedUnitId} onChange={e => setAssignedUnitId(e.target.value)} required disabled={eligibleParentUnits.length === 0} className="mt-1 w-full bg-gray-700 p-2 rounded-md text-sm border border-gray-600 focus:ring-orange-500 focus:border-orange-500 outline-none h-[38px]">
                {eligibleParentUnits.length > 0 ? (
                  eligibleParentUnits.map(unit => <option key={unit.id} value={unit.id}>{unit.name}</option>)
                ) : (
                  <option value="">No hay Batallones/Brigadas</option>
                )}
              </select>
            </div>
            <div>
              <label htmlFor="commander" className="block text-sm font-medium text-gray-300">Comandante de Pieza*</label>
              <select id="commander" value={commanderId} onChange={e => setCommanderId(e.target.value)} required disabled={pieceCommanders.length === 0} className="mt-1 w-full bg-gray-700 p-2 rounded-md text-sm border border-gray-600 focus:ring-orange-500 focus:border-orange-500 outline-none h-[38px]">
                {pieceCommanders.length > 0 ? (
                  pieceCommanders.map(user => <option key={user.id} value={user.id}>{user.displayName}</option>)
                ) : (
                  <option value="">No hay Comandantes de Pieza</option>
                )}
              </select>
            </div>
          </div>
          <div>
            <label htmlFor="directorTiro" className="block text-sm font-medium text-gray-300">Director de Tiro (FDO)*</label>
            <select id="directorTiro" value={directorTiroId} onChange={e => setDirectorTiroId(e.target.value)} required disabled={fireDirectionOfficers.length === 0} className="mt-1 w-full bg-gray-700 p-2 rounded-md text-sm border border-gray-600 focus:ring-orange-500 focus:border-orange-500 outline-none h-[38px]">
              {fireDirectionOfficers.length > 0 ? (
                fireDirectionOfficers.map(user => <option key={user.id} value={user.id}>{user.displayName} ({user.role})</option>)
              ) : (
                <option value="">No hay FDOs para este tipo</option>
              )}
            </select>
            {fireDirectionOfficers.length === 0 && <p className="text-xs text-yellow-400 mt-1">Cree un usuario con el rol FDO para este sistema de armas.</p>}
          </div>
          <fieldset className="border border-gray-700 p-3 rounded-md">
            <legend className="text-sm font-medium text-gray-300 px-1">Ubicación Inicial (GMS)*</legend>
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 mb-2 items-end mt-1">
              <div className="sm:col-span-3 grid grid-cols-3 gap-1">
                <div>
                  <label className="block text-xs font-medium text-gray-400">Lat. G°</label>
                  <input type="number" value={latDeg} onChange={e => setLatDeg(e.target.value)} placeholder="G°" required className="bg-gray-700 border-gray-600 rounded-md p-1.5 text-xs w-full text-white outline-none focus:ring-1 focus:ring-orange-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-400">M′</label>
                  <input type="number" value={latMin} onChange={e => setLatMin(e.target.value)} placeholder="M′" required className="bg-gray-700 border-gray-600 rounded-md p-1.5 text-xs w-full text-white outline-none focus:ring-1 focus:ring-orange-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-400">S″</label>
                  <input type="number" value={latSec} onChange={e => setLatSec(e.target.value)} placeholder="S″" step="any" required className="bg-gray-700 border-gray-600 rounded-md p-1.5 text-xs w-full text-white outline-none focus:ring-1 focus:ring-orange-500" />
                </div>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-gray-400">Dir.</label>
                <select value={latDir} onChange={e => setLatDir(e.target.value as 'N' | 'S')} className="bg-gray-700 border-gray-600 rounded-md p-1.5 text-xs w-full text-white outline-none focus:ring-1 focus:ring-orange-500">
                  <option value="N">Norte (N)</option>
                  <option value="S">Sur (S)</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 items-end">
              <div className="sm:col-span-3 grid grid-cols-3 gap-1">
                <div>
                  <label className="block text-xs font-medium text-gray-400">Lon. G°</label>
                  <input type="number" value={lonDeg} onChange={e => setLonDeg(e.target.value)} placeholder="G°" required className="bg-gray-700 border-gray-600 rounded-md p-1.5 text-xs w-full text-white outline-none focus:ring-1 focus:ring-orange-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-400">M′</label>
                  <input type="number" value={lonMin} onChange={e => setLonMin(e.target.value)} placeholder="M′" required className="bg-gray-700 border-gray-600 rounded-md p-1.5 text-xs w-full text-white outline-none focus:ring-1 focus:ring-orange-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-400">S″</label>
                  <input type="number" value={lonSec} onChange={e => setLonSec(e.target.value)} placeholder="S″" step="any" required className="bg-gray-700 border-gray-600 rounded-md p-1.5 text-xs w-full text-white outline-none focus:ring-1 focus:ring-orange-500" />
                </div>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-gray-400">Dir.</label>
                <select value={lonDir} onChange={e => setLonDir(e.target.value as 'E' | 'W')} className="bg-gray-700 border-gray-600 rounded-md p-1.5 text-xs w-full text-white outline-none focus:ring-1 focus:ring-orange-500">
                  <option value="W">Oeste (W)</option>
                  <option value="E">Este (E)</option>
                </select>
              </div>
            </div>
          </fieldset>

          <fieldset className="border border-gray-700 p-3 rounded-md">
            <legend className="text-sm font-medium text-gray-300 px-1">Carga Inicial de Munición</legend>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-1">
              <div>
                <label className="block text-xs font-medium text-gray-400">Proyectiles HE</label>
                <input type="number" value={initialHe} onChange={e => setInitialHe(e.target.value)} min="0" required className="mt-1 w-full bg-gray-700 p-2 rounded-md text-xs text-white border border-gray-600 outline-none focus:ring-orange-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400">Proyectiles SMOKE</label>
                <input type="number" value={initialSmoke} onChange={e => setInitialSmoke(e.target.value)} min="0" required className="mt-1 w-full bg-gray-700 p-2 rounded-md text-xs text-white border border-gray-600 outline-none focus:ring-orange-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400">Proyectiles ILLUM</label>
                <input type="number" value={initialIllum} onChange={e => setInitialIllum(e.target.value)} min="0" required className="mt-1 w-full bg-gray-700 p-2 rounded-md text-xs text-white border border-gray-600 outline-none focus:ring-orange-500" />
              </div>
            </div>
          </fieldset>

          {error && <p className="text-sm text-red-400 text-center py-1 bg-red-900 bg-opacity-40 rounded">{error}</p>}

          <div className="flex justify-end space-x-3 pt-3">
            <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded-md text-sm text-white">Cancelar</button>
            <button type="submit" className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-md text-sm font-semibold shadow-lg shadow-orange-900/40">Crear Pieza</button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};