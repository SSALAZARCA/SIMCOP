
import React, { useState } from 'react';
import type { OperationsOrder, User, MilitaryUnit } from '../types';
import { OperationsOrderStatus, OperationsOrderClassification } from '../types';
import { DocumentArrowUpIcon } from './icons/DocumentArrowUpIcon';
import { ShareIcon } from './icons/ShareIcon'; // For publish button
import { PencilIcon } from './icons/PencilIcon'; // For Edit button
import { PublishORDOPModal } from './PublishORDOPModal';

interface ORDOPDetailsPanelProps {
  ordop: OperationsOrder;
  onEditORDOP: () => void; // New prop to handle opening the edit modal
  publishOperationsOrder: (orderId: string, selectedUserIds: string[]) => Promise<{ success: boolean, message?: string }>;
  allUsers: User[];
  allUnits: MilitaryUnit[];
}

const DetailSection: React.FC<{ title: string; content: string | undefined | null; defaultContent?: string; className?: string }> = ({ title, content, defaultContent = "No especificado.", className = "" }) => (
  <div className={`py-2 ${className}`}>
    <h4 className="text-md font-semibold text-emerald-200 mb-1">{title}:</h4>
    <div className="text-sm text-gray-300 whitespace-pre-wrap leading-relaxed pl-2 bg-gray-750 p-2 rounded-md scrollbar-thin scrollbar-thumb-gray-500 scrollbar-track-gray-750 max-h-40 overflow-y-auto">
      {(content && content.trim()) ? content : <span className="italic text-gray-500">{defaultContent}</span>}
    </div>
  </div>
);

const getStatusPillColor = (status: OperationsOrderStatus): string => {
  switch (status) {
    case OperationsOrderStatus.PUBLICADA: return 'bg-green-600 text-green-100';
    case OperationsOrderStatus.ARCHIVADA: return 'bg-gray-500 text-gray-200';
    case OperationsOrderStatus.BORRADOR: default: return 'bg-yellow-500 text-yellow-900';
  }
};

const getClassificationPillColor = (classification: OperationsOrderClassification): string => {
  switch (classification) {
    case OperationsOrderClassification.SECRETO: return 'bg-red-600 text-red-100';
    case OperationsOrderClassification.RESERVADO: return 'bg-orange-500 text-orange-100';
    case OperationsOrderClassification.CONFIDENCIAL: return 'bg-amber-500 text-amber-900';
    case OperationsOrderClassification.NO_CLASIFICADO: default: return 'bg-sky-600 text-sky-100';
  }
};

export const ORDOPDetailsPanel: React.FC<ORDOPDetailsPanelProps> = ({
  ordop,
  onEditORDOP,
  publishOperationsOrder,
  allUsers,
  allUnits,
}) => {
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [publishFeedback, setPublishFeedback] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  const issuedDate = new Date(ordop.issuedTimestamp).toLocaleString('es-ES', {
    year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
  });
  const effectiveDate = ordop.effectiveTimestamp
    ? new Date(ordop.effectiveTimestamp).toLocaleString('es-ES', {
      year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
    })
    : 'N/A';

  const handleOpenPublishModal = () => {
    if (ordop.status === OperationsOrderStatus.BORRADOR) {
      setPublishFeedback(null);
      setShowPublishModal(true);
    }
  };

  const handlePublishSubmit = async (selectedUserIds: string[]) => {
    const result = await publishOperationsOrder(ordop.id, selectedUserIds);
    if (result.success) {
      setPublishFeedback({ type: 'success', message: result.message || 'Orden publicada exitosamente.' });
    } else {
      setPublishFeedback({ type: 'error', message: result.message || 'Error al publicar la orden.' });
    }
    setShowPublishModal(false);
  };


  return (
    <>
      <div className="p-1 bg-gray-850 text-gray-200 rounded-lg shadow-lg h-full flex flex-col">
        <div className="flex justify-between items-center py-3 px-4 border-b border-gray-700">
          <h3 className="text-xl font-bold text-emerald-300 truncate" title={ordop.title}>
            {ordop.title}
          </h3>
          <DocumentArrowUpIcon className="w-6 h-6 text-emerald-400 flex-shrink-0" />
        </div>

        {publishFeedback && (
          <div className={`m-2 p-2 text-xs rounded-md text-center ${publishFeedback.type === 'success' ? 'bg-green-700 text-green-100' : 'bg-red-700 text-red-100'}`}>
            {publishFeedback.message}
          </div>
        )}

        <div className="flex-grow overflow-y-auto p-4 space-y-1 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-1 text-sm mb-3">
            <div><strong className="text-gray-400">ID:</strong> {ordop.id.substring(0, 10)}...</div>
            <div>
              <strong className="text-gray-400">Estado: </strong>
              <span className={`ml-1 px-2 py-0.5 text-xs font-semibold rounded-full ${getStatusPillColor(ordop.status)}`}>
                {ordop.status}
              </span>
            </div>
            <div>
              <strong className="text-gray-400">Clasificación: </strong>
              <span className={`ml-1 px-2 py-0.5 text-xs font-semibold rounded-full ${getClassificationPillColor(ordop.classification)}`}>
                {ordop.classification}
              </span>
            </div>
            <div><strong className="text-gray-400">Autoridad Emisora:</strong> {ordop.issuingAuthority}</div>
            <div><strong className="text-gray-400">Fecha Emisión:</strong> {issuedDate}</div>
            <div><strong className="text-gray-400">Fecha Efectiva:</strong> {effectiveDate}</div>
          </div>

          {/* Paragraph I: Situation */}
          <fieldset className="border border-gray-700 p-3 rounded-md mb-3">
            <legend className="text-lg font-semibold text-gray-300 px-1">I. SITUACIÓN</legend>
            <DetailSection title="A. Fuerzas Enemigas" content={ordop.situation_enemyForces} className="mt-1" />
            <DetailSection title="B. Fuerzas Amigas" content={ordop.situation_friendlyForces} />
            <DetailSection title="C. Agregaciones y Segregaciones" content={ordop.situation_aggregationsAndSegregations} />
            <DetailSection title="D. Ambiente Operacional" content={ordop.situation_operationalEnvironment} />
            <DetailSection title="E. Población Civil" content={ordop.situation_civilPopulation} />
          </fieldset>

          {/* Paragraph II: Mission */}
          <fieldset className="border border-gray-700 p-3 rounded-md mb-3">
            <legend className="text-lg font-semibold text-gray-300 px-1">II. MISIÓN</legend>
            <DetailSection title="" content={ordop.mission} className="mt-1" />
          </fieldset>

          {/* Paragraph III: Execution */}
          <fieldset className="border border-gray-700 p-3 rounded-md mb-3">
            <legend className="text-lg font-semibold text-gray-300 px-1">III. EJECUCIÓN</legend>
            <DetailSection title="A. Concepto de la Operación" content={ordop.execution_conceptOfOperations} className="mt-1" />
            <DetailSection title="B. Tareas a las Unidades de Maniobra" content={ordop.execution_tasksManeuverUnits} />
            <DetailSection title="C. Tareas a las Unidades de Apoyo de Combate" content={ordop.execution_tasksCombatSupportUnits} />
            <DetailSection title="D. Instrucciones de Coordinación" content={ordop.execution_coordinationInstructions} />
          </fieldset>

          {/* Paragraph IV: Sustainment */}
          <fieldset className="border border-gray-700 p-3 rounded-md mb-3">
            <legend className="text-lg font-semibold text-gray-300 px-1">IV. ADMINISTRACIÓN Y LOGÍSTICA (ASPC)</legend>
            <DetailSection title="A. Abastecimientos" content={ordop.sustainment_supplies} className="mt-1" />
            <DetailSection title="B. Transportes" content={ordop.sustainment_transportation} />
            <DetailSection title="C. Sanidad" content={ordop.sustainment_medical} />
            <DetailSection title="D. Personal" content={ordop.sustainment_personnel} />
            <DetailSection title="E. Otros" content={ordop.sustainment_others} />
          </fieldset>

          {/* Paragraph V: Command and Signal */}
          <fieldset className="border border-gray-700 p-3 rounded-md mb-3">
            <legend className="text-lg font-semibold text-gray-300 px-1">V. MANDO Y COMUNICACIONES</legend>
            <fieldset className="border border-gray-600 p-2 rounded-md mt-1 mb-2">
              <legend className="text-md font-medium text-gray-300 px-1">A. Mando (o Comando)</legend>
              <DetailSection title="1. Ubicación del Comandante" content={ordop.commandAndSignal_command_commanderLocation} className="mt-0.5" />
              <DetailSection title="2. Puestos de Mando" content={ordop.commandAndSignal_command_commandPosts} />
              <DetailSection title="3. Cadena de Mando" content={ordop.commandAndSignal_command_chainOfCommand} />
            </fieldset>
            <fieldset className="border border-gray-600 p-2 rounded-md">
              <legend className="text-md font-medium text-gray-300 px-1">B. Comunicaciones (o Transmisiones)</legend>
              <DetailSection title="1. Frecuencias y Distintivos de Llamada" content={ordop.commandAndSignal_communications_frequenciesAndCallsigns} className="mt-0.5" />
              <DetailSection title="2. Procedimientos de Radio" content={ordop.commandAndSignal_communications_radioProcedures} />
              <DetailSection title="3. Pirotecnia y Señales" content={ordop.commandAndSignal_communications_pyrotechnicsAndSignals} />
              <DetailSection title="4. Santo y Seña" content={ordop.commandAndSignal_communications_challengeAndResponse} />
            </fieldset>
          </fieldset>
        </div>

        <div className="py-3 px-4 border-t border-gray-700 mt-auto flex justify-end space-x-2">
          <button
            onClick={onEditORDOP}
            disabled={ordop.status !== OperationsOrderStatus.BORRADOR}
            className="px-3 py-1.5 bg-yellow-600 hover:bg-yellow-700 text-black text-xs font-medium rounded-md shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            title={ordop.status !== OperationsOrderStatus.BORRADOR ? "Solo se pueden editar órdenes en Borrador" : "Editar Borrador"}
          >
            <PencilIcon className="w-3.5 h-3.5 mr-1.5" />
            Editar Borrador
          </button>
          {ordop.status === OperationsOrderStatus.BORRADOR && (
            <button
              onClick={handleOpenPublishModal}
              className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-medium rounded-md shadow-sm transition-colors flex items-center"
            >
              <ShareIcon className="w-3.5 h-3.5 mr-1.5" />
              Publicar Orden
            </button>
          )}
          {ordop.status === OperationsOrderStatus.PUBLICADA && (
            <button
              disabled
              className="px-3 py-1.5 bg-green-700 text-green-200 text-xs font-medium rounded-md shadow-sm disabled:opacity-70 cursor-default flex items-center"
            >
              <ShareIcon className="w-3.5 h-3.5 mr-1.5" />
              Orden Publicada
            </button>
          )}
          {ordop.status === OperationsOrderStatus.ARCHIVADA && (
            <button
              disabled
              className="px-3 py-1.5 bg-gray-600 text-gray-400 text-xs font-medium rounded-md shadow-sm disabled:opacity-70 cursor-default"
            >
              Orden Archivada
            </button>
          )}
        </div>
      </div>
      {showPublishModal && (
        <PublishORDOPModal
          isOpen={showPublishModal}
          onClose={() => setShowPublishModal(false)}
          onSubmit={handlePublishSubmit}
          allUsers={allUsers}
          allUnits={allUnits}
          ordopTitle={ordop.title}
        />
      )}
    </>
  );
};