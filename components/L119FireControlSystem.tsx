import React, { useState, useMemo, useEffect } from 'react';
import type { ArtilleryPiece, MilitaryUnit, FiringSolution, TrajectoryPoint, ProjectileType, ForwardObserver, PendingFireMission } from '../types';
import { AVAILABLE_PROJECTILES_L119, calculateL119Solution } from '../utils/ballistics';
import { TrajectoryPlot } from './TrajectoryPlot';
import { decimalToDMS } from '../utils/coordinateUtils';
import { XMarkIcon } from './icons/XMarkIcon';
import { PaperAirplaneIcon } from './icons/PaperAirplaneIcon';
import { ChartBarIcon } from './icons/ChartBarIcon';

interface L119FireControlSystemProps {
  isOpen: boolean;
  onClose: () => void;
  pendingMission: PendingFireMission | null;
  artilleryPieces: ArtilleryPiece[]; 
  allUnits: MilitaryUnit[];
  forwardObservers: ForwardObserver[];
  acceptFireMission: (pendingMissionId: string, artilleryId: string, projectileType: ProjectileType, charge: number, isMrsi: boolean, firingSolution: FiringSolution) => void;
}

export const L119FireControlSystem: React.FC<L119FireControlSystemProps> = ({
  isOpen,
  onClose,
  pendingMission,
  artilleryPieces,
  allUnits,
  forwardObservers,
  acceptFireMission,
}) => {
  const [selectedArtilleryId, setSelectedArtilleryId] = useState<string | null>(null);
  const [selectedProjectile, setSelectedProjectile] = useState<ProjectileType>("L31 HE");
  const [selectedCharge, setSelectedCharge] = useState<number>(6);
  const [wind, setWind] = useState<number>(0);
  const [temperature, setTemperature] = useState<number>(15);
  const [pressure, setPressure] = useState<number>(1013);
  
  const [firingSolution, setFiringSolution] = useState<FiringSolution | null>(null);
  const [trajectoryData, setTrajectoryData] = useState<TrajectoryPoint[]>([]);
  const [feedback, setFeedback] = useState<{ type: 'error' | 'info', message: string } | null>(null);

  const selectedArtillery = useMemo(() => artilleryPieces.find(p => p.id === selectedArtilleryId), [selectedArtilleryId, artilleryPieces]);

  useEffect(() => {
    if (isOpen && pendingMission) {
        const defaultPiece = artilleryPieces.find(p => p.id === pendingMission.assignedArtilleryId);
        setSelectedArtilleryId(defaultPiece?.id || null);
    } else {
        setSelectedArtilleryId(null);
    }
    setFiringSolution(null);
    setTrajectoryData([]);
    setFeedback(null);
  }, [pendingMission?.id, isOpen]);
  
  useEffect(() => {
    const availableCharges = AVAILABLE_PROJECTILES_L119[selectedProjectile as keyof typeof AVAILABLE_PROJECTILES_L119]?.charges || [];
    if (availableCharges.length > 0 && !availableCharges.includes(selectedCharge)) {
        setSelectedCharge(availableCharges[0]);
    }
  }, [selectedProjectile, selectedCharge]);

  const getRequesterName = (requesterId: string): string => {
    const observer = forwardObservers.find(o => o.id === requesterId);
    if (observer) return observer.callsign;
    const unit = allUnits.find(u => u.id === requesterId);
    if (unit) return unit.name;
    return requesterId.substring(0, 8);
  };
  
  const handleCalculate = () => {
    if (!pendingMission || !selectedArtillery) {
        setFeedback({ type: 'error', message: "Misión o pieza de artillería no está seleccionada." });
        return;
    }

    const { solution, trajectory } = calculateL119Solution(
        selectedArtillery.location,
        pendingMission.target,
        600, 700, // Placeholder altitudes
        selectedProjectile,
        selectedCharge,
        wind,
        temperature,
        pressure
    );
    
    if (solution) {
        setFiringSolution(solution);
        setTrajectoryData(trajectory);
        setFeedback(null);
    } else {
        setFeedback({ type: 'error', message: `Combinación de proyectil (${selectedProjectile}) y carga (${selectedCharge}) no es válida.` });
        setFiringSolution(null);
        setTrajectoryData([]);
    }
  };

  const handleDispatch = () => {
    if (!pendingMission || !selectedArtilleryId || !firingSolution) {
      setFeedback({ type: 'error', message: 'Debe seleccionar una pieza y calcular una solución de tiro válida antes de enviarla.' });
      return;
    }
    acceptFireMission(pendingMission.id, selectedArtilleryId, selectedProjectile, selectedCharge, false, firingSolution);
    onClose();
  };

  if (!isOpen || !pendingMission) return null;

  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-80 flex items-center justify-center z-[2000] p-4 backdrop-blur-sm">
      <div className="bg-gray-800 rounded-lg shadow-2xl w-full max-w-7xl h-[90vh] flex flex-col border border-gray-700">
        <header className="flex justify-between items-center p-4 border-b border-gray-700">
          <h2 className="text-xl font-semibold text-red-300">Procesar Misión - Obús 105mm L119</h2>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-white rounded-full hover:bg-gray-700">
            <XMarkIcon className="w-6 h-6" />
          </button>
        </header>

        <main className="flex-1 flex overflow-hidden p-4 gap-4">
          <section className="w-1/4 flex flex-col gap-4">
            <div className="bg-gray-900/50 p-3 rounded-md">
                <h3 className="font-semibold text-gray-300 border-b border-gray-700 pb-2 mb-2">Detalles de la Misión</h3>
                <div className="text-sm space-y-1">
                    <p><span className="text-gray-400">Blanco:</span> {decimalToDMS(pendingMission.target)}</p>
                    <p><span className="text-gray-400">Solicitante:</span> {getRequesterName(pendingMission.requesterId)}</p>
                    <p><span className="text-gray-400">Hora Solicitud:</span> {new Date(pendingMission.requestTimestamp).toLocaleTimeString()}</p>
                </div>
            </div>
            <div className="flex-1 flex flex-col bg-gray-900/50 p-3 rounded-md">
                <h3 className="font-semibold text-gray-300 border-b border-gray-700 pb-2 mb-2">Piezas L119 Asignadas</h3>
                <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                     {artilleryPieces.map(p => (
                        <button key={p.id} onClick={() => setSelectedArtilleryId(p.id)}
                            className={`w-full text-left p-2 rounded-md transition-colors border ${selectedArtilleryId === p.id ? 'bg-purple-600 border-purple-400' : 'bg-gray-700 hover:bg-gray-600 border-gray-600'}`}>
                            <p className="font-semibold text-sm">{p.name}</p>
                        </button>
                    ))}
                </div>
            </div>
          </section>

          <section className="w-2/4 flex flex-col gap-4">
              <div className="bg-gray-900/50 p-3 rounded-md">
                  <h3 className="font-semibold text-gray-300 border-b border-gray-700 pb-2 mb-2">Configuración de Tiro (L119)</h3>
                  <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                      <div>
                          <label className="text-sm text-gray-400 block">Proyectil</label>
                          <select value={selectedProjectile} onChange={e => setSelectedProjectile(e.target.value as ProjectileType)} disabled={!selectedArtillery} className="w-full p-2 bg-gray-700 border-gray-600 rounded mt-1 disabled:opacity-50">
                                {Object.keys(AVAILABLE_PROJECTILES_L119).map(p => <option key={p} value={p}>{p}</option>)}
                          </select>
                      </div>
                      <div>
                          <label className="text-sm text-gray-400 block">Carga</label>
                           <select value={selectedCharge} onChange={e => setSelectedCharge(Number(e.target.value))} disabled={!selectedArtillery || AVAILABLE_PROJECTILES_L119[selectedProjectile as keyof typeof AVAILABLE_PROJECTILES_L119]?.charges.length === 0} className="w-full p-2 bg-gray-700 border-gray-600 rounded mt-1 disabled:opacity-50">
                                {AVAILABLE_PROJECTILES_L119[selectedProjectile as keyof typeof AVAILABLE_PROJECTILES_L119]?.charges.map(c => <option key={c} value={c}>{c}</option>)}
                           </select>
                      </div>
                      <div>
                          <label className="text-sm text-gray-400 block">Presión (hPa)</label>
                           <input type="number" value={pressure} onChange={e => setPressure(Number(e.target.value))} disabled={!selectedArtillery} className="w-full p-2 bg-gray-700 border-gray-600 rounded mt-1 disabled:opacity-50" />
                      </div>
                      <div className="lg:col-start-1">
                          <label className="text-sm text-gray-400 block">Viento (m/s, frente +)</label>
                           <input type="number" value={wind} onChange={e => setWind(Number(e.target.value))} disabled={!selectedArtillery} className="w-full p-2 bg-gray-700 border-gray-600 rounded mt-1 disabled:opacity-50" />
                      </div>
                       <div>
                          <label className="text-sm text-gray-400 block">Temperatura (°C)</label>
                           <input type="number" value={temperature} onChange={e => setTemperature(Number(e.target.value))} disabled={!selectedArtillery} className="w-full p-2 bg-gray-700 border-gray-600 rounded mt-1 disabled:opacity-50" />
                      </div>
                  </div>
                   <button onClick={handleCalculate} disabled={!selectedArtilleryId} className="w-full mt-4 p-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded flex items-center justify-center disabled:opacity-50">
                      <ChartBarIcon className="w-5 h-5 mr-2" />
                      Calcular Solución de Tiro (L119)
                   </button>
              </div>

              <div className="flex-1 bg-gray-900/50 p-3 rounded-md flex flex-col">
                  <h3 className="font-semibold text-gray-300 border-b border-gray-700 pb-2 mb-2">Resultados del Cálculo</h3>
                  <div className="flex-1 overflow-y-auto pr-2">
                  {feedback && <p className={`text-center p-2 rounded text-sm ${feedback.type === 'error' ? 'bg-red-900 text-red-300' : 'bg-blue-900 text-blue-300'}`}>{feedback.message}</p>}
                  {firingSolution ? (
                      <div className="space-y-2 text-sm font-mono">
                          <div className="grid grid-cols-2 gap-2">
                            <div className="p-2 bg-gray-900 rounded"><span className="text-gray-400">Distancia:</span> {(firingSolution.distance/1000).toFixed(2)} km</div>
                            <div className="p-2 bg-gray-900 rounded"><span className="text-gray-400">Azimut:</span> {firingSolution.azimuth.toFixed(2)}°</div>
                            <div className="p-2 bg-gray-900 rounded"><span className="text-gray-400">Elevación:</span> {firingSolution.elevation.toFixed(2)}°</div>
                            <div className="p-2 bg-gray-900 rounded"><span className="text-gray-400">T. de Vuelo:</span> {firingSolution.flightTime.toFixed(1)} s</div>
                          </div>
                          <div className={`p-2 rounded text-center ${firingSolution.elevationStatus?.includes('✅') ? 'bg-green-900 text-green-300' : 'bg-yellow-900 text-yellow-300'}`}>
                            <span className="font-sans text-gray-400">Estado Elevación:</span> {firingSolution.elevationStatus}
                          </div>
                          <div className="p-2 bg-gray-900 rounded mt-2">
                             <p className="font-sans text-gray-400 text-center mb-1">Correcciones Aplicadas</p>
                             <div className="flex justify-around text-xs">
                                <span>Alt: {firingSolution.correction_alt?.toFixed(2)}°</span>
                                <span>Viento: {firingSolution.correction_viento?.toFixed(2)}°</span>
                                <span>Temp: {firingSolution.correction_temp?.toFixed(2)}°</span>
                                <span>Presión: {firingSolution.correction_pres?.toFixed(2)}°</span>
                             </div>
                          </div>
                      </div>
                  ) : <p className="text-sm text-gray-500 text-center pt-8">Esperando cálculo...</p>}
                  </div>
                  {firingSolution && (
                     <button onClick={handleDispatch} className="w-full mt-auto p-2 bg-green-600 hover:bg-green-700 text-white font-bold rounded flex items-center justify-center col-span-2">
                        <PaperAirplaneIcon className="w-5 h-5 mr-2" />
                        Enviar Datos de Tiro a la Pieza
                     </button>
                  )}
              </div>
          </section>

          <section className="w-1/4">
             <TrajectoryPlot data={trajectoryData} targetDistance={firingSolution?.distance || 0} />
          </section>
        </main>
      </div>
    </div>
  );
};