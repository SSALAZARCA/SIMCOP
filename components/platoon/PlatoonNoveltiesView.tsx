import React, { useState } from 'react';
import type { MilitaryUnit, User } from '../../types';
import { ChatBubbleOvalLeftEllipsisIcon } from '../icons/ChatBubbleOvalLeftEllipsisIcon';

interface PlatoonNoveltiesViewProps {
  platoon: MilitaryUnit;
  currentUser: User;
  logNovelty: (unitId: string, userId: string, details: string, isLogisticsRequest: boolean) => void;
}

export const PlatoonNoveltiesView: React.FC<PlatoonNoveltiesViewProps> = ({ platoon, currentUser, logNovelty }) => {
  const [details, setDetails] = useState('');
  const [isLogisticsRequest, setIsLogisticsRequest] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!details.trim()) {
      setError("El detalle de la novedad no puede estar vacío.");
      return;
    }

    logNovelty(platoon.id, currentUser.id, details.trim(), isLogisticsRequest);
    setSuccess('Novedad enviada a su comandante para aprobación.');
    setDetails('');
    setIsLogisticsRequest(false);
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold text-gray-200 border-b border-gray-700 pb-2 flex items-center">
        <ChatBubbleOvalLeftEllipsisIcon className="w-7 h-7 mr-3 text-purple-400" />
        Registro de Novedades del Pelotón
      </h2>

      <div className="max-w-xl mx-auto bg-gray-800 p-6 rounded-lg shadow-lg">
        <p className="text-sm text-gray-400 mb-4">
          Registre cualquier novedad o evento significativo relacionado con su pelotón (personal, equipo, moral, movimientos, etc.). La entrada será enviada a su Comandante de Compañía para validación antes de ser guardada en el histórico de la unidad.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="noveltyDetails" className="block text-sm font-medium text-gray-300">
              Detalles de la Novedad
            </label>
            <textarea
              id="noveltyDetails"
              rows={5}
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              required
              className="mt-1 block w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md shadow-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-gray-200"
              placeholder="Describa la novedad..."
            />
          </div>

          <div className="flex items-center">
            <input
              id="isLogisticsRequest"
              type="checkbox"
              checked={isLogisticsRequest}
              onChange={(e) => setIsLogisticsRequest(e.target.checked)}
              className="h-4 w-4 text-blue-500 bg-gray-700 border-gray-600 rounded focus:ring-blue-600"
            />
            <label htmlFor="isLogisticsRequest" className="ml-2 block text-sm text-gray-300">
              Marcar como Requerimiento Logístico
            </label>
          </div>

          {error && <p className="text-sm text-red-400 text-center">{error}</p>}
          {success && <p className="text-sm text-green-400 text-center">{success}</p>}

          <button
            type="submit"
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-purple-500"
          >
            Enviar Novedad para Aprobación
          </button>
        </form>
      </div>
    </div>
  );
};