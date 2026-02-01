import React, { useState, useEffect } from 'react';
import type { MilitaryUnit, AfterActionReport } from '../types';
import { MoraleLevel } from '../types';
import { decimalToDMS } from '../utils/coordinateUtils';

interface AARModalProps {
  unit: MilitaryUnit; // The unit for which the AAR is being filed
  onSubmit: (aarData: Omit<AfterActionReport, 'id' | 'reportTimestamp' | 'unitId' | 'unitName' | 'combatEndTimestamp' | 'location'>) => void;
  onClose: () => void;
}

export const AARModalComponent: React.FC<AARModalProps> = ({ unit, onSubmit, onClose }) => {
  // Own Unit Status
  const [casualtiesKia, setCasualtiesKia] = useState<number>(0);
  const [casualtiesWia, setCasualtiesWia] = useState<number>(0);
  const [casualtiesMia, setCasualtiesMia] = useState<number>(0);
  const [equipmentLosses, setEquipmentLosses] = useState<string>('');
  const [ammoExpended, setAmmoExpended] = useState<number>(0);
  const [morale, setMorale] = useState<MoraleLevel>(MoraleLevel.MEDIUM); // Default morale to Spanish 'Media'
  const [summary, setSummary] = useState<string>('');
  
  // Positive Outcomes / Enemy Impact
  const [enemyCasualtiesKia, setEnemyCasualtiesKia] = useState<number>(0);
  const [enemyCasualtiesWia, setEnemyCasualtiesWia] = useState<number>(0);
  const [enemyEquipmentDestroyedOrCaptured, setEnemyEquipmentDestroyedOrCaptured] = useState<string>('');
  const [objectivesAchieved, setObjectivesAchieved] = useState<string>('');
  const [positiveObservations, setPositiveObservations] = useState<string>('');

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Reset form if unit changes
    setCasualtiesKia(0);
    setCasualtiesWia(0);
    setCasualtiesMia(0);
    setEquipmentLosses('');
    setAmmoExpended(0);
    setMorale(MoraleLevel.MEDIUM); // Default morale
    setSummary('');
    
    setEnemyCasualtiesKia(0);
    setEnemyCasualtiesWia(0);
    setEnemyEquipmentDestroyedOrCaptured('');
    setObjectivesAchieved('');
    setPositiveObservations('');
    setError(null);
  }, [unit]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (casualtiesKia < 0 || casualtiesWia < 0 || casualtiesMia < 0) {
      setError("Bajas propias no pueden ser negativas.");
      return;
    }
    if (enemyCasualtiesKia < 0 || enemyCasualtiesWia < 0 ) {
      setError("Bajas enemigas no pueden ser negativas.");
      return;
    }
    if (ammoExpended < 0 || ammoExpended > 100) {
      setError("Gasto de munición debe estar entre 0 y 100%.");
      return;
    }
    if (!summary.trim()) {
      setError("El resumen de la acción es obligatorio.");
      return;
    }

    onSubmit({
      casualtiesKia,
      casualtiesWia,
      casualtiesMia,
      equipmentLosses,
      ammunitionExpendedPercent: ammoExpended,
      morale,
      summary,
      enemyCasualtiesKia,
      enemyCasualtiesWia,
      enemyEquipmentDestroyedOrCaptured,
      objectivesAchieved,
      positiveObservations,
    });
  };

  return (
    <div 
        className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center z-[2000] p-4"
        aria-modal="true"
        role="dialog"
        aria-labelledby="aarModalTitle"
    >
      <div className="bg-gray-800 p-6 rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <h2 id="aarModalTitle" className="text-xl font-semibold text-yellow-300 mb-1">
          Reporte Post-Combate (AAR)
        </h2>
        <p className="text-sm text-gray-400 mb-4">
          Unidad: <span className="font-semibold">{unit.name}</span> ({unit.type}) <br/>
          Fin de Combate: {unit.combatEndTimestamp ? new Date(unit.combatEndTimestamp).toLocaleString('es-ES') : 'N/A'} <br/>
          Ubicación Reporte: {unit.combatEndLocation ? decimalToDMS(unit.combatEndLocation) : 'N/A'}
        </p>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Sección Bajas Propias y Logística */}
          <fieldset className="border border-gray-700 p-4 rounded-md">
            <legend className="text-md font-medium text-gray-300 px-2">Estado Propio y Logística</legend>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
              <div>
                <label htmlFor="kia" className="block text-sm font-medium text-gray-400">KIA (Muertos)</label>
                <input type="number" id="kia" value={casualtiesKia} onChange={e => setCasualtiesKia(Math.max(0,parseInt(e.target.value)))} min="0" className="mt-1 w-full bg-gray-700 p-2 rounded-md text-sm"/>
              </div>
              <div>
                <label htmlFor="wia" className="block text-sm font-medium text-gray-400">WIA (Heridos)</label>
                <input type="number" id="wia" value={casualtiesWia} onChange={e => setCasualtiesWia(Math.max(0,parseInt(e.target.value)))} min="0" className="mt-1 w-full bg-gray-700 p-2 rounded-md text-sm"/>
              </div>
              <div>
                <label htmlFor="mia" className="block text-sm font-medium text-gray-400">MIA (Desaparecidos)</label>
                <input type="number" id="mia" value={casualtiesMia} onChange={e => setCasualtiesMia(Math.max(0,parseInt(e.target.value)))} min="0" className="mt-1 w-full bg-gray-700 p-2 rounded-md text-sm"/>
              </div>
            </div>
            <div className="mt-4">
              <label htmlFor="equipmentLosses" className="block text-sm font-medium text-gray-300">Pérdidas/Daños de Equipo Propio</label>
              <textarea id="equipmentLosses" value={equipmentLosses} onChange={e => setEquipmentLosses(e.target.value)} rows={2} className="mt-1 w-full bg-gray-700 p-2 rounded-md text-sm" placeholder="Ej: 1x Radio PRC-152 destruida, Vehículo MRAP con daños leves..."></textarea>
            </div>
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div>
                <label htmlFor="ammoExpended" className="block text-sm font-medium text-gray-300">Munición Gastada (%)</label>
                <input type="number" id="ammoExpended" value={ammoExpended} onChange={e => setAmmoExpended(Math.max(0, Math.min(100, parseInt(e.target.value))))} min="0" max="100" className="mt-1 w-full bg-gray-700 p-2 rounded-md text-sm"/>
              </div>
              <div>
                <label htmlFor="morale" className="block text-sm font-medium text-gray-300">Moral de la Unidad</label>
                <select id="morale" value={morale} onChange={e => setMorale(e.target.value as MoraleLevel)} className="mt-1 w-full bg-gray-700 p-2 rounded-md text-sm">
                  {Object.values(MoraleLevel).map(level => (
                    <option key={level} value={level}>{level}</option>
                  ))}
                </select>
              </div>
            </div>
          </fieldset>

          {/* Sección Resultados Positivos / Impacto Enemigo */}
          <fieldset className="border border-gray-700 p-4 rounded-md">
            <legend className="text-md font-medium text-gray-300 px-2">Resultados del Enfrentamiento (Enemigo y Objetivos)</legend>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
              <div>
                <label htmlFor="enemyKia" className="block text-sm font-medium text-gray-400">Bajas Enemigas (KIA)</label>
                <input type="number" id="enemyKia" value={enemyCasualtiesKia} onChange={e => setEnemyCasualtiesKia(Math.max(0,parseInt(e.target.value)))} min="0" className="mt-1 w-full bg-gray-700 p-2 rounded-md text-sm"/>
              </div>
              <div>
                <label htmlFor="enemyWia" className="block text-sm font-medium text-gray-400">Bajas Enemigas (WIA)</label>
                <input type="number" id="enemyWia" value={enemyCasualtiesWia} onChange={e => setEnemyCasualtiesWia(Math.max(0,parseInt(e.target.value)))} min="0" className="mt-1 w-full bg-gray-700 p-2 rounded-md text-sm"/>
              </div>
            </div>
            <div className="mt-4">
              <label htmlFor="enemyEquipment" className="block text-sm font-medium text-gray-300">Equipo Enemigo Destruido/Capturado</label>
              <textarea id="enemyEquipment" value={enemyEquipmentDestroyedOrCaptured} onChange={e => setEnemyEquipmentDestroyedOrCaptured(e.target.value)} rows={2} className="mt-1 w-full bg-gray-700 p-2 rounded-md text-sm" placeholder="Ej: 2x AKM capturados, 1x Vehículo técnico destruido..."></textarea>
            </div>
            <div className="mt-4">
              <label htmlFor="objectivesAchieved" className="block text-sm font-medium text-gray-300">Objetivos Cumplidos</label>
              <textarea id="objectivesAchieved" value={objectivesAchieved} onChange={e => setObjectivesAchieved(e.target.value)} rows={2} className="mt-1 w-full bg-gray-700 p-2 rounded-md text-sm" placeholder="Ej: Posición enemiga neutralizada, Área asegurada, Información crítica obtenida..."></textarea>
            </div>
             <div className="mt-4">
              <label htmlFor="positiveObservations" className="block text-sm font-medium text-gray-300">Otras Observaciones Positivas / Lecciones Aprendidas</label>
              <textarea id="positiveObservations" value={positiveObservations} onChange={e => setPositiveObservations(e.target.value)} rows={2} className="mt-1 w-full bg-gray-700 p-2 rounded-md text-sm" placeholder="Ej: Excelente coordinación con unidad Bravo, Tácticas enemigas identificadas..."></textarea>
            </div>
          </fieldset>

          {/* Sección Resumen General */}
          <div>
            <label htmlFor="summary" className="block text-sm font-medium text-gray-300">Resumen General de la Acción*</label>
            <textarea id="summary" value={summary} onChange={e => setSummary(e.target.value)} rows={4} required className="mt-1 w-full bg-gray-700 p-2 rounded-md text-sm" placeholder="Describa brevemente el enfrentamiento, acciones tomadas, resultados observados en el enemigo, etc. Este resumen es mandatorio."></textarea>
          </div>

          {error && <p className="text-sm text-red-400 py-2 text-center">{error}</p>}

          <div className="flex justify-end space-x-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded-md text-sm">
              Cancelar
            </button>
            <button type="submit" className="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-black rounded-md text-sm font-semibold">
              Enviar Reporte AAR
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};