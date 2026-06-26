
import React, { useState } from 'react';
import type { MilitaryUnit } from '../types';
import { ArrowPathIcon } from './icons/ArrowPathIcon';
import { AcademicCapIcon } from './icons/AcademicCapIcon';

interface RetrainingUnitCardProps {
  unit: MilitaryUnit;
  returnUnitFromRetraining: (unitId: string) => void;
  startUnitLeave: (unitId: string, durationDays: number) => void;
  startUnitRetraining: (unitId: string, focus: string, durationDays: number) => void; // Updated signature
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export const RetrainingUnitCardComponent: React.FC<RetrainingUnitCardProps> = ({
  unit,
  returnUnitFromRetraining,
  startUnitLeave,
  startUnitRetraining,
}) => {
  const [leaveDaysInput, setLeaveDaysInput] = useState<string>('7');
  const [retrainingFocusInput, setRetrainingFocusInput] = useState<string>('');
  const [retrainingDaysInput, setRetrainingDaysInput] = useState<string>('14'); // New state for retraining duration
  const [inputError, setInputError] = useState<string | null>(null);

  const getDaysRemaining = (startDate?: number, durationDays?: number): number | null => {
    if (startDate && durationDays) {
      const endDate = startDate + durationDays * MS_PER_DAY;
      const remainingMs = endDate - Date.now();
      if (remainingMs <= 0) return 0;
      return Math.ceil(remainingMs / MS_PER_DAY);
    }
    return null;
  };

  const daysRemainingOnLeave = getDaysRemaining(unit.leaveStartDate, unit.leaveDurationDays);
  const isOnLeave = unit.leaveStartDate && daysRemainingOnLeave !== null && daysRemainingOnLeave > 0;
  const isLeaveCompleted = unit.leaveStartDate && daysRemainingOnLeave === 0;

  const daysRemainingOnRetraining = getDaysRemaining(unit.retrainingStartDate, unit.retrainingDurationDays);
  const isInRetraining = unit.retrainingStartDate && daysRemainingOnRetraining !== null && daysRemainingOnRetraining > 0;
  const isRetrainingCompleted = unit.retrainingStartDate && daysRemainingOnRetraining === 0;


  const handleStartLeave = () => {
    setInputError(null);
    const duration = parseInt(leaveDaysInput, 10);
    if (isNaN(duration) || duration <= 0) {
      setInputError('Por favor, ingrese un número válido de días para el permiso.');
      return;
    }
    startUnitLeave(unit.id, duration);
  };

  const handleStartRetraining = () => {
    setInputError(null);
    if (!retrainingFocusInput.trim()) {
      setInputError('Por favor, especifique un foco para el reentrenamiento.');
      return;
    }
    const duration = parseInt(retrainingDaysInput, 10);
    if (isNaN(duration) || duration <= 0) {
      setInputError('Por favor, ingrese un número válido de días para el reentrenamiento.');
      return;
    }
    startUnitRetraining(unit.id, retrainingFocusInput.trim(), duration);
    setRetrainingFocusInput('');
  };

  return (
    <div className="bg-gray-750 p-4 rounded-md shadow-md">
      <div className="flex flex-col sm:flex-row justify-between items-start mb-3">
        <div>
          <h3 className="text-lg font-semibold text-indigo-300">{unit.name}</h3>
          <p className="text-sm text-gray-400">{unit.type} - Cmdte. {unit.commander?.rank || 'N/A'} {unit.commander?.name || 'N/A'}</p>
          <p className="text-xs text-gray-500">ID: {unit.id.substring(0, 8)}...</p>
        </div>
        <span className="mt-2 sm:mt-0 px-2 py-0.5 text-xs font-semibold rounded-full bg-indigo-500 text-indigo-100 self-start sm:self-center">
          {unit.status}
        </span>
      </div>

      {inputError && <p className="text-xs text-red-400 mb-2 text-center">{inputError}</p>}

      {/* Leave Management Section */}
      {!isInRetraining && !isRetrainingCompleted && (
        <div className="mb-3 p-3 border border-gray-600 rounded-md">
          <h4 className="text-md font-semibold text-gray-300 mb-2">Permiso</h4>
          {isOnLeave && daysRemainingOnLeave !== null && (
            <p className="text-sm text-green-400">En Permiso. Días Restantes: {daysRemainingOnLeave}</p>
          )}
          {isLeaveCompleted && (
            <p className="text-sm text-gray-400">Permiso Completado.</p>
          )}
          {!unit.leaveStartDate && !isLeaveCompleted && (
            <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-2">
              <div className="flex-grow">
                <label htmlFor={`leaveDays-${unit.id}`} className="block text-xs font-medium text-gray-400">Días de Permiso:</label>
                <input
                  type="number"
                  id={`leaveDays-${unit.id}`}
                  value={leaveDaysInput}
                  onChange={(e) => setLeaveDaysInput(e.target.value)}
                  min="1"
                  className="mt-1 w-full bg-gray-700 border-gray-600 rounded-md shadow-sm p-2 text-sm"
                />
              </div>
              <button
                onClick={handleStartLeave}
                className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-md shadow-sm transition-colors"
              >
                Iniciar Permiso
              </button>
            </div>
          )}
        </div>
      )}

      {/* Retraining Management Section */}
      {(!isOnLeave || isLeaveCompleted) && (
        <div className="mb-3 p-3 border border-gray-600 rounded-md">
          <h4 className="text-md font-semibold text-gray-300 mb-2">Reentrenamiento</h4>
          {isInRetraining && unit.retrainingFocus && daysRemainingOnRetraining !== null && (
            <p className="text-sm text-green-400">En Reentrenamiento. Foco: {unit.retrainingFocus}. Días Restantes: {daysRemainingOnRetraining}</p>
          )}
          {isRetrainingCompleted && unit.retrainingFocus && (
            <p className="text-sm text-gray-400">Reentrenamiento Completado. Foco: {unit.retrainingFocus}</p>
          )}
          {!unit.retrainingStartDate && !isRetrainingCompleted && (
            <div className="space-y-2">
              <div className="flex-grow">
                <label htmlFor={`retrainingFocus-${unit.id}`} className="block text-xs font-medium text-gray-400">Foco de Reentrenamiento:</label>
                <input
                  type="text"
                  id={`retrainingFocus-${unit.id}`}
                  value={retrainingFocusInput}
                  onChange={(e) => setRetrainingFocusInput(e.target.value)}
                  placeholder="Ej: Puntería, Combate Urbano"
                  className="mt-1 w-full bg-gray-700 border-gray-600 rounded-md shadow-sm p-2 text-sm"
                />
              </div>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-2">
                <div className="flex-grow">
                  <label htmlFor={`retrainingDays-${unit.id}`} className="block text-xs font-medium text-gray-400">Días de Reentrenamiento:</label>
                  <input
                    type="number"
                    id={`retrainingDays-${unit.id}`}
                    value={retrainingDaysInput}
                    onChange={(e) => setRetrainingDaysInput(e.target.value)}
                    min="1"
                    className="mt-1 w-full bg-gray-700 border-gray-600 rounded-md shadow-sm p-2 text-sm"
                  />
                </div>
                <button
                  onClick={handleStartRetraining}
                  className="px-3 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-medium rounded-md shadow-sm transition-colors"
                >
                  Iniciar Reentrenamiento
                </button>
              </div>
            </div>
          )}
        </div>
      )}


      {/* Reintegration Button */}
      <div className="mt-4 pt-3 border-t border-gray-600">
        <button
          onClick={() => returnUnitFromRetraining(unit.id)}
          className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-md shadow-sm transition-colors flex items-center justify-center"
          aria-label={`Reintegrar unidad ${unit.name} a operaciones`}
        >
          <ArrowPathIcon className="w-4 h-4 mr-2 transform scale-x-[-1]" />
          Reintegrar a Operaciones
        </button>
      </div>
    </div>
  );
};
