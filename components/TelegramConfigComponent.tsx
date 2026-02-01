import React, { useState, useMemo } from 'react';
import type { User, UserTelegramConfig, ArtilleryPiece } from '../types';
import { UserRole } from '../types';

interface TelegramConfigProps {
  allUsers: User[];
  // userTelegramConfigs removed
  onUpdateConfig: (userId: string, chatId: string) => void;
  onSendTest: (chatId: string) => Promise<boolean>;
  artilleryPieces: ArtilleryPiece[];
}

export const TelegramConfigComponent: React.FC<TelegramConfigProps> = ({
  allUsers,
  onUpdateConfig,
  onSendTest,
  artilleryPieces
}) => {
  const [chatIds, setChatIds] = useState<Record<string, string>>(() => {
    const initialIds: Record<string, string> = {};
    allUsers.forEach(user => {
      if (user.telegramChatId) {
        initialIds[user.id] = user.telegramChatId;
      }
    });
    return initialIds;
  });
  const [testStatus, setTestStatus] = useState<Record<string, 'sending' | 'success' | 'error' | null>>({});

  const fireDirectionOfficers = useMemo(() => {
    return allUsers.filter(u => u.role.startsWith('Director de Tiro'));
  }, [allUsers]);

  const handleChatIdChange = (userId: string, value: string) => {
    setChatIds(prev => ({ ...prev, [userId]: value }));
  };

  const handleSave = (userId: string) => {
    const chatId = chatIds[userId] || '';
    if (chatId.trim() && /^-?\d+$/.test(chatId.trim())) {
      onUpdateConfig(userId, chatId.trim());
      alert(`Configuración guardada para el usuario.`);
    } else {
      alert("Por favor, ingrese un Chat ID de Telegram numérico válido.");
    }
  };

  const handleSendTestMessage = async (userId: string) => {
    const chatId = chatIds[userId]?.trim();
    if (!chatId) {
      alert("Por favor, guarde un Chat ID antes de enviar una prueba.");
      return;
    }
    setTestStatus(prev => ({ ...prev, [userId]: 'sending' }));
    const success = await onSendTest(chatId);
    if (success) {
      setTestStatus(prev => ({ ...prev, [userId]: 'success' }));
    } else {
      setTestStatus(prev => ({ ...prev, [userId]: 'error' }));
    }
    setTimeout(() => setTestStatus(prev => ({ ...prev, [userId]: null })), 4000);
  };

  const getTestButtonState = (userId: string) => {
    const status = testStatus[userId];
    if (status === 'sending') return { text: 'Enviando...', disabled: true, color: 'bg-gray-500' };
    if (status === 'success') return { text: 'Éxito!', disabled: true, color: 'bg-green-600' };
    if (status === 'error') return { text: 'Fallo', disabled: false, color: 'bg-red-600' };
    return { text: 'Probar', disabled: false, color: 'bg-indigo-600 hover:bg-indigo-700' };
  };

  return (
    <div className="bg-gray-800 p-4 rounded-lg shadow-inner">
      <h3 className="text-lg font-semibold text-gray-300 mb-1 border-b border-gray-700 pb-2">
        Configuración de Notificaciones por Telegram
      </h3>
      <p className="text-sm text-gray-400 mb-4">
        Asigne un Chat ID de Telegram a cada Director de Tiro para que reciba alertas de nuevas misiones de fuego directamente en su dispositivo.
      </p>

      <div className="space-y-4">
        {fireDirectionOfficers.map(fdo => {
          const testButtonState = getTestButtonState(fdo.id);
          const assignedPieces = artilleryPieces.filter(p => p.directorTiroId === fdo.id);
          return (
            <div key={fdo.id} className="bg-gray-750 p-3 rounded-md">
              <p className="font-semibold text-blue-300">{fdo.displayName}</p>
              <p className="text-xs text-gray-400 mb-2">{fdo.role}</p>
              {assignedPieces.length > 0 ? (
                <p className="text-xs text-gray-400 mb-2">
                  <span className="font-semibold">Piezas Asignadas:</span> {assignedPieces.map(p => p.name).join(', ')}
                </p>
              ) : (
                <p className="text-xs text-gray-500 italic mb-2">
                  Sin piezas asignadas.
                </p>
              )}
              <div className="flex flex-col sm:flex-row gap-2 items-stretch">
                <input
                  type="text"
                  value={chatIds[fdo.id] || ''}
                  onChange={(e) => handleChatIdChange(fdo.id, e.target.value)}
                  placeholder="ID de Chat Numérico de Telegram"
                  className="flex-grow bg-gray-700 p-2 rounded-md text-sm border border-gray-600"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => handleSave(fdo.id)}
                    className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded"
                  >
                    Guardar
                  </button>
                  <button
                    onClick={() => handleSendTestMessage(fdo.id)}
                    disabled={!chatIds[fdo.id] || testButtonState.disabled}
                    className={`flex-1 px-3 py-2 text-white text-xs font-bold rounded transition-colors disabled:opacity-70 ${testButtonState.color}`}
                  >
                    {testButtonState.text}
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  );
};
