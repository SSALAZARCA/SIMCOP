import React, { useState } from 'react';
import type { MilitaryUnit, User } from '../../types';
import { ClipboardDocumentListIcon } from '../icons/ClipboardDocumentListIcon';

interface PlatoonLogisticsViewProps {
  platoon: MilitaryUnit;
  currentUser: User;
  submitAmmoReport: (unitId: string, userId: string, amount: number, justification: string) => void;
}

export const PlatoonLogisticsView: React.FC<PlatoonLogisticsViewProps> = ({ platoon, currentUser, submitAmmoReport }) => {
  const [amount, setAmount] = useState('');
  const [justification, setJustification] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0 || amountNum > 100) {
      setError("Por favor, ingrese un porcentaje de gasto válido (entre 1 y 100).");
      return;
    }
    if (!justification.trim()) {
      setError("La justificación del gasto es obligatoria.");
      return;
    }

    submitAmmoReport(platoon.id, currentUser.id, amountNum, justification.trim());
    setSuccess(`Reporte de gasto de ${amountNum}% enviado para aprobación.`);
    setAmount('');
    setJustification('');
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold text-gray-200 border-b border-gray-700 pb-2 flex items-center">
        <ClipboardDocumentListIcon className="w-7 h-7 mr-3 text-blue-400" />
        Reporte de Gasto de Munición
      </h2>
      
      <div className="max-w-xl mx-auto bg-gray-800 p-6 rounded-lg shadow-lg">
        <p className="text-sm text-gray-400 mb-4">
          Use este formulario para reportar el gasto de munición de su pelotón. El reporte será enviado a su comandante de compañía para validación. Una vez aprobado, el nivel de munición de su unidad será actualizado en el sistema.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="ammoAmount" className="block text-sm font-medium text-gray-300">
              Porcentaje de Munición Gastada (%)
            </label>
            <input
              id="ammoAmount"
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              min="1"
              max="100"
              required
              className="mt-1 block w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md shadow-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-200"
              placeholder="Ej: 25"
            />
          </div>
          <div>
            <label htmlFor="justification" className="block text-sm font-medium text-gray-300">
              Justificación (Ej: Contacto armado, entrenamiento)
            </label>
            <textarea
              id="justification"
              rows={3}
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
              required
              className="mt-1 block w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md shadow-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-200"
              placeholder="Describa brevemente la razón del gasto."
            />
          </div>

          {error && <p className="text-sm text-red-400 text-center">{error}</p>}
          {success && <p className="text-sm text-green-400 text-center">{success}</p>}

          <button
            type="submit"
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-blue-500"
          >
            Enviar Reporte para Aprobación
          </button>
        </form>
      </div>
    </div>
  );
};
