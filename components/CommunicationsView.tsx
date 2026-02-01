import React, { useState } from 'react';
import type { MilitaryUnit, AfterActionReport, User, UserTelegramConfig } from '../types';
import { UnitStatus } from '../types';
import { COMMUNICATION_REPORT_INTERVAL_MS, COMMUNICATION_OVERDUE_THRESHOLD_MS } from '../constants';
import { AARModalComponent } from './AARModalComponent';

interface CommunicationsViewProps {
  units: MilitaryUnit[];
  markUnitHourlyReport: (unitId: string) => void;
  reportUnitEngaged: (unitId: string) => void;
  reportUnitCeasefire: (unitId: string) => void;
  addAfterActionReport: (aarData: Omit<AfterActionReport, 'id' | 'reportTimestamp' | 'unitName'>) => void;
  sendTestTelegramAlert: (chatId?: string) => Promise<boolean>; // Updated prop name
  currentUser: User | null;
  // userTelegramConfigs prop removed as it's now part of User
  updateUserTelegramConfig: (userId: string, chatId: string) => void;
}

const formatTimeSince = (timestamp: number | undefined): string => {
  if (timestamp === undefined) return 'N/A';
  const now = Date.now();
  const diffMs = now - timestamp;
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);

  if (diffHours > 0) return `Hace ${diffHours}h ${diffMinutes % 60}m`;
  if (diffMinutes > 0) return `Hace ${diffMinutes}m`;
  return `Hace ${diffSeconds}s`;
};

export const CommunicationsView: React.FC<CommunicationsViewProps> = ({
  units,
  markUnitHourlyReport,
  reportUnitEngaged,
  reportUnitCeasefire,
  addAfterActionReport,
  sendTestTelegramAlert, // Updated prop name
  currentUser,
  updateUserTelegramConfig
}) => {
  const [unitForAAR, setUnitForAAR] = useState<MilitaryUnit | null>(null);
  const [isTestingNotification, setIsTestingNotification] = useState<boolean>(false);
  const [showTelegramConfigModal, setShowTelegramConfigModal] = useState<boolean>(false);
  const [telegramChatIdInput, setTelegramChatIdInput] = useState<string>('');

  const currentUserTelegramChatId = currentUser?.telegramChatId;

  const handleOpenTelegramConfig = () => {
    setTelegramChatIdInput(currentUserTelegramChatId || '');
    setShowTelegramConfigModal(true);
  };

  const handleSaveTelegramConfig = async () => {
    if (currentUser) {
      await updateUserTelegramConfig(currentUser.id, telegramChatIdInput);
      setShowTelegramConfigModal(false);
    } else {
      console.error("No current user to save Telegram config for.");
      alert("Error: No hay usuario actual para guardar la configuración de Telegram.");
    }
  };
  const getReportStatus = (unit: MilitaryUnit): { text: string; colorClass: string; isOverdue: boolean } => {
    if (unit.status === UnitStatus.ENGAGED) {
      return { text: 'EN COMBATE', colorClass: 'text-red-500 font-bold animate-pulse', isOverdue: true };
    }
    if (unit.status === UnitStatus.AAR_PENDING) {
      return { text: 'PENDIENTE REPORTE POST-COMBATE', colorClass: 'text-yellow-500 font-semibold', isOverdue: true };
    }
    const lastReportTime = unit.lastHourlyReportTimestamp;
    if (!lastReportTime) {
      return { text: 'PENDIENTE (PRIMER REPORTE)', colorClass: 'text-red-400 font-semibold', isOverdue: true };
    }
    const timeSinceLastReport = Date.now() - lastReportTime;

    if (timeSinceLastReport > COMMUNICATION_OVERDUE_THRESHOLD_MS) {
      return { text: 'VENCIDO', colorClass: 'text-red-400 font-semibold animate-pulse', isOverdue: true };
    }
    if (timeSinceLastReport > COMMUNICATION_REPORT_INTERVAL_MS) {
      return { text: 'REPORTE PRÓXIMO', colorClass: 'text-yellow-400', isOverdue: false };
    }
    return { text: 'AL DÍA', colorClass: 'text-green-400', isOverdue: false };
  };

  const handleOpenAARModal = (unit: MilitaryUnit) => {
    if (unit.status === UnitStatus.AAR_PENDING && unit.combatEndTimestamp && unit.combatEndLocation) {
      setUnitForAAR(unit);
    } else {
      console.warn("No se puede abrir AAR: la unidad no está en estado AAR_PENDING o falta información de fin de combate.");
    }
  };

  const handleCloseAARModal = () => {
    setUnitForAAR(null);
  };

  const handleAARSubmit = (
    aarDetails: Omit<AfterActionReport, 'id' | 'reportTimestamp' | 'unitId' | 'unitName' | 'combatEndTimestamp' | 'location'>
  ) => {
    if (unitForAAR && unitForAAR.combatEndTimestamp && unitForAAR.combatEndLocation) {
      addAfterActionReport({
        ...aarDetails,
        unitId: unitForAAR.id,
        combatEndTimestamp: unitForAAR.combatEndTimestamp,
        location: unitForAAR.combatEndLocation,
      });
    }
    handleCloseAARModal();
  };

  const handleTestNotification = async () => {
    if (!currentUserTelegramChatId) {
      alert("Primero debe configurar y guardar un Chat ID de Telegram.");
      return;
    }
    setIsTestingNotification(true);
    console.log("Iniciando prueba de notificación Telegram...");
    try {
      const success = await sendTestTelegramAlert(currentUserTelegramChatId); // Call with ID
      if (success) {
        alert("Solicitud de prueba Telegram enviada. Revise su cliente Telegram.");
      } else {
        alert("Falló el envío de la prueba Telegram. Revise que el Chat ID sea correcto y que haya iniciado el Bot.");
      }
    } catch (e) {
      console.error("Error catastrófico durante la prueba de notificación Telegram:", e);
      alert("Ocurrió un error inesperado al intentar enviar la prueba.");
    }
    setIsTestingNotification(false);
  };




  return (
    <>
      <div className="flex flex-col space-y-4 p-1">
        <div className="flex flex-col sm:flex-row justify-between items-center border-b border-gray-700 pb-3 gap-2">
          <h2 className="text-2xl font-semibold text-gray-200">
            Monitor de Comunicaciones y Reportes de Combate
          </h2>
          <div className="flex gap-2">
            <button
              onClick={handleOpenTelegramConfig}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md shadow-sm transition-colors"
              aria-label="Configurar Telegram"
            >
              ⚙️ Configurar Telegram
              {currentUserTelegramChatId && (
                <span className="ml-2 text-xs bg-green-500 px-2 py-0.5 rounded-full">✓</span>
              )}
            </button>
            <button
              onClick={handleTestNotification}
              disabled={isTestingNotification}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-md shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Probar envío de alerta Telegram"
            >
              {isTestingNotification ? (
                <div className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Enviando Prueba...
                </div>
              ) : "🧪 Probar Telegram"}
            </button>
          </div>
        </div>

        <div className="flex-1 bg-gray-800 p-4 rounded-lg shadow-inner">
          {units.length === 0 ? (
            <p className="text-gray-400 text-center py-10">No hay unidades para monitorear.</p>
          ) : (
            <div className="space-y-3">
              {units.map(unit => {
                const statusInfo = getReportStatus(unit);
                const isEngaged = unit.status === UnitStatus.ENGAGED;
                const isAarPending = unit.status === UnitStatus.AAR_PENDING;

                return (
                  <div key={unit.id} className="bg-gray-750 p-4 rounded-md shadow-md flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-blue-300">{unit.name} <span className="text-sm text-gray-400">({unit.type})</span></h3>
                      <p className="text-xs text-gray-400">
                        Último Reporte Horario: {unit.lastHourlyReportTimestamp ? new Date(unit.lastHourlyReportTimestamp).toLocaleString('es-ES') : 'N/A'}
                      </p>
                      <p className={`text-sm font-medium ${statusInfo.colorClass}`}>
                        Estado Comms/Reporte: {statusInfo.text}
                        {unit.lastHourlyReportTimestamp && !isEngaged && !isAarPending && ` (${formatTimeSince(unit.lastHourlyReportTimestamp)})`}
                      </p>
                      {isEngaged && (
                        <p className="text-sm font-bold text-red-400 animate-pulse">ESTADO UNIDAD: EN COMBATE</p>
                      )}
                      {isAarPending && (
                        <p className="text-sm font-bold text-yellow-400">ESTADO UNIDAD: PENDIENTE REPORTE POST-COMBATE</p>
                      )}
                    </div>
                    <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2 w-full sm:w-auto">
                      <button
                        onClick={() => markUnitHourlyReport(unit.id)}
                        className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-medium rounded-md shadow-sm transition-colors w-full"
                        aria-label={`Marcar reporte horario para ${unit.name}`}
                        disabled={isEngaged || isAarPending}
                      >
                        Marcar Reporte Horario
                      </button>

                      {isEngaged ? (
                        <button
                          onClick={() => reportUnitCeasefire(unit.id)}
                          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-md shadow-sm transition-colors w-full"
                          aria-label={`Reportar fin de combate para ${unit.name}`}
                        >
                          Reportar Fin de Combate
                        </button>
                      ) : isAarPending ? (
                        <button
                          onClick={() => handleOpenAARModal(unit)}
                          className="px-3 py-1.5 bg-yellow-500 hover:bg-yellow-600 text-black text-xs font-medium rounded-md shadow-sm transition-colors w-full"
                          aria-label={`Registrar reporte post-combate para ${unit.name}`}
                        >
                          Reporte Post-Combate
                        </button>
                      ) : (
                        <button
                          onClick={() => reportUnitEngaged(unit.id)}
                          className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-medium rounded-md shadow-sm transition-colors w-full"
                          aria-label={`Reportar unidad ${unit.name} en combate`}
                        >
                          Reportar En Combate
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
      {unitForAAR && unitForAAR.combatEndTimestamp && unitForAAR.combatEndLocation && (
        <AARModalComponent
          unit={unitForAAR}
          onSubmit={handleAARSubmit}
          onClose={handleCloseAARModal}
        />
      )}



      {/* Telegram Configuration Modal */}
      {showTelegramConfigModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4">
          <div className="bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-white mb-4">Configurar Telegram</h3>
            <p className="text-gray-300 text-sm mb-4">
              Configure su Chat ID personal de Telegram para recibir notificaciones.
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Chat ID de Telegram
              </label>
              <input
                type="text"
                value={telegramChatIdInput}
                onChange={(e) => setTelegramChatIdInput(e.target.value)}
                placeholder="-1001234567890"
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-400 mt-2">
                💡 Para obtener su Chat ID:
                <br />1. Envíe un mensaje a su bot o grupo
                <br />2. Visite: <code className="bg-gray-700 px-1 rounded">api.telegram.org/bot{'<TOKEN>'}/getUpdates</code>
                <br />3. Busque el campo "chat":{"{"}"id":...{"}"}
              </p>
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowTelegramConfigModal(false)}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-md transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveTelegramConfig}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
