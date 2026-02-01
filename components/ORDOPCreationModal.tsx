
import React, { useState, useEffect } from 'react';
import type { NewOperationsOrderData, OperationsOrder } from '../types';
import { OperationsOrderClassification } from '../types';

interface ORDOPCreationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (orderData: NewOperationsOrderData) => void; // Changed from onSubmit
  existingOrder?: OperationsOrder | null; // New prop for editing
}

export const ORDOPCreationModal: React.FC<ORDOPCreationModalProps> = ({ 
    isOpen, 
    onClose, 
    onSave, 
    existingOrder,
}) => {
  const [title, setTitle] = useState('');
  const [issuingAuthority, setIssuingAuthority] = useState('');
  const [classification, setClassification] = useState<OperationsOrderClassification>(OperationsOrderClassification.RESERVADO);
  const [effectiveTimestamp, setEffectiveTimestamp] = useState<string>('');
  
  // I. SITUACIÓN
  const [situationEnemyForces, setSituationEnemyForces] = useState('');
  const [situationFriendlyForces, setSituationFriendlyForces] = useState('');
  const [situationAggregationsAndSegregations, setSituationAggregationsAndSegregations] = useState('');
  const [situationOperationalEnvironment, setSituationOperationalEnvironment] = useState('');
  const [situationCivilPopulation, setSituationCivilPopulation] = useState('');

  // II. MISIÓN
  const [mission, setMission] = useState('');
  
  // III. EJECUCIÓN
  const [executionConceptOfOperations, setExecutionConceptOfOperations] = useState('');
  const [executionTasksManeuverUnits, setExecutionTasksManeuverUnits] = useState('');
  const [executionTasksCombatSupportUnits, setExecutionTasksCombatSupportUnits] = useState('');
  const [executionCoordinationInstructions, setExecutionCoordinationInstructions] = useState('');
  
  // IV. ADMINISTRACIÓN Y LOGÍSTICA
  const [sustainmentSupplies, setSustainmentSupplies] = useState('');
  const [sustainmentTransportation, setSustainmentTransportation] = useState('');
  const [sustainmentMedical, setSustainmentMedical] = useState('');
  const [sustainmentPersonnel, setSustainmentPersonnel] = useState('');
  const [sustainmentOthers, setSustainmentOthers] = useState('');
  
  // V. MANDO Y COMUNICACIONES
  const [commandCommanderLocation, setCommandCommanderLocation] = useState('');
  const [commandCommandPosts, setCommandCommandPosts] = useState('');
  const [commandChainOfCommand, setCommandChainOfCommand] = useState('');
  const [communicationsFrequencies, setCommunicationsFrequencies] = useState('');
  const [communicationsRadioProcedures, setCommunicationsRadioProcedures] = useState('');
  const [communicationsPyrotechnics, setCommunicationsPyrotechnics] = useState('');
  const [communicationsChallengeResponse, setCommunicationsChallengeResponse] = useState('');

  const [error, setError] = useState<string | null>(null);
  
  const formatDateForInput = (timestamp?: number): string => {
    if (!timestamp) return '';
    // Convert timestamp to YYYY-MM-DDTHH:MM format for datetime-local input
    const date = new Date(timestamp);
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };


  const resetForm = () => {
    setTitle(existingOrder?.title || '');
    setIssuingAuthority(existingOrder?.issuingAuthority || '');
    setClassification(existingOrder?.classification || OperationsOrderClassification.RESERVADO);
    setEffectiveTimestamp(formatDateForInput(existingOrder?.effectiveTimestamp));
    
    setSituationEnemyForces(existingOrder?.situation_enemyForces || '');
    setSituationFriendlyForces(existingOrder?.situation_friendlyForces || '');
    setSituationAggregationsAndSegregations(existingOrder?.situation_aggregationsAndSegregations || '');
    setSituationOperationalEnvironment(existingOrder?.situation_operationalEnvironment || '');
    setSituationCivilPopulation(existingOrder?.situation_civilPopulation || '');
    
    setMission(existingOrder?.mission || '');
    
    setExecutionConceptOfOperations(existingOrder?.execution_conceptOfOperations || '');
    setExecutionTasksManeuverUnits(existingOrder?.execution_tasksManeuverUnits || '');
    setExecutionTasksCombatSupportUnits(existingOrder?.execution_tasksCombatSupportUnits || '');
    setExecutionCoordinationInstructions(existingOrder?.execution_coordinationInstructions || '');
    
    setSustainmentSupplies(existingOrder?.sustainment_supplies || '');
    setSustainmentTransportation(existingOrder?.sustainment_transportation || '');
    setSustainmentMedical(existingOrder?.sustainment_medical || '');
    setSustainmentPersonnel(existingOrder?.sustainment_personnel || '');
    setSustainmentOthers(existingOrder?.sustainment_others || '');
    
    setCommandCommanderLocation(existingOrder?.commandAndSignal_command_commanderLocation || '');
    setCommandCommandPosts(existingOrder?.commandAndSignal_command_commandPosts || '');
    setCommandChainOfCommand(existingOrder?.commandAndSignal_command_chainOfCommand || '');
    setCommunicationsFrequencies(existingOrder?.commandAndSignal_communications_frequenciesAndCallsigns || '');
    setCommunicationsRadioProcedures(existingOrder?.commandAndSignal_communications_radioProcedures || '');
    setCommunicationsPyrotechnics(existingOrder?.commandAndSignal_communications_pyrotechnicsAndSignals || '');
    setCommunicationsChallengeResponse(existingOrder?.commandAndSignal_communications_challengeAndResponse || '');
    
    setError(null);
  };

   useEffect(() => {
    if (isOpen) {
      resetForm();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, existingOrder]);


  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!title.trim()) { setError("El título de la orden es obligatorio."); return; }
    if (!issuingAuthority.trim()) { setError("La autoridad emisora es obligatoria."); return; }
    if (!mission.trim()) { setError("La misión es obligatoria (Párrafo II)."); return; }

    const effectiveTs = effectiveTimestamp ? new Date(effectiveTimestamp).getTime() : undefined;
    if (effectiveTimestamp && isNaN(effectiveTs as number)) {
        setError("Fecha y Hora Efectiva inválida.");
        return;
    }

    const orderData: NewOperationsOrderData = {
      title,
      classification,
      issuingAuthority,
      effectiveTimestamp: effectiveTs,
      situation_enemyForces: situationEnemyForces,
      situation_friendlyForces: situationFriendlyForces,
      situation_aggregationsAndSegregations: situationAggregationsAndSegregations,
      situation_operationalEnvironment: situationOperationalEnvironment,
      situation_civilPopulation: situationCivilPopulation,
      mission,
      execution_conceptOfOperations: executionConceptOfOperations,
      execution_tasksManeuverUnits: executionTasksManeuverUnits,
      execution_tasksCombatSupportUnits: executionTasksCombatSupportUnits,
      execution_coordinationInstructions: executionCoordinationInstructions,
      sustainment_supplies: sustainmentSupplies,
      sustainment_transportation: sustainmentTransportation,
      sustainment_medical: sustainmentMedical,
      sustainment_personnel: sustainmentPersonnel,
      sustainment_others: sustainmentOthers,
      commandAndSignal_command_commanderLocation: commandCommanderLocation,
      commandAndSignal_command_commandPosts: commandCommandPosts,
      commandAndSignal_command_chainOfCommand: commandChainOfCommand,
      commandAndSignal_communications_frequenciesAndCallsigns: communicationsFrequencies,
      commandAndSignal_communications_radioProcedures: communicationsRadioProcedures,
      commandAndSignal_communications_pyrotechnicsAndSignals: communicationsPyrotechnics,
      commandAndSignal_communications_challengeAndResponse: communicationsChallengeResponse,
    };
    onSave(orderData);
  };

  if (!isOpen) return null;

  const renderTextarea = (
    id: string, 
    label: string, 
    value: string, 
    setter: (val: string) => void, 
    placeholder: string, 
    rows: number = 2,
    required: boolean = false
  ) => (
    <div>
      <label htmlFor={id} className="block text-xs font-medium text-gray-400">{label}{required && '*'}</label>
      <textarea 
        id={id} 
        value={value} 
        onChange={e => setter(e.target.value)} 
        rows={rows} 
        required={required}
        className="mt-0.5 w-full bg-gray-700 p-2 rounded-md text-sm text-gray-100 border border-gray-600 focus:ring-emerald-500 focus:border-emerald-500" 
        placeholder={placeholder}
      />
    </div>
  );

  return (
    <div 
        className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center z-[2000] p-2 md:p-4"
        aria-modal="true" role="dialog" aria-labelledby="ordopModalTitle"
    >
      <div className="bg-gray-800 p-4 md:p-6 rounded-lg shadow-xl w-full max-w-4xl max-h-[95vh] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800">
        <h2 id="ordopModalTitle" className="text-xl font-semibold text-emerald-300 mb-4">
          {existingOrder ? 'Editar Orden de Operaciones' : 'Crear Nueva Orden de Operaciones'}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="ordopTitle" className="block text-sm font-medium text-gray-300">Título de la Orden*</label>
              <input type="text" id="ordopTitle" value={title} onChange={e => setTitle(e.target.value)} required className="mt-1 w-full bg-gray-700 p-2 rounded-md text-sm text-gray-100 border border-gray-600 focus:ring-emerald-500 focus:border-emerald-500"/>
            </div>
            <div>
              <label htmlFor="ordopAuthority" className="block text-sm font-medium text-gray-300">Autoridad Emisora*</label>
              <input type="text" id="ordopAuthority" value={issuingAuthority} onChange={e => setIssuingAuthority(e.target.value)} required className="mt-1 w-full bg-gray-700 p-2 rounded-md text-sm text-gray-100 border border-gray-600 focus:ring-emerald-500 focus:border-emerald-500" placeholder="Ej: CMTE BRIM XX"/>
            </div>
            <div>
              <label htmlFor="ordopClassification" className="block text-sm font-medium text-gray-300">Clasificación*</label>
              <select id="ordopClassification" value={classification} onChange={e => setClassification(e.target.value as OperationsOrderClassification)} className="mt-1 w-full bg-gray-700 p-2 rounded-md text-sm text-gray-100 border border-gray-600 focus:ring-emerald-500 focus:border-emerald-500">
                {Object.values(OperationsOrderClassification).map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
             <div>
              <label htmlFor="ordopEffectiveTimestamp" className="block text-sm font-medium text-gray-300">Fecha y Hora Efectiva (Opcional)</label>
              <input 
                type="datetime-local" 
                id="ordopEffectiveTimestamp" 
                value={effectiveTimestamp} 
                onChange={e => setEffectiveTimestamp(e.target.value)} 
                className="mt-1 w-full bg-gray-700 p-2 rounded-md text-sm text-gray-100 border border-gray-600 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>
          </div>

          {/* 5 Paragraph Fields */}
          <fieldset className="border border-gray-700 p-3 rounded-md">
            <legend className="text-md font-medium text-gray-300 px-1">I. SITUACIÓN</legend>
            <div className="space-y-3 mt-1">
              {renderTextarea("sitEnemyForces", "A. Fuerzas Enemigas", situationEnemyForces, setSituationEnemyForces, "Composición, dispositivo, fuerza, capacidades, actividades recientes, curso de acción más probable/peligroso.")}
              {renderTextarea("sitFriendlyForces", "B. Fuerzas Amigas", situationFriendlyForces, setSituationFriendlyForces, "Misión e intención del comando superior (2 escalones), unidades adyacentes, otras unidades de apoyo.")}
              {renderTextarea("sitAggregations", "C. Agregaciones y Segregaciones", situationAggregationsAndSegregations, setSituationAggregationsAndSegregations, "Unidades que se agregan o segregan.")}
              {renderTextarea("sitOpEnvironment", "D. Ambiente Operacional", situationOperationalEnvironment, setSituationOperationalEnvironment, "Terreno, condiciones meteorológicas y su efecto.")}
              {renderTextarea("sitCivilPopulation", "E. Población Civil", situationCivilPopulation, setSituationCivilPopulation, "Situación de la población civil, actitud, consideraciones relevantes.")}
            </div>
          </fieldset>

          <fieldset className="border border-gray-700 p-3 rounded-md">
            <legend className="text-md font-medium text-gray-300 px-1">II. MISIÓN*</legend>
            {renderTextarea("mission", "", mission, setMission, "¿Quién?, ¿Qué?, ¿Cuándo?, ¿Dónde? y ¿Para qué? Ejemplo: La 1ra Compañía destruirá posiciones enemigas en Cerro El Mirador a las 05:00/20JUN25 para facilitar avance del batallón.", 3, true)}
          </fieldset>

          <fieldset className="border border-gray-700 p-3 rounded-md">
            <legend className="text-md font-medium text-gray-300 px-1">III. EJECUCIÓN</legend>
            <div className="space-y-3 mt-1">
              {renderTextarea("execConcept", "A. Concepto de la Operación", executionConceptOfOperations, setExecutionConceptOfOperations, "Visión general de la operación, esquema de maniobra, propósito de cada fase.")}
              {renderTextarea("execTasksManeuver", "B. Tareas a las Unidades de Maniobra", executionTasksManeuverUnits, setExecutionTasksManeuverUnits, "Misiones específicas a unidades subordinadas de maniobra.")}
              {renderTextarea("execTasksSupport", "C. Tareas a las Unidades de Apoyo de Combate", executionTasksCombatSupportUnits, setExecutionTasksCombatSupportUnits, "Misiones específicas a unidades de apoyo (artillería, ingenieros, etc.).")}
              {renderTextarea("execCoordInstructions", "D. Instrucciones de Coordinación", executionCoordinationInstructions, setExecutionCoordinationInstructions, "Límites, líneas de fase, ROE, prioridades de apoyo, etc.")}
            </div>
          </fieldset>
          
          <fieldset className="border border-gray-700 p-3 rounded-md">
            <legend className="text-md font-medium text-gray-300 px-1">IV. ADMINISTRACIÓN Y LOGÍSTICA (ASPC)</legend>
            <div className="space-y-3 mt-1">
              {renderTextarea("sustainSupplies", "A. Abastecimientos", sustainmentSupplies, setSustainmentSupplies, "Clases de abastecimiento (I-V) y procedimientos de distribución.")}
              {renderTextarea("sustainTransport", "B. Transportes", sustainmentTransportation, setSustainmentTransportation, "Uso de vehículos, rutas de abastecimiento/evacuación, prioridades.")}
              {renderTextarea("sustainMedical", "C. Sanidad", sustainmentMedical, setSustainmentMedical, "Ubicación de puestos de socorro, hospitales, procedimientos de evacuación.")}
              {renderTextarea("sustainPersonnel", "D. Personal", sustainmentPersonnel, setSustainmentPersonnel, "Manejo de prisioneros, reemplazos, otros asuntos de personal.")}
              {renderTextarea("sustainOthers", "E. Otros", sustainmentOthers, setSustainmentOthers, "Asuntos civiles, material capturado, etc.")}
            </div>
          </fieldset>
          
          <fieldset className="border border-gray-700 p-3 rounded-md">
            <legend className="text-md font-medium text-gray-300 px-1">V. MANDO Y COMUNICACIONES</legend>
            <div className="space-y-3 mt-1">
                <fieldset className="border border-gray-600 p-2 rounded-md">
                    <legend className="text-sm font-medium text-gray-300 px-1">A. Mando (o Comando)</legend>
                    <div className="space-y-2 mt-1">
                        {renderTextarea("cmdLocation", "1. Ubicación del Comandante", commandCommanderLocation, setCommandCommanderLocation, "Dónde se encontrará el comandante y comandantes subordinados.")}
                        {renderTextarea("cmdPosts", "2. Puestos de Mando", commandCommandPosts, setCommandCommandPosts, "Ubicación de PC principal, alterno, retaguardia.")}
                        {renderTextarea("cmdChain", "3. Cadena de Mando", commandChainOfCommand, setCommandChainOfCommand, "Línea de sucesión.")}
                    </div>
                </fieldset>
                <fieldset className="border border-gray-600 p-2 rounded-md">
                    <legend className="text-sm font-medium text-gray-300 px-1">B. Comunicaciones (o Transmisiones)</legend>
                    <div className="space-y-2 mt-1">
                        {renderTextarea("commFreq", "1. Frecuencias y Distintivos", communicationsFrequencies, setCommunicationsFrequencies, "Índice de Operaciones de Comunicaciones (IOC) en vigor.")}
                        {renderTextarea("commRadioProc", "2. Procedimientos de Radio", communicationsRadioProcedures, setCommunicationsRadioProcedures, "Horarios de enlace, silencio radioeléctrico.")}
                        {renderTextarea("commPyro", "3. Pirotecnia y Señales", communicationsPyrotechnics, setCommunicationsPyrotechnics, "Señales de reconocimiento, iniciar/cesar fuego.")}
                        {renderTextarea("commChallenge", "4. Santo y Seña", communicationsChallengeResponse, setCommunicationsChallengeResponse, "Contraseña y respuesta.")}
                    </div>
                </fieldset>
            </div>
          </fieldset>

          {error && <p className="text-sm text-red-400 text-center py-2">{error}</p>}

          <div className="flex justify-end space-x-3 pt-3">
            <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded-md text-sm text-gray-200 hover:text-white transition-colors">
              Cancelar
            </button>
            <button type="submit" className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-sm font-semibold transition-colors">
              {existingOrder ? 'Guardar Cambios' : 'Guardar Borrador'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};