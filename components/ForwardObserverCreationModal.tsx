import React, { useState, useEffect, useMemo } from 'react';
import type { NewForwardObserverData, MilitaryUnit, User } from '../types';
import { UserRole } from '../types';
import { dmsToDecimal } from '../utils/coordinateUtils';

interface ForwardObserverCreationModalProps {
  isOpen: boolean;
  onClose: () => void;
  addForwardObserver: (observerData: NewForwardObserverData) => void;
  eligibleUnitsForObserver: MilitaryUnit[];
  allUsers: User[];
}

export const ForwardObserverCreationModal: React.FC<ForwardObserverCreationModalProps> = ({ isOpen, onClose, addForwardObserver, eligibleUnitsForObserver, allUsers }) => {
  const [callsign, setCallsign] = useState('');
  const [assignedUnitId, setAssignedUnitId] = useState<string>('');
  const [commanderId, setCommanderId] = useState<string>('');
  
  const [latDeg, setLatDeg] = useState('');
  const [latMin, setLatMin] = useState('');
  const [latSec, setLatSec] = useState('');
  const [latDir, setLatDir] = useState<'N' | 'S'>('N');
  
  const [lonDeg, setLonDeg] = useState('');
  const [lonMin, setLonMin] = useState('');
  const [lonSec, setLonSec] = useState('');
  const [lonDir, setLonDir] = useState<'W' | 'E'>('W');

  const [error, setError] = useState<string | null>(null);

  const observerCommanders = useMemo(() => {
    return allUsers.filter(u => u.role === UserRole.COMANDANTE_OBSERVADOR_ADELANTADO);
  }, [allUsers]);

  useEffect(() => {
    if (isOpen) {
      // Reset form fields
      setCallsign('');
      setAssignedUnitId(eligibleUnitsForObserver.length > 0 ? eligibleUnitsForObserver[0].id : '');
      setCommanderId(observerCommanders.length > 0 ? observerCommanders[0].id : '');
      setLatDeg(''); setLatMin(''); setLatSec(''); setLatDir('N');
      setLonDeg(''); setLonMin(''); setLonSec(''); setLonDir('W');
      setError(null);
    }
  }, [isOpen, eligibleUnitsForObserver, observerCommanders]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Basic Validations
    if (!callsign.trim()) { setError("El indicativo (callsign) es obligatorio."); return; }
    if (!assignedUnitId) { setError("Debe seleccionar una Unidad Asignada."); return; }
    if (!commanderId) { setError("Debe seleccionar un Comandante de Equipo."); return; }

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

    const newObserverData: NewForwardObserverData = {
      callsign: callsign.trim(),
      location: { lat: parsedLat, lon: parsedLon },
      assignedUnitId,
      commanderId,
    };

    addForwardObserver(newObserverData);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center z-[2000] p-4">
      <div className="bg-gray-800 p-6 rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-semibold text-purple-300 mb-4">Crear Nuevo Observador Adelantado</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="observerCallsign" className="block text-sm font-medium text-gray-300">Indicativo (Callsign)*</label>
              <input type="text" id="observerCallsign" value={callsign} onChange={e => setCallsign(e.target.value)} required className="mt-1 w-full bg-gray-700 p-2 rounded-md text-sm"/>
            </div>
            <div>
              <label htmlFor="observerCommander" className="block text-sm font-medium text-gray-300">Comandante de Equipo*</label>
              <select id="observerCommander" value={commanderId} onChange={e => setCommanderId(e.target.value)} required disabled={observerCommanders.length === 0} className="mt-1 w-full bg-gray-700 p-2 rounded-md text-sm">
                {observerCommanders.length > 0 ? (
                  observerCommanders.map(user => <option key={user.id} value={user.id}>{user.displayName}</option>)
                ) : (
                  <option value="">No hay Comandantes de OA</option>
                )}
              </select>
            </div>
          </div>
          <div>
            <label htmlFor="assignedUnitObserver" className="block text-sm font-medium text-gray-300">Unidad Táctica Asignada*</label>
            <select id="assignedUnitObserver" value={assignedUnitId} onChange={e => setAssignedUnitId(e.target.value)} required disabled={eligibleUnitsForObserver.length === 0} className="mt-1 w-full bg-gray-700 p-2 rounded-md text-sm">
              {eligibleUnitsForObserver.length > 0 ? (
                eligibleUnitsForObserver.map(unit => <option key={unit.id} value={unit.id}>{unit.name}</option>)
              ) : (
                <option value="">No hay unidades tácticas elegibles</option>
              )}
            </select>
          </div>
          <fieldset className="border border-gray-700 p-3 rounded-md">
            <legend className="text-sm font-medium text-gray-300 px-1">Ubicación Inicial (GMS)*</legend>
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 mb-2 items-end mt-1">
                <div className="sm:col-span-3 grid grid-cols-3 gap-1">
                    <div>
                        <label className="block text-xs font-medium text-gray-400">Lat. G°</label>
                        <input type="number" value={latDeg} onChange={e => setLatDeg(e.target.value)} placeholder="G°" required className="bg-gray-700 border-gray-600 rounded-md p-1.5 text-xs w-full"/>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-400">M′</label>
                        <input type="number" value={latMin} onChange={e => setLatMin(e.target.value)} placeholder="M′" required className="bg-gray-700 border-gray-600 rounded-md p-1.5 text-xs w-full"/>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-400">S″</label>
                        <input type="number" value={latSec} onChange={e => setLatSec(e.target.value)} placeholder="S″" step="any" required className="bg-gray-700 border-gray-600 rounded-md p-1.5 text-xs w-full"/>
                    </div>
                </div>
                <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-gray-400">Dir.</label>
                    <select value={latDir} onChange={e => setLatDir(e.target.value as 'N' | 'S')} className="bg-gray-700 border-gray-600 rounded-md p-1.5 text-xs w-full">
                        <option value="N">Norte (N)</option>
                        <option value="S">Sur (S)</option>
                    </select>
                </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 items-end">
                  <div className="sm:col-span-3 grid grid-cols-3 gap-1">
                    <div>
                        <label className="block text-xs font-medium text-gray-400">Lon. G°</label>
                        <input type="number" value={lonDeg} onChange={e => setLonDeg(e.target.value)} placeholder="G°" required className="bg-gray-700 border-gray-600 rounded-md p-1.5 text-xs w-full"/>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-400">M′</label>
                        <input type="number" value={lonMin} onChange={e => setLonMin(e.target.value)} placeholder="M′" required className="bg-gray-700 border-gray-600 rounded-md p-1.5 text-xs w-full"/>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-400">S″</label>
                        <input type="number" value={lonSec} onChange={e => setLonSec(e.target.value)} placeholder="S″" step="any" required className="bg-gray-700 border-gray-600 rounded-md p-1.5 text-xs w-full"/>
                    </div>
                </div>
                <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-gray-400">Dir.</label>
                    <select value={lonDir} onChange={e => setLonDir(e.target.value as 'E' | 'W')} className="bg-gray-700 border-gray-600 rounded-md p-1.5 text-xs w-full">
                        <option value="W">Oeste (W)</option>
                        <option value="E">Este (E)</option>
                    </select>
                </div>
            </div>
          </fieldset>
          
          {error && <p className="text-sm text-red-400 text-center py-1 bg-red-900 bg-opacity-40 rounded">{error}</p>}

          <div className="flex justify-end space-x-3 pt-3">
            <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded-md text-sm">Cancelar</button>
            <button type="submit" className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-md text-sm font-semibold">Crear Observador</button>
          </div>
        </form>
      </div>
    </div>
  );
};
