
import React from 'react';
import { createRoot } from 'react-dom/client';

interface ConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: React.ReactNode;
    confirmText?: string;
    cancelText?: string;
    isDestructive?: boolean;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmText = 'Confirmar',
    cancelText = 'Cancelar',
    isDestructive = false,
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center z-[5000] p-4">
            {/* Backdrop blur effect could be added here */}
            <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-md border border-gray-700 transform transition-all scale-100">
                <div className="p-6">
                    <h3 className={`text-lg font-semibold mb-4 ${isDestructive ? 'text-red-400' : 'text-gray-200'}`}>
                        {title}
                    </h3>
                    <div className="text-gray-300 mb-6 text-sm whitespace-pre-line">
                        {message}
                    </div>
                    <div className="flex justify-end space-x-3">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-md text-sm transition-colors"
                        >
                            {cancelText}
                        </button>
                        <button
                            onClick={() => {
                                onConfirm();
                                onClose();
                            }}
                            className={`px-4 py-2 rounded-md text-sm font-semibold text-white transition-colors ${isDestructive
                                    ? 'bg-red-600 hover:bg-red-700 focus:ring-2 focus:ring-red-500'
                                    : 'bg-teal-600 hover:bg-teal-700 focus:ring-2 focus:ring-teal-500'
                                }`}
                        >
                            {confirmText}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
